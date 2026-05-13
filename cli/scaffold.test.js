import assert from 'node:assert/strict';
import { basePageType, routeFor, validateConfig } from './scaffold.js';

let pass = 0;
let fail = 0;

function t(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
    pass++;
  } catch (err) {
    console.error(`  FAIL ${name}\n    ${err.message}`);
    fail++;
  }
}

console.log('basePageType()');
t('returns the page id when no suffix is present', () => {
  assert.equal(basePageType('video'), 'video');
  assert.equal(basePageType('landing'), 'landing');
  assert.equal(basePageType('intro-video'), 'intro-video');
  assert.equal(basePageType('loading-video'), 'loading-video');
  assert.equal(basePageType('ad-video'), 'ad-video');
});
t('leaves legacy suffixed ids unchanged', () => {
  assert.equal(basePageType('landing-2'), 'landing-2');
  assert.equal(basePageType('video-2'), 'video-2');
});

console.log('routeFor()');
t('uses canonical routes for singleton pages', () => {
  assert.equal(routeFor('game'), '/gameplay');
  assert.equal(routeFor('video'), '/video');
  assert.equal(routeFor('intro-video'), '/intro-video');
  assert.equal(routeFor('loading-video'), '/loading-video');
  assert.equal(routeFor('ad-video'), '/ad-video');
});

t('uses routeMap override when provided', () => {
  const routeMap = { landing: '/home', game: '/play' };
  assert.equal(routeFor('landing', routeMap), '/home');
  assert.equal(routeFor('game', routeMap), '/play');
  assert.equal(routeFor('result', routeMap), '/result');   // falls back to PAGE_ROUTES
  assert.equal(routeFor('custom-page', routeMap), '/custom-page'); // falls back to /${id}
});
t('defaults to PAGE_ROUTES when routeMap is empty', () => {
  assert.equal(routeFor('game', {}), '/gameplay');
  assert.equal(routeFor('video-2', {}), '/video-2');
});

console.log('validateConfig()');
t('rejects engine none with a game page', () => {
  const { errors } = validateConfig({ game: 'none', pages: ['landing', 'game', 'result'] });
  assert.ok(errors.some((e) => /game.+requires an engine/i.test(e)));
});
t('does not treat legacy suffixed ids as valid explicit video pages', () => {
  const { errors } = validateConfig({ game: 'unity', pages: ['video-2', 'game', 'result'] });
  assert.equal(errors.length, 0);
  assert.equal(routeFor('video-2'), '/video-2');
});
t('warns when engine is set without a game page', () => {
  const { errors, warnings } = validateConfig({ game: 'unity', pages: ['landing', 'video', 'result'] });
  assert.equal(errors.length, 0);
  assert.ok(warnings.some((w) => /no `game` page/i.test(w)));
});
t('passes valid explicit video flow', () => {
  const { errors } = validateConfig({
    game: 'unity',
    pages: ['landing', 'intro-video', 'onboarding', 'loading-video', 'game', 'result', 'ad-video'],
  });
  assert.equal(errors.length, 0);
});
t('warns when a module has no supporting page', () => {
  const { warnings } = validateConfig({
    game: 'unity',
    pages: ['landing', 'onboarding'],
    modules: ['leaderboard'],
  });
  assert.ok(warnings.some((w) => /Ignoring module "leaderboard"/i.test(w)));
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
