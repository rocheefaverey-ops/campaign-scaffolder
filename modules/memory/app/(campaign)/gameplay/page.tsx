'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameContext } from '@hooks/useGameContext';
import MemoryGame from '@components/_modules/MemoryGame/MemoryGame';

export default function GameplayPage() {
  const router = useRouter();
  const { setScore, setGameIsReady } = useGameContext();

  useEffect(() => {
    setGameIsReady(true);
    return () => setGameIsReady(false);
  }, [setGameIsReady]);

  const handleWin = useCallback((score: number) => {
    setScore(score);
    router.push('{{NEXT_AFTER_GAME}}');
  }, [setScore, router]);

  return (
    <main className="relative h-full w-full overflow-hidden bg-black">
      <MemoryGame onWin={handleWin} />
    </main>
  );
}
