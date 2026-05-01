'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useCapeData } from '@hooks/useCapeData';
import { useGameContext } from '@hooks/useGameContext';
import { buildUnityTranslations } from '@lib/game-bridge/cape-translations';
import type { IGameResult, IUnityInput } from '@lib/game-bridge/game-bridge.types';

const PhaserCanvas = dynamic(
  () => import('@components/_modules/PhaserCanvas/PhaserCanvas'),
  { ssr: false },
);

export default function GameplayPage() {
  const router = useRouter();
  const { capeData, currentLanguage } = useCapeData();
  const { isMuted, onboardingCompleted, setScore } = useGameContext();

  const gameData: IUnityInput = useMemo(() => ({
    environment: (process.env.NEXT_PUBLIC_APP_ENV as IUnityInput['environment']) ?? 'local',
    muted: isMuted,
    translations: buildUnityTranslations(capeData as any, currentLanguage),
    playTutorial: !onboardingCompleted,
  }), [isMuted, onboardingCompleted, capeData, currentLanguage]);

  const handleEnd = (result: IGameResult) => {
    setScore(result.score ?? 0);
    router.push('{{NEXT_AFTER_GAME}}');
  };

  return (
    <main className="relative h-full w-full overflow-hidden">
      <PhaserCanvas
        gameData={gameData}
        onEnd={handleEnd}
        className="absolute inset-0"
      />
    </main>
  );
}
