import { useCallback, useEffect, useTransition } from 'react';
import { useLoaderData, useRouter } from '@tanstack/react-router';
import { useUnity } from '~/components/game/UnityContext.tsx';

export function useGameNavigation() {
  const { isBusy, loadScene, setData } = useUnity();
  const { copy } = useLoaderData({ from: '__root__' });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Preload game route
  useEffect(() => void router.preloadRoute({ to: '/game', replace: true }), []);

  // Navigation
  const navigate = useCallback(() => {
    const performNavigation = () => {
      router.navigate({ to: '/game', replace: true });
    };

    if (isBusy()) {
      performNavigation();
      return;
    }

    startTransition(async () => {
      setData({ translations: copy.game });
      await loadScene();
      performNavigation();
    });
  }, []);

  return {
    isPending,
    navigate,
  };
}
