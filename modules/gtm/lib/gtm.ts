/**
 * lib/gtm.ts
 *
 * Typed Google Tag Manager dataLayer helper.
 * Import gtmPush() anywhere on the client to fire a dataLayer event.
 *
 * Usage:
 *   gtmPush({ event: 'game_start' });
 *   gtmPush({ event: 'game_end', score: 1234, rank: 7 });
 */

type GtmEventBase = { event: string };
type GtmEvent = GtmEventBase & Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: GtmEvent[];
  }
}

export function gtmPush(payload: GtmEvent): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
}
