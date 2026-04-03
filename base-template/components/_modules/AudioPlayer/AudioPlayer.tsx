'use client';

import { useEffect, useRef } from 'react';
import { useGameContext } from '@hooks/useGameContext';

/**
 * [module: audio]
 * Install: npm install howler @types/howler
 * Then uncomment Howler usage below.
 */

// import { Howl } from 'howler';

interface AudioPlayerProps {
  src: string;
  loop?: boolean;
  autoPlay?: boolean;
}

export default function AudioPlayer({ src, loop = true, autoPlay = false }: AudioPlayerProps) {
  const { isMuted, setIsMuted } = useGameContext();
  // const soundRef = useRef<Howl | null>(null);

  // useEffect(() => {
  //   soundRef.current = new Howl({ src: [src], loop, volume: 0.6 });
  //   if (autoPlay && !isMuted) soundRef.current.play();
  //   return () => soundRef.current?.unload();
  // }, [src]);

  // useEffect(() => {
  //   soundRef.current?.mute(isMuted);
  // }, [isMuted]);

  return (
    <button
      onClick={() => setIsMuted(!isMuted)}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/20 hover:bg-black/60"
      aria-label={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
  );
}
