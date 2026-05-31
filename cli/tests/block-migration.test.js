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
  it('adds pageBlocks to a legacy config without losing the original pageSettings', () => {
    const legacy = {
      pages: [{ id: 'landing', type: 'landing', route: '/landing' }],
      pageSettings: { landing: { showKicker: true } },
    };
    const migrated = migrateScaffoldConfig(legacy);
    assert.ok(migrated.pageBlocks.landing);
    assert.equal(migrated.pageBlocks.landing.blocks['title-block'].settings.showKicker, true);
    assert.deepEqual(migrated.pageSettings, legacy.pageSettings);
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
