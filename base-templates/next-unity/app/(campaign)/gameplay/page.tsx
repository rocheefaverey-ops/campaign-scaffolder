'use client';

import { useCallback, useContext, useEffect, useRef, useState, useTransition } from 'react';
import { UnityContext } from '@components/_modules/unity/UnityGame';
import { useCapeData } from '@hooks/useCapeData';
import { useGameContext } from '@hooks/useGameContext';
import { useSafeNavigation } from '@hooks/useSafeNavigation';
import { buildUnityTranslations } from '@lib/game-bridge/cape-translations';
import { UnityNavigationType, UnityTrackingType } from '@lib/game-bridge/game-bridge.types';
import { getCapeText } from '@utils/getCapeData';
import type { IGameResult, IUnityNavigation, IUnityTracking } from '@lib/game-bridge/game-bridge.types';

export default function GameplayPage() {
  const ctx = useContext(UnityContext);
  const navigate = useSafeNavigation();
  const { capeData } = useCapeData();
  const { isMuted, onboardingCompleted, setScore, setOnboardingCompleted } = useGameContext();
  const [, startTransition] = useTransition();
  const [showFallback, setShowFallback] = useState(false);
  const targetScene = getCapeText(capeData, 'settings.game.sceneKey', 'Racing');

  const booted = useRef(false);
  const started = useRef(false);
  const ended = useRef(false);

  const endHandlerRef = useRef<((data: unknown) => void) | undefined>(undefined);
  endHandlerRef.current = (data: unknown) => {
    if (ended.current) return;
    ended.current = true;
    try {
      const result = JSON.parse(String(data ?? '')) as IGameResult;
      setScore(result.score ?? 0);
    } catch {
      setScore(0);
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

    return () => {
      removeEventListener('end', endListener);
      removeEventListener('navigation', navigationListener);
      removeEventListener('tracking', trackingListener);
      removeEventListener('start', startListener);
      removeEventListener('onTutorialPlayed', tutorialPlayedListener);
    };
  }, [ctx, trackingListener, startListener, tutorialPlayedListener]);

  useEffect(() => {
    if (!ctx || booted.current) return;
    booted.current = true;

    const maybeStartGame = () => {
      const startObject = process.env.NEXT_PUBLIC_UNITY_START_OBJECT ?? '';
      const startMethod = process.env.NEXT_PUBLIC_UNITY_START_METHOD ?? 'StartGame';
      if (!startObject) return;
      started.current = true;
      ctx.sendMessage(startObject, startMethod);
    };

    const wasPreloadedFromVideo = sessionStorage.getItem('unity-started-from-video') === 'true';

    if (wasPreloadedFromVideo) {
      sessionStorage.removeItem('unity-started-from-video');
      if (process.env.NEXT_PUBLIC_UNITY_START_OBJECT) {
        ctx.setUnityVisible(true);
        maybeStartGame();
      } else {
        ctx.setUnityVisible(false);
        setShowFallback(true);
      }
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
        setShowFallback(true);
      }
    });
  }, [capeData, ctx, isMuted, onboardingCompleted, startTransition, targetScene]);

  useEffect(() => {
    if (ctx?.isUnityVisible) return;
    const timeout = setTimeout(() => setShowFallback(true), 14000);
    return () => clearTimeout(timeout);
  }, [ctx?.isUnityVisible]);

  useEffect(() => {
    ctx?.setMuted(isMuted);
  }, [ctx, isMuted]);

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
