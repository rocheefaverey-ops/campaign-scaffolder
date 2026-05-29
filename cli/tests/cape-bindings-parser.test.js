import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCapeBindings } from '../cape-bindings-parser.js';

describe('parseCapeBindings', () => {
  it('parses a single binding into { path, type, description }', () => {
    const result = parseCapeBindings(
      { source: '{pageType}.background | image | full-bleed canvas' },
      { pageType: 'landing' },
    );
    assert.deepEqual(result, [
      { path: 'landing.background', type: 'image', description: 'full-bleed canvas' },
    ]);
  });

  it('substitutes {pageType} from context', () => {
    const result = parseCapeBindings(
      { title: '{pageType}.title | i18n-string | headline' },
      { pageType: 'result' },
    );
    assert.equal(result[0].path, 'result.title');
  });

  it('substitutes {pageId} when present', () => {
    const result = parseCapeBindings(
      { title: '{pageId}.title | i18n-string | headline' },
      { pageType: 'video', pageId: 'intro-video' },
    );
    assert.equal(result[0].path, 'intro-video.title');
  });

  it('throws on a binding string missing the | separator', () => {
    assert.throws(
      () => parseCapeBindings({ broken: 'no pipes here' }, { pageType: 'landing' }),
      /malformed binding/,
    );
  });

  it('returns an empty array when capeBindings is empty', () => {
    assert.deepEqual(parseCapeBindings({}, { pageType: 'landing' }), []);
  });
});
