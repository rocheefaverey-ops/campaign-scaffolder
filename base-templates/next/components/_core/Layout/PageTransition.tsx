'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { gsap } from 'gsap';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Wraps page content with a GSAP fade transition on route change.
 * Place inside (campaign)/layout.tsx to scope transitions to game routes only.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
    );
  }, [pathname]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {children}
    </div>
  );
}
