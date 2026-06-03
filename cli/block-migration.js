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
  // Clone pageSettings so we can strip migrated keys without mutating the caller's object.
  const nextPageSettings = { ...(migrated.pageSettings ?? config.pageSettings ?? {}) };
  for (const page of migrated.pages ?? []) {
    const pageId = typeof page === 'string' ? page : page.id;
    const pageType = typeof page === 'string' ? page : (page.type ?? page.id);
    const legacy = config.pageSettings?.[pageId] ?? {};
    migrated.pageBlocks[pageId] = migratePageSettingsToBlocks(pageType, legacy);

    // After migration, drop the keys that now live on blocks so they can't
    // shadow block values on subsequent loads. Keys without a block mapping
    // (e.g. landing.onboardingFirstRunOnly, tutorial.screenLayout) stay put.
    const mapping = LEGACY_TO_BLOCK_MAPPING[pageType] ?? {};
    const migratedKeys = Object.keys(mapping);
    if (migratedKeys.length > 0 && nextPageSettings[pageId]) {
      const remaining = { ...nextPageSettings[pageId] };
      for (const key of migratedKeys) delete remaining[key];
      if (Object.keys(remaining).length > 0) nextPageSettings[pageId] = remaining;
      else delete nextPageSettings[pageId];
    }
  }
  migrated.pageSettings = nextPageSettings;
  return migrated;
}
