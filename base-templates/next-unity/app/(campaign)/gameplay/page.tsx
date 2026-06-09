'use client';

// Unity↔frontend bridge — Next implementation. The CONTRACT this must honor
// (event vocabulary, ProcessResponse channel, flow) is shared with TanStack and
// documented at docs/GAME_BRIDGE_CONTRACT.md (enforced by
// cli/tests/game-bridge-contract.test.js). The MECHANISM here (Server Actions,
// on-demand boot) is intentionally different from TanStack — do not unify.

import { useCallback, useContext, useEffect, useRef, useState, useTransition } from 'react';
import { UnityContext } from '@components/_modules/unity/UnityGame';
import { useCapeData } from '@hooks/useCapeData';
import { useGameContext } from '@hooks/useGameContext';
import { useSafeNavigation } from '@hooks/useSafeNavigation';
import { buildUnityTranslations } from '@lib/game-bridge/cape-translations';
import { UnityNavigationType, UnityTrackingType } from '@lib/game-bridge/game-bridge.types';
import { getCapeText } from '@utils/getCapeData';
import { unityApiRequest } from '@/app/actions/unity-api-request/action';
import type { IGameResult, IUnityApiRequest, IUnityApiResponse, IUnityNavigation, IUnityTracking } from '@lib/game-bridge/game-bridge.types';

function readScore(payload: IGameResult): number {
  const record = payload as Record<string, unknown>;
  const value = record.score ?? record.highScore ?? record.highscore ?? record.points ?? 0;
  const score = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(score) ? score : 0;
}

/** Flatten the game-end payload to primitive stat values for the result table. */
function readStats(payload: IGameResult): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (typeof value === 'number' || typeof value === 'string') out[key] = value;
  }
  return out;
}

const GAME_MOUNT_MARKER = 'lw-game-page-mounted';

export default function GameplayPage() {
  const ctx = useContext(UnityContext);
  const navigate = useSafeNavigation();
  const { capeData } = useCapeData();
  const { isMuted, onboardingCompleted, setScore, setGameResult, setOnboardingCompleted } = useGameContext();
  const [, startTransition] = useTransition();
  const [showFallback, setShowFallback] = useState(false);
  const targetScene = getCapeText(capeData, 'settings.game.sceneKey', 'Racing');
  // Set true when this mount is a hard refresh of the game page (see the mount-
  // marker effect). Used to skip booting and recover the flow instead.
  const reloaded = useRef(false);

  const booted = useRef(false);
  const started = useRef(false);
  const ended = useRef(false);

  // Hard-refresh recovery via a mount marker (reliable in an SPA, unlike the
  // document navigation-type which is shared across all client routes). On a
  // clean client navigation the marker is cleared on unmount; only a hard reload
  // leaves it set. If it's still set when we mount, this is a refresh of the game
  // page — restart the flow from the entry instead of showing a frozen canvas.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(GAME_MOUNT_MARKER) === '1') {
        reloaded.current = true;
        sessionStorage.removeItem(GAME_MOUNT_MARKER);
        navigate('/', 'replace');
        return;
      }
      sessionStorage.setItem(GAME_MOUNT_MARKER, '1');
    } catch {}
    return () => { try { sessionStorage.removeItem(GAME_MOUNT_MARKER); } catch {} };
  }, [navigate]);

  const endHandlerRef = useRef<((data: unknown) => void) | undefined>(undefined);
  endHandlerRef.current = (data: unknown) => {
    if (ended.current) return;
    ended.current = true;
    try {
      const result = JSON.parse(String(data ?? '')) as IGameResult;
      setScore(readScore(result));
      setGameResult(readStats(result));
    } catch {
      setScore(0);
      setGameResult(null);
    }
    ctx?.setUnityVisible(false);
    navigate('/result', 'replace');
  };

  const stableEndListener = useRef<(data: unknown) => void>(
    (data) => endHandlerRef.current?.(data)
  );

  const navigationHandlerRef = useRef<((data: unknown) => void) | undefined>(undefined);
  navigationHandlerRef.current = (data: unknown) => {
    if (started.current && !ended.current) return;
    try {
      const payload = JSON.parse(String(data)) as IUnityNavigation;
      switch (payload.type) {
        case UnityNavigationType.INTERNAL_URL:
          if (payload.target) navigate(payload.target, 'replace');
          break;
        case UnityNavigationType.EXTERNAL_URL:
          if (payload.target) window.open(payload.target, '_blank', 'noopener,noreferrer');
          break;
        case UnityNavigationType.TERMS:
          window.open('/terms', '_blank', 'noopener,noreferrer');
          break;
      }
    } catch {
      // ignore invalid payload
    }
  };

  const stableNavigationListener = useRef<(data: unknown) => void>(
    (data) => navigationHandlerRef.current?.(data)
  );

  const trackingListener = useCallback((data: unknown) => {
    try {
      const payload = JSON.parse(String(data)) as IUnityTracking;
      const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer;
      if (!dataLayer) return;
      if (payload.type === UnityTrackingType.EVENT) {
        dataLayer.push({ event: payload.name, ...payload.data });
      } else {
        dataLayer.push({ event: 'pageview', pageName: payload.name, ...payload.data });
      }
    } catch {
      // ignore invalid payload
    }
  }, []);

  const startListener = useCallback(() => {
    started.current = true;
  }, []);

  const tutorialPlayedListener = useCallback(() => {
    setOnboardingCompleted(true);
  }, [setOnboardingCompleted]);

  // Unity proxies an HTTP request through the frontend (the `apiRequest` bridge):
  // forward {method, path, data} to the campaign backend, then echo the result
  // back to the game on APIService.ProcessResponse, keyed by the request uuid.
  const apiListener = useCallback((data: unknown) => {
    let uuid = '';
    try {
      const { uuid: id, ...requestData } = JSON.parse(String(data)) as IUnityApiRequest;
      uuid = id;
      void unityApiRequest(requestData)
        .then((result) => {
          const response: IUnityApiResponse<unknown> = { success: result.success, uuid, data: result.data };
          ctx?.sendMessage('APIService', 'ProcessResponse', JSON.stringify(response));
        })
        .catch((error) => {
          console.error('[gameplay] Unity apiRequest failed:', error);
          const response: IUnityApiResponse<unknown> = { success: false, uuid, data: { message: String(error) } };
          ctx?.sendMessage('APIService', 'ProcessResponse', JSON.stringify(response));
        });
    } catch {
      // ignore invalid payload (cannot respond without a uuid)
    }
  }, [ctx]);

  useEffect(() => {
    if (!ctx) return;
    const { addEventListener, removeEventListener } = ctx;
    const endListener = stableEndListener.current;
    const navigationListener = stableNavigationListener.current;

    addEventListener('end', endListener);
    addEventListener('navigation', navigationListener);
    addEventListener('tracking', trackingListener);
    addEventListener('start', startListener);
    addEventListener('onTutorialPlayed', tutorialPlayedListener);
    addEventListener('apiRequest', apiListener);

    return () => {
      removeEventListener('end', endListener);
      removeEventListener('navigation', navigationListener);
      removeEventListener('tracking', trackingListener);
      removeEventListener('start', startListener);
      removeEventListener('onTutorialPlayed', tutorialPlayedListener);
      removeEventListener('apiRequest', apiListener);
    };
  }, [ctx, trackingListener, startListener, tutorialPlayedListener, apiListener]);

  useEffect(() => {
    if (reloaded.current || !ctx || booted.current) return;
    booted.current = true;

    const maybeStartGame = () => {
      const startObject = process.env.NEXT_PUBLIC_UNITY_START_OBJECT ?? 'GameService';
      const startMethod = process.env.NEXT_PUBLIC_UNITY_START_METHOD ?? 'StartGame';
      if (!startObject) return;
      started.current = true;
      ctx.sendMessage(startObject, startMethod);
    };

    const wasPreloadedFromVideo = sessionStorage.getItem('unity-started-from-video') === 'true';

    if (wasPreloadedFromVideo) {
      sessionStorage.removeItem('unity-started-from-video');
      setShowFallback(false);
      ctx.setUnityVisible(true);
      // Do NOT start immediately — loading-video may have advanced on
      // loadProgress before the scene was actually ready. The "start when ready"
      // effect below fires StartGame once showLoader clears, so the game never
      // sits paused waiting for a start signal it received too early.
      return;
    }

    const translations = buildUnityTranslations(
      capeData,
      process.env.NEXT_PUBLIC_CAPE_LANGUAGE ?? 'EN'
    );

    ctx.setData({ translations, playTutorial: !onboardingCompleted });

    startTransition(async () => {
      try {
        if (process.env.NEXT_PUBLIC_UNITY_BOOT_SEQUENCE === 'single-message') {
          const bootObject = process.env.NEXT_PUBLIC_UNITY_BOOT_OBJECT ?? 'Manager';
          const bootMethod = process.env.NEXT_PUBLIC_UNITY_BOOT_METHOD ?? 'LoadScene';
          await ctx.initializeUnity(true, false);
          const showOnReady = () => {
            ctx.removeEventListener('ready', showOnReady);
            ctx.setUnityVisible(true);
            maybeStartGame();
          };
          ctx.addEventListener('ready', showOnReady);
          ctx.sendMessage(bootObject, bootMethod, JSON.stringify({
            environment: process.env.NEXT_PUBLIC_ENV ?? 'production',
            muted: isMuted,
            translations,
            files: {},
            lives: 3,
          }));
          return;
        }

        ctx.setTargetScene(targetScene);
        await ctx.initializeUnity(true, false);
        ctx.sendSetScene();
        await new Promise<void>((resolve) => setTimeout(resolve, 1000));
        ctx.sendMessage('WebService', 'LoadScene');
        await Promise.race([
          ctx.waitForSceneLoad(),
          new Promise<void>((resolve) => setTimeout(resolve, 8000)),
        ]);
        ctx.setUnityVisible(true);
        maybeStartGame();
      } catch (error) {
        console.warn('[gameplay] Unity boot failed.', error);
        ctx.setUnityVisible(false);
        ctx.setMuted(true);
        ctx.sendMessage('PauseService', 'PauseGame', 1);
        setShowFallback(true);
      }
    });
  }, [capeData, ctx, isMuted, onboardingCompleted, startTransition, targetScene]);

  // Start when ready: fire StartGame once the engine is visible AND the scene
  // has finished loading (showLoader cleared) — never before. This fixes the
  // "game sits paused waiting to start" race when loading-video advanced on
  // loadProgress before the scene was actually ready. Idempotent via started.
  useEffect(() => {
    if (!ctx || started.current || reloaded.current) return;
    if (!ctx.isUnityVisible || ctx.showLoader) return;
    const startObject = process.env.NEXT_PUBLIC_UNITY_START_OBJECT ?? 'GameService';
    const startMethod = process.env.NEXT_PUBLIC_UNITY_START_METHOD ?? 'StartGame';
    if (!startObject) return;
    started.current = true;
    ctx.sendMessage(startObject, startMethod);
  }, [ctx, ctx?.isUnityVisible, ctx?.showLoader]);

  useEffect(() => {
    if (ctx?.isUnityVisible) return;
    const timeout = setTimeout(() => setShowFallback(true), 14000);
    return () => clearTimeout(timeout);
  }, [ctx?.isUnityVisible]);

  useEffect(() => {
    ctx?.setMuted(isMuted);
  }, [ctx, isMuted]);

  useEffect(() => {
    if (!showFallback || !ctx) return;
    ctx.setMuted(true);
    ctx.sendMessage('PauseService', 'PauseGame', 1);
  }, [ctx, showFallback]);

  const simulateEnd = () => {
    setScore(Math.floor(Math.random() * 200000));
    navigate('/result', 'replace');
  };

  return (
    <>
      <div className="pointer-events-none h-full w-full" />
      {showFallback && !ctx?.isUnityVisible && (
        <div className="campaign-game-fallback">
          <video
            className="campaign-game-fallback__media"
            src="/assets/livewall-background-mobile.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="campaign-game-fallback__shade" aria-hidden />
          <div className="campaign-game-fallback__panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/livewall-animated-logo.webp" alt="" className="campaign-game-fallback__logo" />
            <p className="campaign-game-fallback__eyebrow">Demo mode</p>
            <h1 className="campaign-game-fallback__title">Game preview</h1>
            <p className="campaign-game-fallback__copy">
              Unity did not finish booting in this browser session. Continue the campaign flow with a simulated score.
            </p>
            <button type="button" onClick={simulateEnd} className="campaign-game-fallback__primary">
              Simulate game end
            </button>
            <button type="button" onClick={() => navigate('/menu', 'replace')} className="campaign-game-fallback__secondary">
              Open menu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
