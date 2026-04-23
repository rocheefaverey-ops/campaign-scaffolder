'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { useCapeData } from '@hooks/useCapeData';
import { useGameContext } from '@hooks/useGameContext';
import { PhaserGameBridgeAdapter } from '@lib/game-bridge/phaser-adapter';
import Boot from '@/game/scenes/Boot';
import Load from '@/game/scenes/Load';
import Main from '@/game/scenes/Main';
import HUD from '@/game/scenes/HUD';

interface PhaserCanvasProps {
  onGameEnd: (result: Record<string, unknown>) => void;
  onReady?: () => void;
}

export default function PhaserCanvas({ onGameEnd, onReady }: PhaserCanvasProps) {
  const { capeData } = useCapeData();
  const { setGameIsReady, isMuted } = useGameContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const bridgeRef = useRef<PhaserGameBridgeAdapter | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const bridge = new PhaserGameBridgeAdapter();
    bridgeRef.current = bridge;

    // Wire bridge events
    bridge.on('end', (data) => {
      console.log('[Phaser] Game ended:', data);
      onGameEnd(data as Record<string, unknown>);
    });

    bridge.on('ready', () => {
      console.log('[Phaser] Game ready');
      setGameIsReady(true);
      onReady?.();
    });

    // Set bridge data (CAPE content, etc.)
    if (capeData) {
      bridge.setData({
        translations: capeData,
        score: 0,
      } as any);
    }

    // Create Phaser game
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 1920,
      height: 1080,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: { debug: false, gravity: { y: 0 } },
      },
      scene: [Boot, Load, Main, HUD],
      backgroundColor: '#000000',
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;
    (window as any).gameInstance = game;
    (game as any).__bridge = bridge;

    // Start the game
    bridge.startGame();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      bridge.destroy();
    };
  }, [capeData, onGameEnd, onReady, setGameIsReady]);

  // Handle mute state
  useEffect(() => {
    if (gameRef.current && bridgeRef.current) {
      const data = bridgeRef.current.getData();
      if (data) {
        (gameRef.current as any).__muted = isMuted;
      }
    }
  }, [isMuted]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ overflow: 'hidden', backgroundColor: '#000000' }}
    />
  );
}

declare global {
  interface Window {
    gameInstance?: Phaser.Game;
  }
}
