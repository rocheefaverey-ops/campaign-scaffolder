import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLoaderData } from '@tanstack/react-router';
import styles from './UnityContext.module.scss';
import type {
  IUnityApplication,
  IUnityConfig,
  UnityEventCallback,
  UnityMessageFunction,
} from '~/interfaces/unity/IUnityApplication.ts';
import type { IDefaultProps } from '~/interfaces/IComponentProps.ts';
import type { IUnityFullInput, IUnityInput, IUnitySceneLoad } from '~/interfaces/unity/IUnity.ts';
import { parseNumber } from '~/utils/Helper.ts';
import { useSyncedState } from '~/hooks/useSyncedState.ts';
import { getPlatform } from '~/utils/Functions.ts';

interface IUnityContext {

  // State
  loadProgress: number;
  showLoader: boolean;
  isUnityVisible: boolean;
  setUnityVisible: (visible: boolean) => void;
  activeScene: string;

  // Controls
  sendMessage: UnityMessageFunction;
  setTargetScene: (sceneKey: string) => void;
  setData: (data: IUnityInput) => void;
  initializeUnity: () => Promise<void>;
  preloadScene: () => Promise<void>;
  loadScene: () => Promise<void>;
  startGame: () => void;
  isBusy: () => boolean;
  fullBoot: () => Promise<void>;

  // Events
  addEventListener: (eventName: string, callback: UnityEventCallback) => void;
  removeEventListener: (eventName: string, callback: UnityEventCallback) => void;
}

const UnityContext = createContext<IUnityContext | undefined>(undefined);

export function UnityProvider({ children }: IDefaultProps) {
  const { unityEnvironment } = useLoaderData({ from: '__root__' });

  // Settings
  const autoResume = useRef<boolean>(true);

  // Refs
  const isInitialized = useRef<boolean>(false);
  const unityCanvasRef = useRef<HTMLCanvasElement>(null);
  const unityRef = useRef<IUnityApplication>(null);
  const unityDataRef = useRef<IUnityFullInput>(null);
  const targetSceneRef = useRef<string>('game');

  // Synced states
  const [isUnityLoading, setUnityLoading, isUnityLoadingRef] = useSyncedState<boolean>(true);
  const [isPreloading, setPreloading, isPreloadingRef] = useSyncedState<boolean>(false);
  const [isLoading, setLoading, isLoadingRef] = useSyncedState<boolean>(false);
  const [activeScene, setActiveScene, activeSceneRef] = useSyncedState<string>('');

  // States
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [isUnityVisible, setUnityVisible] = useState<boolean>(false);

  // Caches
  const showLoader = useMemo(() => isUnityLoading || isPreloading || isLoading, [isUnityLoading, isPreloading, isLoading]);


  // Mount hook
  useEffect(() => {
    window.unityEventMap = new Map<string, Array<UnityEventCallback>>();

    // Define callbacks
    const loadingCallback = () => setLoading(true);
    const readyCallback = () => setLoading(false);
    const sceneLoadedCallback = (key: string) => setActiveScene(key);

    // Set loading events
    addEventListener('loading', loadingCallback);
    addEventListener('ready', readyCallback);
    addEventListener('sceneLoaded', sceneLoadedCallback);

    // Set visibility listener
    const visibilityChangeCallback = () => {
      if (!inControllerScene()) {
        if (document.hidden) {
          sendMessage('PauseService', 'PauseGame', 1);
        } else if (autoResume.current) {
          sendMessage('PauseService', 'ResumeGame', 1);
        }
      }
    };

    // Setup visibility change listener
    document.addEventListener('visibilitychange', visibilityChangeCallback);

    // Cleanup on unmount
    return () => {
      removeEventListener('loading', loadingCallback);
      removeEventListener('ready', readyCallback);
      removeEventListener('sceneLoaded', sceneLoadedCallback);
      document.removeEventListener('visibilitychange', visibilityChangeCallback);
    };
  }, []);


  // Exposed functions
  const setTargetScene = useCallback((sceneKey: string) => {
    targetSceneRef.current = sceneKey;
  }, []);

  const setData = useCallback((data: IUnityInput) => {
    unityDataRef.current = {
      useMockAPI: true,
      environment: import.meta.env.VITE_ENVIRONMENT,
      ...data,
    };
  }, []);

  const initializeUnity = useCallback(async (omitLogs = false) => {
    if (isInitialized.current) {
      if (!isUnityLoadingRef.current) {
        if (!omitLogs) {
          console.warn('Unity is already initialized!');
        }
        return;
      } else {
        return await waitForUnity('sceneLoaded');
      }
    }
    isInitialized.current = true;

    // Calculate target DPR
    let dpr: number;
    if (getPlatform() === 'desktop') {
      const minDpr = parseNumber(import.meta.env.VITE_UNITY_DESKTOP_DPR, 1);
      dpr = Math.max(window.devicePixelRatio, minDpr);
    } else {
      dpr = window.devicePixelRatio;
    }

    // Build config
    const config: IUnityConfig = {
      companyName: 'LiveWall',
      productName: 'Game',
      productVersion: '1.0',
      frameworkUrl: `${unityEnvironment.url}Build/Build.framework.js`,
      dataUrl: `${unityEnvironment.url}Build/Build.data`,
      codeUrl: `${unityEnvironment.url}Build/Build.wasm`,
      streamingAssetsUrl: `${unityEnvironment.url}StreamingAssets`,
      devicePixelRatio: dpr,
      matchWebGLToCanvasSize: true,
      cacheControl: (url: string) => {
        if (url.match(/\.data/) || url.match(/\.wasm/) || url.match(/\.bundle/)) {
          return unityEnvironment.isLocal ? 'no-store' : 'immutable';
        }
        return 'no-store';
      },
      errorHandler: () => true,
    };

    // Trigger Unity load
    const unityLoader = async () => {
      const instance = await window.createUnityInstance(unityCanvasRef.current!, config, (progress) => setLoadProgress(Math.round(progress * 100)));
      unityRef.current = instance;

      // Also assign to window, for internal Unity logic
      window.unityInstance = instance;
    };

    // Wait for Unity to load
    setUnityLoading(true);
    await waitForUnity('sceneLoaded', unityLoader);
    setUnityLoading(false);

    // Start the preload automatically
    void preloadScene();
  }, []);

  const preloadScene = useCallback(async (omitLogs = false) => {
    if (isPreloadingRef.current) {
      return waitForUnity('addressableLoaded');
    }
    if (!inControllerScene()) {
      if (!omitLogs) {
        console.warn('Cannot preload scene, not in controller scene!');
      }
      return;
    }

    // Setup payload
    const payload: IUnitySceneLoad = {
      sceneKey: targetSceneRef.current,
      skipPreload: unityEnvironment.isLocal,
    };

    // Wait for preload to finish
    setPreloading(true);
    await waitForUnity('addressableLoaded', () => sendMessage('WebService', 'SetScene', JSON.stringify(payload)));
    setPreloading(false);
  }, []);


  const loadScene = useCallback(async (omitLogs = false) => {
    if (isLoadingRef.current) {
      return waitForUnity('ready');
    }
    if (!inControllerScene()) {
      if (!omitLogs) {
        console.warn('Cannot load scene, not in controller scene!');
      }
      return;
    }

    // Apply preloaded data if available (it should be)
    if (unityDataRef.current) {
      sendMessage('WebService', 'SetData', JSON.stringify(unityDataRef.current));
    }

    // Trigger scene load
    setLoading(true);
    await waitForUnity('ready', () => sendMessage('WebService', 'LoadScene'));
    setLoading(false);
  }, []);

  const startGame = useCallback((omitLogs = false) => {
    if (inControllerScene()) {
      if (!omitLogs) {
        console.warn('Cannot start game, currently in controller scene!');
      }
      return;
    }

    // Trigger game start, with make sure Unity has a frame to setup layout-wise
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        sendMessage('GameService', 'StartGame');
      });
    });
  }, []);

  const isBusy = useCallback(() => {
    return isUnityLoadingRef.current || isPreloadingRef.current || isLoadingRef.current;
  }, []);

  const fullBoot = useCallback(async () => {
    await initializeUnity(true);
    await preloadScene(true);
    await loadScene(true);
  }, []);


  // Event handlers
  const addEventListener = useCallback((eventName: string, callback: UnityEventCallback) => {
    if (typeof window === 'undefined') {
      console.warn('Trying to add Unity event listener in SSR context!');
      return;
    }

    // Get existing listeners
    const listeners = window.unityEventMap.get(eventName) ?? [];

    // Apply listener if not already present
    if (!listeners.includes(callback)) {
      listeners.push(callback);
      window.unityEventMap.set(eventName, listeners);
    }
  }, []);

  const removeEventListener = useCallback((eventName: string, callback: UnityEventCallback) => {
    if (typeof window === 'undefined') {
      console.warn('Trying to remove Unity event listener in SSR context!');
      return;
    }

    // Get existing listeners
    const listeners = window.unityEventMap.get(eventName) ?? [];
    const index = listeners.indexOf(callback);

    // Remove listener if found
    if (index !== -1) {
      listeners.splice(index, 1);
      window.unityEventMap.set(eventName, listeners);
    }
  }, []);


  // Internal functions
  const inControllerScene = () => activeSceneRef.current.toLowerCase() === 'controller';
  const sendMessage = (objectName: string, methodName: string, data?: string | number) => unityRef.current?.SendMessage(objectName, methodName, data);

  const waitForUnity = (eventName: string, action?: () => void) => {
    return new Promise<void>((resolve, reject) => {
      const handleEvent = () => {
        removeEventListener(eventName, handleEvent);
        resolve();
      };
      addEventListener(eventName, handleEvent);

      // Execute action if provided
      Promise.resolve(action?.()).catch((e) => {
        removeEventListener(eventName, handleEvent);
        reject(e);
      });
    });
  };


  // Render component
  const ctxValue = useMemo((): IUnityContext => ({
    loadProgress,
    activeScene,
    showLoader,
    isUnityVisible,
    setUnityVisible,
    isBusy,
    fullBoot,
    initializeUnity,
    setData,
    sendMessage,
    setTargetScene,
    preloadScene,
    loadScene,
    startGame,
    addEventListener,
    removeEventListener,
  }), [loadProgress, activeScene, showLoader, isUnityVisible]);

  return (
    <>
      <UnityContext value={ctxValue}>{children}</UnityContext>

      <div className={styles.unityGame} style={{ display: isUnityVisible ? 'block' : 'none' }}>
        <canvas ref={unityCanvasRef} id={'unity'} className={styles.unityCanvas} />
      </div>
    </>
  );
}

export function useUnity() {
  const context = useContext(UnityContext);
  if (!context) {
    throw new Error('useUnity must be used within a UnityProvider');
  }
  return context;
}
