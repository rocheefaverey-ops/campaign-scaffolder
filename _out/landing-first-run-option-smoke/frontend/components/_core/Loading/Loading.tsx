'use client';

import { useEffect, useRef, useState } from 'react';
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
  const { loading, setLoading } = useGameContext();
  const { capeData } = useCapeData();
  const [showSkip, setShowSkip] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadingTitle = getCapeText(capeData, 'loading.title', 'Loading…');
  const desc1 = getCapeText(capeData, 'loading.description1', '');
  const desc2 = getCapeText(capeData, 'loading.description2', '');
  const desc3 = getCapeText(capeData, 'loading.description3', '');

  useEffect(() => {
    if (!ref.current) return;
    if (loading) {
      setShowSkip(false);
      gsap.set(ref.current, { display: 'flex' });
      gsap.to(ref.current, { opacity: 1, duration: 0.2 });

      // Show skip button after 10 seconds of loading (safety valve)
      timeoutRef.current = setTimeout(() => {
        setShowSkip(true);
      }, 10000);
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      gsap.to(ref.current, {
        opacity: 0,
        duration: 0.35,
        onComplete: () => {
          if (ref.current) gsap.set(ref.current, { display: 'none' });
          setShowSkip(false);
        },
      });
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [loading]);

  const handleSkip = () => {
    setLoading(false);
  };

  return (
    <div
      ref={ref}
      className={`${showSkip ? 'pointer-events-auto' : 'pointer-events-none'} fixed inset-0 z-[110] hidden flex-col items-center justify-center gap-4`}
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      {/* Spinner ring */}
      <div
        className="h-10 w-10 rounded-full border-[3px] animate-spin"
        style={{
          borderColor: 'rgba(255,255,255,0.15)',
          borderTopColor: 'var(--color-primary)',
        }}
      />
      <div className="flex flex-col items-center gap-1 text-center px-6">
        {loadingTitle && (
          <p className="text-sm font-semibold uppercase tracking-widest text-white">
            {loadingTitle}
          </p>
        )}
        {(desc1 || desc2 || desc3) && (
          <p className="text-xs text-white/60 max-w-[200px] leading-relaxed">
            {desc1 || desc2 || desc3}
          </p>
        )}
      </div>

      {showSkip && (
        <button
          onClick={handleSkip}
          className="mt-8 px-6 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-colors animate-fadeIn"
        >
          Skip Loading
        </button>
      )}
    </div>
  );
}
