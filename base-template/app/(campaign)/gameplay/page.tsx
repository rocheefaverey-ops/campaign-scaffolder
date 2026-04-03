'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameContext } from '@hooks/useGameContext';

/**
 * Gameplay route.
 * Mount the game canvas here (UnityCanvas or R3FCanvas module).
 * Listen for the game result event from GameBridge, then navigate to /result.
 */
export default function GameplayPage() {
  const router = useRouter();
  const { setScore, setGameIsReady } = useGameContext();

  useEffect(() => {
    setGameIsReady(true);
    return () => setGameIsReady(false);
  }, [setGameIsReady]);

  const handleGameEnd = (score: number) => {
    setScore(score);
    router.push('/result');
  };

  return (
    <main className="relative h-full w-full">
      {/* TODO: Mount <UnityCanvas /> or <R3FCanvas /> here */}
      <div className="flex h-full items-center justify-center opacity-30">
        Game canvas placeholder
      </div>
    </main>
  );
}
