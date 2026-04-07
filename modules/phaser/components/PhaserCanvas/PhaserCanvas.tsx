'use client';

import { useEffect, useRef } from 'react';
import { PhaserGameBridgeAdapter } from '@lib/game-bridge/phaser-adapter';
import type { IUnityInput } from '@lib/game-bridge/game-bridge.types';
import type { IGameResult } from '@lib/game-bridge/game-bridge.types';

interface Props {
  gameData: IUnityInput;
  onEnd: (result: IGameResult) => void;
  className?: string;
}

/**
 * PhaserCanvas
 *
 * Dynamically imports Phaser (client-only) and boots the game into a div.
 * The bridge adapter is attached to `game.__bridge` so Phaser scenes can
 * emit events without importing React code.
 *
 * Add your Phaser scene classes to the `scene` array in the Phaser.Game config.
 */
export default function PhaserCanvas({ gameData, onEnd, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef   = useRef<PhaserGameBridgeAdapter | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const adapter = new PhaserGameBridgeAdapter();
    adapterRef.current = adapter;

    adapter.setData(gameData);

    let game: { destroy: (removeCanvas: boolean) => void; [key: string]: unknown } | null = null;

    // Dynamic import keeps Phaser out of the server bundle
    import('phaser').then((Phaser) => {
      game = new Phaser.default.Game({
        type: Phaser.default.AUTO,
        parent: containerRef.current!,
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        // TODO: add your scene classes here
        scene: [],
      });

      // Expose adapter to Phaser scenes via game.__bridge
      (game as Record<string, unknown>).__bridge = adapter;

      // Forward Phaser game.events to the bridge adapter
      game.events?.on('end', (result: IGameResult) => adapter.emit('end', result));
      game.events?.on('start', ()                   => adapter.emit('start'));

      // React → game end
      adapter.on('end', (result: unknown) => {
        onEnd(result as IGameResult);
      });
    });

    return () => {
      adapter.destroy();
      game?.destroy(true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync muted state without remounting
  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.setData(gameData);
    }
  }, [gameData]);

  return <div ref={containerRef} className={className ?? 'absolute inset-0'} />;
}
