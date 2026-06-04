import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MODULES_DIR,
  GAMES_DIR,
  runDoctor,
  validateGameManifestFile,
  validateModuleManifestFile,
} from '../core/health.js';

describe('manifest validation', () => {
  it('validates NHL Crush manifest with cache busting enabled', () => {
    const result = validateGameManifestFile(join(GAMES_DIR, 'nhl-crush', 'game.json'));
    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.some((warning) => /cdn\.noCache is false/.test(warning)), false);
  });

  it('validates audio module manifest source files', () => {
    const result = validateModuleManifestFile(join(MODULES_DIR, 'audio', 'manifest.json'));
    assert.deepEqual(result.errors, []);
  });
});

describe('runDoctor', () => {
  it('has no hard failures for the checked-in scaffolder baseline', () => {
    const report = runDoctor();
    assert.equal(report.ok, true);
    assert.ok(report.checks.length >= 4);
  });

  it('reports an existing output directory before scaffold build work starts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-doctor-existing-'));
    try {
      const report = runDoctor({ output: dir });
      const outputCheck = report.checks.find((check) => check.label.includes(dir));
      assert.ok(outputCheck);
      assert.equal(outputCheck.ok, false);
      assert.ok(outputCheck.errors.some((error) => error.includes('Output directory already exists')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('accepts space-separated --output values on the doctor command', () => {
    const dir = mkdtempSync(join(tmpdir(), 'scaffold-doctor-cli-existing-'));
    try {
      const result = spawnSync(process.execPath, ['cli/scaffold.js', 'doctor', '--output', dir], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      assert.notEqual(result.status, 0);
      assert.match(`${result.stdout}\n${result.stderr}`, /Output directory already exists/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
