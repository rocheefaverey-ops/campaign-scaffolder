'use client';

import { useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { useGameContext } from '@hooks/useGameContext';

interface AudioPlayerProps {
  src?: string;
  volume?: number;
}

export default function AudioPlayer({
  src = '/sounds/background.mp3',
  volume = 0.45,
}: AudioPlayerProps) {
  const { isMuted } = useGameContext();
  const soundRef = useRef<Howl | null>(null);

  useEffect(() => {
    const sound = new Howl({
      src: [src],
      loop: true,
      volume,
      html5: true,
    });

    soundRef.current = sound;
    if (!isMuted) sound.play();

    return () => {
      sound.stop();
      sound.unload();
      soundRef.current = null;
    };
  }, [src, volume]);

  useEffect(() => {
    const sound = soundRef.current;
    if (!sound) return;
    sound.mute(isMuted);
    if (!isMuted && !sound.playing()) sound.play();
  }, [isMuted]);

  return null;
}
