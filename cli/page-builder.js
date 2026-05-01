/**
 * cli/page-builder.js
 *
 * Page builder for the Livewall Campaign Scaffolder.
 *
 * Defines available elements per page type and generates
 * complete TypeScript page components from user selections.
 */

export const ELEMENT_CATALOGUE = {
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
  countdown: {
    label: 'Countdown timer',
    description: 'Live countdown to a campaign start/end date',
    pages: ['landing'],
  },
  partners: {
    label: 'Partner / sponsor logos',
    description: 'Row of partner logo images from CAPE',
    pages: ['landing'],
  },
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

export const PAGE_DEFAULTS = {
  landing: ['hero-bg', 'logo', 'title', 'subtitle', 'cta-primary'],
  onboarding: ['title', 'subtitle', 'step-list', 'cta-primary'],
  gameplay: [],
  result: ['hero-bg', 'title', 'score-display', 'rank-badge', 'cta-primary', 'cta-secondary'],
  menu: ['logo', 'nav-items', 'cta-secondary', 'branding-footer'],
};

export const PAGE_ELEMENTS = {
  landing: ['hero-bg', 'logo', 'title', 'subtitle', 'cta-primary', 'cta-secondary', 'countdown', 'partners'],
  onboarding: ['hero-bg', 'title', 'subtitle', 'hero-image', 'step-list', 'cta-primary'],
  gameplay: [],
  result: ['hero-bg', 'title', 'subtitle', 'score-display', 'rank-badge', 'stats-grid', 'cta-primary', 'cta-secondary', 'share-button'],
  menu: ['logo', 'nav-items', 'cta-secondary', 'branding-footer'],
};

function imports(extras = []) {
  const base = [
    `import { useRouter } from 'next/navigation';`,
    `import { useCapeData } from '@hooks/useCapeData';`,
    `import { getCapeText, getCapeImage } from '@utils/getCapeData';`,
    `import Button from '@components/_core/Button/Button';`,
  ];
  return [...base, ...extras.filter(Boolean)].join('\n');
}

function buildLanding(els, opts) {
  const hasBg = els.includes('hero-bg');
  const hasLogo = els.includes('logo');
  const hasTitle = els.includes('title');
  const hasSubtitle = els.includes('subtitle');
  const hasCta = els.includes('cta-primary');
  const hasCtaSec = els.includes('cta-secondary');
  const hasCountdown = els.includes('countdown');
  const hasPartners = els.includes('partners');

  const capeLines = [
    hasBg && `  const bgUrl     = getCapeImage(capeData, 'general.landing.background');`,
    hasLogo && `  const logoUrl   = getCapeImage(capeData, 'general.landing.logo') || getCapeImage(capeData, 'general.header.logo');`,
    hasTitle && `  const title     = getCapeText(capeData, 'general.landing.title', 'Welcome');`,
    hasSubtitle && `  const subtitle  = getCapeText(capeData, 'general.landing.subtitle', 'Are you ready to play?');`,
    hasCta && `  const ctaLabel  = getCapeText(capeData, 'general.landing.ctaLabel', 'Play now');`,
    hasCtaSec && `  const ctaLabel2 = getCapeText(capeData, 'general.landing.ctaLabel2', 'How to play');`,
  ].filter(Boolean).join('\n');

  const bgBlock = hasBg ? `
      {bgUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bgUrl} alt="" className="campaign-image campaign-image--soft" aria-hidden />
      )}
      <div className="campaign-image-wash" />` : '';

  const countdownBlock = hasCountdown ? `
            <div className="badge badge--secondary">
              {getCapeText(capeData, 'general.landing.endDate', 'Set campaign end date')}
            </div>` : '';

  const partnersBlock = hasPartners ? `
          <div className="flex flex-wrap items-center gap-3 opacity-70">
            <div className="badge">Partner logos from CAPE</div>
          </div>` : '';

  return `'use client';

${imports()}

export default function LandingPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();

${capeLines}

  return (
    <div className="campaign-screen">
      ${bgBlock}

      <div className="campaign-shell">
        <div className="campaign-stack" style={{ animation: 'fadeIn 0.5s ease both' }}>
          ${hasLogo ? `{logoUrl
            ? <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain" /> // eslint-disable-line @next/next/no-img-element
            : <div className="h-12" />}` : '<div className="h-12" />'}
        </div>

        <section className="campaign-panel campaign-panel--strong p-7 sm:p-8" style={{ animation: 'fadeIn 0.5s 0.14s ease both' }}>
          <div className="campaign-stack">
            <p className="campaign-kicker">Live experience</p>
            ${hasTitle ? `<h1 className="campaign-title">{title}</h1>` : ''}
            ${hasSubtitle ? `{subtitle && <p className="campaign-copy max-w-[28rem] text-base sm:text-lg">{subtitle}</p>}` : ''}
            ${countdownBlock}
          </div>
        </section>

        <div className="campaign-actions" style={{ animation: 'fadeIn 0.5s 0.28s ease both' }}>
          ${hasCta ? `<Button fullWidth size="lg" onClick={() => router.push('${opts.nextRoute}')}>{ctaLabel}</Button>` : ''}
          ${hasCtaSec ? `<Button fullWidth variant="secondary" size="lg" onClick={() => router.push('/onboarding')}>{ctaLabel2}</Button>` : ''}
          ${partnersBlock}
        </div>
      </div>
    </div>
  );
}
`;
}

function buildOnboarding(els, opts) {
  const hasTitle = els.includes('title');
  const hasSubtitle = els.includes('subtitle');
  const hasBg = els.includes('hero-bg');
  const hasHeroImg = els.includes('hero-image');
  const hasSteps = els.includes('step-list');
  const hasCta = els.includes('cta-primary');
  const stepCount = opts.stepCount ?? 3;

  const capeLines = [
    hasTitle && `  const title    = getCapeText(capeData, 'general.onboarding.title', 'How to play');`,
    hasSubtitle && `  const subtitle = getCapeText(capeData, 'general.onboarding.subtitle', '');`,
    hasHeroImg && `  const heroUrl  = getCapeImage(capeData, 'general.onboarding.heroImage');`,
    hasBg && `  const bgUrl    = getCapeImage(capeData, 'general.onboarding.background');`,
    hasCta && `  const ctaLabel = getCapeText(capeData, 'general.onboarding.ctaLabel', "Let's go");`,
    hasSteps && `
  const steps = [${Array.from({ length: stepCount }, (_, i) => `
    { title: getCapeText(capeData, 'general.onboarding.step${i + 1}Title', 'Step ${i + 1}'), body: getCapeText(capeData, 'general.onboarding.step${i + 1}Body', 'Replace with instruction from CAPE.') }`).join(',')}
  ];`,
  ].filter(Boolean).join('\n');

  return `'use client';

${imports()}

export default function OnboardingPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();

${capeLines}

  return (
    <div className="campaign-screen">
      ${hasBg ? `{bgUrl && <img src={bgUrl} alt="" className="campaign-image campaign-image--soft" aria-hidden />} // eslint-disable-line @next/next/no-img-element
      <div className="campaign-image-wash" />` : ''}
      <div className="campaign-shell gap-5">
        <div className="campaign-stack" style={{ animation: 'fadeIn 0.4s ease both' }}>
          <p className="campaign-kicker">How to play</p>
          ${hasTitle ? `<h1 className="campaign-title campaign-title--compact">{title}</h1>` : ''}
          ${hasSubtitle ? `{subtitle && <p className="campaign-copy max-w-[28rem]">{subtitle}</p>}` : ''}
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto">
          <div className="campaign-stack">
            ${hasHeroImg ? `{heroUrl && <img src={heroUrl} alt="" className="mx-auto max-h-48 w-auto object-contain" />} // eslint-disable-line @next/next/no-img-element` : ''}
            ${hasSteps ? `{steps.map((step, i) => (
              <div key={i} className="campaign-step" style={{ animation: \`fadeIn 0.4s \${0.1 + i * 0.08}s ease both\` }}>
                <span className="campaign-step__index">{i + 1}</span>
                <div className="campaign-stack gap-1">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--text-primary)]">{step.title}</p>
                  <p className="campaign-copy text-sm">{step.body}</p>
                </div>
              </div>
            ))}` : ''}
          </div>
        </div>

        ${hasCta ? `<div className="campaign-actions" style={{ animation: 'fadeIn 0.4s 0.4s ease both' }}>
          <Button fullWidth size="lg" onClick={() => router.push('${opts.nextRoute}')}>{ctaLabel}</Button>
        </div>` : ''}
      </div>
    </div>
  );
}
`;
}

function buildResult(els, opts) {
  const hasBg = els.includes('hero-bg');
  const hasTitle = els.includes('title');
  const hasSubtitle = els.includes('subtitle');
  const hasScore = els.includes('score-display');
  const hasRank = els.includes('rank-badge');
  const hasStats = els.includes('stats-grid');
  const hasCta = els.includes('cta-primary');
  const hasCtaSec = els.includes('cta-secondary');
  const hasShare = els.includes('share-button');

  const capeLines = [
    hasBg && `  const bgUrl      = getCapeImage(capeData, 'general.result.background');`,
    hasTitle && `  const title      = getCapeText(capeData, 'general.result.title', 'Game over');`,
    hasSubtitle && `  const subtitle   = getCapeText(capeData, 'general.result.subtitle', '');`,
    hasScore && `  const scoreLabel = getCapeText(capeData, 'general.result.scoreLabel', 'Your score');`,
    hasRank && `  const rankLabel  = getCapeText(capeData, 'general.result.rankLabel', 'Your rank');`,
    hasCta && `  const ctaLabel   = getCapeText(capeData, 'general.result.ctaLabel', 'Continue');`,
    hasCtaSec && `  const retryLabel = getCapeText(capeData, 'general.result.retryLabel', 'Play again');`,
  ].filter(Boolean).join('\n');

  return `'use client';

${imports([`import { useGameContext } from '@hooks/useGameContext';`])}

export default function ResultPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();
  const { score, rank, userName } = useGameContext();

${capeLines}

  return (
    <div className="campaign-screen">
      ${hasBg ? `{bgUrl && <img src={bgUrl} alt="" className="campaign-image campaign-image--soft" aria-hidden />} // eslint-disable-line @next/next/no-img-element
      <div className="campaign-image-wash" />` : ''}

      <div className="campaign-shell">
        <section className="campaign-stack" style={{ animation: 'fadeIn 0.4s ease both' }}>
          <p className="campaign-kicker">Result</p>
          ${hasTitle ? `<h1 className="campaign-title campaign-title--compact">{title}</h1>` : ''}
          {userName && <p className="campaign-copy text-sm uppercase tracking-[0.14em]">{userName}</p>}
          ${hasSubtitle ? `{subtitle && <p className="campaign-copy max-w-[28rem]">{subtitle}</p>}` : ''}
        </section>

        <section className="campaign-panel campaign-panel--strong p-7 text-center sm:p-8" style={{ animation: 'fadeIn 0.4s 0.1s ease both' }}>
          <div className="campaign-stack items-center">
            ${hasScore ? `<div className="campaign-stack gap-2 items-center">
              <p className="campaign-kicker">{scoreLabel}</p>
              <p className="campaign-score">{(score ?? 0).toLocaleString()}</p>
            </div>` : ''}
            ${hasRank ? `{rank != null && <div className="badge badge--primary px-5 py-3">{rankLabel} #{rank}</div>}` : ''}
            ${hasStats ? `<div className="campaign-grid w-full">
              {[{ label: 'Time', value: '0:42' }, { label: 'Accuracy', value: '87%' }].map((s, i) => (
                <div key={i} className="campaign-stat">
                  <span className="campaign-copy text-sm">{s.label}</span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">{s.value}</span>
                </div>
              ))}
            </div>` : ''}
            ${hasShare ? `{typeof navigator !== 'undefined' && navigator.share && (
              <button className="badge" onClick={() => navigator.share({ title: document.title, url: window.location.href })}>Share result</button>
            )}` : ''}
          </div>
        </section>

        <div className="campaign-actions" style={{ animation: 'fadeIn 0.4s 0.25s ease both' }}>
          ${hasCta ? `<Button fullWidth size="lg" onClick={() => router.push('${opts.nextRoute}')}>{ctaLabel}</Button>` : ''}
          ${hasCtaSec ? `<Button fullWidth variant="secondary" size="lg" onClick={() => router.push('${opts.retryRoute ?? '/gameplay'}')}>{retryLabel}</Button>` : ''}
        </div>
      </div>
    </div>
  );
}
`;
}

function buildMenu(els, opts) {
  const hasLogo = els.includes('logo');
  const hasNav = els.includes('nav-items');
  const hasCtaSec = els.includes('cta-secondary');
  const hasFooter = els.includes('branding-footer');

  const navItems = opts.navItems ?? [
    { label: 'Home', route: '/landing', variant: 'primary' },
    { label: 'How to play', route: '/onboarding', variant: 'secondary' },
  ];

  return `'use client';

${imports()}

export default function MenuPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();
  ${hasLogo ? `const logoUrl = getCapeImage(capeData, 'general.header.logo');` : ''}

  return (
    <div className="campaign-screen">
      <div className="campaign-shell">
        <div className="flex items-center justify-between" style={{ animation: 'fadeIn 0.3s ease both' }}>
          <div className="w-11" />
          ${hasLogo ? `{logoUrl
            ? <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" /> // eslint-disable-line @next/next/no-img-element
            : <div className="h-10" />}` : '<div className="h-10" />'}
          <button className="campaign-close" onClick={() => router.back()} aria-label="Close menu">
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        ${hasNav ? `<div className="campaign-panel campaign-panel--strong p-5 sm:p-6" style={{ animation: 'fadeIn 0.3s 0.05s ease both' }}>
          <div className="campaign-actions">
            ${navItems.map((item) =>
              `<Button fullWidth${item.variant !== 'primary' ? ` variant="${item.variant}"` : ''} onClick={() => router.push('${item.route}')}>${item.label}</Button>`
            ).join('\n            ')}
            ${hasCtaSec ? `<Button fullWidth variant="ghost" size="sm" onClick={() => router.push('/terms')}>Terms &amp; conditions</Button>` : ''}
          </div>
        </div>` : ''}

        ${hasFooter ? `<div className="campaign-stack items-center opacity-50" style={{ animation: 'fadeIn 0.3s 0.1s ease both' }}>
          <div className="divider w-20" />
          <p className="campaign-kicker">Powered by Livewall</p>
        </div>` : ''}
      </div>
    </div>
  );
}
`;
}

function buildGameplay(opts) {
  return `'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameContext } from '@hooks/useGameContext';
import Button from '@components/_core/Button/Button';

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
    <div className="campaign-screen">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(23,21,20,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(23,21,20,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="campaign-shell campaign-shell--centered items-center text-center">
        <div className="campaign-panel campaign-panel--strong w-full max-w-sm p-8">
          <div className="campaign-stack items-center">
            <p className="campaign-kicker">Gameplay</p>
            <h1 className="campaign-title campaign-title--compact">Mount your game canvas here</h1>
            <p className="campaign-copy">Replace this placeholder with your Unity, R3F, Phaser, or custom gameplay component.</p>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <Button variant="secondary" size="sm" onClick={() => handleGameEnd(Math.floor(Math.random() * 10000))}>
            Simulate game end
          </Button>
        )}
      </div>
    </div>
  );
}
`;
}

export function buildPage(pageType, elements, opts = {}) {
  switch (pageType) {
    case 'landing': return buildLanding(elements, opts);
    case 'onboarding': return buildOnboarding(elements, opts);
    case 'gameplay': return buildGameplay(opts);
    case 'result': return buildResult(elements, opts);
    case 'menu': return buildMenu(elements, opts);
    default: throw new Error(`Unknown page type: ${pageType}`);
  }
}
