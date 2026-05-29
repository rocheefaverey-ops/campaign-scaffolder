import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest } from '../block-manifest.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');

describe('validateManifest', () => {
  it('accepts a minimal valid manifest', () => {
    const m = {
      name: 'background',
      displayName: 'Background',
      files: [
        { src: 'Background.tsx', dest: 'components/_blocks/background/Background.tsx' },
      ],
      settings: {},
      capeBindings: {},
      usableOn: ['landing'],
    };
    assert.deepEqual(validateManifest(m), { ok: true, errors: [] });
  });

  it('rejects a manifest missing required fields', () => {
    const m = { name: 'background' };
    const r = validateManifest(m);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some(e => e.includes('files')));
    assert.ok(r.errors.some(e => e.includes('usableOn')));
  });

  it('rejects a manifest whose usableOn lists an unknown page type', () => {
    const m = {
      name: 'background',
      displayName: 'Background',
      files: [{ src: 'Background.tsx', dest: 'components/_blocks/background/Background.tsx' }],
      settings: {},
      capeBindings: {},
      usableOn: ['flying-toaster'],
    };
    const r = validateManifest(m);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some(e => e.includes('flying-toaster')));
  });

  it('rejects a file entry missing src or dest', () => {
    const m = {
      name: 'x',
      displayName: 'x',
      files: [{ src: 'X.tsx' }],
      settings: {},
      capeBindings: {},
      usableOn: ['landing'],
    };
    const r = validateManifest(m);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some(e => e.includes('dest')));
  });

  it('rejects null', () => {
    const r = validateManifest(null);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes('plain object')));
  });

  it('rejects an array as the manifest itself', () => {
    const r = validateManifest([]);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes('plain object')));
  });

  it('rejects settings: null', () => {
    const m = {
      name: 'x',
      displayName: 'x',
      files: [{ src: 'X.tsx', dest: 'X.tsx' }],
      settings: null,
      capeBindings: {},
      usableOn: ['landing'],
    };
    const r = validateManifest(m);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes('settings')));
  });

  it('rejects capeBindings: null', () => {
    const m = {
      name: 'x',
      displayName: 'x',
      files: [{ src: 'X.tsx', dest: 'X.tsx' }],
      settings: {},
      capeBindings: null,
      usableOn: ['landing'],
    };
    const r = validateManifest(m);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes('capeBindings')));
  });

  it('rejects non-object file entries with a clear message', () => {
    const m = {
      name: 'x',
      displayName: 'x',
      files: ['oops'],
      settings: {},
      capeBindings: {},
      usableOn: ['landing'],
    };
    const r = validateManifest(m);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes('files[0] must be an object')));
    // Should NOT also emit "missing src" / "missing dest" — one clear error per entry.
    assert.equal(r.errors.filter((e) => e.startsWith('files[0]')).length, 1);
  });
});

describe('real block manifests on disk', () => {
  it('background/manifest.json is valid', () => {
    const raw = readFileSync(join(repoRoot, 'components/_blocks/background/manifest.json'), 'utf8');
    const m = JSON.parse(raw);
    const r = validateManifest(m);
    assert.equal(r.ok, true, `errors: ${r.errors.join('; ')}`);
  });
});
