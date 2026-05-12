'use client';

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UnityContext } from '@components/_modules/unity/UnityGame';
import { useCapeData } from '@hooks/useCapeData';
import { useGameContext } from '@hooks/useGameContext';
import { useInstanceId } from '@hooks/useInstanceId';
import { useSafeNavigation } from '@hooks/useSafeNavigation';
import { getCapeImage, getCapeText, buildCopyResolver, buildImageResolver } from '@utils/getCapeData';
import { buildUnityTranslations } from '@lib/game-bridge/cape-translations';
import VideoIntro from '@components/_modules/VideoIntro/VideoIntro';

type VideoPageSettings = {
  skipAfterSeconds?: number;
  minPlaybackSec?: number;
};

const TEMPLATE_PAGE_ID = '{{VIDEO_PAGE_ID}}';
const TEMPLATE_NEXT_ROUTE = '{{NEXT_AFTER_VIDEO_PAGE}}';

function resolveTemplateValue(value: string, fallback: string) {
  return value.startsWith('{{') ? fallback : value;
}
function resolveCapeInstanceAlias(value: string) {
  return String(value).replace(/-([a-z0-9])/g, (_, chr) => chr.toUpperCase());
}

export default function VideoPage() {
  const router       = useRouter();
  const navigate     = useSafeNavigation();
  const unity        = useContext(UnityContext);
  const { capeData } = useCapeData();
  const { onboardingCompleted } = useGameContext();
  const routePageId  = useInstanceId('video');
  const pageId       = resolveTemplateValue(TEMPLATE_PAGE_ID, routePageId);
  const pageAliasId  = resolveCapeInstanceAlias(pageId);
  const nextRoute    = resolveTemplateValue(TEMPLATE_NEXT_ROUTE, '/landing');
  const isLoadingVideo = pageId === 'loading-video';
  const bootStarted  = useRef(false);
  const [gameReady, setGameReady] = useState(false);
  const t            = buildCopyResolver(capeData, 'video', pageId);
  const img          = buildImageResolver(capeData, 'video', pageId);

  const videoSrc =
    img('introVideo')
    || getCapeImage(capeData, `files.${pageId}.loadingVideo`)
    || getCapeImage(capeData, `files.${pageAliasId}.loadingVideo`)
    || getCapeImage(capeData, 'files.video.loadingVideo')
    || '/assets/intro-livewall.mp4';
  const logoUrl =
    img('logo')
    || getCapeImage(capeData, 'general.header.logo')
    || getCapeImage(capeData, 'settings.branding.favicon')
    || '/assets/logo-livewall-wordmark.svg';
  const loadingText = t('loadingText', 'Loading...');
  const skipLabel   = t('cta', 'Continue');
  const targetScene = getCapeText(capeData, 'settings.game.sceneKey', 'Racing');

  const pageSettingsById = (capeData as { settings?: { pages?: Record<string, VideoPageSettings> } } | null)
    ?.settings
    ?.pages
    ?.[pageId];
  const pageSettings = pageSettingsById ?? (capeData as { settings?: { pages?: Record<string, VideoPageSettings> } } | null)
    ?.settings
    ?.pages
    ?.[pageAliasId];
  const skipAfterSeconds = pageSettings?.skipAfterSeconds ?? pageSettings?.minPlaybackSec ?? 3;

  useEffect(() => {
    if (!videoSrc) navigate(nextRoute, 'replace');
  }, [navigate, nextRoute, videoSrc]);

  useEffect(() => {
    if (videoSrc) router.prefetch(nextRoute);
  }, [nextRoute, router, videoSrc]);

  useEffect(() => {
    if (!isLoadingVideo || !unity || bootStarted.current) return;
    bootStarted.current = true;

    const translations = buildUnityTranslations(
      capeData,
      process.env.NEXT_PUBLIC_CAPE_LANGUAGE ?? 'EN',
    );

    unity.setData({ translations, playTutorial: !onboardingCompleted });
    unity.setTargetScene(targetScene);

    void (async () => {
      try {
        await unity.initializeUnity(true);
        unity.sendSetScene();
        await unity.loadScene(true);
        setGameReady(true);
      } catch {
        bootStarted.current = false;
      }
    })();
  }, [capeData, isLoadingVideo, onboardingCompleted, targetScene, unity]);

  const handleContinue = useCallback(() => {
    if (isLoadingVideo && unity) {
      sessionStorage.setItem('unity-started-from-video', 'true');
      unity.setUnityVisible(true);
    }
    navigate(nextRoute);
  }, [isLoadingVideo, navigate, nextRoute, unity]);

  if (!videoSrc) return null;

  return (
    <main className="h-full w-full">
      <VideoIntro
        src={videoSrc}
        onEnd={handleContinue}
        skipAfterSeconds={skipAfterSeconds}
        skipMode={isLoadingVideo ? 'gameReady' : 'timerOrComplete'}
        gameReady={gameReady}
        logoUrl={logoUrl}
        loadingText={loadingText}
        skipLabel={skipLabel}
        progress={isLoadingVideo ? unity?.loadProgress : undefined}
        muted={unity?.isMuted ?? true}
        onMutedChange={unity?.setMuted}
      />
    </main>
  );
}
