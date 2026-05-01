'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGameContext } from '@hooks/useGameContext';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText } from '@utils/getCapeData';

/**
 * Full-screen loading overlay.
 * Fades in/out based on GameContext.loading.
 * Mount once in the campaign layout — it overlays all routes.
 * Loading title read from CAPE at loading.title.
 */
export default function Loading() {
  const { loading } = useGameContext();
  const { capeData } = useCapeData();
  const ref = useRef<HTMLDivElement>(null);

  const loadingTitle = getCapeText(capeData, 'loading.title', 'Loading…');

  useEffect(() => {
    if (!ref.current) return;
    if (loading) {
      gsap.set(ref.current, { display: 'flex' });
      gsap.to(ref.current, { opacity: 1, duration: 0.2 });
    } else {
      gsap.to(ref.current, {
        opacity: 0,
        duration: 0.35,
        onComplete: () => {
          if (ref.current) gsap.set(ref.current, { display: 'none' });
        },
      });
    }
  }, [loading]);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-0 z-50 hidden flex-col items-center justify-center gap-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
    >
      {/* Spinner ring */}
      <div
        className="h-10 w-10 rounded-full border-[3px] animate-spin"
        style={{
          borderColor: 'rgba(255,255,255,0.15)',
          borderTopColor: 'var(--color-primary)',
        }}
      />
      {loadingTitle && (
        <p className="text-sm font-semibold uppercase tracking-widest text-white opacity-60">
          {loadingTitle}
        </p>
      )}
    </div>
  );
}
