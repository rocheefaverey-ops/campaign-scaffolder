'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@lib/query/query-client';
import { GameProvider } from '@contexts/GameContext';
import { type ICapeData } from '@lib/cape/cape.types';
import { type Platform } from '@/types/game';
import ClientLayout from '@components/_core/Layout/ClientLayout';

interface ProvidersProps {
  children: React.ReactNode;
  capeData: ICapeData | null;
  platform: Platform;
  nonce: string;
}

/**
 * Client-side provider tree.
 * Order matters: Query → Game (depends on nothing) → ClientLayout (reads game state).
 */
export default function Providers({
  children,
  capeData,
  platform,
  nonce,
}: ProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <GameProvider capeData={capeData} platform={platform}>
        <ClientLayout nonce={nonce}>{children}</ClientLayout>
      </GameProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
