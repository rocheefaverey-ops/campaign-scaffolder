'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeBoolean, getCapeNumber } from '@utils/getCapeData';
import { useGameContext } from '@hooks/useGameContext';
import Button from '@components/_core/Button/Button';
import GameTimer from '@components/_core/GameTimer/GameTimer';

export default function GameplayPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();
  const { setScore, setGameIsReady } = useGameContext();

  const timerEnabled = getCapeBoolean(capeData, 'settings.pages.game.timerEnabled', true);
  const timerSec     = getCapeNumber (capeData, 'settings.pages.game.timerSec',     60);

  useEffect(() => {
    setGameIsReady(true);
    return () => setGameIsReady(false);
  }, [setGameIsReady]);

  const handleGameEnd = (nextScore: number) => {
    setScore(nextScore);
    router.push('{{NEXT_AFTER_GAME}}');
  };

  // When the countdown expires we end the game with whatever score is in
  // context. Engine modules that replace this page should hook the same
  // CAPE keys but call their own engine.endGame() on expire.
  const onTimerExpire = () => handleGameEnd(0);

  return (
    <div className="campaign-screen">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(14,14,14,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(14,14,14,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {timerEnabled && timerSec > 0 && (
        <GameTimer durationSec={timerSec} onExpire={onTimerExpire} />
      )}

      <div className="campaign-shell campaign-shell--centered items-center text-center">
        <div className="campaign-panel campaign-panel--strong w-full max-w-sm p-8">
          <div className="campaign-stack items-center">
            <p className="campaign-kicker">Gameplay</p>
            <h1 className="campaign-title campaign-title--compact">Mount your game canvas here</h1>
            <p className="campaign-copy">
              Replace this placeholder with your Unity, R3F, Phaser, or custom gameplay component.
            </p>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <Button variant="secondary" size="sm" onClick={() => handleGameEnd(Math.floor(Math.random() * 10000))}>
            Simulate game end
          </Button>
        )}
      </div>
    </div>
  );
}
