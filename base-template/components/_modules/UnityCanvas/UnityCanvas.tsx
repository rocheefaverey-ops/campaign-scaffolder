'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GameBridgeContext } from '@hooks/useGameBridge';
import { UnityGameBridgeAdapter } from '@lib/game-bridge/GameBridge';
import { BRIDGE_EVENTS } from '@lib/game-bridge/game-bridge.events';
import { useGameContext } from '@hooks/useGameContext';
import UnityLoader from './UnityLoader';

declare global {
  function createUnityInstance(
    canvas: HTMLCanvasElement,
    config: UnityConfig,
    onProgress?: (progress: number) => void,
  ): Promise<Window['unityInstance']>;
}

interface UnityConfig {
  dataUrl: string;
  frameworkUrl: string;
  codeUrl: string;
  streamingAssetsUrl?: string;
  companyName?: string;
  productName?: string;
  productVersion?: string;
  devicePixelRatio?: number;
}

function buildUnityConfig(): UnityConfig {
  const base = process.env.NEXT_PUBLIC_UNITY_BASE_URL!;
  const name = process.env.NEXT_PUBLIC_UNITY_GAME_NAME!;
  const ver = process.env.NEXT_PUBLIC_UNITY_VERSION ?? '1.0.0';
  const ext =
    process.env.NEXT_PUBLIC_UNITY_COMPRESSION === 'br'
      ? '.br'
      : process.env.NEXT_PUBLIC_UNITY_COMPRESSION === 'gzip'
        ? '.gz'
        : '';

  return {
    dataUrl: `${base}/Build/${name}.data${ext}`,
    frameworkUrl: `${base}/Build/${name}.framework.js${ext}`,
    codeUrl: `${base}/Build/${name}.wasm${ext}`,
    streamingAssetsUrl: `${base}/StreamingAssets`,
    devicePixelRatio: Number(process.env.NEXT_PUBLIC_UNITY_DESKTOP_DPR ?? 1),
  };
}

interface UnityCanvasProps {
  /** Called once the engine has initialised and received SetData */
  onReady?: () => void;
  className?: string;
}

export default function UnityCanvas({ onReady, className }: UnityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<Window['unityInstance']>(null);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const { isMuted, setLoading } = useGameContext();

  const getAdapter = useCallback(
    () => new UnityGameBridgeAdapter(() => instanceRef.current ?? null),
    [],
  );

  const [adapter] = useState(getAdapter);

  useEffect(() => {
    if (!canvasRef.current) return;

    const loaderUrl = `${process.env.NEXT_PUBLIC_UNITY_BASE_URL}/Build/${process.env.NEXT_PUBLIC_UNITY_GAME_NAME}.loader.js`;

    const script = document.createElement('script');
    script.src = loaderUrl;
    script.onload = async () => {
      const config = buildUnityConfig();
      const instance = await createUnityInstance(
        canvasRef.current!,
        config,
        (p) => setProgress(Math.round(p * 100)),
      );

      instanceRef.current = instance;
      window.unityInstance = instance;

      adapter.on(BRIDGE_EVENTS.READY, () => {
        setLoaded(true);
        setLoading(false);
        onReady?.();
      });
    };

    document.body.appendChild(script);

    return () => {
      adapter.destroy();
      instanceRef.current?.Quit?.();
      document.body.removeChild(script);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync mute state to Unity whenever it changes
  useEffect(() => {
    if (!loaded) return;
    window.muted = isMuted;
  }, [isMuted, loaded]);

  return (
    <GameBridgeContext.Provider value={adapter}>
      <div className={`relative h-full w-full ${className ?? ''}`}>
        {!loaded && <UnityLoader progress={progress} />}
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ visibility: loaded ? 'visible' : 'hidden' }}
        />
      </div>
    </GameBridgeContext.Provider>
  );
}
