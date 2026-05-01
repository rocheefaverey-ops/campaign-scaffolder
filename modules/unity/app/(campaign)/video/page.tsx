'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UnityContext } from '@components/_modules/unity/UnityGame';
import { useCapeData } from '@hooks/useCapeData';
import { useInstanceId } from '@hooks/useInstanceId';
import { getCapeImage } from '@utils/getCapeData';
import VideoIntro from '@components/_modules/VideoIntro/VideoIntro';

/**
 * Unity override of the engine-neutral video page.
 *
 * Same CAPE-driven contract as the base video page, but `gameReady` is wired
 * into the actual Unity 'ready' bridge event — so loadingScreen mode behaves
 * as intended (video loops until Unity finishes downloading + initialising,
 * then surfaces the skip button).
 *
 * Also kicks off Unity warm-up on mount so the WebGL bundle starts
 * downloading in parallel with video playback.
 */
export default function VideoPage() {
  const router       = useRouter();
  const unity        = useContext(UnityContext);
  const { capeData } = useCapeData();
  const warmedUp     = useRef(false);
  const [gameReady, setGameReady] = useState(false);
  const instanceId   = useInstanceId('video');

  const videoSrc =
    getCapeImage(capeData, 'general.video.introVideo')
    || getCapeImage(capeData, 'files.video.loadingVideo')
    || '/assets/intro-livewall.mp4';

  const settingsAll = (capeData as { settings?: { pages?: Record<string, { mode?: string; minPlaybackSec?: number; readyFallbackSec?: number; alwaysSkip?: boolean }> } } | null)?.settings;
  const inst = settingsAll?.pages?.[instanceId];
  const mode             = inst?.mode             ?? 'loadingScreen'; // Unity defaults to loader
  const minPlaybackSec   = inst?.minPlaybackSec   ?? 3;
  const readyFallbackSec = inst?.readyFallbackSec ?? 30; // generous for WebGL bundle
  const alwaysSkip       = inst?.alwaysSkip       ?? false;
  const isLoaderMode     = mode === 'loadingScreen';

  useEffect(() => {
    if (!videoSrc) router.replace('{{NEXT_AFTER_VIDEO}}');
  }, [router, videoSrc]);

  useEffect(() => {
    if (videoSrc) router.prefetch('{{NEXT_AFTER_VIDEO}}');
  }, [router, videoSrc]);

  // Subscribe to Unity's 'ready' event so the skip button is gated on the
  // engine actually finishing its boot sequence.
  useEffect(() => {
    if (!unity || !isLoaderMode) return;
    const onReady = () => setGameReady(true);
    unity.addEventListener('ready', onReady);
    return () => { unity.removeEventListener('ready', onReady); };
  }, [unity, isLoaderMode]);

  // Hard fallback — if Unity never reports ready (network failure, CDN issue,
  // …) we still let the user move on after readyFallbackSec.
  useEffect(() => {
    if (!isLoaderMode) return;
    const t = window.setTimeout(() => setGameReady(true), readyFallbackSec * 1000);
    return () => window.clearTimeout(t);
  }, [isLoaderMode, readyFallbackSec]);

  // Kick off Unity preload — bundle download starts in parallel with video.
  useEffect(() => {
    if (!unity || warmedUp.current) return;
    warmedUp.current = true;

    void unity.initializeUnity(true).catch(() => {
      warmedUp.current = false;
    });
  }, [unity]);

  const handleEnd = () => router.push('{{NEXT_AFTER_VIDEO}}');

  if (!videoSrc) return null;

  return (
    <main className="h-full w-full">
      <VideoIntro
        src={videoSrc}
        onEnd={handleEnd}
        skipAfterSeconds={minPlaybackSec}
        loadingScreenMode={isLoaderMode}
        gameReady={gameReady}
        alwaysSkip={alwaysSkip}
      />
    </main>
  );
}
