import { createFileRoute, useLoaderData, useRouter } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useTransition } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import styles from './game.module.scss';
import type {
  IUnityApiError,
  IUnityApiRequest,
  IUnityApiResponse,
  IUnityNavigation,
  IUnityTracking,
} from '~/interfaces/unity/IUnity.ts';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { useUnity } from '~/components/game/UnityContext.tsx';
import { UnityLoader } from '~/components/game/UnityLoader.tsx';
import { useUnityStore } from '~/hooks/stores/useUnityStore.ts';
import { UnityNavigationType, UnityTrackingType } from '~/utils/Constants.ts';
import { loadGameData } from '~/loaders/GameLoader.ts';
import { useTracking } from '~/hooks/useTracking.ts';
import { useApi } from '~/hooks/useApi.ts';
import { customRequest } from '~/server/api/Request.ts';
import { ApiError } from '~/server/api/ApiError.ts';

export const Route = createFileRoute('/game')({
  component: Game,
  loader: async ({ context }) => await loadGameData(context.language),
});

// TODO: Implement Unity <-> API support
function Game() {
  const { copy: sharedCopy } = useLoaderData({ from: '__root__' });
  const { copy } = Route.useLoaderData();
  const { setResult } = useUnityStore();
  const { sendMessage, setData, setTargetScene, fullBoot, startGame, addEventListener, removeEventListener, setUnityVisible, showLoader } = useUnity();
  const { trackEvent, trackPageView } = useTracking();
  const [_, startTransition] = useTransition();
  const callAPI = useApi(customRequest);
  const started = useRef<boolean>(false);
  const router = useRouter();

  // Define listeners
  const startListener = useCallback(() => {
    console.info('GAME STARTED');
  }, []);

  const endListener = useCallback((data: string) => {
    console.info('GAME ENDED', data);
    setResult(data);
    void router.navigate({ to: '/score', replace: true });
  }, []);

  const apiListener = useCallback((data: string) => {
    const { uuid, ...requestData } = JSON.parse(data) as IUnityApiRequest;

    // Attempt the request
    callAPI({ data: requestData })
      .then((response) => {
        const obj: IUnityApiResponse<unknown> = {
          success: true,
          uuid: uuid,
          data: response,
        };
        sendMessage('APIService', 'ProcessResponse', JSON.stringify(obj));
      })
      .catch((e) => {
        console.error('Request from Unity failed: ', e, requestData);

        // Send failed response to Unity
        const obj: IUnityApiResponse<IUnityApiError> = {
          success: false,
          uuid: uuid,
          data: ApiError.toSimple(e),
        };
        sendMessage('APIService', 'ProcessResponse', JSON.stringify(obj));
      });
  }, []);

  const navigationListener = useCallback((data: string) => {
    let payload: IUnityNavigation;

    // Parse payload safely
    try {
      payload = JSON.parse(data) as IUnityNavigation;
    } catch (e) {
      console.error('Failed to parse navigation payload:', e);
      return;
    }

    // Handle navigation based on type
    switch (payload.type) {
      case UnityNavigationType.INTERNAL_URL:
        if (payload.target) {
          router.navigate({ to: payload.target, replace: true });
        }
        break;
      case UnityNavigationType.EXTERNAL_URL:
        if (payload.target) {
          window.open(payload.target, '_blank');
        }
        break;
      case UnityNavigationType.TERMS:
        window.open(copy.terms, '_blank');
        break;
      default:
        console.warn('Unhandled navigation type', payload);
        break;
    }
  }, []);

  const trackingListener = useCallback((data: string) => {
    let payload: IUnityTracking;

    // Parse payload safely
    try {
      payload = JSON.parse(data) as IUnityTracking;
    } catch (e) {
      console.error('Failed to parse tracking payload:', e);
      return;
    }

    // Handle payload based on type
    switch (payload.type) {
      case UnityTrackingType.EVENT:
        trackEvent({
          event: payload.name,
          ...payload.data,
        });
        break;
      case UnityTrackingType.VIEW:
        trackPageView(payload.name, payload.data);
        break;
    }
  }, []);

  // Setup Unity game on mount
  useEffect(() => {
    addEventListener('start', startListener);
    addEventListener('end', endListener);
    addEventListener('apiRequest', apiListener);
    addEventListener('navigation', navigationListener);
    addEventListener('tracking', trackingListener);

    // Start full boot
    startTransition(async () => {
      setData({ translations: sharedCopy.game });
      setTargetScene('example'); // TODO: Replace with actual scene name
      await fullBoot();
      setUnityVisible(true);

      // Only call start once
      if (!started.current) {
        started.current = true;
        startGame();
      }
    });

    // Prefetch score route
    void router.preloadRoute({ to: '/score' });

    return () => {
      setUnityVisible(false);
      removeEventListener('start', startListener);
      removeEventListener('end', endListener);
      removeEventListener('apiRequest', apiListener);
      removeEventListener('navigation', navigationListener);
      removeEventListener('tracking', trackingListener);
    };
  }, []);

  return (
    <PageContainer className={styles.game} disableTransition>
      <AnimatePresence mode={'wait'}>
        {showLoader &&
          <motion.div key="loader" className={styles.loader} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: 'linear' }}>
            <UnityLoader />
          </motion.div>
        }
      </AnimatePresence>
    </PageContainer>
  );
}
