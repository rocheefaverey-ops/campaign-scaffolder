import { readFileSync } from 'fs';
import { join } from 'path';
import type { ICapeData } from './cape.types';
import Logger from '@lib/logger/logger';

/** In-process cache so multiple Server Components don't hammer the CDN */
let cache: { data: ICapeData; expiresAt: number } | null = null;
const IS_DEV = process.env.NODE_ENV === 'development';
const TTL_MS = 5 * 60 * 1000; // 5 minutes
const TTL_ERROR_MS = 15 * 1000; // 15 seconds on failure (retry quickly)

/** Load public/mock-cape.json for local dev without real CAPE credentials. */
function loadMockCapeData(): ICapeData | null {
  try {
    const raw = readFileSync(join(process.cwd(), 'public', 'mock-cape.json'), 'utf-8');
    return JSON.parse(raw) as ICapeData;
  } catch {
    Logger.warn('getCapeDataServer: CAPE_MOCK=true but public/mock-cape.json not found');
    return null;
  }
}

/**
 * Server-only CAPE fetcher with in-process TTL cache.
 * Safe to call from layout.tsx, Server Components, and Server Actions.
 * Never import this in a Client Component — use useCapeData() instead.
 *
 * In development: always fetches fresh (no-store) so CAPE edits are visible immediately.
 * In production: 5-minute in-process cache + Next.js revalidate.
 */
export async function getCapeDataServer(): Promise<ICapeData | null> {
  if (!IS_DEV && cache && Date.now() < cache.expiresAt) {
    return cache.data;
  }

  // Mock mode — skip CDN entirely, serve local stub
  if (process.env.CAPE_MOCK === 'true') {
    Logger.info('getCapeDataServer: CAPE_MOCK=true — serving mock-cape.json');
    return loadMockCapeData();
  }

  const baseUrl    = process.env.NEXT_PUBLIC_CAPE_URL;
  const campaignId = process.env.NEXT_PUBLIC_CAPE_DEFAULT_ID;
  const market     = (process.env.NEXT_PUBLIC_CAPE_DEFAULT_MARKET ?? 'NL').toUpperCase();

  if (!baseUrl || !campaignId) {
    Logger.warn('getCapeDataServer: NEXT_PUBLIC_CAPE_URL or NEXT_PUBLIC_CAPE_DEFAULT_ID not set');
    return null;
  }

  const url = `${baseUrl}/${campaignId}_${market}.json`;

  try {
    const res = await fetch(url, IS_DEV
      ? { cache: 'no-store' }
      : { next: { revalidate: TTL_MS / 1000 } },
    );

    if (!res.ok) {
      throw new Error(`CAPE fetch failed: ${res.status} ${res.statusText}`);
    }

    const data: ICapeData = await res.json();
    cache = { data, expiresAt: Date.now() + TTL_MS };
    return data;
  } catch (error) {
    Logger.error('getCapeDataServer error', { url, error });
    if (cache) cache.expiresAt = Date.now() + TTL_ERROR_MS;
    return cache?.data ?? null;
  }
}
