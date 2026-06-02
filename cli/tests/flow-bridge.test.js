import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveFlowFromBlocks, mapButtonsToExits, mergeDerivedFlow, deriveMenuItemsEnabled, CTA_GROUP_PAGE_TYPES } from '../flow-bridge.js';

const ctx = {
  ids: ['landing', 'tutorial', 'game', 'result', 'leaderboard', 'voucher', 'end'],
  typeOf: (id) => id,
  firstOfType: (type) => (type === 'game' ? 'game' : null),
  entryId: 'landing',
};

describe('mapButtonsToExits', () => {
  it('maps the first button to the page\'s next exit (target + variant)', () => {
    const out = mapButtonsToExits('landing', 'landing', [{ variant: 'primary', exit: 'game' }], ctx);
    assert.equal(out.flowExits['landing.next'], 'game');
    assert.equal(out.flowButtonVariants['landing.next'], 'primary');
    assert.deepEqual(out.warnings, []);
    // A lone primary button never enables an optional exit.
    assert.deepEqual(out.flowEnabledExits, {});
  });

  it('maps landing secondary buttons to tutorial / leaderboard by target type', () => {
    const out = mapButtonsToExits('landing', 'landing', [
      { variant: 'primary', exit: 'game' },
      { variant: 'secondary', exit: 'tutorial' },
      { variant: 'tertiary', exit: 'leaderboard' },
    ], ctx);
    assert.equal(out.flowExits['landing.tutorial'], 'tutorial');
    assert.equal(out.flowButtonVariants['landing.tutorial'], 'secondary');
    assert.equal(out.flowEnabledExits['landing.tutorial'], true);
    assert.equal(out.flowExits['landing.leaderboard'], 'leaderboard');
    assert.equal(out.flowEnabledExits['landing.leaderboard'], true);
    assert.deepEqual(out.warnings, []);
  });

  it('maps result buttons to playAgain (entry/game target) and leaderboard', () => {
    const out = mapButtonsToExits('result', 'result', [
      { variant: 'primary', exit: 'voucher' },
      { variant: 'secondary', exit: 'game' },        // → playAgain (firstOfType game)
      { variant: 'tertiary', exit: 'leaderboard' },  // → leaderboard
    ], ctx);
    assert.equal(out.flowExits['result.next'], 'voucher');
    assert.equal(out.flowEnabledExits['result.playAgain'], true);
    assert.equal(out.flowExits['result.playAgain'], 'game');
    assert.equal(out.flowEnabledExits['result.leaderboard'], true);
    assert.deepEqual(out.warnings, []);
  });

  it('warns when an extra button has no semantic slot (Next-only)', () => {
    const out = mapButtonsToExits('leaderboard', 'leaderboard', [
      { variant: 'primary', exit: 'landing' },
      { variant: 'secondary', exit: 'voucher' }, // leaderboard page has only `next`
    ], ctx);
    assert.equal(out.flowExits['leaderboard.next'], 'landing');
    assert.equal(out.warnings.length, 1);
    assert.match(out.warnings[0], /no semantic slot/);
  });

  it('returns empty fragments for an empty button list', () => {
    const out = mapButtonsToExits('voucher', 'voucher', [], ctx);
    assert.deepEqual(out.flowExits, {});
    assert.deepEqual(out.flowEnabledExits, {});
    assert.deepEqual(out.flowButtonVariants, {});
  });
});

describe('deriveFlowFromBlocks', () => {
  const pages = ['landing', 'tutorial', 'game', 'result', 'leaderboard'];

  it('derives maps only for CTA-group pages, leaving others untouched', () => {
    const blocksConfig = {
      landing: { blocks: [
        { name: 'background', settings: {} },
        { name: 'cta-group', settings: { buttons: [
          { variant: 'primary', exit: 'tutorial' },
          { variant: 'secondary', exit: 'leaderboard' },
        ] } },
      ] },
      game: { blocks: [{ name: 'timer', settings: { mode: 'countdown' } }] }, // no cta-group
    };
    const out = deriveFlowFromBlocks(blocksConfig, pages, {});
    assert.equal(out.flowExits['landing.next'], 'tutorial');
    assert.equal(out.flowExits['landing.leaderboard'], 'leaderboard');
    assert.equal(out.flowEnabledExits['landing.leaderboard'], true);
    // No stray keys for the non-cta game page.
    assert.ok(!Object.keys(out.flowExits).some((k) => k.startsWith('game.')));
  });

  it('returns empty maps when blocksConfig is empty (CLI legacy path)', () => {
    const out = deriveFlowFromBlocks({}, pages, {});
    assert.deepEqual(out, { flowExits: {}, flowEnabledExits: {}, flowButtonVariants: {}, warnings: [], governedPageIds: [] });
  });

  it('returns empty maps when blocksConfig is null/undefined', () => {
    assert.deepEqual(deriveFlowFromBlocks(null, pages, {}).flowExits, {});
    assert.deepEqual(deriveFlowFromBlocks(undefined, pages, {}).flowExits, {});
  });

  it('resolves page type via pageTypes for renamed instances', () => {
    const blocksConfig = {
      'result-2': { blocks: [
        { name: 'cta-group', settings: { buttons: [{ variant: 'primary', exit: 'voucher' }] } },
      ] },
    };
    const out = deriveFlowFromBlocks(blocksConfig, ['result-2'], { 'result-2': 'result' });
    assert.equal(out.flowExits['result-2.next'], 'voucher');
  });

  it('reports governed page ids', () => {
    const blocksConfig = {
      landing: { blocks: [{ name: 'cta-group', settings: { buttons: [{ variant: 'primary', exit: 'game' }] } }] },
      game: { blocks: [{ name: 'timer', settings: {} }] },
    };
    const out = deriveFlowFromBlocks(blocksConfig, pages, {});
    assert.deepEqual(out.governedPageIds, ['landing']);
  });

  it('exposes the canonical CTA page-type set', () => {
    for (const t of ['landing', 'result', 'leaderboard', 'voucher', 'register', 'end']) {
      assert.ok(CTA_GROUP_PAGE_TYPES.has(t));
    }
    assert.ok(!CTA_GROUP_PAGE_TYPES.has('game'));
  });
});

describe('deriveMenuItemsEnabled', () => {
  it('enables exactly the items selected in the menu-item-list block', () => {
    const blocksConfig = {
      menu: { blocks: [{ name: 'menu-item-list', settings: { items: ['home', 'leaderboard', 'leave'] } }] },
    };
    const out = deriveMenuItemsEnabled(blocksConfig);
    assert.equal(out.home, true);
    assert.equal(out.leaderboard, true);
    assert.equal(out.leave, true);
    // Known ids that are NOT selected must be explicitly false (so they don't
    // fall back to the agency default downstream).
    assert.equal(out.howToPlay, false);
    assert.equal(out.terms, false);
    assert.equal(out.faq, false);
  });

  it('returns null when there is no menu-item-list block (keeps stored map)', () => {
    assert.equal(deriveMenuItemsEnabled({ landing: { blocks: [{ name: 'cta-group', settings: {} }] } }), null);
    assert.equal(deriveMenuItemsEnabled({}), null);
    assert.equal(deriveMenuItemsEnabled(null), null);
  });
});

describe('mergeDerivedFlow', () => {
  it('drops stale keys for governed pages and layers derived on top', () => {
    const stored = {
      'result.next': 'voucher',
      'result.playAgain': 'landing', // stale — no playAgain button anymore
      'game.next': 'result',         // non-governed, must survive
    };
    const derived = { 'result.next': 'voucher' };
    const merged = mergeDerivedFlow(stored, derived, ['result']);
    assert.equal(merged['result.next'], 'voucher');
    assert.ok(!('result.playAgain' in merged), 'stale governed key removed');
    assert.equal(merged['game.next'], 'result', 'non-governed key preserved');
  });

  it('is a no-op passthrough when nothing is governed', () => {
    const stored = { 'game.next': 'result' };
    const merged = mergeDerivedFlow(stored, {}, []);
    assert.deepEqual(merged, { 'game.next': 'result' });
  });
});
