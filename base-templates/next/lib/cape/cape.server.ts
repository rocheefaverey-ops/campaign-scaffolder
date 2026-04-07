import type { ICapeData } from './cape.types';
import Logger from '@lib/logger/logger';

/** In-process cache so multiple Server Components don't hammer the CDN */
let cache: { data: ICapeData; expiresAt: number } | null = null;
const TTL_MS = 5 * 60 * 1000; // 5 minutes
const TTL_ERROR_MS = 15 * 1000; // 15 seconds on failure (retry quickly)

/**
 * Server-only CAPE fetcher with in-process TTL cache.
 * Safe to call from layout.tsx, Server Components, and Server Actions.
 * Never import this in a Client Component — use useCapeData() instead.
 */
export async function getCapeDataServer(): Promise<ICapeData | null> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.data;
  }

  const baseUrl = process.env.NEXT_PUBLIC_CAPE_URL;
  const campaignId = process.env.NEXT_PUBLIC_CAPE_CAMPAIGN_ID;
  const market = (process.env.NEXT_PUBLIC_CAPE_MARKET ?? 'NL').toUpperCase();

  if (!baseUrl || !campaignId) {
    Logger.warn('getCapeDataServer: NEXT_PUBLIC_CAPE_URL or NEXT_PUBLIC_CAPE_CAMPAIGN_ID not set');
    return null;
  }

  const url = `${baseUrl}/${campaignId}_${market}.json`;

  try {
    const res = await fetch(url, {
      next: { revalidate: TTL_MS / 1000 },
    });

    if (!res.ok) {
      throw new Error(`CAPE fetch failed: ${res.status} ${res.statusText}`);
    }

    const data: ICapeData = await res.json();
    cache = { data, expiresAt: Date.now() + TTL_MS };
    return data;
  } catch (error) {
    Logger.error('getCapeDataServer error', { url, error });
    // Set a short TTL so we retry soon, but don't hammer on every request
    if (cache) cache.expiresAt = Date.now() + TTL_ERROR_MS;
    return cache?.data ?? null;
  }
}
