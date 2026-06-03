import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { migratePageSettingsToBlocks, migrateScaffoldConfig } from '../block-migration.js';

describe('migratePageSettingsToBlocks', () => {
  it('returns the default landing block list for a landing page', () => {
    const result = migratePageSettingsToBlocks('landing', {});
    assert.ok(result.blocks.background);
    assert.ok(result.blocks['title-block']);
    assert.ok(result.blocks['cta-group']);
  });

  it('carries over a legacy showKicker setting to the title-block', () => {
    const result = migratePageSettingsToBlocks('landing', { showKicker: true });
    assert.equal(result.blocks['title-block'].settings.showKicker, true);
  });

  it('returns an empty block map for unknown page types', () => {
    assert.deepEqual(migratePageSettingsToBlocks('flying-toaster', {}), { blocks: {}, blockOrder: [] });
  });
});

describe('migrateScaffoldConfig', () => {
  it('moves migrated keys to blocks and strips them from pageSettings', () => {
    const legacy = {
      pages: [{ id: 'landing', type: 'landing', route: '/landing' }],
      pageSettings: { landing: { showKicker: true } },
    };
    const migrated = migrateScaffoldConfig(legacy);
    assert.ok(migrated.pageBlocks.landing);
    assert.equal(migrated.pageBlocks.landing.blocks['title-block'].settings.showKicker, true);
    // showKicker has a block mapping — it must not linger in pageSettings.
    assert.equal(migrated.pageSettings.landing, undefined);
  });

  it('preserves pageSettings keys that have no block mapping', () => {
    const legacy = {
      pages: [{ id: 'landing', type: 'landing', route: '/landing' }],
      pageSettings: { landing: { showKicker: true, onboardingFirstRunOnly: false } },
    };
    const migrated = migrateScaffoldConfig(legacy);
    assert.equal(migrated.pageBlocks.landing.blocks['title-block'].settings.showKicker, true);
    assert.equal(migrated.pageSettings.landing.onboardingFirstRunOnly, false);
    assert.equal(migrated.pageSettings.landing.showKicker, undefined);
  });

  it('is a no-op for configs that already have pageBlocks', () => {
    const already = {
      pages: [],
      pageSettings: {},
      pageBlocks: { landing: { blocks: { background: { enabled: true, settings: {} } } } },
    };
    const out = migrateScaffoldConfig(already);
    assert.deepEqual(out, already);
  });
});
