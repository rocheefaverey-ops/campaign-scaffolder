'use client';

import { useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { R3FGameBridgeAdapter } from '@lib/game-bridge/r3f-adapter';
import type { IUnityInput, IGameResult } from '@lib/game-bridge/game-bridge.types';
import Scene from './Scene';

interface Props {
  gameData: IUnityInput;
  onEnd: (result: IGameResult) => void;
  className?: string;
}

export default function R3FCanvas({ gameData, onEnd, className }: Props) {
  const bridgeRef = useRef<R3FGameBridgeAdapter | null>(null);

  if (!bridgeRef.current) {
    bridgeRef.current = new R3FGameBridgeAdapter();
  }

  useEffect(() => {
    const bridge = bridgeRef.current!;
    bridge.setData(gameData);
  }, [gameData]);

  useEffect(() => {
    const bridge = bridgeRef.current!;

    const handleEnd = (result: unknown) => onEnd(result as IGameResult);
    bridge.on('end', handleEnd);
    bridge.startGame();

    return () => {
      bridge.off('end', handleEnd);
      bridge.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={className ?? 'absolute inset-0'}>
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-white text-sm tracking-widest uppercase opacity-40">Loading…</div>
        </div>
      }>
        <Canvas
          className="w-full h-full"
          camera={{ position: [0, 0, 10], fov: 70 }}
          gl={{ antialias: true }}
        >
          <Scene bridge={bridgeRef.current} gameData={gameData} />
        </Canvas>
      </Suspense>
    </div>
  );
}
