'use client';

import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText, getCapeImage } from '@utils/getCapeData';
import Button from '@components/_core/Button/Button';

/**
 * Menu overlay — navigated to when the user taps the header menu button.
 * Sits inside the (campaign) layout group so the header is hidden via
 * PAGES_WITHOUT_HEADER (add '/menu' to that list in layout.tsx to go full-bleed).
 *
 * Adjust nav items to match your campaign's page structure.
 */
export default function MenuPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();

  const logoUrl     = getCapeImage(capeData, 'general.header.logo');
  const homeLabel   = getCapeText(capeData,  'general.menu.home',      'Home');
  const resumeLabel = getCapeText(capeData,  'general.menu.resume',    'Resume game');
  const howToLabel  = getCapeText(capeData,  'general.menu.howToPlay', 'How to play');
  const termsLabel  = getCapeText(capeData,  'general.menu.terms',     'Terms & conditions');

  return (
    <div
      className="relative flex h-full flex-col items-center justify-between px-8 py-10"
      style={{ background: 'rgba(0,0,0,0.97)' }}
    >

      {/* Top row: spacer — logo — close */}
      <div
        className="flex w-full items-center justify-between"
        style={{ animation: 'fadeIn 0.3s ease both' }}
      >
        <div className="w-10" />

        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
        ) : (
          <div className="h-10" />
        )}

        <button
          className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-70"
          style={{ background: 'rgba(255,255,255,0.1)' }}
          onClick={() => router.back()}
          aria-label="Close menu"
        >
          <span className="text-xl leading-none text-white">✕</span>
        </button>
      </div>

      {/* Nav items */}
      <div
        className="flex w-full max-w-xs flex-col gap-3"
        style={{ animation: 'fadeIn 0.3s 0.05s ease both' }}
      >
        <Button className="w-full" onClick={() => router.push('/landing')}>
          {homeLabel}
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => router.push('/gameplay')}>
          {resumeLabel}
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => router.push('/onboarding')}>
          {howToLabel}
        </Button>
        <Button variant="ghost" size="sm" className="w-full" onClick={() => router.push('/terms')}>
          {termsLabel}
        </Button>
      </div>

      {/* Footer branding */}
      <div
        className="flex flex-col items-center gap-2 opacity-25"
        style={{ animation: 'fadeIn 0.3s 0.1s ease both' }}
      >
        <div className="h-px w-10 bg-white" />
        <p className="text-xs uppercase tracking-widest">Powered by Livewall</p>
      </div>
    </div>
  );
}
