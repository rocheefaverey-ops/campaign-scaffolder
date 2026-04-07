'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameContext } from '@hooks/useGameContext';
import Button from '@components/_core/Button/Button';

/**
 * Gameplay route — mount your game canvas here.
 *
 * Replace the placeholder div with your engine canvas:
 *   - Unity:  <UnityCanvas onGameEnd={handleGameEnd} />
 *   - R3F:    <R3FCanvas   onGameEnd={handleGameEnd} />
 *   - Phaser: <PhaserGame  onGameEnd={handleGameEnd} />
 *
 * The canvas should fill `absolute inset-0` and call handleGameEnd(score) when done.
 * This page deliberately has no header (see PAGES_WITHOUT_HEADER in layout.tsx).
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
    router.push('{{NEXT_AFTER_GAME}}');
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">

      {/* ── Canvas slot ────────────────────────────────────────────────────────
          Replace everything inside this comment with your actual canvas.
          The canvas must fill the entire space: className="absolute inset-0"
      ─────────────────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-20">
          Game canvas
        </p>
      </div>
      {/* ── End canvas slot ─────────────────────────────────────────────────── */}

      {/* Dev shortcut — visible only in development, remove before launch */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleGameEnd(Math.floor(Math.random() * 10000))}
          >
            Simulate game end (dev)
          </Button>
        </div>
      )}
    </div>
  );
}
