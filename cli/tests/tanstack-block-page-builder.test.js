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

  it('routes game CTAs through loading-video when present', () => {
    const route = buildTsBlockDrivenPage('landing', 'landing', blocks, {
      pages: ['landing', 'loading-video', 'game'],
      routeMap: { 'loading-video': '/loading-video', game: '/game' },
    });

    assert.match(route, /router\.navigate\(\{ to: '\/loading-video' as never \}\)/);
    assert.doesNotMatch(route, /router\.navigate\(\{ to: '\/game' as never \}\)/);
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

  it('auto-advances loading pages even when the loading indicator block is disabled', () => {
    const route = buildTsBlockDrivenPage('loading', 'loading', [
      { name: 'background', settings: { kind: 'video' } },
      { name: 'brand-chip', settings: { size: 'md' } },
    ], {
      pages: ['loading', 'landing'],
      routeMap: { loading: '/loading', landing: '/landing' },
    });

    assert.match(route, /window\.setTimeout/);
    assert.match(route, /router\.navigate\(\{ to: ["']\/landing["'] as never, replace: true \}\), 800/);
    assert.doesNotMatch(route, /LoadingIndicator/);
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
    assert.match(route, /cape\.video \?\? '\/assets\/livewall-loading\.mp4'/);
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

  it('routes final tutorial step through loading-video when present', () => {
    const route = buildTsBlockDrivenPage('tutorial', 'tutorial', blocks, {
      pages: ['landing', 'tutorial', 'loading-video', 'game'],
      routeMap: { tutorial: '/tutorial', 'loading-video': '/loading-video', game: '/game' },
    });

    assert.match(route, /isLastStep \? router\.navigate\(\{ to: ["']\/loading-video["'] as never \}\) : setStepIndex/);
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
    assert.match(loader, /"key":"step3Image","path":"tutorial\.step3Image"/);
    assert.doesNotMatch(loader, /step4/);
    assert.doesNotMatch(loader, /step5/);
    assert.match(loader, /Array\.from\(\{ length: 3 \}/);
    assert.match(loader, /"key":"nextLabel","path":"tutorial\.ctaNext"/);
    assert.match(loader, /"key":"lastLabel","path":"tutorial\.cta"/);
    assert.match(loader, /return \{ cape, steps \}/);
  });

  it('honors a custom step-indicator count', () => {
    const loader = buildTsBlockDrivenLoader('tutorial', 'tutorial', [
      { name: 'step-indicator', settings: { count: 2, style: 'dots' } },
    ]);
    assert.match(loader, /"key":"step2Image","path":"tutorial\.step2Image"/);
    assert.doesNotMatch(loader, /step3/);
    assert.match(loader, /Array\.from\(\{ length: 2 \}/);
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
    assert.match(route, /useUnityStore/);
    assert.match(route, /const currentScore = result\.score \?\? cape\.score \?\? 0/);
    assert.match(route, /durationSec=\{45\}/);
    assert.match(route, /defaultTab="all"/);
  });

  it('honors numeric display limits from block settings', () => {
    const route = buildTsBlockDrivenPage('leaderboard', 'leaderboard', [
      { name: 'title-block', settings: { showKicker: true, showSubtitle: true } },
      { name: 'rank-list', settings: { rows: 4 } },
      { name: 'personal-best-row', settings: {} },
      { name: 'stats-table', settings: { count: 2 } },
      { name: 'top-n-highlight', settings: { count: 5 } },
    ], {});

    assert.match(route, /cape\.title && cape\.title !== 'Title' \? cape\.title : "Leaderboard"/);
    assert.match(route, /rows=\{\(cape\.rankings \?\? \[\]\)\.slice\(0, 4\)\}/);
    assert.match(route, /rank=\{cape\.personalRank\} score=\{cape\.personalBest\}/);
    assert.doesNotMatch(route, /personalRank \?\? 0/);
    assert.doesNotMatch(route, /personalBest \?\? 0/);
    assert.match(route, /<StatsTable rows=\{cape\.stats \?\? \[\]\} count=\{2\}/);
    assert.match(route, /<TopNHighlight label=\{cape\.topNLabel \?\? ''\} count=\{5\}/);
  });

  it('keeps card page header chrome outside the card wrapper', () => {
    const route = buildTsBlockDrivenPage('register', 'register', [
      { name: 'background', settings: { kind: 'image' } },
      { name: 'header-chrome', settings: { leftSlot: 'back', rightSlot: 'close' } },
      { name: 'card-wrapper', settings: { style: 'card', cardWidth: 'with-margin' } },
      { name: 'title-block', settings: { showSubtitle: true } },
      { name: 'cta-group', settings: { buttons: [{ variant: 'primary', exit: 'voucher' }] } },
    ], {});

    assert.match(route, /<HeaderChrome[\s\S]*<CardWrapper/);
    assert.doesNotMatch(route, /<CardWrapper[\s\S]*<HeaderChrome/);
  });

  it('marks registration locally and skips the register page after submit', () => {
    const route = buildTsBlockDrivenPage('register', 'register', [
      { name: 'background', settings: { kind: 'image' } },
      { name: 'card-wrapper', settings: { style: 'card', cardWidth: 'with-margin' } },
      { name: 'title-block', settings: { showSubtitle: true } },
      { name: 'cta-group', settings: { buttons: [{ variant: 'primary', exit: 'voucher' }] } },
    ], {
      capeId: '63633',
      pages: ['result', 'register', 'voucher'],
      routeMap: { voucher: '/voucher' },
    });

    assert.match(route, /const REGISTERED_KEY = "lw_registered_63633"/);
    assert.match(route, /if \(registered\) void router\.navigate\(\{ to: "\/voucher" as never, replace: true \}\)/);
    assert.match(route, /markRegistered\(\); router\.navigate\(\{ to: '\/voucher' as never \}\)/);
  });

  it('shows leaderboard and play-again result actions after registration', () => {
    const route = buildTsBlockDrivenPage('result', 'result', [
      { name: 'background', settings: { kind: 'image' } },
      { name: 'score-readout', settings: { showHighScore: true } },
      { name: 'cta-group', settings: {
        buttons: [{ variant: 'primary', exit: 'register' }],
        registeredButtons: [
          { variant: 'secondary', exit: 'landing' },
          { variant: 'tertiary', exit: 'leaderboard' },
          { variant: 'primary', exit: 'game' },
        ],
      } },
    ], {
      capeId: '63633',
      pages: ['result', 'register', 'landing', 'loading-video', 'game', 'leaderboard'],
      routeMap: { register: '/register', landing: '/landing', 'loading-video': '/loading-video', game: '/game', leaderboard: '/leaderboard' },
    });

    assert.match(route, /const \[hasRegistered, setHasRegistered\] = useState\(false\)/);
    assert.match(route, /hasRegistered \? \[\{ label: cape\.registeredCta\?\.\[0\]\?\.label \|\| cape\.registeredCta\?\.\[0\] \|\| "Home"/);
    assert.match(route, /router\.navigate\(\{ to: '\/landing' as never \}\)/);
    assert.match(route, /\{ label: cape\.registeredCta\?\.\[1\]\?\.label \|\| cape\.registeredCta\?\.\[1\] \|\| "Leaderboard", variant: 'tertiary', onClick: \(\) => router\.navigate\(\{ to: '\/leaderboard' as never \}\) \}/);
    assert.match(route, /\{ label: cape\.registeredCta\?\.\[2\]\?\.label \|\| cape\.registeredCta\?\.\[2\] \|\| "Play again", variant: 'primary', onClick: \(\) => router\.navigate\(\{ to: '\/loading-video' as never \}\) \}/);
    assert.match(route, /: \[\{ label: cape\.cta\?\.\[0\]\?\.label/);
  });

  it('emits route-aware menu targets without sending missing legal links to landing', () => {
    const route = buildTsBlockDrivenPage('menu', 'menu', [
      { name: 'background', settings: { kind: 'image' } },
      { name: 'menu-item-list', settings: { items: ['home', 'howToPlay', 'terms', 'privacy', 'leave'] } },
    ], {
      pages: ['loading', 'landing', 'tutorial', 'game', 'leaderboard', 'menu'],
      routeMap: { landing: '/landing', tutorial: '/tutorial', game: '/game', leaderboard: '/leaderboard', menu: '/menu' },
    });

    assert.match(route, /"home":"\/landing"/);
    assert.match(route, /"howToPlay":"\/tutorial"/);
    assert.match(route, /"leaderboard":"\/leaderboard"/);
    assert.match(route, /"terms":"#"/);
    assert.match(route, /"privacy":"#"/);
    assert.match(route, /"leave":"#"/);
  });
});

describe('buildTsBlockDrivenLoader - leaderboard data', () => {
  it('loads API leaderboard rows into the cape data consumed by leaderboard blocks', () => {
    const loader = buildTsBlockDrivenLoader('leaderboard', 'leaderboard', [
      { name: 'title-block', settings: { showKicker: true, showSubtitle: true } },
      { name: 'rank-list', settings: { rows: 10 } },
      { name: 'personal-best-row', settings: {} },
    ]);

    assert.match(loader, /import \{ getLeaderboardRequest \} from '~\/server\/api\/endpoints\/Leaderboard\.ts'/);
    assert.match(loader, /getLeaderboardRequest\(\{ data: \{ type: 'total', offset: 0, limit: 10 \} \}\)/);
    assert.match(loader, /cape\.rankings = entries\.map/);
    assert.match(loader, /you: Boolean\(entry\.you \?\? entry\.isYou \?\? entry\.isCurrentPlayer\)/);
    assert.match(loader, /cape\.personalRank = personalBest\?\.rank/);
    assert.match(loader, /cape\.personalBest = personalBest\?\.score/);
  });
});

describe('buildTsBlockDrivenLoader - result score data', () => {
  it('seeds result score copy from the local leaderboard fixture', () => {
    const loader = buildTsBlockDrivenLoader('result', 'result', [
      { name: 'score-readout', settings: { showHighScore: true } },
    ]);

    assert.match(loader, /import \{ leaderboardFixture \} from '~\/server\/api\/fixtures\/LeaderboardFixture\.ts'/);
    assert.match(loader, /cape\.score = fixture\.personalBest\?\.score \?\? cape\.score \?\? 0/);
    assert.match(loader, /cape\.highScore = bestScore \|\| cape\.highScore \|\| cape\.score/);
  });
});
