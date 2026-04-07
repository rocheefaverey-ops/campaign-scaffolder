import type { Platform } from '@/types/game';

/**
 * Parse a User-Agent string into a Platform.
 * Used in middleware (server) and can be called client-side as a fallback.
 */
export function parsePlatform(userAgent: string): Platform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

/** Client-side platform detection via navigator (use only in Client Components) */
export function getClientPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  return parsePlatform(navigator.userAgent);
}
