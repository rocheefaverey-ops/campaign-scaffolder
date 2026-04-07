'use client';

import { useContext, createContext } from 'react';
import type { ICapeData } from '@lib/cape/cape.types';

/**
 * CapeDataContext is populated in Providers with the server-fetched CAPE data.
 * Use useCapeData() in any Client Component to access it without re-fetching.
 */
export const CapeDataContext = createContext<ICapeData | null>(null);

export function useCapeData(): ICapeData | null {
  return useContext(CapeDataContext);
}
