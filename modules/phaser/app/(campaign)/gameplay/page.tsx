'use client';

import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { useGameContext } from '@hooks/useGameContext';
import { buildUnityTranslations } from '@lib/game-bridge/cape-translations';
import PhaserCanvas from '@components/_modules/PhaserCanvas/PhaserCanvas';
import type { IGameResult, IUnityInput } from '@lib/game-bridge/game-bridge.types';

export default function GameplayPage() {
  const router = useRouter();
  const capeData = useCapeData();
  const { isMuted, onboardingCompleted, setScore } = useGameContext();

  const gameData: IUnityInput = {
    environment: (process.env.NEXT_PUBLIC_APP_ENV as IUnityInput['environment']) ?? 'local',
    muted: isMuted,
    translations: buildUnityTranslations(capeData, process.env.NEXT_PUBLIC_CAPE_LANGUAGE ?? 'EN'),
    playTutorial: !onboardingCompleted,
  };

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
