import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// One block catalogue, two emitters. The Next builder (cli/page-builder.js) and
// the TanStack builder (cli/tanstack-block-page-builder.js) are intentionally
// SEPARATE — the stacks diverge at the code-emit layer (router API, data
// fetching, hooks). What must NOT diverge is which blocks each emitter handles:
// a block rendered with proper props in one stack but falling to the propless
// default `<Component />` in the other is a silent, stack-specific bug.
//
// This guard derives the block catalogue from block-defaults.js and asserts
// every block is explicitly handled (has a `case '<name>':`) by BOTH builders.
// `background` and `card-wrapper` are excluded — they are handled structurally
// (extracted before renderBlock), not via the switch.

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliDir = join(__dirname, '..');

const STRUCTURAL = new Set(['background', 'card-wrapper']);

function catalogueBlocks() {
  const src = readFileSync(join(cliDir, 'block-defaults.js'), 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/(?:^|\s)'?([a-z][a-z0-9-]+)'?:\s*block\(/g)) {
    if (!STRUCTURAL.has(m[1])) names.add(m[1]);
  }
  return [...names].sort();
}

function handledBlocks(file) {
  const src = readFileSync(join(cliDir, file), 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/case '([a-z][a-z0-9-]+)':/g)) names.add(m[1]);
  return names;
}

describe('builder block parity (Next ↔ TanStack emitters)', () => {
  const catalogue = catalogueBlocks();
  const nextHandled = handledBlocks('page-builder.js');
  const tsHandled = handledBlocks('tanstack-block-page-builder.js');

  it('derives a non-trivial block catalogue', () => {
    assert.ok(catalogue.length >= 30, `expected ≥30 catalogue blocks, got ${catalogue.length}`);
  });

  it('every catalogue block is explicitly handled by the Next builder', () => {
    const missing = catalogue.filter((n) => !nextHandled.has(n));
    assert.deepEqual(missing, [], `Next builder (page-builder.js) silently defaults these blocks: ${missing.join(', ')}`);
  });

  it('every catalogue block is explicitly handled by the TanStack builder', () => {
    const missing = catalogue.filter((n) => !tsHandled.has(n));
    assert.deepEqual(missing, [], `TanStack builder silently defaults these blocks: ${missing.join(', ')}`);
  });

  it('the two builders handle the same catalogue block set', () => {
    const onlyNext = catalogue.filter((n) => nextHandled.has(n) && !tsHandled.has(n));
    const onlyTs = catalogue.filter((n) => tsHandled.has(n) && !nextHandled.has(n));
    assert.deepEqual({ onlyNext, onlyTs }, { onlyNext: [], onlyTs: [] },
      'block handling drifted between the two builders');
  });
});

// Behavioral parity: presence-of-`case` isn't enough — a block can have a case
// in both builders yet render `<Foo a={x}/>` in one and a bare `<Foo/>` in the
// other (the silent-default bug the catalogue test only *describes*). This
// renders representative pages through BOTH emitters and asserts that for every
// component appearing in both, neither side emits it propless while the other
// passes props. Prop *values* legitimately differ per stack (router API, data
// source); prop *presence* must not silently collapse.
describe('builder behavioral parity (component prop presence)', () => {
  // Map<ComponentName, propCount> from generated TSX (max props seen per tag).
  function componentPropCounts(tsx) {
    const counts = new Map();
    for (const m of tsx.matchAll(/<([A-Z][A-Za-z0-9]*)\b([^>]*?)\/?>/g)) {
      const name = m[1];
      const propCount = [...m[2].matchAll(/[\s{]([a-zA-Z][\w]*)=/g)].length;
      counts.set(name, Math.max(counts.get(name) ?? 0, propCount));
    }
    return counts;
  }

  // Representative compositions that satisfy each page type's required blocks.
  const PAGES = [
    { pageId: 'landing', type: 'landing', blocks: [
      { name: 'background', settings: { kind: 'image' } },
      { name: 'header-chrome', settings: { leftSlot: 'menu', rightSlot: 'help' } },
      { name: 'title-block', settings: { showSubtitle: true } },
      { name: 'cta-group', settings: { buttons: [{ variant: 'primary', exit: 'game' }] } },
    ] },
    { pageId: 'result', type: 'result', blocks: [
      { name: 'background', settings: { kind: 'image' } },
      { name: 'title-block', settings: { showKicker: true } },
      { name: 'score-readout', settings: { showHighScore: true } },
      { name: 'cta-group', settings: { buttons: [{ variant: 'primary', exit: 'game' }] } },
    ] },
    { pageId: 'tutorial', type: 'onboarding', blocks: [
      { name: 'background', settings: { kind: 'image' } },
      { name: 'title-block', settings: {} },
      { name: 'body-copy', settings: { markdown: true } },
      { name: 'step-indicator', settings: { count: 3 } },
      { name: 'nav-controls', settings: { nextExit: 'game' } },
    ] },
    { pageId: 'menu', type: 'menu', blocks: [
      { name: 'background', settings: { kind: 'image' } },
      { name: 'menu-item-list', settings: { items: ['home', 'howToPlay'] } },
    ] },
  ];

  const opts = { pages: ['landing', 'tutorial', 'game', 'result', 'menu'], routeMap: { game: '/gameplay' } };

  let buildNext, buildTs;
  it('loads both builders', async () => {
    ({ buildBlockDrivenPage: buildNext } = await import('../page-builder.js'));
    ({ buildTsBlockDrivenPage: buildTs } = await import('../tanstack-block-page-builder.js'));
    assert.ok(buildNext && buildTs);
  });

  for (const page of PAGES) {
    it(`${page.pageId}: no component is propless in one stack but propped in the other`, () => {
      const nextOut = buildNext(page.pageId, page.type, page.blocks, { ...opts, pageId: page.pageId });
      const tsOut = buildTs(page.pageId, page.type, page.blocks, opts);
      const nextCounts = componentPropCounts(nextOut);
      const tsCounts = componentPropCounts(tsOut);
      const offenders = [];
      for (const [name, nCount] of nextCounts) {
        if (!tsCounts.has(name)) continue; // stack-exclusive wrapper — fine
        const tCount = tsCounts.get(name);
        if ((nCount > 0) !== (tCount > 0)) {
          offenders.push(`${name} (next props=${nCount}, tanstack props=${tCount})`);
        }
      }
      assert.deepEqual(offenders, [], `silent-default drift on ${page.pageId}: ${offenders.join('; ')}`);
    });
  }
});
