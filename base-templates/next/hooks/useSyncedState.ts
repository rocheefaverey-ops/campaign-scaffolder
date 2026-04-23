'use client';

import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';

type SetStateAction<T> = T | ((prevState: T) => T);

/**
 * Like useState, but also gives you a ref that always holds the latest value,
 * updated synchronously whenever you set state.
 * Useful for async operations where stale closures would otherwise be a problem.
 * Supports lazy initializer (function form) just like useState.
 *
 * Returns [state, setter, ref]
 */
export function useSyncedState<T>(
  initialValue: T | (() => T),
): readonly [T, (action: SetStateAction<T>) => void, RefObject<T>] {
  const [state, setState] = useState(initialValue);
  const ref = useRef(state);

  const set = useCallback((next: SetStateAction<T>) => {
    if (typeof next === 'function') {
      setState((prev) => {
        const resolved = (next as (p: T) => T)(prev);
        ref.current = resolved;
        return resolved;
      });
      return;
    }
    ref.current = next;
    setState(next);
  }, []);

  return [state, set, ref] as const;
}
