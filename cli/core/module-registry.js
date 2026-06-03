import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { GAME_ENGINES, pageModuleType } from './page-config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SCAFFOLDER_ROOT = resolve(__dirname, '..', '..');
export const MODULES_DIR = join(SCAFFOLDER_ROOT, 'modules');

export const PAGE_REQUIRES_MODULE = {
  register: 'registration',
  leaderboard: 'leaderboard',
  voucher: 'voucher',
  video: 'video',
};

export const OPTIONAL_MODULE_IDS = ['leaderboard', 'registration', 'scoring', 'audio', 'cookie-consent', 'gtm'];
export const GLOBAL_OPTIONAL_MODULES = new Set(['audio', 'cookie-consent', 'gtm']);
export const MODULE_PAGE_SUPPORT = {
  leaderboard: new Set(['leaderboard']),
  registration: new Set(['register']),
  scoring: new Set(['game', 'result', 'register', 'leaderboard']),
  voucher: new Set(['voucher']),
  video: new Set(['video']),
};

const manifestCache = {};

export function validateManifest(manifest, moduleId) {
  const base = `Manifest validation failed for module "${moduleId}"`;
  if (!manifest.id) throw new Error(`${base}: missing required field "id"`);
  if (!manifest.name) throw new Error(`${base}: missing required field "name"`);
  if (!Array.isArray(manifest.files)) throw new Error(`${base}: "files" must be an array`);
  for (let i = 0; i < manifest.files.length; i++) {
    const f = manifest.files[i];
    if (!f.src) throw new Error(`${base}: files[${i}] missing "src"`);
    if (!f.dest) throw new Error(`${base}: files[${i}] missing "dest"`);
  }
}

export function loadManifest(moduleId) {
  if (manifestCache[moduleId]) return manifestCache[moduleId];
  const p = join(MODULES_DIR, moduleId, 'manifest.json');
  if (!existsSync(p)) throw new Error(`Manifest not found: ${p}`);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    throw new Error(`Invalid JSON in manifest ${p}: ${e.message}`);
  }
  validateManifest(manifest, moduleId);
  manifestCache[moduleId] = manifest;
  return manifest;
}

export function loadAllManifests() {
  const all = {};
  const dirs = readdirSync(MODULES_DIR).filter((d) =>
    statSync(join(MODULES_DIR, d)).isDirectory()
  );
  for (const id of dirs) {
    try { all[id] = loadManifest(id); } catch { /* skip */ }
  }
  return all;
}

export function moduleSupportedByPages(moduleId, pages) {
  if (GLOBAL_OPTIONAL_MODULES.has(moduleId)) return true;
  const supportedTypes = MODULE_PAGE_SUPPORT[moduleId];
  if (!supportedTypes) return false;
  const pageTypes = new Set((pages ?? []).map((p) => pageModuleType(p)));
  for (const type of supportedTypes) {
    if (pageTypes.has(type)) return true;
  }
  return false;
}

export function resolveImplied(selectedModules) {
  const manifests = loadAllManifests();
  const resolved = new Set(selectedModules);
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...resolved]) {
      const m = manifests[id];
      if (m?.implies) {
        for (const dep of m.implies) {
          if (!resolved.has(dep)) {
            resolved.add(dep);
            changed = true;
          }
        }
      }
    }
  }
  return [...resolved];
}

export function autoModulesForPages(pages, _game = '') {
  const mods = new Set();
  const pageTypes = (pages ?? []).map((p) => pageModuleType(p));
  if (pageTypes.includes('register')) mods.add('registration');
  if (pageTypes.includes('voucher')) mods.add('voucher');
  if (pageTypes.includes('video')) mods.add('video');
  if (pageTypes.includes('leaderboard')) {
    mods.add('leaderboard');
    mods.add('scoring');
  }
  if (pageTypes.includes('game') || pageTypes.includes('result')) mods.add('scoring');
  return [...mods];
}

export function moduleSelectionPolicy(pages, game = '') {
  const required = new Set();
  const pageTypes = (pages ?? []).map((p) => pageModuleType(p));
  for (const [pageType, moduleId] of Object.entries(PAGE_REQUIRES_MODULE)) {
    if (pageTypes.includes(pageType)) required.add(moduleId);
  }
  const selectable = OPTIONAL_MODULE_IDS
    .filter((moduleId) => moduleSupportedByPages(moduleId, pages))
    .filter((moduleId) => !required.has(moduleId));
  const suggested = autoModulesForPages(pages, game).filter((moduleId) => selectable.includes(moduleId));
  return {
    required: [...required],
    selectable,
    suggested,
  };
}

export function resolveModules(game, pages, extraModules) {
  const all = new Set();
  const pageTypes = (pages ?? []).map((p) => pageModuleType(p));
  for (const [page, mod] of Object.entries(PAGE_REQUIRES_MODULE)) {
    if (pageTypes.includes(page)) all.add(mod);
  }
  for (const moduleId of autoModulesForPages(pages, game)) {
    all.add(moduleId);
  }
  const policy = moduleSelectionPolicy(pages, game);
  const allowedExtras = new Set([...policy.required, ...policy.selectable]);
  for (const m of (extraModules ?? [])) {
    if (allowedExtras.has(m)) all.add(m);
  }
  return resolveImplied([...all]);
}
