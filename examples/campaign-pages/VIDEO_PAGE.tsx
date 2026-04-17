'use client';

import { useRef } from 'react';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText, getCapeImage } from '@utils/getCapeData';
import Button from '@components/_core/Button/Button';

/**
 * Example Video Page
 * Displays promotional or instructional video
 */
export default function VideoPage() {
  const { capeData } = useCapeData();
  const videoRef = useRef<HTMLVideoElement>(null);

  const title = getCapeText(capeData, 'general.video.title', 'Watch this');
  const subtitle = getCapeText(capeData, 'general.video.subtitle', 'See how others won');
  const videoUrl = getCapeImage(capeData, 'general.video.url') || '/sample-video.mp4';
  const ctaLabel = getCapeText(capeData, 'general.video.ctaLabel', 'Continue');

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 px-6 py-6 text-center">
        <h1 className="text-2xl font-black text-white">{title}</h1>
        {subtitle && (
          <p className="max-w-[260px] text-xs leading-relaxed opacity-60">{subtitle}</p>
        )}
      </div>

      {/* Video */}
      <div className="no-scrollbar flex-1 overflow-hidden px-6 py-4">
        <div
          className="aspect-video w-full rounded-lg overflow-hidden bg-black/50"
          style={{ animation: 'fadeIn 0.4s ease both' }}
        >
          <video
            ref={videoRef}
            controls
            className="h-full w-full"
            poster="/video-poster.jpg"
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support HTML5 video.
          </video>
        </div>

        {/* Video description */}
        <div className="mt-4 rounded-lg bg-white/5 p-3 border border-white/10">
          <p className="text-sm leading-relaxed opacity-80">
            Learn the secrets to winning big! Watch how our top players dominated the leaderboard
            and discover strategies you can use.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-8 pt-4">
        <Button className="w-full" size="lg">
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
