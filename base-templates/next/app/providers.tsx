'use client';

import { CapeDataProvider } from '@components/providers/CapeDataProvider';
import { GameProvider } from '@contexts/GameContext';
import DesignTokenInjector from '@components/_core/DesignTokenInjector/DesignTokenInjector';
import { type Platform } from '@/types/game';

interface ProvidersProps {
  children: React.ReactNode;
  capeData: Record<string, unknown> | null;
  platform: Platform;
  nonce: string;
}

export default function Providers({ children, capeData, platform, nonce }: ProvidersProps) {
  return (
    <CapeDataProvider initialData={capeData}>
      <DesignTokenInjector capeData={capeData} />
      <GameProvider platform={platform} nonce={nonce}>
        {children}
      </GameProvider>
    </CapeDataProvider>
  );
}
