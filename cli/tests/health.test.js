// cli/tests/health.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  MODULES_DIR,
  GAMES_DIR,
  runDoctor,
  validateGameManifestFile,
  validateModuleManifestFile,
} from '../core/health.js';

test('validates NHL Crush manifest with cache busting enabled', () => {
  const result = validateGameManifestFile(join(GAMES_DIR, 'nhl-crush', 'game.json'));
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.some((warning) => /cdn\.noCache is false/.test(warning)), false);
});

test('validates audio module manifest source files', () => {
  const result = validateModuleManifestFile(join(MODULES_DIR, 'audio', 'manifest.json'));
  assert.deepEqual(result.errors, []);
});

test('doctor has no hard failures for the checked-in scaffolder baseline', () => {
  const report = runDoctor();
  assert.equal(report.ok, true);
  assert.ok(report.checks.length >= 4);
});
