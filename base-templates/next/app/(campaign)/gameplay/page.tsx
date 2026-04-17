'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGameContext } from '@hooks/useGameContext';
import Button from '@components/_core/Button/Button';
import UnityCanvas from '@components/_modules/unity/UnityCanvas';

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
  const navigatingRef = useRef(false);

  useEffect(() => {
    setGameIsReady(true);
    return () => setGameIsReady(false);
  }, [setGameIsReady]);

  const handleGameEnd = useCallback((score: number) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;

    setScore(score);
    // Use setTimeout to ensure state updates complete before navigation
    setTimeout(() => {
      router.push('{{NEXT_AFTER_GAME}}');
    }, 0);
  }, [setScore, router]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">

      {/* ── Canvas slot ────────────────────────────────────────────────────────
          UnityCanvas handles:
          - Loading Unity WebGL build from CDN
          - Initializing with boot data
          - Event listening (ready, start, end, sendEvent)
          - Forwarding result to handleGameEnd()
      ─────────────────────────────────────────────────────────────────────── */}
      <UnityCanvas
        onGameEnd={handleGameEnd}
        onReady={() => console.log('Game ready')}
      />
      {/* ── End canvas slot ─────────────────────────────────────────────────── */}

      {/* Dev shortcut — visible only in development, remove before launch */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
          <Button
            variant="primary"
            size="lg"
            onClick={() => handleGameEnd(Math.floor(Math.random() * 10000))}
            className="!min-w-[200px]"
          >
            End Game (Score: Random)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleGameEnd(5000)}
          >
            End with 5000
          </Button>
          <p className="text-xs text-gray-500 mt-2">Dev Controls</p>
        </div>
      )}
    </div>
  );
}
