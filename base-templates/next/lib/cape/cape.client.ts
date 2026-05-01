'use client';

/**
 * Client-side CAPE helpers.
 * These are thin re-exports — the actual utilities live in cape.utils.ts
 * and work identically on server and client.
 *
 * Import cape.utils.ts directly in Server Components / Server Actions.
 * Import this file in Client Components so the 'use client' boundary is explicit.
 */
export {
  getCapeText,
  getCapeImage,
  getCapeBoolean,
  getCapeNumber,
  getCapeFont,
} from './cape.utils';

export type { ICapeData, ICapeFile } from './cape.types';
