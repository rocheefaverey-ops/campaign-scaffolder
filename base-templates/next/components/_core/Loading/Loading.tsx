'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGameContext } from '@hooks/useGameContext';

/**
 * Full-screen loading overlay.
 * Fades in/out based on GameContext.loading.
 * Mount this once in the campaign layout; it overlays all game routes.
 */
export default function Loading() {
  const { loading } = useGameContext();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (loading) {
      gsap.set(ref.current, { display: 'flex' });
      gsap.to(ref.current, { opacity: 1, duration: 0.2 });
    } else {
      gsap.to(ref.current, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          if (ref.current) gsap.set(ref.current, { display: 'none' });
        },
      });
    }
  }, [loading]);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-0 z-50 hidden items-center justify-center bg-black/80"
    >
      {/* Replace with branded spinner */}
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
    </div>
  );
}
