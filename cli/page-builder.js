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
    description: 'Secondary action (outlined style)',
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

const variantFor = (opts, pageId, exitKey, fallback = 'primary') => {
  const value = opts?.buttonVariants?.[`${pageId}.${exitKey}`];
  return ['primary', 'secondary', 'tertiary', 'dark', 'danger'].includes(value) ? value : fallback;
};

const variantProp = (variant) => ` variant="${variant}"`;

export const PAGE_DEFAULTS = {
  'intro-video': [],
  'loading-video': [],
  'ad-video': [],
  landing: ['hero-bg', 'logo', 'title', 'subtitle', 'cta-primary'],
  onboarding: ['title', 'subtitle', 'step-list', 'cta-primary'],
  gameplay: [],
  result: ['hero-bg', 'title', 'score-display', 'rank-badge', 'cta-primary', 'cta-secondary'],
  menu: ['logo', 'nav-items', 'cta-secondary', 'branding-footer'],
};

export const PAGE_ELEMENTS = {
  'intro-video': [],
  'loading-video': [],
  'ad-video': [],
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
  const primaryVariant = variantFor(opts, 'landing', 'next', 'primary');
  const secondaryVariant = variantFor(opts, 'landing', 'leaderboard', 'secondary');
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
          ${hasCta ? `<Button fullWidth${variantProp(primaryVariant)} size="lg" onClick={() => router.push('${opts.nextRoute}')}>{ctaLabel}</Button>` : ''}
          ${hasCtaSec ? `<Button fullWidth${variantProp(secondaryVariant)} size="lg" onClick={() => router.push('/onboarding')}>{ctaLabel2}</Button>` : ''}
          ${partnersBlock}
        </div>
      </div>
    </div>
  );
}
`;
}

function buildOnboarding(els, opts) {
  const primaryVariant = variantFor(opts, 'onboarding', 'next', 'primary');
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
          <Button fullWidth${variantProp(primaryVariant)} size="lg" onClick={() => router.push('${opts.nextRoute}')}>{ctaLabel}</Button>
        </div>` : ''}
      </div>
    </div>
  );
}
`;
}

function buildResult(els, opts) {
  const primaryVariant = variantFor(opts, 'result', 'next', 'primary');
  const secondaryVariant = variantFor(opts, 'result', 'playAgain', 'secondary');
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
          ${hasCta ? `<Button fullWidth${variantProp(primaryVariant)} size="lg" onClick={() => router.push('${opts.nextRoute}')}>{ctaLabel}</Button>` : ''}
          ${hasCtaSec ? `<Button fullWidth${variantProp(secondaryVariant)} size="lg" onClick={() => router.push('${opts.retryRoute ?? '/gameplay'}')}>{retryLabel}</Button>` : ''}
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
    { label: 'Home', route: '/landing', variant: opts.menuButtonVariants?.home ?? 'primary' },
    { label: 'How to play', route: '/onboarding', variant: opts.menuButtonVariants?.howToPlay ?? 'secondary' },
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
            ${hasCtaSec ? `<Button fullWidth variant="${opts.menuButtonVariants?.terms ?? 'tertiary'}" size="sm" onClick={() => router.push('/terms')}>Terms &amp; conditions</Button>` : ''}
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

/**
 * Generate `app/landing/page.tsx` from a block list.
 *
 * @param {Array<{ name: string, settings: object }>} blocks the page's block list, in render order
 * @returns {string} the generated TSX source
 */
function buildBlockDrivenLandingLegacy(blocks) {
  const required = ['background', 'title-block'];
  for (const req of required) {
    if (!blocks.find((b) => b.name === req)) {
      throw new Error(`buildBlockDrivenLanding: required block missing: ${req}`);
    }
  }

  const componentNameOf = (blockName) =>
    blockName.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');

  const importLines = blocks
    .map((b) => `import { ${componentNameOf(b.name)} } from '@/components/_blocks/${b.name}/${componentNameOf(b.name)}';`)
    .join('\n');

  const ctaBlock = blocks.find((b) => b.name === 'cta-group');
  const ctaButtonsJsx = ctaBlock
    ? renderCtaButtons(ctaBlock.settings)
    : null;

  const headerBlock = blocks.find((b) => b.name === 'header-chrome');
  const brandBlock = blocks.find((b) => b.name === 'brand-chip');
  const titleBlock = blocks.find((b) => b.name === 'title-block');
  const footerBlock = blocks.find((b) => b.name === 'footer-link-list');

  return [
    "'use client';",
    '',
    '// Generated by campaign-scaffolder · do not edit by hand',
    ctaBlock ? "import { useRouter } from 'next/navigation';" : null,
    "import { useCape } from '@/lib/cape';",
    importLines,
    '',
    'export default function LandingPage() {',
    "  const cape = useCape('landing');",
    ctaBlock ? '  const router = useRouter();' : null,
    '  return (',
    '    <Background source={cape.background}>',
    headerBlock ? `      <HeaderChrome leftSlot="${headerBlock.settings.leftSlot}" rightSlot="${headerBlock.settings.rightSlot}" />` : null,
    brandBlock ? `      <BrandChip image={cape.brandChip?.image} size="${brandBlock.settings.size}" />` : null,
    titleBlock
      ? `      <TitleBlock${titleBlock.settings.showKicker ? ' kicker={cape.kicker}' : ''} title={cape.title}${titleBlock.settings.showSubtitle ? ' subtitle={cape.subtitle}' : ''} />`
      : null,
    ctaButtonsJsx ? `      <CtaGroup buttons={${ctaButtonsJsx}} />` : null,
    footerBlock ? '      <FooterLinkList links={cape.footerLinks ?? []} />' : null,
    '    </Background>',
    '  );',
    '}',
  ].filter((l) => l !== null).join('\n');
}

function renderCtaButtonsLegacy(settings) {
  const buttons = settings.buttons ?? [];
  const entries = buttons.map((b, i) =>
    `{ label: cape.cta?.[${i}]?.label ?? '', variant: '${b.variant}', onClick: () => router.push('/${b.exit}') }`,
  );
  return `[${entries.join(', ')}]`;
}

const BLOCK_REQUIRED_BY_TYPE = {
  loading: ['background', 'loading-indicator'],
  landing: ['background', 'title-block'],
  tutorial: ['background', 'title-block', 'nav-controls'],
  onboarding: ['background', 'title-block', 'nav-controls'],
  video: ['video-player'],
  game: ['background'],
  result: ['background', 'title-block', 'cta-group'],
  leaderboard: ['background', 'rank-list'],
  register: ['background', 'card-wrapper', 'field-set', 'opt-in-list'],
  voucher: ['background', 'title-block'],
  end: ['background', 'title-block', 'cta-group'],
  menu: ['background', 'menu-item-list'],
};

const DEFAULT_BLOCK_ROUTES = {
  landing: '/landing',
  tutorial: '/tutorial',
  onboarding: '/tutorial',
  loading: '/loading',
  video: '/video',
  'intro-video': '/intro-video',
  'loading-video': '/loading-video',
  'ad-video': '/ad-video',
  register: '/register',
  game: '/gameplay',
  gameplay: '/gameplay',
  result: '/result',
  leaderboard: '/leaderboard',
  voucher: '/voucher',
  end: '/end',
  menu: '/menu',
};

function componentNameOf(blockName) {
  return blockName.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');
}

function normaliseBlockType(pageType) {
  if (['video', 'intro-video', 'loading-video', 'ad-video'].includes(pageType)) return 'video';
  if (pageType === 'tutorial') return 'onboarding';
  if (pageType === 'gameplay') return 'game';
  return pageType;
}

function pageComponentName(pageId, pageType) {
  const base = pageId || pageType || 'Campaign';
  return `${base.split(/[-_]/).map((part) => part[0]?.toUpperCase() + part.slice(1)).join('')}Page`;
}

function routeForExit(exit, routeMap = {}) {
  if (!exit) return '/';
  const key = String(exit);
  if (key.startsWith('/')) return key;
  const hyphenKey = key.replace(/_/g, '-');
  const underscoreKey = key.replace(/-/g, '_');
  return routeMap[key] ?? routeMap[hyphenKey] ?? routeMap[underscoreKey] ?? DEFAULT_BLOCK_ROUTES[key] ?? DEFAULT_BLOCK_ROUTES[hyphenKey] ?? `/${hyphenKey}`;
}

function jsString(value) {
  return JSON.stringify(value);
}

function settingsOf(block) {
  return block?.settings ?? {};
}

/**
 * Move the block named `target` so it renders immediately after the block named
 * `anchor`. Used when a block exposes a "position relative to another" setting
 * (e.g. step-indicator's below/above relative to nav-controls). No-op if either
 * block is missing or `target` already follows `anchor`.
 */
function reorderAfter(blocks, target, anchor) {
  const targetIdx = blocks.findIndex((b) => b.name === target);
  const anchorIdx = blocks.findIndex((b) => b.name === anchor);
  if (targetIdx < 0 || anchorIdx < 0) return blocks;
  if (targetIdx === anchorIdx + 1) return blocks;
  const without = blocks.filter((_, i) => i !== targetIdx);
  const insertAt = without.findIndex((b) => b.name === anchor) + 1;
  return [...without.slice(0, insertAt), blocks[targetIdx], ...without.slice(insertAt)];
}

/**
 * Mirror of reorderAfter — moves `target` to render immediately *before* `anchor`
 * instead. Used for hero-treatment positioning (e.g. score-illustration above
 * the title on a result page).
 */
function reorderBefore(blocks, target, anchor) {
  const targetIdx = blocks.findIndex((b) => b.name === target);
  const anchorIdx = blocks.findIndex((b) => b.name === anchor);
  if (targetIdx < 0 || anchorIdx < 0) return blocks;
  if (targetIdx === anchorIdx - 1) return blocks;
  const without = blocks.filter((_, i) => i !== targetIdx);
  const insertAt = without.findIndex((b) => b.name === anchor);
  return [...without.slice(0, insertAt), blocks[targetIdx], ...without.slice(insertAt)];
}

function slotUsesRouter(slot) {
  return ['menu', 'back', 'close', 'help'].includes(slot);
}

function blockUsesRouter(block) {
  const s = settingsOf(block);
  switch (block.name) {
    case 'header-chrome':
      return slotUsesRouter(s.leftSlot) || slotUsesRouter(s.rightSlot);
    case 'cta-group':
    case 'nav-controls':
    case 'skip-control':
    case 'reveal-cta':
      return true;
    case 'video-player':
      return (s.onEnd ?? 'auto-advance') === 'auto-advance';
    default:
      return false;
  }
}

/**
 * Generate a block-driven page component.
 *
 * @param {string} pageId instance id (e.g. "landing", "intro-video")
 * @param {string} pageType type (e.g. "landing", "video")
 * @param {Array<{ name: string, settings: object }>} blocks render-order block list
 * @param {object} options routeMap and other generator options
 * @returns {string}
 */
export function buildBlockDrivenPage(pageId, pageType, blocks, options = {}) {
  const type = normaliseBlockType(pageType || pageId);
  const required = BLOCK_REQUIRED_BY_TYPE[pageType] ?? BLOCK_REQUIRED_BY_TYPE[type] ?? [];
  for (const req of required) {
    if (!blocks.find((b) => b.name === req)) {
      throw new Error(`buildBlockDrivenPage(${pageId}): required block missing: ${req}`);
    }
  }

  const uniqueBlockNames = [...new Set(blocks.map((b) => b.name))];
  const importLines = uniqueBlockNames
    .map((name) => `import { ${componentNameOf(name)} } from '@/components/_blocks/${name}/${componentNameOf(name)}';`)
    .join('\n');

  const background = blocks.find((b) => b.name === 'background');
  const card = blocks.find((b) => b.name === 'card-wrapper');
  const innerBlocks = blocks.filter((b) => b.name !== 'background' && b.name !== 'card-wrapper');
  // brand-chip with slot=header rides inside the header-chrome block instead of
  // rendering as a sibling. Requires header-chrome to actually be present; if it
  // isn't, the brand-chip falls back to its standalone (content) placement.
  const brandChipBlock = innerBlocks.find((b) => b.name === 'brand-chip');
  const headerChromeBlock = innerBlocks.find((b) => b.name === 'header-chrome');
  const brandSlot = settingsOf(brandChipBlock).slot;
  const brandInHeader = brandChipBlock && headerChromeBlock && brandSlot === 'header'
    ? brandChipBlock
    : null;
  const renderableBlocks = brandInHeader
    ? innerBlocks.filter((b) => b.name !== 'brand-chip')
    : innerBlocks;
  // step-indicator with position=below swaps with nav-controls so the dots/count
  // render after the buttons. Requires nav-controls to be present; otherwise the
  // setting is a no-op and the indicator stays in its declared position.
  const stepIndicatorBlock = renderableBlocks.find((b) => b.name === 'step-indicator');
  const navControlsBlock = renderableBlocks.find((b) => b.name === 'nav-controls');
  const stepBelow = stepIndicatorBlock && navControlsBlock
    && settingsOf(stepIndicatorBlock).position === 'below';
  let orderedBlocks = stepBelow
    ? reorderAfter(renderableBlocks, 'step-indicator', 'nav-controls')
    : renderableBlocks;
  // score-illustration with position=above-title hoists itself to render
  // immediately before the title-block (hero-style result page). No-op if
  // title-block is absent.
  const scoreIllusBlock = orderedBlocks.find((b) => b.name === 'score-illustration');
  const titleBlock = orderedBlocks.find((b) => b.name === 'title-block');
  if (scoreIllusBlock && titleBlock && settingsOf(scoreIllusBlock).position === 'above-title') {
    orderedBlocks = reorderBefore(orderedBlocks, 'score-illustration', 'title-block');
  }
  const ctx = { pageId, pageType: type, routeMap: options.routeMap ?? {}, brandInHeader };
  const children = orderedBlocks.map((block) => renderBlock(block, ctx));
  const usesRouter = innerBlocks.some(blockUsesRouter);
  const content = card
    ? [
      `      <CardWrapper styleMode="${settingsOf(card).style ?? 'card'}" cardWidth="${settingsOf(card).cardWidth ?? 'with-margin'}">`,
      ...children.map((line) => `  ${line}`),
      '      </CardWrapper>',
    ]
    : children;

  const wrapStart = background ? '    <Background source={cape.background}>' : '    <main className="campaign-block-page">';
  const wrapEnd = background ? '    </Background>' : '    </main>';

  return [
    "'use client';",
    '',
    '// Generated by campaign-scaffolder - do not edit by hand',
    usesRouter ? "import { useRouter } from 'next/navigation';" : null,
    "import { useCape } from '@/lib/cape';",
    importLines,
    '',
    `export default function ${pageComponentName(pageId, pageType)}() {`,
    `  const cape = useCape(${jsString(pageId)});`,
    usesRouter ? '  const router = useRouter();' : null,
    '  return (',
    wrapStart,
    ...content,
    wrapEnd,
    '  );',
    '}',
  ].filter(Boolean).join('\n');
}

export function buildBlockDrivenLanding(blocks, options = {}) {
  return buildBlockDrivenPage('landing', 'landing', blocks, options);
}

export function buildBlockDrivenLoading(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'loading', 'loading', blocks, options);
}

export function buildBlockDrivenOnboarding(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'tutorial', 'tutorial', blocks, options);
}

export function buildBlockDrivenVideo(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'video', 'video', blocks, options);
}

export function buildBlockDrivenGame(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'game', 'game', blocks, options);
}

export function buildBlockDrivenResult(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'result', 'result', blocks, options);
}

export function buildBlockDrivenLeaderboard(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'leaderboard', 'leaderboard', blocks, options);
}

export function buildBlockDrivenRegister(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'register', 'register', blocks, options);
}

export function buildBlockDrivenVoucher(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'voucher', 'voucher', blocks, options);
}

export function buildBlockDrivenEnd(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'end', 'end', blocks, options);
}

export function buildBlockDrivenMenu(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'menu', 'menu', blocks, options);
}

function renderBlock(block, ctx) {
  const s = settingsOf(block);
  switch (block.name) {
    case 'header-chrome': {
      const brand = ctx.brandInHeader ? settingsOf(ctx.brandInHeader) : null;
      const centerProp = brand
        ? ` center={<BrandChip image={cape.brandChip?.image ?? cape.logo} size="${brand.size ?? 'md'}" position="${brand.position ?? 'center'}" />}`
        : '';
      return `      <HeaderChrome leftSlot="${s.leftSlot ?? 'none'}" rightSlot="${s.rightSlot ?? 'none'}" onLeftClick={() => ${slotAction(s.leftSlot)}} onRightClick={() => ${slotAction(s.rightSlot)}}${centerProp} />`;
    }
    case 'brand-chip':
      return `      <BrandChip image={cape.brandChip?.image ?? cape.logo} size="${s.size ?? 'md'}" position="${s.position ?? 'center'}" />`;
    case 'title-block':
      return `      <TitleBlock${s.showKicker ? ' kicker={cape.kicker}' : ''} title={cape.title ?? 'Title'}${s.showSubtitle ? ' subtitle={cape.subtitle}' : ''} />`;
    case 'body-copy':
      return '      <BodyCopy text={cape.body ?? cape.subline ?? ""} />';
    case 'cta-group':
      return `      <CtaGroup buttons={${renderCtaButtons(s, ctx.routeMap)}} />`;
    case 'footer-link-list':
      return '      <FooterLinkList links={cape.footerLinks ?? []} />';
    case 'centered-art':
      return `      <CenteredArt image={cape.art?.url ?? cape.art} size="${s.size ?? 'md'}" />`;
    case 'tagline':
      return '      <Tagline text={cape.tagline} />';
    case 'loading-indicator':
      return `      <LoadingIndicator kind="${s.kind ?? 'ring'}" label={cape.loadingLabel ?? 'Loading'} />`;
    case 'prize-illustration':
      return '      <PrizeIllustration image={cape.prizeImage?.url ?? cape.prizeImage} />';
    case 'code-box':
      return "      <CodeBox code={cape.code ?? ''} label={cape.codeLabel ?? 'Code'} copiedLabel={cape.codeCopiedConfirmation ?? 'Copied'} />";
    case 'qr-display':
      return "      <QrDisplay value={cape.qrValue ?? cape.code ?? ''} instructions={cape.qrInstructions} />";
    case 'channel-tabs':
      return `      <ChannelTabs tabs={${jsString(s.tabs ?? ['webshop', 'in-store'])}} defaultTab="${s.defaultTab ?? 'webshop'}" />`;
    case 'score-readout':
      return `      <ScoreReadout score={cape.score ?? 0} label={cape.scoreLabel ?? 'Score'} highScore={cape.highScore} showHighScore={${Boolean(s.showHighScore)}} />`;
    case 'score-illustration':
      return '      <ScoreIllustration image={cape.scoreImage?.url ?? cape.scoreImage} />';
    case 'stats-table':
      return `      <StatsTable rows={cape.stats ?? []} count={${Number(s.count ?? 3)}} />`;
    case 'status-chip':
      return `      <StatusChip label={cape.statusLabel} kind="${s.kind ?? 'registered'}" />`;
    case 'compliance-badge':
      return `      <ComplianceBadge label={cape.complianceLabel} kind="${s.kind ?? '18+'}" />`;
    case 'rank-list':
      return "      <RankList rows={cape.rankings ?? []} emptyLabel={cape.emptyState ?? 'No scores yet.'} />";
    case 'leaderboard-tabs':
      return `      <LeaderboardTabs tabs={${jsString(s.tabs ?? ['all', 'daily', 'weekly'])}} defaultTab="${s.defaultTab ?? 'all'}" />`;
    case 'personal-best-row':
      return "      <PersonalBestRow label={cape.youLabel ?? 'You'} rank={cape.personalRank} score={cape.personalBest} />";
    case 'top-n-highlight':
      return `      <TopNHighlight label={cape.topNLabel} count={${Number(s.count ?? 3)}} />`;
    case 'step-indicator':
      return `      <StepIndicator count={${Number(s.count ?? 3)}} style="${s.style ?? 'dots'}" />`;
    case 'nav-controls':
      return `      <NavControls showPrev={${Boolean(s.showPrev)}} nextLabel={cape.nextLabel ?? 'Continue'} onNext={() => router.push(${jsString(routeForExit(s.nextExit ?? 'game', ctx.routeMap))})} />`;
    case 'field-set':
      return `      <FieldSet fields={${jsString(s.fields ?? ['firstName', 'lastName', 'email'])}} />`;
    case 'opt-in-list':
      return `      <OptInList optIns={${jsString(s.optIns ?? ['terms'])}} required={${s.required !== false}} />`;
    case 'video-player':
      return (s.onEnd ?? 'auto-advance') === 'auto-advance'
        ? `      <VideoPlayer src={cape.video?.url ?? cape.video} muted={${s.muted !== false}} loop={${Boolean(s.loop)}} onEnded={() => router.push(${jsString(routeForExit(s.exit ?? 'game', ctx.routeMap))})} />`
        : `      <VideoPlayer src={cape.video?.url ?? cape.video} muted={${s.muted !== false}} loop={${Boolean(s.loop)}} />`;
    case 'skip-control':
      return `      <SkipControl label={cape.skipLabel ?? 'Skip'} availableAfterMs={${Number(s.availableAfterMs ?? 0)}} onSkip={() => router.push(${jsString(routeForExit(s.exit ?? 'game', ctx.routeMap))})} />`;
    case 'reveal-cta':
      return `      <RevealCta label={cape.ctaLabel ?? 'Continue'} variant="${s.variant ?? 'primary'}" onClick={() => router.push(${jsString(routeForExit(s.exit ?? 'game', ctx.routeMap))})} />`;
    case 'fallback-indicator':
      return "      <FallbackIndicator label={cape.fallbackLabel ?? 'Loading'} />";
    case 'audio-toggle':
      return '      <AudioToggle />';
    case 'pause-toggle':
      return '      <PauseToggle />';
    case 'pause-overlay':
      return '      <PauseOverlay title={cape.pauseTitle} />';
    case 'timer':
      return `      <Timer mode="${s.mode ?? 'countdown'}" durationSec={${Number(s.durationSec ?? 60)}} />`;
    case 'sponsor-footer-strip':
      return '      <SponsorFooterStrip text={cape.sponsorText} logo={cape.sponsorLogo?.url ?? cape.sponsorLogo} />';
    case 'menu-item-list':
      return '      <MenuItemList items={cape.items ?? undefined} />';
    case 'pre-gate-modal':
      return `      <PreGateModal kind="${s.kind ?? 'age-18'}" title={cape.preGateTitle} confirmLabel={cape.preGateConfirm ?? 'Continue'} persistAcrossSession={${s.persistAcrossSession !== false}} />`;
    default:
      return `      <${componentNameOf(block.name)} />`;
  }
}

function slotAction(slot) {
  switch (slot) {
    case 'menu': return "router.push('/menu')";
    case 'back': return 'router.back()';
    case 'close': return "router.push('/')";
    case 'help': return "router.push('/tutorial')";
    default: return 'undefined';
  }
}

function renderCtaButtons(settings, routeMap = {}) {
  // The button list is the source of truth (count is derived from its length).
  // Legacy `count`, if present, only caps the list. Clamp to the manifest's 1–4.
  const list = Array.isArray(settings.buttons) && settings.buttons.length
    ? settings.buttons
    : [{ variant: 'primary', exit: 'game' }];
  const cap = Math.min(4, settings.count ? Number(settings.count) : list.length);
  const entries = list.slice(0, Math.max(1, cap)).map((b, i) =>
    `{ label: cape.cta?.[${i}]?.label ?? cape.ctaLabel ?? 'Continue', variant: '${b.variant ?? 'primary'}', onClick: () => router.push('${routeForExit(b.exit ?? 'game', routeMap)}') }`,
  );
  return `[${entries.join(', ')}]`;
}
