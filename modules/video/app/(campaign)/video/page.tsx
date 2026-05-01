'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { useInstanceId } from '@hooks/useInstanceId';
import { getCapeImage } from '@utils/getCapeData';
import VideoIntro from '@components/_modules/VideoIntro/VideoIntro';

/**
 * Engine-neutral video page.
 *
 * CAPE controls behavior via `settings.pages.video`:
 *   - `mode: 'intro'`         → plays once, skip available after minPlaybackSec
 *   - `mode: 'loadingScreen'` → loops until `gameReady`, skip gated on it
 *   - `minPlaybackSec`        → minimum seconds before skip can appear
 *
 * `gameReady` for the engine-neutral page resolves to true after a fallback
 * timeout (so we never strand the user). Engine-specific modules (e.g. Unity)
 * may install their own override of this page that wires the real engine
 * "ready" event into `gameReady`.
 */
export default function VideoPage() {
  const router      = useRouter();
  const { capeData } = useCapeData();
  const [gameReady, setGameReady] = useState(false);
  // Self-identify via the URL — settings.pages.{instanceId}.* may differ
  // between video, video-intro, video-outro, … in multi-instance flows.
  const instanceId = useInstanceId('video');

  const videoSrc =
    getCapeImage(capeData, 'general.video.introVideo')
    || getCapeImage(capeData, 'files.video.loadingVideo')
    || '/assets/intro-livewall.mp4';

  // Read CAPE behavior settings (with sensible defaults), keyed by instance id.
  const settingsAll = (capeData as { settings?: { pages?: Record<string, { mode?: string; minPlaybackSec?: number; readyFallbackSec?: number; alwaysSkip?: boolean }> } } | null)?.settings;
  const inst = settingsAll?.pages?.[instanceId];
  const mode             = inst?.mode             ?? 'intro';
  const minPlaybackSec   = inst?.minPlaybackSec   ?? 3;
  const readyFallbackSec = inst?.readyFallbackSec ?? 8;
  const alwaysSkip       = inst?.alwaysSkip       ?? false;
  const isLoaderMode     = mode === 'loadingScreen';

  // No video configured — skip straight through after mount.
  useEffect(() => {
    if (!videoSrc) router.replace('{{NEXT_AFTER_VIDEO}}');
  }, [router, videoSrc]);

  // Prefetch the next route's JS chunks so the video → game transition is
  // instant once the user skips or the video ends.
  useEffect(() => {
    if (videoSrc) router.prefetch('{{NEXT_AFTER_VIDEO}}');
  }, [router, videoSrc]);

  // Fallback ready signal — without an engine-specific bridge, we can't know
  // for sure when the game is ready. After `readyFallbackSec` we flip
  // gameReady to true so loadingScreen mode degrades gracefully into normal
  // skip-after-time behavior instead of looping the video forever.
  useEffect(() => {
    if (!isLoaderMode) return;
    const t = window.setTimeout(() => setGameReady(true), readyFallbackSec * 1000);
    return () => window.clearTimeout(t);
  }, [isLoaderMode, readyFallbackSec]);

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
