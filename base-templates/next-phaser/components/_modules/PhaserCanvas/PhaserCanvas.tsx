'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { PhaserGameBridgeAdapter } from '@lib/game-bridge/phaser-adapter';
import type { IUnityInput, IGameResult } from '@lib/game-bridge/game-bridge.types';
import Boot from '@/game/scenes/Boot';
import Load from '@/game/scenes/Load';
import Main from '@/game/scenes/Main';
import HUD from '@/game/scenes/HUD';

interface Props {
  gameData: IUnityInput;
  onEnd: (result: IGameResult) => void;
  className?: string;
}

export default function PhaserCanvas({ gameData, onEnd, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef   = useRef<PhaserGameBridgeAdapter | null>(null);
  const gameRef      = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const adapter = new PhaserGameBridgeAdapter();
    adapterRef.current = adapter;
    adapter.setData(gameData);

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: '100%',
      height: '100%',
      backgroundColor: '#000000',
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false },
      },
      scene: [Boot, Load, Main, HUD],
    });

    gameRef.current = game;
    (game as unknown as Record<string, unknown>).__bridge = adapter;

    game.events.on('end',   (result: IGameResult) => adapter.emit('end', result));
    game.events.on('start', ()                     => adapter.emit('start'));

    adapter.on('end', (result: unknown) => onEnd(result as IGameResult));

    return () => {
      adapter.destroy();
      game.destroy(true);
      gameRef.current    = null;
      adapterRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    adapterRef.current?.setData(gameData);
    // Sync muted state live without restarting the game
    const g = gameRef.current;
    if (g) g.sound.mute = gameData.muted ?? false;
  }, [gameData]);

  return <div ref={containerRef} className={className ?? 'absolute inset-0'} />;
}
