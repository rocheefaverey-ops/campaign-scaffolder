'use client';

import { useGameContext } from './useGameContext';
import type { Platform } from '@/types/game';

/**
 * Returns the current platform detected by middleware.
 * Convenience hook so components don't need to pull the full GameContext.
 */
export function usePlatform(): Platform {
  return useGameContext().platform;
}
