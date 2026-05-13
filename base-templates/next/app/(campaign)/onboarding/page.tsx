'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { useInstanceId } from '@hooks/useInstanceId';
import { useSafeNavigation } from '@hooks/useSafeNavigation';
import { getCapeText, getCapeImage, getCapeBoolean, buildCopyResolver, buildImageResolver, isVideoUrl } from '@utils/getCapeData';
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
  const navigate     = useSafeNavigation();
  const { capeData } = useCapeData();
  const instanceId   = useInstanceId('onboarding');
  const t   = buildCopyResolver(capeData, 'onboarding', instanceId);
  const img = buildImageResolver(capeData, 'onboarding', instanceId);

  // Always-on visuals (mirror landing)
  const bgUrl   = img('background')
              || getCapeImage(capeData, `files.${instanceId}.backgroundImage`)
              || getCapeImage(capeData, `files.${instanceId}.heroImage`)
              || getCapeImage(capeData, 'general.landing.background')
              || '/assets/hero-mobile.png';
  const logoUrl = img('logo')
              || getCapeImage(capeData, 'general.landing.logo')
              || getCapeImage(capeData, 'general.header.logo')
              || '/assets/logo-livewall-wordmark.svg';

  // Default tutorial content used when the CAPE schema doesn't define
  // step{N}Title/Body fields (this campaign's cape-format.json only declares
  // kicker/headline/subline/cta for onboarding). Each entry is overridden
  // per-step by `copy.{instanceId}.step{N}Title` / `step${N}Body` once the
  // campaign manager adds those fields and populates them.
  //
  // Steps 4–6 still probe CAPE — campaigns that DO define more steps in
  // their schema (e.g. Proximus runner / pinball tutorials) keep rendering
  // them automatically.
  const DEFAULT_STEPS: Array<{ title: string; body: string }> = [
    { title: 'Welcome',           body: 'Tap the screen to start playing.' },
    { title: 'Score points',      body: 'React fast, beat the clock, rack up combos.' },
    { title: 'Top the leaderboard', body: 'Set a high score and see how you stack up.' },
  ];

  const steps = [1, 2, 3, 4, 5, 6].map((n) => {
    const dflt = DEFAULT_STEPS[n - 1];
    return {
      title: t(`step${n}Title`, dflt?.title ?? ''),
      body:  t(`step${n}Body`,  dflt?.body  ?? ''),
      image: getCapeImage(capeData, `files.${instanceId}.step${n}Image`)
          || getCapeImage(capeData, `files.onboarding.step${n}Image`),
    };
  }).filter(s => s.title.trim().length > 0);

  const headline  = t('headline', '[copy.onboarding.headline]');
  const subline   = t('subline',  '');
  const kicker    = t('kicker',   'How to play');
  const ctaFinal  = t('cta',      "Let's go");
  const ctaNext   = t('ctaNext',  'Continue');
  const allowSkip = getCapeBoolean(capeData, `settings.pages.${instanceId}.allowSkip`, false);

  const [slideIdx, setSlideIdx] = useState(0);
  // With DEFAULT_STEPS providing 3 baseline steps, isMulti is always true
  // unless someone deliberately overrides every default with empty CAPE
  // values — keep the threshold so that opt-out path still works.
  const isMulti     = steps.length >= 2;
  const isLastSlide = slideIdx === steps.length - 1;
  const currentStep = steps[slideIdx];

  // Per-slide image overrides the page-level bg when provided.
  const showBg       = isMulti && currentStep?.image ? currentStep.image : bgUrl;
  const showHeadline = isMulti ? currentStep.title : (steps[0]?.title || headline);
  const showBody     = isMulti ? currentStep.body  : (steps[0]?.body  || subline);
  const showCta      = isMulti && !isLastSlide ? ctaNext : ctaFinal;

  const advance = () => navigate('{{NEXT_AFTER_ONBOARDING}}');
  const onCtaClick = () => {
    if (!isMulti || isLastSlide) advance();
    else setSlideIdx(i => Math.min(i + 1, steps.length - 1));
  };

  return (
    <div className="campaign-screen campaign-screen--hero">
      {isVideoUrl(showBg)
        ? <video src={showBg} className="campaign-hero-bleed" autoPlay muted loop playsInline aria-hidden key={showBg} />
        // eslint-disable-next-line @next/next/no-img-element
        : <img   src={showBg} alt="" className="campaign-hero-bleed" aria-hidden key={showBg} />
      }
      <div className="campaign-hero-shade" aria-hidden />

      <div className="campaign-shell relative z-10">
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
          <Button variant={'{{BUTTON_VARIANT_ONBOARDING_NEXT}}' as any} className="w-full" size="lg" onClick={onCtaClick}>
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
