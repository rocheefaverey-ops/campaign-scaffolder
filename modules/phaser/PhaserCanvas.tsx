'use client';

import { useEffect, useRef } from 'react';
import { useCapeData } from '@hooks/useCapeData';
import { useGameContext } from '@hooks/useGameContext';

interface PhaserCanvasProps {
  onGameEnd: (result: Record<string, unknown>) => void;
  onReady?: () => void;
}

/**
 * PhaserCanvas — mounts Phaser 3/4 games
 *
 * Usage:
 * 1. Create your Phaser game with `new Phaser.Game(config)`
 * 2. Expose `window.gameInstance`
 * 3. Call `window.dispatchGameEvent('end', result)`
 */
export default function PhaserCanvas({ onGameEnd, onReady }: PhaserCanvasProps) {
  const { capeData } = useCapeData();
  const { setGameIsReady, isMuted } = useGameContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);

  // Set up event bridge
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.dispatchGameEvent = (eventName: string, data?: unknown) => {
      console.log(`[Phaser Event] ${eventName}:`, data);

      if (eventName === 'ready') {
        setGameIsReady(true);
        onReady?.();
      } else if (eventName === 'end') {
        onGameEnd(data as Record<string, unknown>);
      }
    };

    return () => {
      delete (window as any).dispatchGameEvent;
    };
  }, [setGameIsReady, onGameEnd, onReady]);

  // Load Phaser and initialize game
  useEffect(() => {
    if (!containerRef.current) return;

    // Load Phaser library
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/phaser@3.55.2/dist/phaser.js';
    script.async = true;
    script.onload = () => {
      console.log('[Phaser] Library loaded');
      initializeGame();
    };
    script.onerror = () => {
      console.error('[Phaser] Failed to load library');
    };

    document.head.appendChild(script);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }
      document.head.removeChild(script);
    };
  }, []);

  const initializeGame = () => {
    if (!containerRef.current) return;

    const Phaser = (window as any).Phaser;

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      physics: {
        default: 'arcade',
        arcade: { debug: false },
      },
      scene: {
        preload: preload,
        create: create,
        update: update,
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;
    (window as any).gameInstance = game;

    // Notify React
    window.dispatchGameEvent?.('ready');
  };

  const preload = function (this: any) {
    // Load assets here
    console.log('[Phaser] Preloading assets');
  };

  const create = function (this: any) {
    // Setup scene
    const scene = this;
    scene.add.text(100, 100, 'Phaser Game', { font: '32px Arial' });

    // Example: End game on spacebar
    this.input.keyboard.on('keydown-SPACE', () => {
      window.dispatchGameEvent?.('end', {
        score: 100,
        playTime: 30000,
      });
    });

    console.log('[Phaser] Scene created');
  };

  const update = function (this: any) {
    // Game loop - runs every frame
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ overflow: 'hidden' }}
    />
  );
}

declare global {
  interface Window {
    dispatchGameEvent?: (eventName: string, data?: unknown) => void;
    gameInstance?: any;
  }
}
