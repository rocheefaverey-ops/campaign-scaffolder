'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText, getCapeImage, getCapeBoolean } from '@utils/getCapeData';
import Button from '@components/_core/Button/Button';

/**
 * Onboarding page — layout adapts to how many steps CAPE has populated:
 *
 *   0–1 populated steps  →  single-panel layout (just headline + body + CTA),
 *                           identical DNA to the landing page.
 *   2+ populated steps   →  multi-slide carousel with dot pagination, per-slide
 *                           hero image (CAPE: files.onboarding.step{N}Image),
 *                           "Continue" CTA on intermediate slides, the final
 *                           CTA (copy.onboarding.cta) on the last slide.
 *
 * A step counts as "populated" when its `step{N}Title` returns non-empty —
 * we read with a literal '' fallback (instead of the bracketed placeholder)
 * so missing CAPE keys collapse rather than render as junk.
 */
export default function OnboardingPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();

  // Always-on visuals (mirror landing)
  const bgUrl   = getCapeImage(capeData, 'general.onboarding.background')
              || getCapeImage(capeData, 'general.landing.background')
              || '/assets/hero-mobile.png';
  const logoUrl = getCapeImage(capeData, 'general.landing.logo')
              || getCapeImage(capeData, 'general.header.logo')
              || '/assets/logo-livewall-wordmark.svg';

  // Per-step CAPE content. Empty title → step is treated as not populated.
  // We probe up to 6 steps because real CAPE campaigns regularly use 4 (e.g.
  // Proximus runner / pinball / bonanza tutorials). The filter drops empties,
  // so most campaigns still render 3 — but 4-step (or 5-, 6-step) flows
  // adapt automatically.
  const steps = [1, 2, 3, 4, 5, 6].map((n) => ({
    title: getCapeText (capeData, `copy.onboarding.step${n}Title`, ''),
    body:  getCapeText (capeData, `copy.onboarding.step${n}Body`,  ''),
    image: getCapeImage(capeData, `files.onboarding.step${n}Image`),
  })).filter(s => s.title.trim().length > 0);

  const headline = getCapeText(capeData, 'copy.onboarding.headline', '[copy.onboarding.headline]');
  const subline  = getCapeText(capeData, 'copy.onboarding.subline',  '');
  const kicker   = getCapeText(capeData, 'copy.onboarding.kicker',   'How to play');
  const ctaFinal = getCapeText(capeData, 'copy.onboarding.cta',      '[copy.onboarding.cta]');
  const ctaNext  = getCapeText(capeData, 'copy.onboarding.ctaNext',  'Continue');
  const allowSkip = getCapeBoolean(capeData, 'settings.pages.onboarding.allowSkip', false);

  const [slideIdx, setSlideIdx] = useState(0);
  const isMulti     = steps.length >= 2;
  const isLastSlide = slideIdx === steps.length - 1;
  const currentStep = steps[slideIdx];

  // Per-slide image overrides the page-level bg when provided.
  const showBg       = isMulti && currentStep?.image ? currentStep.image : bgUrl;
  const showHeadline = isMulti ? currentStep.title : (steps[0]?.title || headline);
  const showBody     = isMulti ? currentStep.body  : (steps[0]?.body  || subline);
  const showCta      = isMulti && !isLastSlide ? ctaNext : ctaFinal;

  const advance = () => router.push('{{NEXT_AFTER_ONBOARDING}}');
  const onCtaClick = () => {
    if (!isMulti || isLastSlide) advance();
    else setSlideIdx(i => Math.min(i + 1, steps.length - 1));
  };

  return (
    <div className="campaign-screen campaign-screen--hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={showBg} alt="" className="campaign-hero-bleed" aria-hidden key={showBg} />
      <div className="campaign-hero-shade" aria-hidden />

      <div className="campaign-shell">
        <header className="campaign-hero-header campaign-hero-header--with-close" style={{ animation: 'fadeIn 0.4s ease both' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Logo" className="campaign-hero-logo" />
          {isMulti && (
            <button className="campaign-close" aria-label="Close" onClick={() => router.back()}>×</button>
          )}
        </header>

        <div
          key={slideIdx /* re-trigger fade on slide change */}
          className="campaign-stack campaign-hero-content"
          style={{ animation: 'fadeIn 0.32s ease both' }}
        >
          <p className="campaign-kicker">{kicker}</p>
          <h1 className="campaign-title campaign-title--compact">{showHeadline}</h1>
          {showBody && <p className="campaign-copy max-w-[28rem] text-base sm:text-lg">{showBody}</p>}
        </div>

        <div className="campaign-actions" style={{ animation: 'fadeIn 0.4s 0.18s ease both' }}>
          {isMulti && (
            <div className="campaign-pagination" role="tablist" aria-label="Onboarding progress">
              {steps.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === slideIdx}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`campaign-pagination__dot${i === slideIdx ? ' is-active' : ''}`}
                  onClick={() => setSlideIdx(i)}
                />
              ))}
            </div>
          )}
          <Button className="w-full" size="lg" onClick={onCtaClick}>
            {showCta}
          </Button>
          {allowSkip && !isLastSlide && (
            <button
              type="button"
              onClick={advance}
              className="campaign-skip"
              aria-label="Skip onboarding"
            >
              Skip →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
