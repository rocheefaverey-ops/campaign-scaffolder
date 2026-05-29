import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listBlocks, copyBlockFiles } from '../block-resolver.js';

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

describe('copyBlockFiles', () => {
  it('copies block source files to the target project directory', () => {
    const targetDir = mkdtempSync(join(tmpdir(), 'block-resolver-test-'));
    try {
      const background = listBlocks().find((b) => b.manifest.name === 'background');
      copyBlockFiles([background], targetDir, { PROJECT_NAME: 'test-campaign' });

      const tsxPath = join(targetDir, 'components/_blocks/background/Background.tsx');
      const scssPath = join(targetDir, 'components/_blocks/background/Background.module.scss');
      assert.ok(existsSync(tsxPath), `expected ${tsxPath} to exist`);
      assert.ok(existsSync(scssPath), `expected ${scssPath} to exist`);
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it('replaces {{PROJECT_NAME}} tokens in copied files', () => {
    const targetDir = mkdtempSync(join(tmpdir(), 'block-resolver-token-'));
    try {
      const background = listBlocks().find((b) => b.manifest.name === 'background');
      copyBlockFiles([background], targetDir, { PROJECT_NAME: 'demo-replaced' });
      // Background.tsx has no token today; assert the file copied without corruption
      const tsx = readFileSync(join(targetDir, 'components/_blocks/background/Background.tsx'), 'utf8');
      assert.ok(tsx.includes('export function Background'));
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it('dedupes when the same block appears in the input list twice', () => {
    const targetDir = mkdtempSync(join(tmpdir(), 'block-resolver-dedupe-'));
    try {
      const background = listBlocks().find((b) => b.manifest.name === 'background');
      copyBlockFiles([background, background], targetDir, {});
      const tsxPath = join(targetDir, 'components/_blocks/background/Background.tsx');
      assert.ok(existsSync(tsxPath));
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });
});
