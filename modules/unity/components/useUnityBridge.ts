'use client';

import { useEffect } from 'react';

/**
 * useUnityBridge — sets up the React↔Unity event bridge.
 *
 * Exposes window.unityEventMap for Unity to dispatch events:
 *   window.unityEventMap.dispatchToGame('ready')
 *   window.unityEventMap.dispatchToGame('end', { score: 150, playTime: 45000 })
 */
export function useUnityBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Ensure window.unityEventMap exists (initialized in UnityCanvas)
    if (!window.unityEventMap) {
      window.unityEventMap = {
        dispatchToGame: (eventName: string, data?: unknown) => {
          console.warn(`[Unity Bridge] dispatchToGame called before initialization:`, eventName);
        },
      };
    }

    return () => {
      // Keep the event map for entire app lifetime
    };
  }, []);
}

// Extend Window interface to include unityEventMap
declare global {
  interface Window {
    unityEventMap?: {
      dispatchToGame: (eventName: string, data?: unknown) => void;
    };
  }
}
