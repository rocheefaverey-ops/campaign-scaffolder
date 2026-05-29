import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listBlocks } from '../block-resolver.js';

describe('listBlocks', () => {
  it('returns at least the Background block', () => {
    const blocks = listBlocks();
    const names = blocks.map((b) => b.manifest.name);
    assert.ok(names.includes('background'), `expected "background", got: ${names.join(', ')}`);
  });

  it('every returned manifest is valid', async () => {
    const { validateManifest } = await import('../block-manifest.js');
    const blocks = listBlocks();
    for (const b of blocks) {
      const r = validateManifest(b.manifest);
      assert.equal(r.ok, true, `${b.manifest.name} invalid: ${r.errors.join('; ')}`);
    }
  });

  it('each block has a sourceDir absolute path', () => {
    const blocks = listBlocks();
    for (const b of blocks) {
      assert.ok(b.sourceDir.startsWith('/') || /^[A-Z]:/.test(b.sourceDir), `${b.manifest.name}: sourceDir not absolute: ${b.sourceDir}`);
    }
  });
});
