'use client';

import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText, getCapeImage } from '@utils/getCapeData';
import Button from '@components/_core/Button/Button';

export default function LandingPage() {
  const router        = useRouter();
  const { capeData }  = useCapeData();

  const bgUrl    = getCapeImage(capeData, 'general.landing.background');
  const logoUrl  = getCapeImage(capeData, 'general.landing.logo') || getCapeImage(capeData, 'general.header.logo');
  const title    = getCapeText(capeData, 'general.landing.title',    'Welcome');
  const subtitle = getCapeText(capeData, 'general.landing.subtitle', 'Are you ready to play?');
  const ctaLabel = getCapeText(capeData, 'general.landing.ctaLabel', 'Play now');

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* Background image */}
      {bgUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bgUrl} alt="" className="absolute inset-0 h-full w-full object-cover" aria-hidden />
      )}

      {/* Gradient overlay — darkens top and bottom for text legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.97) 100%)',
        }}
      />

      {/* Layout: top logo — center title — bottom CTA */}
      <div className="relative flex h-full flex-col items-center justify-between px-8 py-12">

        {/* Logo */}
        <div style={{ animation: 'fadeIn 0.5s ease both' }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
          ) : (
            <div className="h-12" />
          )}
        </div>

        {/* Hero copy */}
        <div
          className="flex flex-col items-center gap-4 text-center"
          style={{ animation: 'fadeIn 0.5s 0.15s ease both' }}
        >
          <h1 className="text-5xl font-black leading-tight text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="max-w-[260px] text-base leading-relaxed opacity-70">
              {subtitle}
            </p>
          )}
        </div>

        {/* CTA */}
        <div
          className="w-full max-w-xs"
          style={{ animation: 'fadeIn 0.5s 0.3s ease both' }}
        >
          <Button
            className="w-full"
            size="lg"
            onClick={() => router.push('{{NEXT_AFTER_LANDING}}')}
          >
            {ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
