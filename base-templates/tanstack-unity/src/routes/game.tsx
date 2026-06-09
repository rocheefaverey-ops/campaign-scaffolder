// Unity↔frontend bridge — TanStack implementation. The CONTRACT this must honor
// (event vocabulary, ProcessResponse channel, flow) is shared with Next and
// documented at docs/GAME_BRIDGE_CONTRACT.md (enforced by
// cli/tests/game-bridge-contract.test.js). The MECHANISM here (server fns,
// start-of-page preload) is intentionally different from Next — do not unify.

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

const GAME_MOUNT_MARKER = 'lw-game-page-mounted';

function Game() {
  const { copy: sharedCopy, sceneKey } = useLoaderData({ from: '__root__' });
  const { copy } = Route.useLoaderData();
  const { setResult } = useUnityStore();
  const { sendMessage, setData, setTargetScene, fullBoot, startGame, addEventListener, removeEventListener, setUnityVisible, showLoader, isUnityVisible } = useUnity();
  const { trackEvent, trackPageView } = useTracking();
  const [_, startTransition] = useTransition();
  const callAPI = useApi(customRequest);
  const started = useRef<boolean>(false);
  // Set true when this mount is a hard refresh of the game page (mount-marker
  // effect below). Used to skip booting and recover the flow instead.
  const reloaded = useRef<boolean>(false);
  const router = useRouter();

  // Define listeners
  const startListener = useCallback(() => {
    console.info('GAME STARTED');
  }, []);

  const endListener = useCallback((data: string) => {
    console.info('GAME ENDED', data);
    setResult(data);
    void router.navigate({ to: '{{NEXT_AFTER_GAME}}' as never, replace: true });
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

  // Hard-refresh recovery via a mount marker (reliable in an SPA, unlike the
  // document navigation-type which is shared across all client routes). Cleared
  // on a clean unmount; only a hard reload leaves it set. If still set on mount,
  // this is a refresh of the game route — restart the flow from the entry.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(GAME_MOUNT_MARKER) === '1') {
        reloaded.current = true;
        sessionStorage.removeItem(GAME_MOUNT_MARKER);
        void router.navigate({ to: '/' as never, replace: true });
        return;
      }
      sessionStorage.setItem(GAME_MOUNT_MARKER, '1');
    } catch {}
    return () => { try { sessionStorage.removeItem(GAME_MOUNT_MARKER); } catch {} };
  }, []);

  // Setup Unity game on mount
  useEffect(() => {
    if (reloaded.current) return;
    addEventListener('start', startListener);
    addEventListener('end', endListener);
    addEventListener('apiRequest', apiListener);
    addEventListener('navigation', navigationListener);
    addEventListener('tracking', trackingListener);

    // loading-video is the single loading screen — it fully boots Unity and sets
    // 'unity-started-from-video'. If that flag is present, the scene is already
    // loaded: skip the boot (and its loader) and start immediately. Otherwise
    // (e.g. deep-linked straight to /game) fall back to a full boot here.
    const preloaded = (() => { try { return sessionStorage.getItem('unity-started-from-video') === 'true'; } catch { return false; } })();
    if (preloaded) { try { sessionStorage.removeItem('unity-started-from-video'); } catch {} }

    startTransition(async () => {
      if (!preloaded) {
        setData({ translations: sharedCopy.game });
        setTargetScene(sceneKey);
        await fullBoot();
      }
      setUnityVisible(true);
      // Start is fired by the "start when ready" effect below (gated on
      // !showLoader) — never here, because when preloaded the scene may still be
      // finishing (loading-video advanced on loadProgress) and an early
      // StartGame would be missed, leaving the game paused.
    });

    // Prefetch score route
    void router.preloadRoute({ to: '{{NEXT_AFTER_GAME}}' as never });

    return () => {
      setUnityVisible(false);
      removeEventListener('start', startListener);
      removeEventListener('end', endListener);
      removeEventListener('apiRequest', apiListener);
      removeEventListener('navigation', navigationListener);
      removeEventListener('tracking', trackingListener);
    };
  }, []);

  // Start when ready: fire StartGame once Unity is visible AND the scene has
  // finished loading (showLoader cleared) — never before. Fixes the "game sits
  // paused waiting to start" race when loading-video advanced on loadProgress
  // before the scene was actually ready. Idempotent via started.
  useEffect(() => {
    if (started.current || reloaded.current) return;
    if (!isUnityVisible || showLoader) return;
    started.current = true;
    startGame();
  }, [isUnityVisible, showLoader]);

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
