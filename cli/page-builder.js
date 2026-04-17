/**
 * cli/page-builder.js
 *
 * Page builder for the Livewall Campaign Scaffolder.
 *
 * Defines available elements per page type and generates
 * complete TypeScript page components from user selections.
 *
 * Usage:
 *   import { PAGE_ELEMENTS, buildPage } from './page-builder.js';
 *
 *   const elements = ['hero-bg', 'logo', 'title', 'subtitle', 'cta-primary'];
 *   const code = buildPage('landing', elements, { nextRoute: '/onboarding' });
 */

// ─── Element catalogue ────────────────────────────────────────────────────────
// Each entry: { id, label, description, pages[] }

export const ELEMENT_CATALOGUE = {
  // ── Shared ──────────────────────────────────────────────────────────────
  'hero-bg': {
    label: 'Hero background image',
    description: 'Full-bleed image from CAPE with gradient overlay',
    pages: ['landing', 'onboarding', 'result'],
  },
  'logo': {
    label: 'Logo',
    description: 'Brand logo from CAPE branding',
    pages: ['landing', 'menu'],
  },
  'title': {
    label: 'Title / headline',
    description: 'Large heading text from CAPE copy',
    pages: ['landing', 'onboarding', 'result', 'menu'],
  },
  'subtitle': {
    label: 'Subtitle / tagline',
    description: 'Supporting text below the headline',
    pages: ['landing', 'onboarding', 'result'],
  },
  'cta-primary': {
    label: 'Primary CTA button',
    description: 'Main call-to-action (e.g. Play now, Continue)',
    pages: ['landing', 'onboarding', 'result', 'menu'],
  },
  'cta-secondary': {
    label: 'Secondary button',
    description: 'Secondary action (ghost/outlined style)',
    pages: ['landing', 'result', 'menu'],
  },
  // ── Landing ─────────────────────────────────────────────────────────────
  'countdown': {
    label: 'Countdown timer',
    description: 'Live countdown to a campaign start/end date',
    pages: ['landing'],
  },
  'partners': {
    label: 'Partner / sponsor logos',
    description: 'Row of partner logo images from CAPE',
    pages: ['landing'],
  },
  // ── Onboarding ──────────────────────────────────────────────────────────
  'step-list': {
    label: 'How-to-play steps',
    description: 'Numbered instruction cards (configurable count)',
    pages: ['onboarding'],
  },
  'hero-image': {
    label: 'Inline hero image',
    description: 'Illustration / product image from CAPE',
    pages: ['onboarding'],
  },
  // ── Result ──────────────────────────────────────────────────────────────
  'score-display': {
    label: 'Score display',
    description: 'Large score number with label',
    pages: ['result'],
  },
  'rank-badge': {
    label: 'Rank badge',
    description: 'Shows current leaderboard rank (if known)',
    pages: ['result'],
  },
  'stats-grid': {
    label: 'Stats grid',
    description: 'Key/value rows — time, accuracy, combos, etc.',
    pages: ['result'],
  },
  'share-button': {
    label: 'Share button',
    description: 'Native share sheet via Web Share API',
    pages: ['result'],
  },
  // ── Menu ────────────────────────────────────────────────────────────────
  'nav-items': {
    label: 'Navigation items',
    description: 'Vertical stack of nav buttons',
    pages: ['menu'],
  },
  'branding-footer': {
    label: 'Branding footer',
    description: '"Powered by Livewall" footer strip',
    pages: ['menu'],
  },
};

// Default element selections per page type
export const PAGE_DEFAULTS = {
  landing:    ['hero-bg', 'logo', 'title', 'subtitle', 'cta-primary'],
  onboarding: ['title', 'subtitle', 'step-list', 'cta-primary'],
  gameplay:   [],  // no builder — always full canvas
  result:     ['hero-bg', 'title', 'score-display', 'rank-badge', 'cta-primary', 'cta-secondary'],
  menu:       ['logo', 'nav-items', 'cta-secondary', 'branding-footer'],
};

// Available elements per page (ordered as they appear top→bottom)
export const PAGE_ELEMENTS = {
  landing:    ['hero-bg', 'logo', 'title', 'subtitle', 'cta-primary', 'cta-secondary', 'countdown', 'partners'],
  onboarding: ['hero-bg', 'title', 'subtitle', 'hero-image', 'step-list', 'cta-primary'],
  gameplay:   [],
  result:     ['hero-bg', 'title', 'subtitle', 'score-display', 'rank-badge', 'stats-grid', 'cta-primary', 'cta-secondary', 'share-button'],
  menu:       ['logo', 'nav-items', 'cta-secondary', 'branding-footer'],
};

// ─── Code generators ──────────────────────────────────────────────────────────

function imports(extras = []) {
  const base = [
    `import { useRouter } from 'next/navigation';`,
    `import { useCapeData } from '@hooks/useCapeData';`,
    `import { getCapeText, getCapeImage } from '@utils/getCapeData';`,
    `import Button from '@components/_core/Button/Button';`,
  ];
  return [...base, ...extras].join('\n');
}

// ─── Landing page ─────────────────────────────────────────────────────────────
function buildLanding(els, opts) {
  const hasBg        = els.includes('hero-bg');
  const hasLogo      = els.includes('logo');
  const hasTitle     = els.includes('title');
  const hasSubtitle  = els.includes('subtitle');
  const hasCta       = els.includes('cta-primary');
  const hasCtaSec    = els.includes('cta-secondary');
  const hasCountdown = els.includes('countdown');
  const hasPartners  = els.includes('partners');

  const capeLines = [
    hasBg       && `  const bgUrl     = getCapeImage(capeData, 'general.landing.background');`,
    hasLogo     && `  const logoUrl   = getCapeImage(capeData, 'general.landing.logo') || getCapeImage(capeData, 'general.header.logo');`,
    hasTitle    && `  const title     = getCapeText(capeData, 'general.landing.title',    'Welcome');`,
    hasSubtitle && `  const subtitle  = getCapeText(capeData, 'general.landing.subtitle', 'Are you ready to play?');`,
    hasCta      && `  const ctaLabel  = getCapeText(capeData, 'general.landing.ctaLabel', 'Play now');`,
    hasCtaSec   && `  const ctaLabel2 = getCapeText(capeData, 'general.landing.ctaLabel2', 'How to play');`,
  ].filter(Boolean).join('\n');

  const bgBlock = hasBg ? `
      {/* Background image */}
      {bgUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bgUrl} alt="" className="absolute inset-0 h-full w-full object-cover" aria-hidden />
      )}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.97) 100%)' }}
      />` : '';

  const logoBlock = hasLogo ? `
          {/* Logo */}
          <div style={{ animation: 'fadeIn 0.5s ease both' }}>
            {logoUrl
              ? <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain" /> // eslint-disable-line @next/next/no-img-element
              : <div className="h-12" />}
          </div>` : '<div />';

  const countdownBlock = hasCountdown ? `
          {/* Countdown — replace CAMPAIGN_END_DATE with real ISO date */}
          <Countdown targetDate={getCapeText(capeData, 'general.landing.endDate', '')} />` : '';

  const middleBlock = (hasTitle || hasSubtitle || hasCountdown) ? `
          {/* Hero copy */}
          <div className="flex flex-col items-center gap-4 text-center" style={{ animation: 'fadeIn 0.5s 0.15s ease both' }}>
            ${hasTitle    ? `<h1 className="text-5xl font-black leading-tight text-white">{title}</h1>` : ''}
            ${hasSubtitle ? `{subtitle && <p className="max-w-[260px] text-base leading-relaxed opacity-70">{subtitle}</p>}` : ''}
            ${countdownBlock}
          </div>` : '<div />';

  const partnersBlock = hasPartners ? `
          {/* Partner logos — add one img per partner using CAPE image keys */}
          {/* e.g. <img src={getCapeImage(capeData, 'general.landing.partner1')} alt="" className="h-8 w-auto object-contain" /> */}
          <div className="flex flex-wrap items-center justify-center gap-4 opacity-60">
          </div>` : '';

  const ctaBlock = (hasCta || hasCtaSec || hasPartners) ? `
          {/* CTAs */}
          <div className="flex w-full flex-col gap-3" style={{ animation: 'fadeIn 0.5s 0.3s ease both' }}>
            ${hasCta    ? `<Button fullWidth size="lg" onClick={() => router.push('${opts.nextRoute}')}>{ctaLabel}</Button>` : ''}
            ${hasCtaSec ? `<Button fullWidth variant="secondary" size="lg" onClick={() => router.push('/onboarding')}>{ctaLabel2}</Button>` : ''}
            ${partnersBlock}
          </div>` : '<div />';

  return `'use client';

${imports()}

export default function LandingPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();

${capeLines}

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      ${bgBlock}

      <div
        className="relative flex h-full flex-col items-center justify-between px-6"
        style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))', paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}
      >
        ${logoBlock}
        ${middleBlock}
        ${ctaBlock}
      </div>
    </div>
  );
}
`;
}

// ─── Onboarding page ──────────────────────────────────────────────────────────
function buildOnboarding(els, opts) {
  const hasTitle     = els.includes('title');
  const hasSubtitle  = els.includes('subtitle');
  const hasBg        = els.includes('hero-bg');
  const hasHeroImg   = els.includes('hero-image');
  const hasSteps     = els.includes('step-list');
  const hasCta       = els.includes('cta-primary');

  const stepCount = opts.stepCount ?? 3;

  const capeLines = [
    hasTitle    && `  const title    = getCapeText(capeData, 'general.onboarding.title',    'How to play');`,
    hasSubtitle && `  const subtitle = getCapeText(capeData, 'general.onboarding.subtitle', '');`,
    hasHeroImg  && `  const heroUrl  = getCapeImage(capeData, 'general.onboarding.heroImage');`,
    hasBg       && `  const bgUrl    = getCapeImage(capeData, 'general.onboarding.background');`,
    hasCta      && `  const ctaLabel = getCapeText(capeData, 'general.onboarding.ctaLabel', "Let's go");`,
    hasSteps    && `
  const steps = [${Array.from({ length: stepCount }, (_, i) => `
    { title: getCapeText(capeData, 'general.onboarding.step${i+1}Title', 'Step ${i+1}'), body: getCapeText(capeData, 'general.onboarding.step${i+1}Body', 'Replace with instruction from CAPE.') }`).join(',')}
  ];`,
  ].filter(Boolean).join('\n');

  const bgBlock = hasBg ? `
      {bgUrl && <img src={bgUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" aria-hidden />} // eslint-disable-line @next/next/no-img-element` : '';

  const headingBlock = (hasTitle || hasSubtitle) ? `
          <div className="mb-8 flex flex-col items-center gap-2 text-center" style={{ animation: 'fadeIn 0.4s ease both' }}>
            ${hasTitle    ? `<h1 className="text-3xl font-black text-white">{title}</h1>` : ''}
            ${hasSubtitle ? `{subtitle && <p className="max-w-[260px] text-sm leading-relaxed opacity-60">{subtitle}</p>}` : ''}
          </div>` : '';

  const heroImgBlock = hasHeroImg ? `
          {heroUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroUrl} alt="" className="mb-6 h-40 w-auto object-contain" />
          )}` : '';

  const stepsBlock = hasSteps ? `
          <div className="flex flex-col gap-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.06)', animation: \`fadeIn 0.4s \${0.1 + i * 0.08}s ease both\` }}>
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'var(--color-primary)' }}>{i + 1}</span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-white">{step.title}</p>
                  <p className="text-sm leading-relaxed opacity-60">{step.body}</p>
                </div>
              </div>
            ))}
          </div>` : '';

  const ctaBlock = hasCta ? `
      <div
        className="px-6 pt-4"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))', animation: 'fadeIn 0.4s 0.4s ease both' }}
      >
        <Button fullWidth size="lg" onClick={() => router.push('${opts.nextRoute}')}>{ctaLabel}</Button>
      </div>` : '';

  return `'use client';

${imports()}

export default function OnboardingPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();

${capeLines}

  return (
    <div className="relative flex h-full flex-col">
      ${bgBlock}
      <div className="no-scrollbar relative flex-1 overflow-y-auto px-6 pb-4 pt-8">
        ${headingBlock}
        ${heroImgBlock}
        ${stepsBlock}
      </div>
      ${ctaBlock}
    </div>
  );
}
`;
}

// ─── Result page ──────────────────────────────────────────────────────────────
function buildResult(els, opts) {
  const hasBg      = els.includes('hero-bg');
  const hasTitle   = els.includes('title');
  const hasScore   = els.includes('score-display');
  const hasRank    = els.includes('rank-badge');
  const hasStats   = els.includes('stats-grid');
  const hasCta     = els.includes('cta-primary');
  const hasCtaSec  = els.includes('cta-secondary');
  const hasShare   = els.includes('share-button');

  const capeLines = [
    hasBg    && `  const bgUrl      = getCapeImage(capeData, 'general.result.background');`,
    hasTitle && `  const title      = getCapeText(capeData,  'general.result.title',      'Game over');`,
    hasScore && `  const scoreLabel = getCapeText(capeData,  'general.result.scoreLabel', 'Your score');`,
    hasRank  && `  const rankLabel  = getCapeText(capeData,  'general.result.rankLabel',  'Your rank');`,
    hasCta   && `  const ctaLabel   = getCapeText(capeData,  'general.result.ctaLabel',   'Continue');`,
    hasCtaSec&& `  const retryLabel = getCapeText(capeData,  'general.result.retryLabel', 'Play again');`,
  ].filter(Boolean).join('\n');

  const gameCtx = (hasScore || hasRank) ? `  const { score, rank, userName } = useGameContext();` : '';

  const bgBlock = hasBg ? `
      {bgUrl && <img src={bgUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" aria-hidden />} {/* eslint-disable-line @next/next/no-img-element */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.75) 100%)' }} />` : '';

  const titleBlock = hasTitle ? `
          <div className="flex flex-col items-center gap-1 text-center" style={{ animation: 'fadeIn 0.4s ease both' }}>
            <p className="text-sm font-semibold uppercase tracking-widest opacity-50">{title}</p>
            {userName && <p className="text-lg font-bold opacity-80">{userName}</p>}
          </div>` : '<div />';

  const scoreBlock = hasScore ? `<div className="flex flex-col items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-50">{scoreLabel}</p>
              <p className="text-8xl font-black tabular-nums leading-none" style={{ color: 'var(--color-primary)' }}>{(score ?? 0).toLocaleString()}</p>
            </div>` : '';

  const rankBlock = hasRank ? `{rank != null && (
              <div className="flex items-center gap-3 rounded-full px-5 py-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <span className="text-xs font-semibold uppercase tracking-widest opacity-50">{rankLabel}</span>
                <span className="text-lg font-black" style={{ color: 'var(--color-primary)' }}>#{rank}</span>
              </div>
            )}` : '';

  const statsBlock = hasStats ? `
            {/* Stats grid — populate with real data from game bridge */}
            <div className="w-full max-w-xs">
              {[{ label: 'Time', value: '0:42' }, { label: 'Accuracy', value: '87%' }].map((s, i) => (
                <div key={i} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-sm opacity-60">{s.label}</span>
                  <span className="text-sm font-bold">{s.value}</span>
                </div>
              ))}
            </div>` : '';

  const shareBlock = hasShare ? `
            {typeof navigator !== 'undefined' && navigator.share && (
              <button className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity" onClick={() => navigator.share({ title: document.title, url: window.location.href })}>
                <span>↗</span><span>Share result</span>
              </button>
            )}` : '';

  const middleBlock = `
          <div className="flex flex-col items-center gap-5" style={{ animation: 'fadeIn 0.4s 0.1s ease both' }}>
            ${scoreBlock}
            ${rankBlock}
            ${statsBlock}
            ${shareBlock}
          </div>`;

  const ctaBlock = (hasCta || hasCtaSec) ? `
          <div className="flex w-full flex-col gap-3" style={{ animation: 'fadeIn 0.4s 0.25s ease both' }}>
            ${hasCta    ? `<Button fullWidth size="lg" onClick={() => router.push('${opts.nextRoute}')}>{ctaLabel}</Button>` : ''}
            ${hasCtaSec ? `<Button fullWidth variant="secondary" size="lg" onClick={() => router.push('${opts.retryRoute ?? '/gameplay'}')}>{retryLabel}</Button>` : ''}
          </div>` : '<div />';

  const gameCtxImport = (hasScore || hasRank) ? `\nimport { useGameContext } from '@hooks/useGameContext';` : '';

  return `'use client';

${imports([gameCtxImport])}

export default function ResultPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();
  ${gameCtx}

${capeLines}

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      ${bgBlock}
      <div
        className="relative flex h-full flex-col items-center justify-between px-6"
        style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))', paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}
      >
        ${titleBlock}
        ${middleBlock}
        ${ctaBlock}
      </div>
    </div>
  );
}
`;
}

// ─── Menu page ────────────────────────────────────────────────────────────────
function buildMenu(els, opts) {
  const hasLogo     = els.includes('logo');
  const hasNav      = els.includes('nav-items');
  const hasCtaSec   = els.includes('cta-secondary');
  const hasFooter   = els.includes('branding-footer');

  const navItems = opts.navItems ?? [
    { label: 'Home',         route: '/landing',    variant: 'primary' },
    { label: 'How to play',  route: '/onboarding', variant: 'secondary' },
  ];

  const logoBlock = hasLogo ? `
        {logoUrl
          ? <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" /> // eslint-disable-line @next/next/no-img-element
          : <div className="h-10" />}` : '<div className="h-10" />';

  const navBlock = hasNav ? `
      <div className="flex w-full max-w-xs flex-col gap-3" style={{ animation: 'fadeIn 0.3s 0.05s ease both' }}>
        ${navItems.map((item, i) =>
          `<Button fullWidth${item.variant !== 'primary' ? ` variant="${item.variant}"` : ''} onClick={() => router.push('${item.route}')}>${item.label}</Button>`
        ).join('\n        ')}
        ${hasCtaSec ? `<Button fullWidth variant="ghost" size="sm" onClick={() => router.push('/terms')}>Terms &amp; conditions</Button>` : ''}
      </div>` : '<div />';

  const footerBlock = hasFooter ? `
      <div className="flex flex-col items-center gap-2 opacity-25" style={{ animation: 'fadeIn 0.3s 0.1s ease both' }}>
        <div className="h-px w-10 bg-white" />
        <p className="text-xs uppercase tracking-widest">Powered by Livewall</p>
      </div>` : '<div />';

  const logoLine = hasLogo ? `  const logoUrl = getCapeImage(capeData, 'general.header.logo');` : '';

  return `'use client';

${imports()}

export default function MenuPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();
  ${logoLine}

  return (
    <div className="relative flex h-full flex-col items-center justify-between px-8 py-10" style={{ background: 'rgba(0,0,0,0.97)' }}>
      <div className="flex w-full items-center justify-between" style={{ animation: 'fadeIn 0.3s ease both' }}>
        <div className="w-10" />
        ${logoBlock}
        <button className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-70" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => router.back()} aria-label="Close menu">
          <span className="text-xl leading-none text-white">✕</span>
        </button>
      </div>
      ${navBlock}
      ${footerBlock}
    </div>
  );
}
`;
}

// ─── Gameplay page (no builder — always fixed) ────────────────────────────────
function buildGameplay(opts) {
  return `'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameContext } from '@hooks/useGameContext';
import Button from '@components/_core/Button/Button';

/**
 * Gameplay route — mount your game canvas here.
 * Replace the placeholder with <UnityCanvas />, <R3FCanvas />, or <PhaserCanvas />.
 * This page is full-bleed (no header) — see PAGES_WITHOUT_HEADER in layout.tsx.
 */
export default function GameplayPage() {
  const router = useRouter();
  const { setScore, setGameIsReady } = useGameContext();

  useEffect(() => {
    setGameIsReady(true);
    return () => setGameIsReady(false);
  }, [setGameIsReady]);

  const handleGameEnd = (score: number) => {
    setScore(score);
    router.push('${opts.nextRoute}');
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* ── Canvas slot ────────────────────────────────────────────────────
          Replace this block with your engine canvas component.
          It must fill absolute inset-0 and call handleGameEnd(score).
      ─────────────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-20">Game canvas</p>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <Button variant="secondary" size="sm" onClick={() => handleGameEnd(Math.floor(Math.random() * 10000))}>
            Simulate game end (dev)
          </Button>
        </div>
      )}
    </div>
  );
}
`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a complete page component from element selections.
 *
 * @param {'landing'|'onboarding'|'gameplay'|'result'|'menu'} pageType
 * @param {string[]} elements   - element IDs from PAGE_ELEMENTS[pageType]
 * @param {object}   opts       - { nextRoute, retryRoute, stepCount, navItems }
 * @returns {string}            - TypeScript source code
 */
export function buildPage(pageType, elements, opts = {}) {
  switch (pageType) {
    case 'landing':    return buildLanding(elements, opts);
    case 'onboarding': return buildOnboarding(elements, opts);
    case 'gameplay':   return buildGameplay(opts);
    case 'result':     return buildResult(elements, opts);
    case 'menu':       return buildMenu(elements, opts);
    default:           throw new Error(`Unknown page type: ${pageType}`);
  }
}
