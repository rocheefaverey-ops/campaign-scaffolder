'use client';

import { usePathname } from 'next/navigation';

/**
 * Resolve the current page's instance id from the URL pathname.
 *
 *   /video        → 'video'
 *   /video-intro  → 'video-intro'
 *   /landing      → 'landing'
 *
 * The wizard generates `/{instance-id}` route folders for every flow page,
 * so the first segment of the pathname is always the instance id. CAPE
 * settings live at `settings.pages.{instanceId}.*`, which means a duplicated
 * page type (e.g. two video instances) reads its OWN settings without any
 * extra wiring.
 *
 * @param fallback Returned when pathname is empty (server / pre-hydration).
 *                 Use the page's natural type id (e.g. 'video') so default
 *                 settings still apply on first paint.
 */
export function useInstanceId(fallback: string): string {
  const pathname = usePathname();
  if (!pathname) return fallback;
  const first = pathname.split('/').filter(Boolean)[0];
  return first ?? fallback;
}
