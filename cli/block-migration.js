import { defaultBlocksForPage, ensurePageBlocksForPages } from './block-defaults.js';

const LEGACY_TO_BLOCK_MAPPING = {
  landing: {
    showKicker: { block: 'title-block', key: 'showKicker' },
    showSubtitle: { block: 'title-block', key: 'showSubtitle' },
  },
  tutorial: {
    allowSkip: { block: 'nav-controls', key: 'allowSkip' },
  },
  onboarding: {
    allowSkip: { block: 'nav-controls', key: 'allowSkip' },
  },
  game: {
    timerEnabled: { block: 'timer', key: 'enabled' },
    timerSec: { block: 'timer', key: 'durationSec' },
  },
  voucher: {
    showQr: { block: 'qr-display', key: 'enabled' },
  },
  register: {
    requireOptIns: { block: 'opt-in-list', key: 'required' },
  },
};

export function migratePageSettingsToBlocks(pageType, legacySettings = {}) {
  const result = defaultBlocksForPage(pageType);
  const mapping = LEGACY_TO_BLOCK_MAPPING[pageType] ?? {};

  for (const [legacyKey, value] of Object.entries(legacySettings ?? {})) {
    const target = mapping[legacyKey];
    if (!target || !result.blocks[target.block]) continue;
    if (target.key === 'enabled') {
      result.blocks[target.block].enabled = Boolean(value);
      continue;
    }
    result.blocks[target.block].settings = {
      ...result.blocks[target.block].settings,
      [target.key]: value,
    };
  }

  return result;
}

export function migrateScaffoldConfig(config) {
  if (config.pageBlocks && Object.keys(config.pageBlocks).length > 0) return config;
  const migrated = ensurePageBlocksForPages(config);
  for (const page of migrated.pages ?? []) {
    const pageId = typeof page === 'string' ? page : page.id;
    const pageType = typeof page === 'string' ? page : (page.type ?? page.id);
    migrated.pageBlocks[pageId] = migratePageSettingsToBlocks(
      pageType,
      config.pageSettings?.[pageId] ?? {},
    );
  }
  return migrated;
}
