'use client';

import { useRef, useState } from 'react';
import Button from '@components/_core/Button/Button';

interface Props {
  src: string;
  onEnd: () => void;
  /** Show a skip button after this many seconds (default: 3) */
  skipAfterSeconds?: number;
}

export default function VideoIntro({ src, onEnd, skipAfterSeconds = 3 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canSkip, setCanSkip] = useState(skipAfterSeconds === 0);

  const handleTimeUpdate = () => {
    if (!canSkip && videoRef.current && videoRef.current.currentTime >= skipAfterSeconds) {
      setCanSkip(true);
    }
  };

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        src={src}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
        onEnded={onEnd}
        onTimeUpdate={handleTimeUpdate}
      />

      {canSkip && (
        <div className="absolute bottom-8 right-6">
          <Button variant="ghost" size="sm" onClick={onEnd}>
            Skip →
          </Button>
        </div>
      )}
    </div>
  );
}
