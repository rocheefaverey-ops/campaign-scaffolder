'use client';

import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { useGameContext } from '@hooks/useGameContext';
import { buildUnityTranslations } from '@lib/game-bridge/cape-translations';
import UnityCanvas from '@components/_modules/UnityCanvas/UnityCanvas';
import type { IGameResult } from '@lib/game-bridge/game-bridge.types';
import type { IUnityInput } from '@lib/game-bridge/game-bridge.types';

/**
 * [module: unity] — gameplay page
 *
 * This page:
 *  1. Builds the IUnityInput data object from context + CAPE translations
 *  2. Passes it to UnityCanvas, which calls setData() before loadScene()
 *  3. Listens for the 'end' event via the onEnd prop
 *  4. Persists the result to GameContext and navigates to /result
 *
 * To add campaign-specific fields to the Unity payload (teams, config, etc.),
 * extend IUnityInput in lib/game-bridge/game-bridge.types.ts and add them here.
 */
export default function GameplayPage() {
  const router = useRouter();
  const capeData = useCapeData();
  const { isMuted, onboardingCompleted, setScore, setLoading } = useGameContext();

  const unityData: IUnityInput = {
    environment: (process.env.NEXT_PUBLIC_APP_ENV as IUnityInput['environment']) ?? 'local',
    muted: isMuted,
    translations: buildUnityTranslations(capeData, process.env.NEXT_PUBLIC_CAPE_LANGUAGE ?? 'EN'),
    playTutorial: !onboardingCompleted,
    useMockAPI: process.env.NEXT_PUBLIC_APP_ENV === 'local',
  };

  const handleReady = () => {
    // Unity is initialised — call startGame if you want auto-start,
    // or wait for a user gesture (button press) to call bridge.startGame()
  };

  const handleEnd = (result: IGameResult) => {
    setScore(result.score ?? 0);
    // TODO: call end-session action with result before navigating
    router.push('/result');
  };

  return (
    <main className="relative h-full w-full overflow-hidden">
      <UnityCanvas
        unityData={unityData}
        sceneKey="game"
        onReady={handleReady}
        onEnd={handleEnd}
        className="absolute inset-0"
      />
    </main>
  );
}
