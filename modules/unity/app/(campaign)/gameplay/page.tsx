'use client';

import { useCallback, useContext, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UnityContext } from '@components/_modules/unity/UnityGame';
import { useCapeData } from '@hooks/useCapeData';
import { useGameContext } from '@hooks/useGameContext';
import { buildUnityTranslations } from '@lib/game-bridge/cape-translations';
import { UnityNavigationType, UnityTrackingType } from '@lib/game-bridge/game-bridge.types';
import type { IUnityNavigation, IUnityTracking, IGameResult } from '@lib/game-bridge/game-bridge.types';

export default function GameplayPage() {
  const ctx = useContext(UnityContext);
  const router = useRouter();
  const { capeData } = useCapeData();
  const { isMuted, onboardingCompleted, setScore, setOnboardingCompleted } = useGameContext();
  const [, startTransition] = useTransition();

  const booted = useRef(false);
  const started = useRef(false);
  const ended = useRef(false);

  // ── end ───────────────────────────────────────────────────────────────────
  // Ref pattern: stable listener, always calls the latest handler.

  const endHandlerRef = useRef<((data: unknown) => void) | undefined>(undefined);
  endHandlerRef.current = (data: unknown) => {
    if (ended.current) return;
    ended.current = true;
    try {
      const result = JSON.parse(String(data ?? '')) as IGameResult;
      setScore(result.score ?? 0);
      // TODO: call your end-session server action here before navigating
    } catch {
      setScore(0);
    }
    ctx?.setUnityVisible(false);
    router.replace('/result');
  };

  const stableEndListener = useRef<(data: unknown) => void>(
    (data) => endHandlerRef.current?.(data)
  );

  // ── navigation ────────────────────────────────────────────────────────────
  // Block mid-game navigation from Unity (e.g. menu button) while playing.

  const navigationHandlerRef = useRef<((data: unknown) => void) | undefined>(undefined);
  navigationHandlerRef.current = (data: unknown) => {
    if (started.current && !ended.current) return;
    try {
      const payload = JSON.parse(String(data)) as IUnityNavigation;
      switch (payload.type) {
        case UnityNavigationType.INTERNAL_URL:
          if (payload.target) router.replace(payload.target);
          break;
        case UnityNavigationType.EXTERNAL_URL:
          if (payload.target) window.open(payload.target, '_blank', 'noopener,noreferrer');
          break;
        case UnityNavigationType.TERMS: {
          // TODO: replace with CAPE terms file URL if your campaign has one
          // e.g. const termsUrl = getCapeFile(capeData, 'files.terms');
          window.open('/terms', '_blank', 'noopener,noreferrer');
          break;
        }
      }
    } catch {
      // ignore invalid payload
    }
  };

  const stableNavigationListener = useRef<(data: unknown) => void>(
    (data) => navigationHandlerRef.current?.(data)
  );

  // ── tracking ──────────────────────────────────────────────────────────────
  // Pushes Unity analytics events into the GTM dataLayer.

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

  // ── start ─────────────────────────────────────────────────────────────────

  const startListener = useCallback(() => {
    started.current = true;
    // TODO: push a GTM game-start event here if needed
  }, []);

  // ── onTutorialPlayed ──────────────────────────────────────────────────────

  const tutorialPlayedListener = useCallback(() => {
    setOnboardingCompleted(true);
  }, [setOnboardingCompleted]);

  // ── Register all listeners as soon as ctx exists ───────────────────────────
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

  // ── Boot Unity once ctx is available ──────────────────────────────────────
  useEffect(() => {
    if (!ctx || booted.current) return;
    booted.current = true;

    const translations = buildUnityTranslations(
      capeData,
      process.env.NEXT_PUBLIC_CAPE_LANGUAGE ?? 'EN'
    );

    ctx.setData({ translations, playTutorial: !onboardingCompleted });

    startTransition(async () => {
      // TODO: call your create-session server action here before starting
      await ctx.fullBoot();
      ctx.setUnityVisible(true);
      ctx.startGame();
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);

  // ── Sync mute from GameContext into Unity ──────────────────────────────────
  useEffect(() => {
    ctx?.setMuted(isMuted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted]);

  return <div className="w-full h-full bg-black" />;
}
