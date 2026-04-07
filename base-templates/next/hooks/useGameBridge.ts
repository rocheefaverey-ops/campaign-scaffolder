'use client';

import { createContext, useContext } from 'react';
import type { IGameBridgeAdapter } from '@lib/game-bridge/game-bridge.types';

/**
 * GameBridgeContext holds the active adapter (Unity or R3F).
 * Populated by the game module's canvas component once the engine is ready.
 */
export const GameBridgeContext = createContext<IGameBridgeAdapter | null>(null);

export function useGameBridge(): IGameBridgeAdapter {
  const ctx = useContext(GameBridgeContext);
  if (!ctx)
    throw new Error('useGameBridge must be used within a game canvas provider');
  return ctx;
}
