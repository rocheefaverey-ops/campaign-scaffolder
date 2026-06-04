import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { GAME_ENGINES } from './page-config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SCAFFOLDER_ROOT = resolve(__dirname, '..', '..');
export const GAMES_DIR = join(SCAFFOLDER_ROOT, 'games');
export const MODULES_DIR = join(SCAFFOLDER_ROOT, 'modules');

const TEMPLATE_KEYS = [
  'next-unity',
  'next-r3f',
  'next-phaser',
  'next-memory',
  'next-none',
  'tanstack-unity',
];

export function readJsonFile(filePath) {
  try {
    return { value: JSON.parse(readFileSync(filePath, 'utf8')), errors: [], warnings: [] };
  } catch (err) {
    return { value: null, errors: [`Invalid JSON: ${err.message}`], warnings: [] };
  }
}

export function validateGameManifestFile(filePath) {
  const result = { type: 'game', filePath, errors: [], warnings: [] };
  if (!existsSync(filePath)) {
    result.errors.push(`File not found: ${filePath}`);
    return result;
  }

  const parsed = readJsonFile(filePath);
  result.errors.push(...parsed.errors);
  if (!parsed.value) return result;

  const game = parsed.value;
  if (!game.id || typeof game.id !== 'string') result.errors.push('Missing required string field: id');
  if (!game.name || typeof game.name !== 'string') result.errors.push('Missing required string field: name');
  if (!game.engine || typeof game.engine !== 'string') {
    result.errors.push('Missing required string field: engine');
  } else if (!GAME_ENGINES.includes(game.engine)) {
    result.errors.push(`Unknown engine "${game.engine}". Expected one of: ${GAME_ENGINES.join(', ')}`);
  }
  if (game.stack != null && !['next', 'tanstack'].includes(game.stack)) {
    result.errors.push('Field "stack" must be "next" or "tanstack" when present');
  }

  if (game.engine === 'unity') {
    if (!game.cdn || typeof game.cdn !== 'object') {
      result.errors.push('Unity game missing required object: cdn');
    } else {
      if (!game.cdn.baseUrl || typeof game.cdn.baseUrl !== 'string') result.errors.push('Unity cdn.baseUrl must be a non-empty string');
      if (!game.cdn.gameName || typeof game.cdn.gameName !== 'string') result.errors.push('Unity cdn.gameName must be a non-empty string');
      if (game.cdn.versionFile && game.cdn.noCache === false) {
        result.warnings.push('cdn.noCache is false; test builds can stay stale in normal browsers if CDN assets are reused');
      }
    }
    if (game.dpr) {
      if (typeof game.dpr.min !== 'number') result.errors.push('dpr.min must be a number');
      if (typeof game.dpr.max !== 'number') result.errors.push('dpr.max must be a number');
      if (typeof game.dpr.min === 'number' && typeof game.dpr.max === 'number' && game.dpr.min > game.dpr.max) {
        result.errors.push('dpr.min must be less than or equal to dpr.max');
      }
    }
  }

  if (game.env != null && typeof game.env !== 'object') result.errors.push('Field "env" must be an object when present');
  return result;
}

export function validateModuleManifestFile(filePath) {
  const result = { type: 'module', filePath, errors: [], warnings: [] };
  if (!existsSync(filePath)) {
    result.errors.push(`File not found: ${filePath}`);
    return result;
  }

  const parsed = readJsonFile(filePath);
  result.errors.push(...parsed.errors);
  if (!parsed.value) return result;

  const manifest = parsed.value;
  const moduleDir = dirname(filePath);
  if (!manifest.id || typeof manifest.id !== 'string') result.errors.push('Missing required string field: id');
  if (!manifest.name || typeof manifest.name !== 'string') result.errors.push('Missing required string field: name');
  if (!Array.isArray(manifest.files)) {
    result.errors.push('Field "files" must be an array');
  } else {
    manifest.files.forEach((file, index) => {
      if (!file || typeof file !== 'object') {
        result.errors.push(`files[${index}] must be an object`);
        return;
      }
      if (!file.src || typeof file.src !== 'string') result.errors.push(`files[${index}].src must be a non-empty string`);
      if (!file.dest || typeof file.dest !== 'string') result.errors.push(`files[${index}].dest must be a non-empty string`);
      if (file.src && !existsSync(join(moduleDir, file.src))) {
        result.errors.push(`files[${index}].src does not exist: ${file.src}`);
      }
    });
  }

  if (manifest.copyDirs != null) {
    if (!Array.isArray(manifest.copyDirs)) {
      result.errors.push('Field "copyDirs" must be an array when present');
    } else {
      manifest.copyDirs.forEach((dir, index) => {
        if (!dir?.src || typeof dir.src !== 'string') result.errors.push(`copyDirs[${index}].src must be a non-empty string`);
        if (!dir?.dest || typeof dir.dest !== 'string') result.errors.push(`copyDirs[${index}].dest must be a non-empty string`);
        if (dir?.src && !existsSync(join(moduleDir, dir.src))) {
          result.errors.push(`copyDirs[${index}].src does not exist: ${dir.src}`);
        }
      });
    }
  }

  for (const field of ['packages', 'devPackages', 'implies']) {
    if (manifest[field] != null && (!Array.isArray(manifest[field]) || manifest[field].some((value) => typeof value !== 'string'))) {
      result.errors.push(`Field "${field}" must be an array of strings when present`);
    }
  }

  return result;
}

export function validateAllGameManifests() {
  if (!existsSync(GAMES_DIR)) return [{ type: 'games', filePath: GAMES_DIR, errors: ['games directory not found'], warnings: [] }];
  return readdirSync(GAMES_DIR)
    .filter((dir) => !dir.startsWith('_'))
    .map((dir) => join(GAMES_DIR, dir, 'game.json'))
    .filter((filePath) => existsSync(filePath))
    .map((filePath) => validateGameManifestFile(filePath));
}

export function validateAllModuleManifests() {
  if (!existsSync(MODULES_DIR)) return [{ type: 'modules', filePath: MODULES_DIR, errors: ['modules directory not found'], warnings: [] }];
  return readdirSync(MODULES_DIR)
    .filter((dir) => statSync(join(MODULES_DIR, dir)).isDirectory())
    .map((dir) => join(MODULES_DIR, dir, 'manifest.json'))
    .filter((filePath) => existsSync(filePath))
    .map((filePath) => validateModuleManifestFile(filePath));
}

export function runDoctor(options = {}) {
  const checks = [];
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  checks.push({
    label: `Node.js ${process.versions.node}`,
    ok: nodeMajor >= 18,
    warnings: nodeMajor < 20 ? ['Node 20+ is recommended for TanStack projects'] : [],
    errors: nodeMajor >= 18 ? [] : ['Node.js 18+ is required'],
  });

  checks.push({
    label: 'Required root files',
    ok: ['package.json', 'README.md', 'cli/scaffold.js'].every((file) => existsSync(join(SCAFFOLDER_ROOT, file))),
    warnings: [],
    errors: ['package.json', 'README.md', 'cli/scaffold.js']
      .filter((file) => !existsSync(join(SCAFFOLDER_ROOT, file)))
      .map((file) => `Missing ${file}`),
  });

  const missingTemplates = TEMPLATE_KEYS.filter((key) => !existsSync(join(SCAFFOLDER_ROOT, 'base-templates', key)));
  checks.push({
    label: 'Base templates',
    ok: missingTemplates.length === 0,
    warnings: [],
    errors: missingTemplates.map((key) => `Missing base-templates/${key}`),
  });

  const gameResults = validateAllGameManifests();
  checks.push(summarizeValidation('Game manifests', gameResults));

  const moduleResults = validateAllModuleManifests();
  checks.push(summarizeValidation('Module manifests', moduleResults));

  const outputTarget = options.output
    ? resolve(options.output)
    : options.name
      ? resolve(SCAFFOLDER_ROOT, '..', options.name)
      : null;
  if (outputTarget) {
    const exists = existsSync(outputTarget);
    checks.push({
      label: `Output directory ${outputTarget}`,
      ok: !exists,
      warnings: [],
      errors: exists ? [`Output directory already exists: ${outputTarget}`] : [],
    });
  }

  return {
    ok: checks.every((check) => check.ok),
    checks,
    results: [...gameResults, ...moduleResults],
  };
}

function summarizeValidation(label, results) {
  const errors = results.flatMap((result) => result.errors.map((message) => `${result.filePath}: ${message}`));
  const warnings = results.flatMap((result) => result.warnings.map((message) => `${result.filePath}: ${message}`));
  return {
    label,
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
