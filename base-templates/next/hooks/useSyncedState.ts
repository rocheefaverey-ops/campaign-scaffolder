'use client';

import { useState, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';

/**
 * Like useState, but also returns a ref that stays in sync.
 * Use the ref inside async callbacks / timeouts where the closure over state
 * would be stale.
 *
 * Returns [state, setter, ref]
 */
export function useSyncedState<T>(
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>, React.MutableRefObject<T>] {
  const [state, _setState] = useState<T>(initialValue);
  const ref = useRef<T>(initialValue);

  const setState = useCallback<Dispatch<SetStateAction<T>>>((value) => {
    const next =
      typeof value === 'function'
        ? (value as (prev: T) => T)(ref.current)
        : value;
    ref.current = next;
    _setState(next);
  }, []);

  return [state, setState, ref];
}
