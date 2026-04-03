import type {
  IGameBridgeAdapter,
  IUnityInput,
  IUnitySceneLoad,
  GameBridgeEventName,
  GameBridgeEventCallback,
} from '@lib/game-bridge/game-bridge.types';
import { BRIDGE_EVENTS } from '@lib/game-bridge/game-bridge.events';
import Logger from '@lib/logger/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Window type augmentation
// ─────────────────────────────────────────────────────────────────────────────
declare global {
  interface Window {
    createUnityInstance: (
      canvas: HTMLCanvasElement,
      config: IUnityLoaderConfig,
      onProgress?: (progress: number) => void,
    ) => Promise<IUnityApplication>;
    unityInstance: IUnityApplication | undefined;
    /** Populated by Unity loader; read by Unity .jslib files */
    muted: boolean;
    /** Event map Unity dispatches into via a .jslib call */
    unityEventMap: Map<string, Array<GameBridgeEventCallback>>;
  }
}

export interface IUnityApplication {
  SendMessage(objectName: string, methodName: string, value?: string | number): void;
  SetFullscreen(enabled: boolean): void;
  Quit(): Promise<void>;
}

interface IUnityLoaderConfig {
  companyName: string;
  productName: string;
  productVersion: string;
  dataUrl: string;
  frameworkUrl: string;
  codeUrl: string;
  streamingAssetsUrl: string;
  devicePixelRatio: number;
  matchWebGLToCanvasSize: boolean;
  cacheControl: (url: string) => string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter
// ─────────────────────────────────────────────────────────────────────────────

export class UnityGameBridgeAdapter implements IGameBridgeAdapter {
  private instance: IUnityApplication | null = null;
  private dataSnapshot: IUnityInput | null = null;
  private targetScene = 'game';
  private activeScene = '';
  private isDestroyed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    // Initialise the global event map Unity will dispatch into
    if (typeof window !== 'undefined') {
      window.unityEventMap = new Map();
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  setData(input: IUnityInput): void {
    this.dataSnapshot = input;
    // Sync muted flag to window so Unity .jslib can read it synchronously
    if (typeof window !== 'undefined') {
      window.muted = input.muted;
    }
    Logger.info('[UnityBridge] setData stored', { environment: input.environment });
  }

  setTargetScene(sceneKey: string): void {
    this.targetScene = sceneKey;
  }

  sendMessage(objectName: string, methodName: string, data?: string): void {
    if (!this.instance) {
      Logger.warn('[UnityBridge] sendMessage before instance ready', { objectName, methodName });
      return;
    }
    this.instance.SendMessage(objectName, methodName, data ?? '');
    Logger.info(`[UnityBridge] → ${objectName}.${methodName}`, { data: data?.slice(0, 120) });
  }

  on<T = unknown>(event: GameBridgeEventName, cb: GameBridgeEventCallback<T>): void {
    if (!window.unityEventMap.has(event)) {
      window.unityEventMap.set(event, []);
    }
    window.unityEventMap.get(event)!.push(cb as GameBridgeEventCallback);
  }

  off<T = unknown>(event: GameBridgeEventName, cb: GameBridgeEventCallback<T>): void {
    const handlers = window.unityEventMap.get(event);
    if (!handlers) return;
    const idx = handlers.indexOf(cb as GameBridgeEventCallback);
    if (idx !== -1) handlers.splice(idx, 1);
  }

  waitFor<T = unknown>(event: GameBridgeEventName, timeoutMs = 60_000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(event, handler);
        reject(new Error(`[UnityBridge] waitFor("${event}") timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const handler = (data: T) => {
        clearTimeout(timer);
        this.off(event, handler);
        resolve(data);
      };

      this.on<T>(event, handler);
    });
  }

  /**
   * Full boot sequence:
   *  1. Load the Unity loader script
   *  2. createUnityInstance → wait for sceneLoaded('controller')
   *  3. preloadScene  → SetScene + wait for addressableLoaded
   *  4. loadScene     → SetData + LoadScene + wait for ready
   *
   * Caller should call startGame() after fullBoot() resolves.
   */
  async fullBoot(): Promise<void> {
    await this.initializeUnity();
    await this.preloadScene();
    await this.loadScene();
  }

  startGame(): void {
    // Only send StartGame when NOT in the controller scene
    if (this.activeScene !== 'controller') {
      this.sendMessage('GameService', 'StartGame');
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    window.unityEventMap?.clear();
    this.instance?.Quit?.();
    this.instance = null;
    window.unityInstance = undefined;
    this.removeVisibilityHandler?.();
    Logger.info('[UnityBridge] destroyed');
  }

  // ── Private boot steps ─────────────────────────────────────────────────────

  private async initializeUnity(): Promise<void> {
    const loaderScript = await this.loadLoaderScript();

    const dpr = this.calculateDPR();
    const isLocal = process.env.NEXT_PUBLIC_UNITY_BASE_URL?.includes('localhost');
    const base = process.env.NEXT_PUBLIC_UNITY_BASE_URL!;
    const name = process.env.NEXT_PUBLIC_UNITY_GAME_NAME!;
    const compression = process.env.NEXT_PUBLIC_UNITY_COMPRESSION ?? 'none';
    const ext = compression === 'br' ? '.br' : compression === 'gzip' ? '.gz' : '';

    const config: IUnityLoaderConfig = {
      companyName: 'Livewall',
      productName: name,
      productVersion: process.env.NEXT_PUBLIC_UNITY_VERSION ?? '1.0',
      dataUrl: `${base}/Build/Build.data${ext}`,
      frameworkUrl: `${base}/Build/Build.framework.js${ext}`,
      codeUrl: `${base}/Build/Build.wasm${ext}`,
      streamingAssetsUrl: `${base}/StreamingAssets`,
      devicePixelRatio: dpr,
      matchWebGLToCanvasSize: true,
      cacheControl: (url: string) => {
        if (/\.(data|wasm|bundle)/.test(url)) return isLocal ? 'no-store' : 'immutable';
        return 'no-store';
      },
    };

    const sceneLoadedPromise = this.waitFor<string>(BRIDGE_EVENTS.SCENE_LOADED);

    this.instance = await window.createUnityInstance(
      this.canvas,
      config,
      (progress) => {
        // Expose raw load progress (0–1) via custom event so UnityLoader can read it
        this.dispatch(BRIDGE_EVENTS.LOADING, progress);
      },
    );

    window.unityInstance = this.instance;
    this.setupVisibilityHandler();

    // Wait for controller scene to confirm Unity is ready
    this.activeScene = await sceneLoadedPromise;
    Logger.info('[UnityBridge] initialised, active scene:', this.activeScene);
  }

  private async preloadScene(): Promise<void> {
    const payload: IUnitySceneLoad = {
      sceneKey: this.targetScene,
      skipPreload: process.env.APP_ENV === 'local',
    };
    this.sendMessage('WebService', 'SetScene', JSON.stringify(payload));
    await this.waitFor(BRIDGE_EVENTS.ADDRESSABLE_LOADED);
    Logger.info('[UnityBridge] preload complete for scene:', this.targetScene);
  }

  private async loadScene(): Promise<void> {
    if (!this.dataSnapshot) {
      Logger.warn('[UnityBridge] loadScene called before setData — Unity will receive empty translations');
    }
    // SetData must be called immediately before LoadScene
    this.sendMessage('WebService', 'SetData', JSON.stringify(this.dataSnapshot ?? {}));
    this.sendMessage('WebService', 'LoadScene');
    await this.waitFor(BRIDGE_EVENTS.READY);
    Logger.info('[UnityBridge] scene loaded and ready');
  }

  private loadLoaderScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('unity-loader');
      if (existing) { resolve(); return; }

      const script = document.createElement('script');
      script.id = 'unity-loader';
      script.src = `${process.env.NEXT_PUBLIC_UNITY_BASE_URL}/Build/${process.env.NEXT_PUBLIC_UNITY_GAME_NAME}.loader.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('[UnityBridge] Failed to load Unity loader script'));
      document.body.appendChild(script);
    });
  }

  private calculateDPR(): number {
    const deviceDPR = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    const maxDPR = Number(process.env.NEXT_PUBLIC_UNITY_DESKTOP_DPR ?? 2);
    const minDPR = Number(process.env.NEXT_PUBLIC_UNITY_MOBILE_DPR ?? 1);
    return Math.min(maxDPR, Math.max(minDPR, deviceDPR));
  }

  private removeVisibilityHandler?: () => void;

  private setupVisibilityHandler(): void {
    const handler = () => {
      if (this.activeScene === 'controller') return; // Don't pause controller
      if (document.hidden) {
        this.sendMessage('PauseService', 'PauseGame', '1');
      } else {
        this.sendMessage('PauseService', 'ResumeGame', '1');
      }
    };
    document.addEventListener('visibilitychange', handler);
    this.removeVisibilityHandler = () =>
      document.removeEventListener('visibilitychange', handler);
  }

  private dispatch(event: GameBridgeEventName, data: unknown): void {
    window.unityEventMap?.get(event)?.forEach((cb) => cb(data));
  }
}
