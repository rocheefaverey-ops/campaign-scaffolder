'use client';

import { useCallback, useEffect } from 'react';
import { useGameContext } from '@hooks/useGameContext';
import { useSafeNavigation } from '@hooks/useSafeNavigation';
import MemoryGame from '@components/_modules/MemoryGame/MemoryGame';

export default function GameplayPage() {
  const navigate = useSafeNavigation();
  const { setScore, setGameIsReady } = useGameContext();

  useEffect(() => {
    setGameIsReady(true);
    return () => setGameIsReady(false);
  }, [setGameIsReady]);

  const handleWin = useCallback((score: number) => {
    setScore(score);
    navigate('{{NEXT_AFTER_GAME}}');
  }, [setScore, navigate]);

  return (
    <main className="relative h-full w-full overflow-hidden bg-black">
      <MemoryGame onWin={handleWin} />
    </main>
  );
}
