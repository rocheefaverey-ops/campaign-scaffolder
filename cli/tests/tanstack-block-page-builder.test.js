import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTsBlockDrivenPage, buildTsBlockDrivenLoader } from '../tanstack-block-page-builder.js';

describe('buildTsBlockDrivenPage - landing', () => {
  const blocks = [
    { name: 'background', settings: {} },
    { name: 'title-block', settings: { showKicker: true, showSubtitle: true } },
    { name: 'cta-group', settings: { buttons: [{ variant: 'primary', exit: 'game' }] } },
  ];
  const opts = { routeMap: { game: '/game' } };

  it('emits a createFileRoute route file', () => {
    const route = buildTsBlockDrivenPage('landing', 'landing', blocks, opts);
    assert.match(route, /createFileRoute\(["']\/landing["']\)/);
    assert.match(route, /import \{ TitleBlock \} from '~\/components\/_blocks\/title-block\/TitleBlock'/);
    assert.match(route, /<TitleBlock/);
    assert.match(route, /<CtaGroup/);
    assert.match(route, /campaign-block-page--hero/);
    assert.match(route, /campaign-block-content/);
    assert.match(route, /campaign-block-actions/);
    assert.match(route, /useRouter/);
    assert.match(route, /router\.navigate\(\{ to: '\/game' as never \}\)/);
  });

  it('emits a loader that calls loadPageCape', () => {
    const loader = buildTsBlockDrivenLoader('landing', 'landing', blocks);
    assert.match(loader, /export async function loadLandingData/);
    assert.match(loader, /loadPageCape\(["']landing["']/);
    assert.match(loader, /"key":"background","path":"landing\.background","type":"image"/);
    assert.match(loader, /"key":"title","path":"landing\.title","type":"i18n-string"/);
    assert.match(loader, /"key":"cta","path":"landing\.cta","type":"array"/);
  });
});

describe('buildTsBlockDrivenPage - loading', () => {
  const blocks = [
    { name: 'background', settings: {} },
    { name: 'loading-indicator', settings: { kind: 'ring', minDisplayMs: 800 } },
  ];

  it('auto-advances to the next configured page after the minimum display time', () => {
    const route = buildTsBlockDrivenPage('loading', 'loading', blocks, {
      pages: ['loading', 'landing', 'game'],
      routeMap: { loading: '/loading', landing: '/landing', game: '/game' },
    });
    assert.match(route, /createFileRoute\(["']\/loading["']\)/);
    assert.match(route, /import \{ useEffect \} from 'react'/);
    assert.match(route, /window\.setTimeout/);
    assert.match(route, /router\.navigate\(\{ to: ["']\/landing["'] as never, replace: true \}\), 800/);
  });
});

describe('buildTsBlockDrivenPage - loading-video', () => {
  const blocks = [
    { name: 'background', settings: { kind: 'solid' } },
    { name: 'header-chrome', settings: { leftSlot: 'none', rightSlot: 'none' } },
    { name: 'video-player', settings: { muted: true, loop: true, onEnd: 'wait-for-engine', readyFallbackSec: 8 } },
  ];

  it('waits for Unity boot without rendering a close or howto route', () => {
    const route = buildTsBlockDrivenPage('loading-video', 'loading-video', blocks, {
      pages: ['landing', 'loading-video', 'game'],
      routeMap: { 'loading-video': '/loading-video', game: '/game' },
    });
    assert.match(route, /createFileRoute\(["']\/loading-video["']\)/);
    assert.match(route, /import \{ createFileRoute, useLoaderData, useRouter \} from '@tanstack\/react-router'/);
    assert.match(route, /import \{ useUnity \} from '~\/components\/game\/UnityContext\.tsx'/);
    assert.match(route, /rightSlot="none"/);
    assert.match(route, /void fullBoot\(\)/);
    assert.match(route, /router\.navigate\(\{ to: ["']\/game["'] as never, replace: true \}\)/);
    assert.doesNotMatch(route, /\/howto-play/);
    assert.doesNotMatch(route, /rightSlot="close"/);
  });

  it('falls back to the bundled livewall loading video when CAPE has none', () => {
    const route = buildTsBlockDrivenPage('loading-video', 'loading-video', blocks, {
      pages: ['landing', 'loading-video', 'game'],
      routeMap: { 'loading-video': '/loading-video', game: '/game' },
    });
    assert.match(route, /cape\.video \?\? '\/assets\/livewall-intro-loadingvid\.mp4'/);
  });
});

describe('buildTsBlockDrivenPage - tutorial step flow', () => {
  const blocks = [
    { name: 'background', settings: {} },
    { name: 'title-block', settings: { showSubtitle: true } },
    { name: 'body-copy', settings: {} },
    { name: 'centered-art', settings: { size: 'md' } },
    { name: 'step-indicator', settings: { count: 3, style: 'dots' } },
    { name: 'nav-controls', settings: { showPrev: false, nextExit: 'game' } },
  ];

  it('wires step state and reads steps from the loader', () => {
    const route = buildTsBlockDrivenPage('tutorial', 'tutorial', blocks, {
      routeMap: { tutorial: '/tutorial', game: '/game' },
    });
    assert.match(route, /import \{ useState \} from 'react'/);
    assert.match(route, /const \[stepIndex, setStepIndex\] = useState\(0\)/);
    assert.match(route, /\(data as Record<string, any>\)\.steps as Array/);
    assert.match(route, /const visibleSteps = filledSteps\.length \? filledSteps : rawSteps/);
    assert.match(route, /const isLastStep = safeStepIndex >= totalSteps - 1/);
  });

  it('swaps per-step title, body, art, and background', () => {
    const route = buildTsBlockDrivenPage('tutorial', 'tutorial', blocks, {
      routeMap: { tutorial: '/tutorial', game: '/game' },
    });
    assert.match(route, /currentStep\.image \? \{ kind: 'image' as const, url: currentStep\.image \} : cape\.background/);
    assert.match(route, /title=\{currentStep\.title \|\| cape\.title \|\| "How to play"\}/);
    assert.match(route, /subtitle=\{currentStep\.description \|\| cape\.subtitle\}/);
    assert.match(route, /<BodyCopy text=\{currentStep\.description \?\? cape\.body/);
    assert.match(route, /<CenteredArt image=\{currentStep\.image \?\? cape\.art/);
  });

  it('toggles the next-button label between Continue and Start', () => {
    const route = buildTsBlockDrivenPage('tutorial', 'tutorial', blocks, {
      routeMap: { tutorial: '/tutorial', game: '/game' },
    });
    assert.match(route, /nextLabel=\{isLastStep \? \(cape\.lastLabel \?\? 'Start'\) : \(cape\.nextLabel \?\? 'Continue'\)\}/);
    assert.match(route, /isLastStep \? router\.navigate\(\{ to: ["']\/game["'] as never \}\) : setStepIndex/);
    assert.match(route, /<StepIndicator count=\{totalSteps\} current=\{safeStepIndex\}/);
  });

  it('does not wire step state when nav-controls is absent', () => {
    const noNav = [
      { name: 'step-indicator', settings: { count: 3, style: 'dots' } },
    ];
    const route = buildTsBlockDrivenPage('tutorial', 'tutorial', noNav, {});
    assert.doesNotMatch(route, /useState/);
    assert.doesNotMatch(route, /currentStep/);
  });
});

describe('buildTsBlockDrivenLoader - tutorial steps', () => {
  it('emits per-step bindings and returns a steps array for onboarding pages', () => {
    const blocks = [
      { name: 'background', settings: {} },
      { name: 'title-block', settings: { showSubtitle: true } },
      { name: 'step-indicator', settings: { count: 3, style: 'dots' } },
      { name: 'nav-controls', settings: { showPrev: false, nextExit: 'game' } },
    ];
    const loader = buildTsBlockDrivenLoader('tutorial', 'tutorial', blocks);
    assert.match(loader, /export async function loadTutorialData/);
    assert.match(loader, /"key":"step1Title","path":"tutorial\.step1Title"/);
    assert.match(loader, /"key":"step1Body","path":"tutorial\.step1Body"/);
    assert.match(loader, /"key":"step1Image","path":"tutorial\.step1Image"/);
    assert.match(loader, /"key":"step5Image","path":"tutorial\.step5Image"/);
    assert.match(loader, /"key":"nextLabel","path":"tutorial\.ctaNext"/);
    assert.match(loader, /"key":"lastLabel","path":"tutorial\.cta"/);
    assert.match(loader, /return \{ cape, steps \}/);
  });

  it('does not emit step bindings for non-onboarding pages', () => {
    const loader = buildTsBlockDrivenLoader('landing', 'landing', [
      { name: 'background', settings: {} },
    ]);
    assert.doesNotMatch(loader, /step1Title/);
    assert.match(loader, /return \{ cape \}/);
  });
});

describe('buildTsBlockDrivenPage - block coverage', () => {
  const blocks = [
    { name: 'background', settings: {} },
    { name: 'header-chrome', settings: { leftSlot: 'menu', rightSlot: 'help' } },
    { name: 'brand-chip', settings: { slot: 'content', size: 'md', position: 'center' } },
    { name: 'title-block', settings: { showKicker: true, showSubtitle: true } },
    { name: 'body-copy', settings: {} },
    { name: 'cta-group', settings: { buttons: [{ variant: 'primary', exit: 'game' }, { variant: 'secondary', exit: 'leaderboard' }] } },
    { name: 'footer-link-list', settings: {} },
    { name: 'centered-art', settings: { size: 'md' } },
    { name: 'tagline', settings: {} },
    { name: 'loading-indicator', settings: { kind: 'ring' } },
    { name: 'prize-illustration', settings: {} },
    { name: 'code-box', settings: {} },
    { name: 'qr-display', settings: {} },
    { name: 'channel-tabs', settings: { tabs: ['webshop', 'in-store'], defaultTab: 'webshop' } },
    { name: 'score-readout', settings: { showHighScore: true } },
    { name: 'score-illustration', settings: { position: 'above-title' } },
    { name: 'stats-table', settings: { count: 3 } },
    { name: 'status-chip', settings: { kind: 'registered' } },
    { name: 'compliance-badge', settings: { kind: '18+' } },
    { name: 'rank-list', settings: {} },
    { name: 'leaderboard-tabs', settings: { tabs: ['all', 'daily'], defaultTab: 'all' } },
    { name: 'personal-best-row', settings: {} },
    { name: 'top-n-highlight', settings: { count: 3 } },
    { name: 'step-indicator', settings: { count: 3, style: 'dots', position: 'below' } },
    { name: 'nav-controls', settings: { showPrev: true, nextExit: 'game' } },
    { name: 'field-set', settings: { fields: ['firstName', 'email'] } },
    { name: 'opt-in-list', settings: { optIns: ['terms'], required: true } },
    { name: 'video-player', settings: { muted: true, loop: false, onEnd: 'auto-advance', exit: 'game' } },
    { name: 'skip-control', settings: { availableAfterMs: 1000, exit: 'game' } },
    { name: 'reveal-cta', settings: { variant: 'primary', exit: 'game' } },
    { name: 'fallback-indicator', settings: {} },
    { name: 'audio-toggle', settings: {} },
    { name: 'pause-toggle', settings: {} },
    { name: 'pause-overlay', settings: {} },
    { name: 'timer', settings: { mode: 'countdown', durationSec: 45 } },
    { name: 'sponsor-footer-strip', settings: {} },
    { name: 'menu-item-list', settings: {} },
    { name: 'pre-gate-modal', settings: { kind: 'age-18', persistAcrossSession: true } },
    { name: 'card-wrapper', settings: { style: 'card', cardWidth: 'with-margin' } },
  ];

  it('imports and renders every current block component', () => {
    const route = buildTsBlockDrivenPage('result', 'result', blocks, {
      routeMap: { game: '/game', leaderboard: '/leaderboard' },
    });

    for (const block of blocks) {
      const component = block.name.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');
      assert.match(route, new RegExp(`import \\{ ${component} \\}`), `${component} import missing`);
      assert.match(route, new RegExp(`<${component}`), `${component} render missing`);
    }
    assert.match(route, /router\.navigate/);
    assert.match(route, /durationSec=\{45\}/);
    assert.match(route, /defaultTab="all"/);
  });
});
