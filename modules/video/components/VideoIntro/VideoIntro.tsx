'use client';

import { useRef, useState } from 'react';
import Button from '@components/_core/Button/Button';

interface Props {
  src: string;
  onEnd: () => void;
  /** Show a skip button after this many seconds (default: 3). 0 = always show. */
  skipAfterSeconds?: number;
  /**
   * Loading-screen mode. When true:
   *  - Skip button appears only when BOTH `skipAfterSeconds` has elapsed
   *    AND `gameReady` is true.
   *  - When the video ends without the game being ready, it loops back to
   *    the start and keeps playing while the user waits.
   *  - A subtle "Loading…" indicator is shown until the game is ready.
   */
  loadingScreenMode?: boolean;
  gameReady?: boolean;
  /**
   * Show the skip button immediately, ignoring `skipAfterSeconds` and the
   * loading-screen wait. Useful when the video is purely optional (e.g.
   * a brand intro the user has seen before).
   */
  alwaysSkip?: boolean;
}

export default function VideoIntro({
  src,
  onEnd,
  skipAfterSeconds = 3,
  loadingScreenMode = false,
  gameReady = false,
  alwaysSkip = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [minTimeElapsed, setMinTimeElapsed] = useState(skipAfterSeconds === 0);

  const canSkip = alwaysSkip
    ? true
    : loadingScreenMode
      ? (minTimeElapsed && gameReady)
      : minTimeElapsed;

  const handleTimeUpdate = () => {
    if (!minTimeElapsed && videoRef.current && videoRef.current.currentTime >= skipAfterSeconds) {
      setMinTimeElapsed(true);
    }
  };

  const handleEnd = () => {
    if (loadingScreenMode && !gameReady && videoRef.current) {
      // Game still warming up — loop the video while we wait. We restart
      // playback rather than rely on the `loop` attribute so non-loader mode
      // keeps the natural single-shot behavior.
      videoRef.current.currentTime = 0;
      void videoRef.current.play();
      return;
    }
    onEnd();
  };

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        src={src}
        autoPlay
        playsInline
        muted
        preload="auto"
        className="h-full w-full object-cover"
        onEnded={handleEnd}
        onTimeUpdate={handleTimeUpdate}
      />

      {loadingScreenMode && !gameReady && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/80 animate-pulse">
            Loading…
          </p>
        </div>
      )}

      {canSkip && (
        <div className="absolute bottom-8 right-6">
          <Button variant="ghost" size="sm" onClick={() => onEnd()}>
            Skip →
          </Button>
        </div>
      )}
    </div>
  );
}
