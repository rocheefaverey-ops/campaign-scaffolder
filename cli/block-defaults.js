const VIDEO_PAGE_IDS = new Set(['video', 'intro-video', 'loading-video', 'ad-video']);

export function normalizeBlockPageType(pageType) {
  if (VIDEO_PAGE_IDS.has(pageType)) return 'video';
  if (pageType === 'tutorial') return 'onboarding';
  if (pageType === 'gameplay') return 'game';
  return pageType;
}

function block(enabled, settings = {}) {
  return { enabled, settings };
}

function page(blocks, blockOrder = Object.keys(blocks)) {
  return { blocks, blockOrder };
}

export const DEFAULT_PAGE_BLOCKS = {
  loading: page({
    background: block(true, { kind: 'image' }),
    'centered-art': block(true, { size: 'md' }),
    'brand-chip': block(true, { size: 'md' }),
    tagline: block(true, {}),
    'loading-indicator': block(true, { kind: 'ring', minDisplayMs: 800 }),
  }),

  landing: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'menu', rightSlot: 'none' }),
    'brand-chip': block(true, { size: 'md' }),
    'title-block': block(true, { showKicker: false, showSubtitle: false }),
    'cta-group': block(true, { count: 1, buttons: [{ variant: 'primary', exit: 'game' }] }),
    'footer-link-list': block(false, {}),
    'compliance-badge': block(false, { kind: '18+' }),
    'pre-gate-modal': block(false, { kind: 'age-18', persistAcrossSession: true }),
  }),

  onboarding: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'back', rightSlot: 'none' }),
    'brand-chip': block(true, { size: 'md' }),
    'centered-art': block(true, { size: 'md' }),
    'title-block': block(true, { showKicker: false, showSubtitle: true }),
    'body-copy': block(true, { markdown: true }),
    'step-indicator': block(true, { count: 3, style: 'dots' }),
    'nav-controls': block(true, { showPrev: false, nextExit: 'game' }),
    'compliance-badge': block(false, { kind: '18+' }),
  }),

  video: page({
    background: block(true, { kind: 'solid' }),
    'header-chrome': block(true, { leftSlot: 'none', rightSlot: 'close' }),
    'brand-chip': block(false, { size: 'sm' }),
    'video-player': block(true, { muted: true, loop: false, onEnd: 'auto-advance', availableAfterMs: 3000 }),
    'skip-control': block(true, { availableAfterMs: 3000, exit: 'game' }),
    'reveal-cta': block(false, { exit: 'game', variant: 'primary' }),
    'fallback-indicator': block(false, {}),
  }),

  game: page({
    background: block(true, { kind: 'solid' }),
    'header-chrome': block(false, { leftSlot: 'none', rightSlot: 'none' }),
    'audio-toggle': block(true, {}),
    'pause-toggle': block(true, {}),
    timer: block(true, { mode: 'countdown', durationSec: 60 }),
    'score-readout': block(false, { showHighScore: false }),
    'sponsor-footer-strip': block(false, {}),
    'pause-overlay': block(true, { showRestart: true, showHowToPlay: true }),
  }),

  result: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'none', rightSlot: 'close' }),
    'brand-chip': block(true, { size: 'md' }),
    'title-block': block(true, { showKicker: true, showSubtitle: true }),
    'body-copy': block(true, { markdown: true }),
    'score-readout': block(true, { showHighScore: true }),
    'score-illustration': block(false, {}),
    'stats-table': block(false, { count: 3, rows: [{ label: 'Score', value: 'score' }, { label: 'Rank', value: 'rank' }, { label: 'Best', value: 'highScore' }] }),
    'status-chip': block(false, { kind: 'registered' }),
    'cta-group': block(true, { count: 2, buttons: [{ variant: 'primary', exit: 'voucher' }, { variant: 'secondary', exit: 'game' }] }),
    'compliance-badge': block(false, { kind: '18+' }),
    'footer-link-list': block(false, {}),
  }),

  leaderboard: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'back', rightSlot: 'none' }),
    'brand-chip': block(true, { size: 'md' }),
    'title-block': block(true, { showKicker: true, showSubtitle: true }),
    'leaderboard-tabs': block(true, { tabs: ['all', 'daily', 'weekly'], defaultTab: 'all' }),
    'rank-list': block(true, { rows: 10 }),
    'top-n-highlight': block(false, { count: 3 }),
    'personal-best-row': block(true, {}),
    'cta-group': block(true, { count: 1, buttons: [{ variant: 'primary', exit: 'landing' }] }),
  }),

  register: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'back', rightSlot: 'none' }),
    'brand-chip': block(true, { size: 'md' }),
    'card-wrapper': block(true, { style: 'card', cardWidth: 'with-margin' }),
    'title-block': block(true, { showKicker: false, showSubtitle: true }),
    'body-copy': block(false, { markdown: true }),
    'field-set': block(true, { fields: ['firstName', 'lastName', 'email'] }),
    'opt-in-list': block(true, { optIns: ['terms'] }),
    'cta-group': block(true, { count: 1, buttons: [{ variant: 'primary', exit: 'result' }] }),
    'footer-link-list': block(false, {}),
  }),

  voucher: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'back', rightSlot: 'close' }),
    'brand-chip': block(true, { size: 'md' }),
    'title-block': block(true, { showKicker: true, showSubtitle: false }),
    'body-copy': block(true, { markdown: true }),
    'channel-tabs': block(false, { tabs: ['webshop', 'in-store'], defaultTab: 'webshop' }),
    'code-box': block(true, {}),
    'qr-display': block(true, {}),
    'cta-group': block(true, { count: 1, buttons: [{ variant: 'primary', exit: 'leaderboard' }] }),
    'compliance-badge': block(false, { kind: '18+' }),
    'footer-link-list': block(true, {}),
  }),

  end: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'none', rightSlot: 'close' }),
    'brand-chip': block(true, { size: 'md' }),
    'title-block': block(true, { showKicker: true, showSubtitle: false }),
    'body-copy': block(true, { markdown: true }),
    'prize-illustration': block(true, {}),
    'cta-group': block(true, { count: 2, buttons: [{ variant: 'icon-only', exit: 'leaderboard' }, { variant: 'primary', exit: 'game' }] }),
    'compliance-badge': block(false, { kind: '18+' }),
    'footer-link-list': block(false, {}),
  }),

  menu: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'back', rightSlot: 'none' }),
    'brand-chip': block(true, { size: 'md' }),
    'menu-item-list': block(true, { items: ['home', 'howToPlay', 'leaderboard', 'terms', 'privacy'] }),
  }),
};

DEFAULT_PAGE_BLOCKS.tutorial = DEFAULT_PAGE_BLOCKS.onboarding;
DEFAULT_PAGE_BLOCKS['intro-video'] = DEFAULT_PAGE_BLOCKS.video;
DEFAULT_PAGE_BLOCKS['loading-video'] = DEFAULT_PAGE_BLOCKS.video;
DEFAULT_PAGE_BLOCKS['ad-video'] = DEFAULT_PAGE_BLOCKS.video;

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function defaultBlocksForPage(pageType) {
  const direct = DEFAULT_PAGE_BLOCKS[pageType];
  if (direct) return clone(direct);
  const normalized = DEFAULT_PAGE_BLOCKS[normalizeBlockPageType(pageType)];
  return normalized ? clone(normalized) : { blocks: {}, blockOrder: [] };
}

export function blockConfigToList(pageBlocksConfig) {
  const blocks = pageBlocksConfig?.blocks ?? {};
  const order = pageBlocksConfig?.blockOrder?.length ? pageBlocksConfig.blockOrder : Object.keys(blocks);
  return order
    .filter((name) => blocks[name]?.enabled)
    .map((name) => ({ name, settings: blocks[name]?.settings ?? {} }));
}

export function pageBlocksToBlocksConfig(pageBlocks = {}) {
  const payload = {};
  for (const [pageId, config] of Object.entries(pageBlocks ?? {})) {
    const blocks = blockConfigToList(config);
    if (blocks.length > 0) payload[pageId] = { blocks };
  }
  return payload;
}

export function ensurePageBlocksForPages(config) {
  const pageBlocks = { ...(config.pageBlocks ?? {}) };
  for (const page of config.pages ?? []) {
    const pageId = typeof page === 'string' ? page : page.id;
    const pageType = typeof page === 'string' ? page : (page.type ?? page.id);
    if (!pageBlocks[pageId]) pageBlocks[pageId] = defaultBlocksForPage(pageType);
  }
  return { ...config, pageBlocks };
}
