'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useSafeNavigation() {
  const router = useRouter();

  return useCallback((href: string, mode: 'push' | 'replace' = 'push') => {
    if (!href) return;

    if (/^https?:\/\//i.test(href)) {
      window.location.assign(href);
      return;
    }

    if (mode === 'replace') router.replace(href);
    else router.push(href);
  }, [router]);
}
