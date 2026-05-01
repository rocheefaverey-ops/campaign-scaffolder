'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameContext } from '@hooks/useGameContext';

interface R3FCanvasProps {
  onGameEnd: (result: Record<string, unknown>) => void;
  onReady?: () => void;
}

/**
 * R3FCanvas — mounts React Three Fiber games
 *
 * Uses Three.js for 3D graphics rendered in React
 * Ideal for: interactive 3D experiences, product visualizations
 */
export default function R3FCanvas({ onGameEnd, onReady }: R3FCanvasProps) {
  const { setGameIsReady, isMuted } = useGameContext();

  const handleGameEnd = (score: number, playTime: number) => {
    onGameEnd({ score, playTime });
  };

  return (
    <Suspense
      fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-white mx-auto mb-4" />
            <p>Loading 3D game...</p>
          </div>
        </div>
      }
    >
      <Canvas
        className="absolute inset-0"
        onCreated={() => {
          setGameIsReady(true);
          onReady?.();
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 2, 5]} />
        <OrbitControls />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* Example game scene */}
        <GameScene onGameEnd={handleGameEnd} />
      </Canvas>
    </Suspense>
  );
}

/**
 * Example game scene with rotating cube and score display
 */
function GameScene({ onGameEnd }: { onGameEnd: (score: number, time: number) => void }) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const startTimeRef = React.useRef(Date.now());

  React.useEffect(() => {
    const interval = setInterval(() => {
      // Example: end game after 30 seconds
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed > 30000) {
        onGameEnd(150, elapsed);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [onGameEnd]);

  return (
    <group>
      {/* Rotating cube */}
      <mesh ref={meshRef} onClick={() => onGameEnd(100, Date.now() - startTimeRef.current)}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={'#00ff00'} />
      </mesh>

      {/* HTML overlay for UI */}
      <Html position={[-2, 2, 0]}>
        <div className="bg-black text-white p-4 rounded">
          <p>Click the cube or wait 30s to end</p>
          <p className="text-sm text-gray-400 mt-2">Press ESC to quit</p>
        </div>
      </Html>
    </group>
  );
}