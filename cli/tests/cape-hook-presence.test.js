import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const NEXT_TEMPLATES = ['next-unity', 'next-r3f', 'next-phaser', 'next-memory', 'next-none'];

describe('useCape hook presence in base templates', () => {
  for (const template of NEXT_TEMPLATES) {
    it(`${template}/lib/cape.ts exists`, () => {
      assert.ok(existsSync(join('base-templates', template, 'lib', 'cape.ts')));
    });
  }

  it('tanstack-unity/src/lib/cape.ts exists', () => {
    assert.ok(existsSync(join('base-templates', 'tanstack-unity', 'src', 'lib', 'cape.ts')));
  });
});
