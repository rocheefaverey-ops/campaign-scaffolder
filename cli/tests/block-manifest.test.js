import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest } from '../block-manifest.js';

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
});
