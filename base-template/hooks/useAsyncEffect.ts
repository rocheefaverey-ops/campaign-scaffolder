'use client';

import { useEffect, type DependencyList } from 'react';

/**
 * useEffect wrapper for async functions.
 * Automatically ignores stale calls if the component unmounts or deps change
 * before the async work completes.
 */
export function useAsyncEffect(
  effect: (isCancelled: () => boolean) => Promise<void>,
  deps: DependencyList = [],
): void {
  useEffect(() => {
    let cancelled = false;
    effect(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
