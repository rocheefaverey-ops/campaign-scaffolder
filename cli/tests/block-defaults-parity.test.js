import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The default page-block tables are hand-duplicated across the Node scaffold
// (cli/block-defaults.js, DEFAULT_PAGE_BLOCKS) and the TS wizard UI
// (cli/wizard-ui/src/shared/config.ts, DEFAULT_BLOCKS_BY_PAGE). The UI source is
// TypeScript and can't be imported into the node test runner, so — like the
// KNOWN_PAGE_TYPES/ALL_PAGES drift check in cape-format-builder.test.js — this
// guard compares the two as text for the cta-group block specifically, which is
// the one this migration just touched (count removed). If they drift, the wizard
// preview/editor and the scaffolded output disagree about CTA buttons.

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliDir = join(__dirname, '..');

function ctaGroupLines(filePath) {
  const src = readFileSync(filePath, 'utf8');
  return [...src.matchAll(/'cta-group':\s*block\([^\n]*\),?/g)]
    .map((m) => m[0].replace(/,\s*$/, '').replace(/\s+/g, ' ').trim())
    .sort();
}

describe('cta-group default parity (block-defaults.js ↔ config.ts)', () => {
  const jsLines = ctaGroupLines(join(cliDir, 'block-defaults.js'));
  const tsLines = ctaGroupLines(join(cliDir, 'wizard-ui', 'src', 'shared', 'config.ts'));

  it('finds cta-group defaults in both tables', () => {
    assert.ok(jsLines.length >= 6, `expected ≥6 cta-group defaults in block-defaults.js, got ${jsLines.length}`);
    assert.equal(tsLines.length, jsLines.length, 'cta-group default count differs between the two tables');
  });

  it('has identical cta-group default definitions in both tables', () => {
    assert.deepEqual(tsLines, jsLines, 'cta-group defaults drifted between config.ts and block-defaults.js');
  });

  it('no longer declares a `count` setting on cta-group defaults', () => {
    for (const line of [...jsLines, ...tsLines]) {
      assert.doesNotMatch(line, /count:/, `stale count in cta-group default: ${line}`);
    }
  });
});
