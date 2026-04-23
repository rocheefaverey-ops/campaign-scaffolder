'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { IUnityApplication, IUnityConfig, IUnityFullData, IUnitySceneLoad, IUnitySetData, UnityEventCallback } from './IUnity';
import { useSyncedState } from '@hooks/useSyncedState';
import { uLog } from './UnityLogger';

// ─── Context ──────────────────────────────────────────────────────────────────

export interface UnityContextType {
  // State
  loadProgress: number;
  showLoader: boolean;
  isUnityVisible: boolean;
  setUnityVisible: (visible: boolean) => void;
  activeScene: string;
  isInitialized: boolean;
  isMuted: boolean;
  setMuted: (muted: boolean) => void;

  // Controls
  setTargetScene: (sceneKey: string) => void;
  setData: (data: IUnitySetData) => void;
  initializeUnity: (omitLogs?: boolean) => Promise<void>;
  preloadScene: (omitLogs?: boolean) => Promise<void>;
  loadScene: (omitLogs?: boolean) => Promise<void>;
  startGame: (omitLogs?: boolean) => void;
  isBusy: () => boolean;
  fullBoot: () => Promise<void>;
  replayBoot: () => Promise<void>;

  // Events
  addEventListener: (eventName: string, callback: UnityEventCallback) => void;
  removeEventListener: (eventName: string, callback: UnityEventCallback) => void;
}

export const UnityContext = createContext<UnityContextType | undefined>(undefined);

export function useUnityGame(): UnityContextType {
  const ctx = useContext(UnityContext);
  if (!ctx) throw new Error('useUnityGame must be used inside <UnityGame>');
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MUTED_STORAGE_KEY = 'unity-muted';

/** Flag to suppress event-map dispatch logging during internal JS access */
let _suppressDispatchLog = false;

/** Create a Map that logs unhandled Unity event dispatches (events with no listeners) */
function createEventMap(): Map<string, Array<UnityEventCallback>> {
  const map = new Map<string, Array<UnityEventCallback>>();
  const originalGet = map.get.bind(map);

  map.get = function (key: string): Array<UnityEventCallback> | undefined {
    const listeners = originalGet(key);
    if (!_suppressDispatchLog) {
      if (!listeners || listeners.length === 0) {
        uLog.event(`← ${key} (no listeners)`);
      }
    }
    return listeners;
  } as typeof map.get;

  return map;
}

function parseNumber(input: string | null | undefined, fallback: number): number {
  const parsed = Number(input);
  return isNaN(parsed) ? fallback : parsed;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UnityGameProps {
  children: ReactNode;
  /** Full base URL for the Unity build, e.g. https://cdn.example.com/Game/V3/desktop/ */
  buildBaseUrl: string;
  /** Disable asset caching for local builds */
  isLocal?: boolean;
}

export function UnityGame({ children, buildBaseUrl, isLocal = false }: UnityGameProps) {
  // Ensure unityEventMap exists immediately — before any child effects run
  if (typeof window !== 'undefined' && !window.unityEventMap) {
    window.unityEventMap = createEventMap();
  }

  // Muted state — persisted in localStorage, exposed on window for Unity .jslib
  const [isMuted, setIsMutedState, isMutedRef] = useSyncedState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(MUTED_STORAGE_KEY);
    return stored === null ? false : stored === 'true';
  });

  const autoResume = useRef<boolean>(false);

  // Refs
  const isInitialized = useRef<boolean>(false);
  const initialSceneLoaded = useRef<boolean>(false);
  const unityCanvasRef = useRef<HTMLCanvasElement>(null);
  const unityRef = useRef<IUnityApplication | null>(null);
  const unityDataRef = useRef<IUnityFullData | null>(null);
  const targetSceneRef = useRef<string>('game');

  // Synced states (state + ref in sync for async-safe access)
  const [isUnityLoading, setUnityLoading, isUnityLoadingRef] = useSyncedState<boolean>(true);
  const [isPreloading, setPreloading, isPreloadingRef] = useSyncedState<boolean>(false);
  const [isLoading, setLoading, isLoadingRef] = useSyncedState<boolean>(false);
  const [activeScene, setActiveScene, activeSceneRef] = useSyncedState<string>('');

  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [isUnityVisible, setUnityVisible] = useState<boolean>(false);

  const showLoader = useMemo(
    () => isUnityLoading || isPreloading || isLoading,
    [isUnityLoading, isPreloading, isLoading]
  );

  // ── Mount: reset event map + lifecycle listeners ───────────────────────────
  useEffect(() => {
    // Only reset the map if Unity hasn't started initializing yet.
    // React StrictMode unmounts+remounts in dev — resetting after createUnityInstance
    // has started would wipe the 'sceneLoaded' listener and cause initializeUnity to hang.
    if (!isInitialized.current) {
      window.unityEventMap = createEventMap();
      uLog.lifecycle('UnityGame mounted — unityEventMap reset');
    } else {
      uLog.lifecycle('UnityGame remounted — keeping existing unityEventMap (Unity already initializing)');
    }

    // Expose muted on window via defineProperty so Unity .jslib always gets the latest value
    Object.defineProperty(window, 'muted', {
      get: () => isMutedRef.current,
      configurable: true,
    });

    const loadingCallback = () => {
      uLog.event('← loading');
      setLoading(true);
    };
    const readyCallback = () => {
      uLog.event('← ready');
      // ready fires early in this build — don't setLoading(false) here
    };
    const sceneLoadedCallback = (key: unknown) => {
      uLog.event('← sceneLoaded', { key, isLoading: isLoadingRef.current, activeScene: activeSceneRef.current });
      initialSceneLoaded.current = true;
      setActiveScene(String(key ?? ''));
      setLoading(false);
    };
    const tutorialPlayedCallback = () => {
      uLog.event('← onTutorialPlayed');
      localStorage.setItem('tutorialPlayed', 'true');
    };
    const mutedCallback = (value: unknown) => {
      try {
        const parsed = JSON.parse(String(value));
        const muted = parsed?.muted === true;
        setIsMutedState(muted);
        localStorage.setItem(MUTED_STORAGE_KEY, String(muted));
        if (unityDataRef.current) unityDataRef.current.muted = muted;
      } catch {
        // ignore malformed payload
      }
    };

    addEventListener('loading', loadingCallback);
    addEventListener('ready', readyCallback);
    addEventListener('sceneLoaded', sceneLoadedCallback);
    addEventListener('onTutorialPlayed', tutorialPlayedCallback);
    addEventListener('muted', mutedCallback);

    const visibilityChangeCallback = () => {
      if (!inControllerScene()) {
        if (document.hidden) {
          sendMessage('PauseService', 'PauseGame', 1);
        } else if (autoResume.current) {
          sendMessage('PauseService', 'ResumeGame', 1);
        }
      }
    };
    document.addEventListener('visibilitychange', visibilityChangeCallback);

    return () => {
      removeEventListener('loading', loadingCallback);
      removeEventListener('ready', readyCallback);
      removeEventListener('sceneLoaded', sceneLoadedCallback);
      removeEventListener('onTutorialPlayed', tutorialPlayedCallback);
      removeEventListener('muted', mutedCallback);
      document.removeEventListener('visibilitychange', visibilityChangeCallback);
      uLog.lifecycle('UnityGame unmounted');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Exposed controls ──────────────────────────────────────────────────────

  const setTargetScene = useCallback((sceneKey: string) => {
    targetSceneRef.current = sceneKey;
  }, []);

  const setData = useCallback((data: IUnitySetData) => {
    unityDataRef.current = {
      environment: process.env.NEXT_PUBLIC_ENV ?? 'production',
      muted: isMutedRef.current,
      ...data,
    };
    if (isInitialized.current && unityRef.current) {
      uLog.lifecycle('setData — Unity initialized, sending SetData immediately', unityDataRef.current);
      sendMessage('WebService', 'SetData', JSON.stringify(unityDataRef.current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeUnity = useCallback(
    async (omitLogs = false) => {
      if (isInitialized.current) {
        if (!isUnityLoadingRef.current) {
          if (!omitLogs) uLog.warn('Unity is already initialized!');
          return;
        }
        if (initialSceneLoaded.current) {
          uLog.lifecycle('initializeUnity: sceneLoaded already received, resolving immediately');
          return;
        }
        return await waitForUnity('sceneLoaded');
      }
      isInitialized.current = true;

      const maxDpr = parseNumber(process.env.NEXT_PUBLIC_UNITY_MAX_DPR, 3);
      const minDpr = parseNumber(process.env.NEXT_PUBLIC_UNITY_MIN_DPR, 1);
      const targetDpr = Math.max(minDpr, Math.min(maxDpr, window.devicePixelRatio));

      const config: IUnityConfig = {
        companyName: 'Livewall',
        productName: 'Campaign Game',
        productVersion: '1.0',
        frameworkUrl: `${buildBaseUrl}Build/Build.framework.js`,
        dataUrl: `${buildBaseUrl}Build/Build.data`,
        codeUrl: `${buildBaseUrl}Build/Build.wasm`,
        streamingAssetsUrl: `${buildBaseUrl}StreamingAssets`,
        devicePixelRatio: targetDpr,
        matchWebGLToCanvasSize: true,
        cacheControl: (url: string) => {
          if (url.match(/\.data/) || url.match(/\.wasm/) || url.match(/\.bundle/)) {
            return isLocal ? 'no-store' : 'immutable';
          }
          return 'no-store';
        },
      };

      uLog.lifecycle('Starting createUnityInstance', { buildBaseUrl, targetDpr });

      const waitForLoader = async () => {
        let attempts = 0;
        while (typeof window.createUnityInstance !== 'function') {
          if (attempts++ > 100) {
            throw new Error('Timed out waiting for window.createUnityInstance — loader script did not load');
          }
          uLog.lifecycle(`Waiting for createUnityInstance... (attempt ${attempts})`);
          await new Promise((r) => setTimeout(r, 100));
        }
        uLog.lifecycle('createUnityInstance is available');
      };

      const unityLoader = async () => {
        await waitForLoader();
        const instance = await window.createUnityInstance(unityCanvasRef.current!, config, (progress) => {
          const pct = Math.round(progress * 100);
          setLoadProgress(pct);
          uLog.progress(`Load progress: ${pct}%`, { raw: progress });
        });
        unityRef.current = instance;
        window.unityInstance = instance;
        uLog.lifecycle('Unity instance created');
      };

      setUnityLoading(true);
      await waitForUnity('sceneLoaded', unityLoader);
      setUnityLoading(false);
      uLog.lifecycle('initializeUnity complete — sceneLoaded received');

      void preloadScene(true);
    },
    [buildBaseUrl, isLocal] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const preloadScene = useCallback(
    async (omitLogs = false) => {
      uLog.lifecycle('preloadScene — enter', {
        isPreloading: isPreloadingRef.current,
        activeScene: activeSceneRef.current,
        inController: inControllerScene(),
      });
      if (isPreloadingRef.current) {
        uLog.lifecycle('preloadScene — already preloading, waiting for it to finish');
        while (isPreloadingRef.current) {
          await new Promise((r) => setTimeout(r, 50));
        }
        uLog.lifecycle('preloadScene — previous preload finished');
        return;
      }
      if (!inControllerScene()) {
        uLog.lifecycle('preloadScene — NOT in controller, bailing', { activeScene: activeSceneRef.current });
        if (!omitLogs) uLog.warn('Cannot preload scene — not in controller scene');
        return;
      }

      const payload: IUnitySceneLoad = {
        sceneKey: targetSceneRef.current,
        skipPreload: isLocal,
      };

      if (unityDataRef.current) {
        uLog.lifecycle('preloadScene — sending SetData', unityDataRef.current);
        sendMessage('WebService', 'SetData', JSON.stringify(unityDataRef.current));
      }

      setPreloading(true);
      uLog.lifecycle('preloadScene — sending SetScene', { sceneKey: payload.sceneKey });
      await waitForUnity('addressableLoaded', () => sendMessage('WebService', 'SetScene', JSON.stringify(payload)));
      setPreloading(false);
      uLog.lifecycle('preloadScene complete — addressableLoaded received');
    },
    [isLocal] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const loadScene = useCallback(async (omitLogs = false) => {
    uLog.lifecycle('loadScene — enter', {
      isLoading: isLoadingRef.current,
      activeScene: activeSceneRef.current,
      inController: inControllerScene(),
    });
    if (isLoadingRef.current) {
      uLog.lifecycle('loadScene — already loading, waiting for it to finish');
      while (isLoadingRef.current) {
        await new Promise((r) => setTimeout(r, 50));
      }
      uLog.lifecycle('loadScene — previous load finished');
      return;
    }
    if (!inControllerScene()) {
      uLog.lifecycle('loadScene — NOT in controller, bailing', { activeScene: activeSceneRef.current });
      if (!omitLogs) uLog.warn('Cannot load scene — not in controller scene');
      return;
    }

    if (unityDataRef.current) {
      uLog.lifecycle('loadScene — sending SetData', unityDataRef.current);
      sendMessage('WebService', 'SetData', JSON.stringify(unityDataRef.current));
    }

    setLoading(true);
    uLog.lifecycle('loadScene — sending LoadScene');
    // Wait for sceneLoaded — 'ready' fires before the scene transition completes
    await waitForUnity('sceneLoaded', () => sendMessage('WebService', 'LoadScene'));
    setLoading(false);
    uLog.lifecycle('loadScene complete — sceneLoaded received');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startGame = useCallback((_omitLogs = false) => {
    uLog.lifecycle('startGame — sending StartGame', { activeScene: activeSceneRef.current });
    sendMessage('GameService', 'StartGame');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    setIsMutedState(muted);
    localStorage.setItem(MUTED_STORAGE_KEY, String(muted));
    if (unityDataRef.current) {
      unityDataRef.current.muted = muted;
      sendMessage('WebService', 'SetData', JSON.stringify(unityDataRef.current));
    }
    uLog.state(`Muted → ${muted}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBusy = useCallback(
    () => isUnityLoadingRef.current || isPreloadingRef.current || isLoadingRef.current,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const fullBoot = useCallback(async () => {
    await initializeUnity(true);
    await preloadScene(true);
    await loadScene(true);
  }, [initializeUnity, preloadScene, loadScene]);

  const replayBoot = useCallback(async () => {
    uLog.lifecycle('replayBoot — start', {
      activeScene: activeSceneRef.current,
      isLoading: isLoadingRef.current,
      isPreloading: isPreloadingRef.current,
    });

    setPreloading(false);
    setLoading(false);
    setActiveScene('controller');
    activeSceneRef.current = 'controller';

    const payload: IUnitySceneLoad = {
      sceneKey: targetSceneRef.current,
      skipPreload: isLocal,
    };

    if (unityDataRef.current) {
      uLog.lifecycle('replayBoot — sending SetData');
      sendMessage('WebService', 'SetData', JSON.stringify(unityDataRef.current));
    }

    setPreloading(true);
    uLog.lifecycle('replayBoot — sending SetScene', { sceneKey: payload.sceneKey });
    await waitForUnity('addressableLoaded', () => sendMessage('WebService', 'SetScene', JSON.stringify(payload)));
    setPreloading(false);
    uLog.lifecycle('replayBoot — preload complete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocal]);

  // ── Event system ──────────────────────────────────────────────────────────

  const callbackMapRef = useRef<WeakMap<UnityEventCallback, UnityEventCallback>>(new WeakMap());

  const addEventListener = useCallback((eventName: string, callback: UnityEventCallback) => {
    if (typeof window === 'undefined') {
      uLog.warn('Trying to add Unity event listener in SSR context');
      return;
    }
    if (!window.unityEventMap) {
      window.unityEventMap = createEventMap();
    }

    let wrappedCallback = callbackMapRef.current.get(callback);
    if (!wrappedCallback) {
      wrappedCallback = (...args) => {
        uLog.event(`← ${eventName}`, args.length > 0 ? args[0] : undefined);
        callback(...args);
      };
      callbackMapRef.current.set(callback, wrappedCallback);
    }

    _suppressDispatchLog = true;
    const listeners = window.unityEventMap.get(eventName) ?? [];
    _suppressDispatchLog = false;
    if (!listeners.includes(wrappedCallback)) {
      listeners.push(wrappedCallback);
      window.unityEventMap.set(eventName, listeners);
    }
  }, []);

  const removeEventListener = useCallback((eventName: string, callback: UnityEventCallback) => {
    if (typeof window === 'undefined') {
      uLog.warn('Trying to remove Unity event listener in SSR context');
      return;
    }
    if (!window.unityEventMap) return;

    const wrappedCallback = callbackMapRef.current.get(callback);
    const callbackToRemove = wrappedCallback || callback;

    _suppressDispatchLog = true;
    const listeners = window.unityEventMap.get(eventName) ?? [];
    _suppressDispatchLog = false;
    const index = listeners.indexOf(callbackToRemove);
    if (index !== -1) {
      listeners.splice(index, 1);
      window.unityEventMap.set(eventName, listeners);
    }
  }, []);

  // ── Internal helpers ──────────────────────────────────────────────────────

  const inControllerScene = () => activeSceneRef.current.toLowerCase() === 'controller';

  const sendMessage = (objectName: string, methodName: string, data?: string | number) =>
    unityRef.current?.SendMessage(objectName, methodName, data);

  const waitForUnity = (eventName: string, action?: () => void | Promise<void>) =>
    new Promise<void>((resolve, reject) => {
      const handleEvent = () => {
        removeEventListener(eventName, handleEvent);
        resolve();
      };
      addEventListener(eventName, handleEvent);
      Promise.resolve(action?.()).catch((e) => {
        removeEventListener(eventName, handleEvent);
        reject(e);
      });
    });

  // ── Context value ─────────────────────────────────────────────────────────

  const ctxValue = useMemo(
    (): UnityContextType => ({
      loadProgress,
      activeScene,
      showLoader,
      isUnityVisible,
      isInitialized: isInitialized.current,
      isMuted,
      setMuted,
      setUnityVisible,
      isBusy,
      fullBoot,
      replayBoot,
      initializeUnity,
      setData,
      setTargetScene,
      preloadScene,
      loadScene,
      startGame,
      addEventListener,
      removeEventListener,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadProgress, activeScene, showLoader, isUnityVisible, isMuted]
  );

  return (
    <>
      <UnityContext value={ctxValue}>{children}</UnityContext>

      {/* Unity canvas — hidden when not visible, always mounted so Unity can render */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ display: isUnityVisible ? 'block' : 'none' }}
        aria-hidden="true"
      >
        <canvas ref={unityCanvasRef} id="unity-canvas" className="h-full w-full" />
      </div>
    </>
  );
}
