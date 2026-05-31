import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listBlocks } from '../block-resolver.js';
import { parseCapeBindings } from '../cape-bindings-parser.js';
import { emitBlockDrivenFields } from '../cape-format-builder.js';

describe('CAPE drift between block manifests and schema generator', () => {
  it('every binding in every block parses for every supported page type', () => {
    for (const { manifest } of listBlocks()) {
      for (const pageType of manifest.usableOn) {
        assert.doesNotThrow(
          () => parseCapeBindings(manifest.capeBindings, { pageType, pageId: pageType }),
          `${manifest.name} on ${pageType} threw`,
        );
      }
    }
  });

  it('emitBlockDrivenFields produces a field for every unique binding path', () => {
    for (const { manifest } of listBlocks()) {
      for (const pageType of manifest.usableOn) {
        const parsed = parseCapeBindings(manifest.capeBindings, { pageType, pageId: pageType });
        const expectedCount = new Set(parsed.map((binding) => binding.path)).size;
        const fields = emitBlockDrivenFields(pageType, [{ name: manifest.name }], pageType);
        assert.equal(
          fields.length,
          expectedCount,
          `${manifest.name} on ${pageType}: expected ${expectedCount} fields, got ${fields.length}`,
        );
      }
    }
  });
});
