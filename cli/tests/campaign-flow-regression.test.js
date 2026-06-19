import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildBlockDrivenPage } from '../page-builder.js';
import { buildTsBlockDrivenPage } from '../tanstack-block-page-builder.js';

// Campaign-flow regression guard. Every behavior here is a bug that was fixed
// during a long debugging session; this file regenerates the key pages on BOTH
// stacks and asserts the fix is present, so a scaffolded campaign can't silently
// regress to: a second loader, a paused-on-start game, a tutorial that repeats,
// a dead /register link, an intro with a close button / skip timer, a frozen
// game after refresh, or unresolved CAPE titles.

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

// Full canonical flow WITHOUT register — so the result CTA's default register
// exit must gate to a real page instead of 404ing.
const PAGES = ['intro-video', 'landing', 'tutorial', 'loading-video', 'game', 'result', 'leaderboard'];
const nextOpts = { pageId: undefined, pages: PAGES, capeId: '70001', flowRules: {}, routeMap: { 'intro-video': '/intro-video', landing: '/landing', tutorial: '/tutorial', 'loading-video': '/loading-video', game: '/gameplay', result: '/result', leaderboard: '/leaderboard' } };
const tsOpts = { pages: PAGES, capeId: '70002', flowRules: {}, routeMap: { 'intro-video': '/intro-video', landing: '/landing', tutorial: '/tutorial', 'loading-video': '/loading-video', game: '/game', result: '/result', leaderboard: '/leaderboard' } };

const BLOCKS = {
  'loading-video': [ { name: 'background', settings: { kind: 'solid' } }, { name: 'video-player', settings: { muted: true, loop: true, onEnd: 'wait-for-engine', exit: 'game' } } ],
  'intro-video': [ { name: 'background', settings: { kind: 'solid' } }, { name: 'video-player', settings: { muted: true, loop: false, onEnd: 'auto-advance' } } ],
  landing: [ { name: 'background', settings: { kind: 'image' } }, { name: 'title-block', settings: { showSubtitle: true } }, { name: 'cta-group', settings: { buttons: [{ variant: 'primary', exit: 'tutorial' }] } } ],
  tutorial: [ { name: 'background', settings: {} }, { name: 'title-block', settings: {} }, { name: 'body-copy', settings: {} }, { name: 'step-indicator', settings: { count: 3 } }, { name: 'nav-controls', settings: { showPrev: false, nextExit: 'loading-video' } } ],
  result: [ { name: 'background', settings: { kind: 'image' } }, { name: 'title-block', settings: { showKicker: true } }, { name: 'score-readout', settings: { showHighScore: true } }, { name: 'cta-group', settings: { buttons: [{ variant: 'primary', exit: 'register' }] } } ],
};

const nextPage = (id, type) => buildBlockDrivenPage(id, type, BLOCKS[id], { ...nextOpts, pageId: id });
const tsPage = (id, type) => buildTsBlockDrivenPage(id, type, BLOCKS[id], tsOpts);

describe('campaign-flow regression — Next', () => {
  it('lib/cape aliases CAPE field names (titles resolve, not fallback)', () => {
    const cape = readFileSync(join(root, 'base-templates', 'next-unity', 'lib', 'cape.ts'), 'utf8');
    assert.match(cape, /applyFieldAliases/);
    assert.match(cape, /headline/);
  });
  it('loading-video is the single loader (fullBoot, preload flag, no premature loadProgress advance, manual Continue)', () => {
    const out = nextPage('loading-video', 'video');
    assert.match(out, /unity\.fullBoot\(\)/);
    assert.match(out, /unity-started-from-video/);
    assert.doesNotMatch(out, /loadProgress >= 100/);
    assert.match(out, /canContinue/);
    // Timed advance is MOCK-ONLY (GAME_MOCK fast-path, no engine to wait for).
    // Real builds still advance on fullBoot; the real-path timer only reveals
    // the manual Continue (setCanContinue), it never auto-navigates.
    assert.match(out, /NEXT_PUBLIC_GAME_MOCK === 'true'/);
    assert.match(out, /setTimeout\(\(\) => goToGame\(\)/);
    assert.match(out, /unity\.fullBoot\(\)\s*\.then\(\(\) => goToGame\(\)\)/);
  });
  it('intro-video has no close button, no skip timer, advances on video end', () => {
    const out = nextPage('intro-video', 'video');
    assert.doesNotMatch(out, /HeaderChrome/);
    assert.doesNotMatch(out, /SkipControl/);
    assert.match(out, /onEnded=\{\(\) => router\.push\("\/landing"\)\}/);
  });
  it('landing gates the tutorial behind the once-per-browser onboarding flag', () => {
    const out = nextPage('landing', 'landing');
    assert.match(out, /isOnboardingDone\(\)/);
  });
  it('result CTA does not link to a non-existent register page', () => {
    const out = nextPage('result', 'result');
    assert.doesNotMatch(out, /\/register/);
  });
  it('gameplay (base template) has mount-marker recovery, start-when-ready, and the apiRequest bridge', () => {
    const gp = readFileSync(join(root, 'base-templates', 'next-unity', 'app', '(campaign)', 'gameplay', 'page.tsx'), 'utf8');
    assert.match(gp, /lw-game-page-mounted/);
    assert.match(gp, /Start when ready/);
    assert.match(gp, /showLoader/);
    assert.match(gp, /addEventListener\('apiRequest'/);
    assert.match(gp, /ProcessResponse/);
  });
});

describe('campaign-flow regression — TanStack', () => {
  it('loading-video is the single loader (fullBoot, preload flag, no premature loadProgress advance, manual Continue)', () => {
    const out = tsPage('loading-video', 'video');
    assert.match(out, /void fullBoot\(\)/);
    assert.match(out, /unity-started-from-video/);
    assert.doesNotMatch(out, /loadProgress >= 100/);
    assert.match(out, /canContinue/);
  });
  it('intro-video has no close button / no skip timer and waits for the asset download', () => {
    const out = tsPage('intro-video', 'video');
    assert.doesNotMatch(out, /HeaderChrome/);
    assert.doesNotMatch(out, /SkipControl/);
    assert.match(out, /loadProgress/);
  });
  it('landing gates the tutorial behind the onboarding flag', () => {
    const out = tsPage('landing', 'landing');
    assert.match(out, /isOnboardingDone\(\)/);
  });
  it('tutorial marks onboarding done and auto-skips on return', () => {
    const out = tsPage('tutorial', 'onboarding');
    assert.match(out, /markOnboardingDone\(\)/);
    assert.match(out, /if \(isOnboardingDone\(\)\) void router\.navigate/);
  });
  it('result CTA does not link to a non-existent register page', () => {
    const out = tsPage('result', 'result');
    assert.doesNotMatch(out, /\/register/);
  });
  it('game (base template) has mount-marker recovery, start-when-ready, preloaded skip, and the apiRequest bridge', () => {
    const g = readFileSync(join(root, 'base-templates', 'tanstack-unity', 'src', 'routes', 'game.tsx'), 'utf8');
    assert.match(g, /lw-game-page-mounted/);
    assert.match(g, /showLoader/);
    assert.match(g, /unity-started-from-video/);
    assert.match(g, /addEventListener\('apiRequest'/);
    assert.match(g, /ProcessResponse/);
  });
});
