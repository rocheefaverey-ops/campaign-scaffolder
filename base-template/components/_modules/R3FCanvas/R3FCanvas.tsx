'use client';

/**
 * [module: r3f]
 * Install dependencies before using:
 *   npm install three @react-three/fiber @react-three/drei @react-three/rapier
 *   npm install --save-dev @types/three
 */

import { Suspense, useState, useCallback } from 'react';
import { GameBridgeContext } from '@hooks/useGameBridge';
import Scene from './Scene';

// Uncomment once @react-three/fiber is installed:
// import { Canvas } from '@react-three/fiber';

interface R3FCanvasProps {
  onReady?: () => void;
  className?: string;
}

/**
 * Minimal R3F canvas stub.
 * Replace the placeholder div with <Canvas> once deps are installed.
 * The GameBridgeContext here uses a simple event-emitter adapter for R3F.
 */
export default function R3FCanvas({ onReady, className }: R3FCanvasProps) {
  // TODO: replace with R3FGameBridgeAdapter (event-emitter based)
  const [adapter] = useState(() => null as unknown as Parameters<typeof GameBridgeContext.Provider>[0]['value']);

  return (
    <GameBridgeContext.Provider value={adapter}>
      <div className={`h-full w-full ${className ?? ''}`}>
        {/* <Canvas>
          <Suspense fallback={null}>
            <Scene onReady={onReady} />
          </Suspense>
        </Canvas> */}
        <div className="flex h-full items-center justify-center text-white/30">
          R3F Canvas — install @react-three/fiber and uncomment Canvas
        </div>
      </div>
    </GameBridgeContext.Provider>
  );
}
