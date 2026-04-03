import type {
  IGameBridgeAdapter,
  IGameBridgeInput,
  GameBridgeEventName,
  GameBridgeEventCallback,
} from './game-bridge.types';
import Logger from '@lib/logger/logger';

/**
 * UnityGameBridgeAdapter
 *
 * Implements the IGameBridgeAdapter contract for Unity WebGL builds.
 *
 * Unity → React  :  Unity calls window-level functions that dispatch CustomEvents
 * React → Unity  :  unityInstance.SendMessage(objectName, methodName, data)
 *
 * The adapter is created once the unityInstance is available (after WASM init),
 * then stored in GameContext so all components share the same instance.
 */
export class UnityGameBridgeAdapter implements IGameBridgeAdapter {
  private readonly UNITY_WEBSERVICE = 'WebService';
  private readonly listeners = new Map<
    GameBridgeEventName,
    Set<GameBridgeEventCallback>
  >();

  constructor(
    private readonly getInstance: () => UnityInstance | null,
  ) {
    // Expose global handler so Unity .jslib can dispatch events
    if (typeof window !== 'undefined') {
      (window as Window & { __bridgeDispatch?: (event: string, data: string) => void }).__bridgeDispatch =
        (event: string, rawData: string) => {
          this.dispatch(event, this.tryParse(rawData));
        };
    }
  }

  setData(input: IGameBridgeInput): void {
    this.sendMessage(this.UNITY_WEBSERVICE, 'SetData', JSON.stringify(input));
    Logger.info('[GameBridge] setData', input);
  }

  sendMessage(objectName: string, methodName: string, data?: string): void {
    const instance = this.getInstance();
    if (!instance) {
      Logger.warn('[GameBridge] sendMessage called before instance ready', {
        objectName,
        methodName,
      });
      return;
    }
    instance.SendMessage(objectName, methodName, data ?? '');
  }

  on<T = unknown>(
    event: GameBridgeEventName,
    cb: GameBridgeEventCallback<T>,
  ): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb as GameBridgeEventCallback);
  }

  off<T = unknown>(
    event: GameBridgeEventName,
    cb: GameBridgeEventCallback<T>,
  ): void {
    this.listeners.get(event)?.delete(cb as GameBridgeEventCallback);
  }

  waitFor<T = unknown>(
    event: GameBridgeEventName,
    timeoutMs = 30_000,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`[GameBridge] waitFor("${event}") timed out`)),
        timeoutMs,
      );

      const handler = (data: T) => {
        clearTimeout(timer);
        this.off(event, handler);
        resolve(data);
      };

      this.on<T>(event, handler);
    });
  }

  destroy(): void {
    this.listeners.clear();
    if (typeof window !== 'undefined') {
      delete (window as Window & { __bridgeDispatch?: unknown }).__bridgeDispatch;
    }
  }

  private dispatch(event: GameBridgeEventName, data: unknown): void {
    const cbs = this.listeners.get(event);
    if (!cbs) return;
    cbs.forEach((cb) => cb(data));
  }

  private tryParse(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}

// ─────────────────────────────────────────────
// Type augmentation — add UnityInstance to Window
// ─────────────────────────────────────────────
interface UnityInstance {
  SendMessage(objectName: string, methodName: string, value?: string): void;
  SetFullscreen(enabled: boolean): void;
  Quit(): Promise<void>;
}
