'use client';

import { useEffect, useRef } from 'react';
import { useCapeData } from '@hooks/useCapeData';
import { useGameContext } from '@hooks/useGameContext';
import { useUnityBridge } from './useUnityBridge';

interface UnityCanvasProps {
  onGameEnd: (result: Record<string, unknown>) => void;
  onReady?: () => void;
}

/**
 * UnityCanvas — mounts and communicates with Unity WebGL builds.
 *
 * Flow:
 * 1. Load Unity loader script from CDN
 * 2. Initialize game with boot data via SendMessage
 * 3. Listen for 'ready', 'start', 'end', 'sendEvent' events
 * 4. Forward result payload to onGameEnd(result)
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_UNITY_BASE_URL — CDN root
 *   NEXT_PUBLIC_UNITY_GAME_NAME — GameObject name to SendMessage to
 *   NEXT_PUBLIC_UNITY_VERSION — "V1", "V2", etc. (affects loader script)
 */
export default function UnityCanvas({ onGameEnd, onReady }: UnityCanvasProps) {
  const { capeData } = useCapeData();
  const {
    gameIsReady,
    setGameIsReady,
    score,
    userName,
    isMuted,
  } = useGameContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const unityLoaderRef = useRef<{ Instance?: { SendMessage: (go: string, method: string, data: string) => void } }>(null);
  const eventMapRef = useRef<Record<string, (data: unknown) => void>>({});

  // Set up event map before loading Unity
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.unityEventMap = {
      dispatchToGame: (eventName: string, data: unknown) => {
        console.log(`[Unity Event] ${eventName}:`, data);

        if (eventName === 'ready') {
          setGameIsReady(true);
          onReady?.();
        } else if (eventName === 'end') {
          onGameEnd(data as Record<string, unknown>);
        } else if (eventName === 'sendEvent') {
          // Custom events — can be used for analytics, etc.
          eventMapRef.current[eventName]?.(data);
        }
      },
    };

    return () => {
      delete (window as any).unityEventMap;
    };
  }, [setGameIsReady, onGameEnd, onReady]);

  // Load Unity WebGL build
  useEffect(() => {
    if (!containerRef.current) return;
    if (!process.env.NEXT_PUBLIC_UNITY_BASE_URL) {
      console.error('[Unity] NEXT_PUBLIC_UNITY_BASE_URL not set');
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_UNITY_BASE_URL;
    const loaderUrl = `${baseUrl}/Build/UnityLoader.js`; // V1/V2 standard

    // Load Unity loader script
    const script = document.createElement('script');
    script.src = loaderUrl;
    script.async = true;
    script.onload = () => {
      console.log('[Unity] Loader script loaded');
      initializeUnity(baseUrl);
    };
    script.onerror = () => {
      console.error('[Unity] Failed to load loader script:', loaderUrl);
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initializeUnity = (baseUrl: string) => {
    const gameName = process.env.NEXT_PUBLIC_UNITY_GAME_NAME || 'Game';
    const version = process.env.NEXT_PUBLIC_UNITY_VERSION || 'V1';
    const compression = process.env.NEXT_PUBLIC_UNITY_COMPRESSION || 'none';
    const noCacheFlag = process.env.NEXT_PUBLIC_UNITY_NO_CACHE === 'true';

    // Build loader config
    const loaderConfig = {
      dataUrl: `${baseUrl}/Build/game.data`,
      frameworkUrl: `${baseUrl}/Build/game.framework.js.${compression}`,
      codeUrl: `${baseUrl}/Build/game.wasm.${compression}`,
      streamingAssetsUrl: `${baseUrl}/StreamingAssets`,
      companyName: 'Livewall',
      productName: 'Campaign Game',
      productVersion: version,
      showBanner: () => {
        // Placeholder for browser compatibility warnings
      },
    };

    if (noCacheFlag) {
      const timestamp = Date.now();
      Object.keys(loaderConfig).forEach((key) => {
        if (typeof loaderConfig[key as keyof typeof loaderConfig] === 'string') {
          (loaderConfig as any)[key] += `?v=${timestamp}`;
        }
      });
    }

    // Create game container
    if (containerRef.current) {
      containerRef.current.innerHTML = '<div id="unity-container" style="width: 100%; height: 100%; position: relative;"></div>';
    }

    // Initialize via global UnityLoader (loaded from script above)
    const UnityLoader = (window as any).UnityLoader;
    if (!UnityLoader) {
      console.error('[Unity] UnityLoader not found on window');
      return;
    }

    UnityLoader.instantiate('unity-container', loaderConfig).then((instance: any) => {
      console.log('[Unity] Instance created:', instance);
      unityLoaderRef.current = { Instance: instance };

      // Send boot data to game
      sendBootData(instance, gameName);
    }).catch((error: Error) => {
      console.error('[Unity] Failed to instantiate:', error);
    });
  };

  const sendBootData = (instance: any, gameName: string) => {
    const bootData = {
      environment: process.env.NEXT_PUBLIC_ENV || 'local',
      muted: isMuted,
      translations: capeData?.translations || {},
      custom: {
        // Game-specific data injected via environment or context
      },
    };

    const dataJson = JSON.stringify(bootData);
    try {
      instance.SendMessage(gameName, 'SetData', dataJson);
      console.log('[Unity] Boot data sent to', gameName);
    } catch (error) {
      console.error('[Unity] Failed to send boot data:', error);
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full bg-black"
      style={{ overflow: 'hidden' }}
    >
      {/* Loading state */}
      {!gameIsReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-white mx-auto mb-4" />
            <p className="text-white text-sm">Loading game...</p>
          </div>
        </div>
      )}
    </div>
  );
}
