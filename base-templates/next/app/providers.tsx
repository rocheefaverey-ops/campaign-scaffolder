'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@lib/query/query-client';
import { CapeDataProvider } from '@components/providers/CapeDataProvider';
import { GameProvider } from '@contexts/GameContext';
import { type Platform } from '@/types/game';

interface ProvidersProps {
  children: React.ReactNode;
  capeData: Record<string, unknown> | null;
  platform: Platform;
  nonce: string;
}

export default function Providers({ children, capeData, platform, nonce }: ProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <CapeDataProvider initialData={capeData}>
        <GameProvider platform={platform} nonce={nonce}>
          {children}
        </GameProvider>
      </CapeDataProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
