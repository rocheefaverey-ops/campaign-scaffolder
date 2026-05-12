'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  onEnd: () => void;
  skipAfterSeconds?: number;
  skipMode?: 'timerOrComplete' | 'gameReady';
  gameReady?: boolean;
  logoUrl?: string;
  loadingText?: string;
  skipLabel?: string;
  progress?: number;
  muted?: boolean;
  onMutedChange?: (muted: boolean) => void;
}

export default function VideoIntro({
  src,
  onEnd,
  skipAfterSeconds = 3,
  skipMode = 'timerOrComplete',
  gameReady = false,
  logoUrl,
  loadingText = 'Loading...',
  skipLabel = 'Skip',
  progress,
  muted = true,
  onMutedChange,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [minTimeElapsed, setMinTimeElapsed] = useState(skipAfterSeconds === 0);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const isGameReadyMode = skipMode === 'gameReady';
  const canSkip = isGameReadyMode ? gameReady : minTimeElapsed || videoCompleted;

  useEffect(() => {
    setMinTimeElapsed(skipAfterSeconds === 0);
    setVideoCompleted(false);
  }, [skipAfterSeconds, src]);

  const handleTimeUpdate = () => {
    if (!minTimeElapsed && videoRef.current && videoRef.current.currentTime >= skipAfterSeconds) {
      setMinTimeElapsed(true);
    }
  };

  const handleEnd = () => {
    if (isGameReadyMode && !gameReady && videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play();
      return;
    }
    setVideoCompleted(true);
  };

  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-black">
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          src={src}
          autoPlay
          playsInline
          muted={muted}
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
          onEnded={handleEnd}
          onTimeUpdate={handleTimeUpdate}
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {logoUrl && (
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex justify-center px-4 py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="Logo"
            className="h-9 w-[122px] object-contain drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)]"
          />
        </div>
      )}

      {onMutedChange && (
        <div className="absolute right-4 top-6 z-10">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-[0_10px_28px_rgba(0,0,0,0.26)] backdrop-blur-md transition hover:bg-black/65"
            aria-label={muted ? 'Unmute video' : 'Mute video'}
            onClick={() => onMutedChange(!muted)}
          >
            {muted ? <MutedIcon /> : <SoundIcon />}
          </button>
        </div>
      )}

      {isGameReadyMode && !canSkip && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 flex w-[112px] -translate-x-1/2 flex-col items-center gap-3">
          <ProgressRing progress={progress} />
          <p className="text-center text-sm font-medium leading-[18px] text-white">
            {loadingText}
          </p>
        </div>
      )}

      {canSkip && (
        <div className="absolute bottom-8 left-1/2 z-10 w-full -translate-x-1/2 px-4">
          <button
            type="button"
            className="relative inline-flex min-h-[56px] w-full items-center justify-center rounded-full border border-white/30 bg-white/[0.16] px-10 text-base font-bold uppercase tracking-wider text-white shadow-none backdrop-blur-md transition-all duration-200 ease-out hover:bg-white/[0.24] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            onClick={() => onEnd()}
          >
            {skipLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function ProgressRing({ progress }: { progress?: number }) {
  const pct = typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : 0;
  const background = `conic-gradient(var(--color-primary) ${pct * 3.6}deg, rgba(255,255,255,0.18) 0deg)`;

  return (
    <div
      className="relative h-[72px] w-[72px] rounded-full p-[5px] shadow-[0_0_34px_rgba(0,0,0,0.35)]"
      style={{ background }}
      aria-hidden
    >
      <div className="flex h-full w-full items-center justify-center rounded-full border border-white/15 bg-black/65 text-[11px] font-bold text-white backdrop-blur-md">
        {Math.round(pct)}%
      </div>
    </div>
  );
}

function SoundIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 5a10 10 0 0 1 0 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m17 9 5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m22 9-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
