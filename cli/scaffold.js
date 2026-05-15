#!/usr/bin/env node

/**
 * cli/scaffold.js
 *
 * Livewall Campaign Scaffolder — interactive wizard + scaffolding engine.
 *
 * Interactive:
 *   node cli/scaffold.js
 *
 * Non-interactive:
 *   node cli/scaffold.js \
 *     --name=hema-handdoek-2025 --cape-id=54031 --market=NL \
 *     --game=unity \
 *     --page=landing --page=onboarding --page=game --page=result --page=leaderboard \
 *     --reg-mode=gate \
 *     --module=registration --module=leaderboard --module=audio \
 *     --gtm-id=GTM-XXXXXX \
 *     --iframe \
 *     --output=/c/Dev/Livewall/hema-handdoek-2025 \
 *     --yes
 */

import { createInterface } from 'readline';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, cpSync, rmSync, renameSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname, relative } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { networkInterfaces, tmpdir } from 'os';
import { execSync, spawn } from 'child_process';
import { printPostScaffoldMessage } from './post-scaffold-message.js';
import { PAGE_ELEMENTS, PAGE_DEFAULTS, ELEMENT_CATALOGUE, buildPage } from './page-builder.js';
import { TS_PAGE_ELEMENTS, TS_PAGE_DEFAULTS, TS_ELEMENT_CATALOGUE, TS_ALL_PAGES, TS_PAGE_ROUTES, buildTsPage } from './tanstack-page-builder.js';
import { getGamesByEngine, getGamesByStack, getGame, gameEnvLines, gameLabel } from './game-registry.js';
import { checkAuth, validateAuth, login, clearTokenCache, createCampaign, pushFormat, populateDefaults, seedTemplateAssets, publishCampaign } from './cape-client.js';
import { buildTanStackCapeFormat, buildNextCapeFormat } from './cape-format-builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const SCAFFOLDER_ROOT    = resolve(__dirname, '..');
const TEMPLATES = {
  'next-unity':    join(SCAFFOLDER_ROOT, 'base-templates', 'next-unity'),
  'next-r3f':      join(SCAFFOLDER_ROOT, 'base-templates', 'next-r3f'),
  'next-phaser':   join(SCAFFOLDER_ROOT, 'base-templates', 'next-phaser'),
  'next-memory':   join(SCAFFOLDER_ROOT, 'base-templates', 'next-memory'),
  'next-none':     join(SCAFFOLDER_ROOT, 'base-templates', 'next-none'),
  'tanstack-unity':join(SCAFFOLDER_ROOT, 'base-templates', 'tanstack-unity'),
};
const MODULES_DIR        = join(SCAFFOLDER_ROOT, 'modules');

// ─── CAPE campaign creation helper ───────────────────────────────────────────

/**
 * Interactive CAPE campaign creation flow.
 * Checks/prompts for auth, creates a campaign, pushes the format,
 * and publishes to acceptance. Returns the new campaign details.
 *
 * @param {Function}      ask           readline-compatible prompt function
 * @param {string}        projectName   used to derive default title
 * @param {string}        market        e.g. 'NL'
 * @param {string|null}   autoTitle     skip title prompt when provided
 * @param {boolean}       forceNewLogin clear cached tokens before login
 * @param {object|null}   formatOverride  dynamically generated format; uses empty format if omitted
 */
async function runCapeCreateFlow(ask, projectName, market, autoTitle = null, forceNewLogin = false, formatOverride = null) {
  // 1. Auth — with retry logic (up to 3 attempts)
  let tokens = forceNewLogin ? null : await checkAuth();
  if (!tokens) {
    const askAuth = ask ?? ((q) => promptOnce(q));
    const MAX_LOGIN_ATTEMPTS = 3;
    let loginAttempt = 0;
    let loginError = null;

    while (loginAttempt < MAX_LOGIN_ATTEMPTS && !tokens) {
      loginAttempt++;
      console.log(`\n  ${c.yellow('⚠')}  Not logged in to CAPE. Enter your credentials:`);
      if (loginAttempt > 1) {
        console.log(`  ${c.dim(`Attempt ${loginAttempt}/${MAX_LOGIN_ATTEMPTS}`)}`);
      }

      const email    = (await askAuth(`  ${c.cyan('CAPE email')}: `)).trim();
      const password = (await askAuth(`  ${c.cyan('CAPE password')}: `)).trim();

      if (!email || !password) {
        console.log(`  ${c.red('✘')} Email and password are required.`);
        continue;
      }

      try {
        tokens = await login(email, password);
        console.log(`  ${c.green('✓')}  Logged in.`);
      } catch (err) {
        loginError = err;
        if (loginAttempt < MAX_LOGIN_ATTEMPTS) {
          console.log(`  ${c.red('✘')} ${err.message}`);
          console.log(`  ${c.dim(`Try again (${MAX_LOGIN_ATTEMPTS - loginAttempt} attempt${MAX_LOGIN_ATTEMPTS - loginAttempt === 1 ? '' : 's'} remaining)`)}`);
        }
      }
    }

    if (!tokens) {
      throw new Error(`CAPE login failed after ${MAX_LOGIN_ATTEMPTS} attempts: ${loginError?.message || 'unknown error'}`);
    }
  }

  // 2. Campaign title — use autoTitle if provided (non-interactive mode), otherwise prompt
  const defaultTitle = projectName
    .split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  let title;
  if (autoTitle !== null) {
    title = autoTitle || defaultTitle;
    console.log(`  ${c.dim('Campaign title:')} ${title}`);
  } else {
    const rawTitle = (await ask(`  ${c.cyan('Campaign title')} ${c.dim(`(default: ${defaultTitle})`)}: `)).trim();
    title = rawTitle || defaultTitle;
  }

  // 3. Create campaign
  process.stdout.write(`  ${c.dim('Creating campaign...')} `);
  let campaignId;
  try {
    campaignId = await createCampaign(tokens, { title, market });
    console.log(`${c.green('✓')}  ID: ${c.cyan(campaignId)}`);
  } catch (err) {
    throw new Error(`Campaign creation failed: ${err.message}`);
  }

  // 4. Push format — dynamic format built from scaffold selections
  let formatFile = formatOverride ?? { interfaceSetup: { pages: [] }, publishProfiles: {} };

  // Sanity-check the format BEFORE pushing. If the per-page tabs collapse to
  // just the always-on shell (Header + Desktop & Loading + Menu = 3 tabs),
  // it means the format builder didn't recognise any of the page pages —
  // the campaign would be scaffolded with no editable pages in CAPE.
  // Surface this loudly so the user sees it in the wizard log instead of
  // discovering it only after opening CAPE.
  const pagesPage = formatFile.interfaceSetup?.pages?.find((p) => p.path === 'pages');
  const pageTabCount = pagesPage?.tabs?.length ?? 0;
  if (pageTabCount === 0) {
    console.log(`  ${c.red('✘')} Generated CAPE format has NO page tabs at all. Campaign will be empty in CAPE.`);
  } else if (pageTabCount <= 3) {
    // 3 = Header + Desktop & Loading + Menu (the always-on shell). Anything
    // less than that means we built only the shell, no per-page tabs.
    console.log(`  ${c.yellow('⚠')}  Generated CAPE format only has ${pageTabCount} page tab(s) — looks like the shell only.`);
    console.log(`  ${c.dim('   Check that your wizard pages map to known types (video, landing, onboarding, result, leaderboard, register, voucher, game).')}`);
  }

  // Persist the exact format we're about to push to a stable temp file. If
  // CAPE looks wrong later, this is the artifact to diff against. Path is
  // logged so the user can find it. Best-effort — never fails the scaffold.
  let debugFormatPath = null;
  try {
    debugFormatPath = join(tmpdir(), `lw-cape-format-${campaignId}-${Date.now()}.json`);
    writeFileSync(debugFormatPath, JSON.stringify(formatFile, null, 2), 'utf8');
  } catch { /* ignore — debug artifact, not load-bearing */ }

  process.stdout.write(`  ${c.dim('Pushing format...')} `);
  try {
    await pushFormat(tokens, campaignId, formatFile);
    const tabSummary = pagesPage?.tabs?.map((t) => t.title).join(', ') ?? '(none)';
    console.log(`${c.green('✓')}  ${pageTabCount} tab${pageTabCount === 1 ? '' : 's'}: ${c.dim(tabSummary)}`);
    if (debugFormatPath) {
      console.log(`  ${c.dim('Format snapshot:')} ${c.dim(debugFormatPath)}`);
    }
  } catch (err) {
    const snapshotHint = debugFormatPath ? `\n  Format snapshot: ${debugFormatPath}` : '';
    throw new Error(`Failed to push CAPE format: ${err.message}${snapshotHint}`);
  }

  // 5. Populate defaults
  process.stdout.write(`  ${c.dim('Populating defaults...')} `);
  try {
    const count = await populateDefaults(tokens, campaignId, formatFile.interfaceSetup);
    console.log(`${c.green('✓')}  ${count} fields`);
  } catch (err) {
    console.log(`${c.yellow('⚠')}  ${err.message} (continuing)`);
  }

  // 5b. Seed template placeholder assets (logos, backgrounds, video)
  process.stdout.write(`  ${c.dim('Seeding template assets...')} `);
  try {
    const { seeded } = await seedTemplateAssets(tokens, campaignId);
    console.log(`${c.green('✓')}  ${seeded} fields seeded`);
  } catch (err) {
    console.log(`${c.yellow('⚠')}  ${err.message} (continuing)`);
  }

  // 6. Publish to acceptance
  process.stdout.write(`  ${c.dim('Publishing campaign...')} `);
  let publishedUrl = '';
  try {
    publishedUrl = await publishCampaign(tokens, campaignId);
    console.log(`${c.green('✓')}${publishedUrl ? `  ${c.dim(publishedUrl)}` : ''}`);
  } catch (err) {
    console.log(`${c.yellow('⚠')}  ${err.message} (continuing)`);
  }

  return { campaignId, publishedUrl };
}

// ─── Cleanup registry (SIGINT / SIGTERM / rollback) ───────────────────────────
// Any code that creates temp dirs or lock files registers a cleanup fn here.
// Signal handlers and catch blocks both call runCleanup() so nothing is left
// behind whether the process exits normally, crashes, or the user hits Ctrl+C.

const _cleanupHandlers = new Set();

function registerCleanup(fn) {
  _cleanupHandlers.add(fn);
  return () => _cleanupHandlers.delete(fn);   // returns unregister function
}

function runCleanup() {
  for (const fn of _cleanupHandlers) {
    try { fn(); } catch { /* never throw in cleanup */ }
  }
  _cleanupHandlers.clear();
}

process.once('SIGINT',  () => {
  console.error(`\n\n  ${'\x1b[31m'}✘${'\x1b[0m'} Interrupted — rolling back…`);
  runCleanup();
  process.exit(130);   // 128 + SIGINT(2)
});

process.once('SIGTERM', () => {
  runCleanup();
  process.exit(143);   // 128 + SIGTERM(15)
});

// ─── Colour helpers ──────────────────────────────────────────────────────────
const c = {
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GAME_ENGINES = ['unity', 'r3f', 'phaser', 'memory', 'video', 'pure-react'];

const ALL_PAGES = ['landing', 'intro-video', 'onboarding', 'loading-video', 'game', 'result', 'ad-video', 'register', 'leaderboard', 'voucher'];
const VIDEO_PAGE_IDS = new Set(['video', 'intro-video', 'loading-video', 'ad-video']);
const EXPLICIT_VIDEO_PAGES = ['intro-video', 'loading-video', 'ad-video'];

const VALID_MARKETS = new Set(['NL', 'BE', 'FR', 'DE', 'UK', 'ES', 'IT', 'PL', 'AT', 'CH', 'LU', 'DK', 'SE', 'NO', 'FI']);

/**
 * Mirror of buildCapeLanguagesMap in cli/wizard-ui/src/shared/config.ts.
 * Builds the CAPE-shaped languages map: { "EN": "EN - English", ... }.
 */
const ISO_LANGUAGE_NAMES = {
  EN: 'English', NL: 'Dutch', 'NL-BE': 'Flemish', DE: 'German', 'DE-AT': 'Austrian German',
  'DE-CH': 'Swiss German', FR: 'French', 'FR-BE': 'French (Belgium)', 'FR-CH': 'French (Switzerland)',
  IT: 'Italian', ES: 'Spanish', PT: 'Portuguese', 'PT-BR': 'Portuguese (Brazil)', GA: 'Irish',
  SV: 'Swedish', NO: 'Norwegian', DA: 'Danish', FI: 'Finnish', IS: 'Icelandic',
  PL: 'Polish', CS: 'Czech', SK: 'Slovak', HU: 'Hungarian', RO: 'Romanian', BG: 'Bulgarian',
  HR: 'Croatian', SR: 'Serbian', SL: 'Slovenian', EL: 'Greek', RU: 'Russian', UK: 'Ukrainian',
  TR: 'Turkish', ET: 'Estonian', LV: 'Latvian', LT: 'Lithuanian',
  ZH: 'Chinese', 'ZH-TW': 'Chinese (Traditional)', JA: 'Japanese', KO: 'Korean',
  VI: 'Vietnamese', TH: 'Thai', ID: 'Indonesian', MS: 'Malay', HI: 'Hindi', BN: 'Bengali',
  AR: 'Arabic', HE: 'Hebrew', FA: 'Persian', SW: 'Swahili',
};
function buildLanguagesMap(codes) {
  const out = {};
  for (const code of codes) {
    out[code] = `${code} - ${ISO_LANGUAGE_NAMES[code] ?? code}`;
  }
  return out;
}

/** Names that would conflict with framework directories or reserved paths */
const RESERVED_NAMES = new Set(['next', 'app', 'api', 'src', 'public', 'node_modules', 'build', 'dist', 'test', 'tests', 'frontend', 'backend', 'scaffolder', 'campaign-scaffolder', 'livewall']);

export const PAGE_ROUTES = {
  landing:     '/landing',
  video:       '/video',
  'intro-video':   '/intro-video',
  'loading-video': '/loading-video',
  'ad-video':      '/ad-video',
  onboarding:  '/onboarding',
  register:    '/register',
  game:        '/gameplay',
  result:      '/result',
  leaderboard: '/leaderboard',
  voucher:     '/voucher',
};

export function basePageType(pageId) {
  return String(pageId);
}

function pageModuleType(pageId) {
  return VIDEO_PAGE_IDS.has(pageId) ? 'video' : String(pageId);
}

export function routeFor(pageId, routeMap = {}) {
  return routeMap[pageId] ?? PAGE_ROUTES[pageId] ?? `/${pageId}`;
}

function inferPageTypes(pages) {
  return {};
}

/** Pages that require a specific module to be present */
const PAGE_REQUIRES_MODULE = {
  register:    'registration',
  leaderboard: 'leaderboard',
  voucher:     'voucher',
  video:       'video',
};

const OPTIONAL_MODULE_IDS = ['leaderboard', 'registration', 'scoring', 'audio', 'cookie-consent', 'gtm'];
const GLOBAL_OPTIONAL_MODULES = new Set(['audio', 'cookie-consent', 'gtm']);
const MODULE_PAGE_SUPPORT = {
  leaderboard: new Set(['leaderboard']),
  registration: new Set(['register']),
  scoring: new Set(['game', 'result', 'register', 'leaderboard']),
  voucher: new Set(['voucher']),
  video: new Set(['video']),
};
const LOCAL_WIZARD_PAGE_SETTINGS = new Set(['onboardingFirstRunOnly']);

function moduleSupportedByPages(moduleId, pages) {
  if (GLOBAL_OPTIONAL_MODULES.has(moduleId)) return true;
  const supportedTypes = MODULE_PAGE_SUPPORT[moduleId];
  if (!supportedTypes) return false;
  const pageTypes = new Set((pages ?? []).map((p) => pageModuleType(p)));
  for (const type of supportedTypes) {
    if (pageTypes.has(type)) return true;
  }
  return false;
}

/** Modules that imply other modules */
function resolveImplied(selectedModules) {
  const manifests = loadAllManifests();
  const resolved  = new Set(selectedModules);
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...resolved]) {
      const m = manifests[id];
      if (m?.implies) {
        for (const dep of m.implies) {
          if (!resolved.has(dep)) { resolved.add(dep); changed = true; }
        }
      }
    }
  }
  return [...resolved];
}

// ─── Manifest helpers ─────────────────────────────────────────────────────────
const _manifestCache = {};

function validateManifest(manifest, moduleId) {
  const base = `Manifest validation failed for module "${moduleId}"`;
  if (!manifest.id)              throw new Error(`${base}: missing required field "id"`);
  if (!manifest.name)            throw new Error(`${base}: missing required field "name"`);
  if (!Array.isArray(manifest.files)) throw new Error(`${base}: "files" must be an array`);
  for (let i = 0; i < manifest.files.length; i++) {
    const f = manifest.files[i];
    if (!f.src)  throw new Error(`${base}: files[${i}] missing "src"`);
    if (!f.dest) throw new Error(`${base}: files[${i}] missing "dest"`);
  }
}

function loadManifest(moduleId) {
  if (_manifestCache[moduleId]) return _manifestCache[moduleId];
  const p = join(MODULES_DIR, moduleId, 'manifest.json');
  if (!existsSync(p)) throw new Error(`Manifest not found: ${p}`);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    throw new Error(`Invalid JSON in manifest ${p}: ${e.message}`);
  }
  validateManifest(manifest, moduleId);
  _manifestCache[moduleId] = manifest;
  return manifest;
}

function loadAllManifests() {
  const all = {};
  const dirs = readdirSync(MODULES_DIR).filter(d =>
    statSync(join(MODULES_DIR, d)).isDirectory()
  );
  for (const id of dirs) {
    try { all[id] = loadManifest(id); } catch { /* skip */ }
  }
  return all;
}

// ─── Arg parsing ─────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { modules: [], pages: [], routeOverrides: {}, market: 'NL' };
  for (const raw of argv.slice(2)) {
    const [key, ...rest] = raw.replace(/^--/, '').split('=');
    const val = rest.join('=');
    if      (key === 'module')   args.modules.push(val);
    else if (key === 'page')     args.pages.push(val);
    else if (key === 'name')     args.name     = val;
    else if (key === 'cape-id')  args.capeId   = val;
    else if (key === 'market')   args.market   = val;
    else if (key === 'game' || key === 'engine') args.game = val;
    else if (key === 'game-id')  args.gameId   = val;
    else if (key === 'stack')    args.stack    = val;
    else if (key === 'reg-mode') args.regMode  = val;
    else if (key === 'gtm-id')   args.gtmId    = val;
    else if (key === 'output')   args.output   = val;
    else if (key === 'config')   args.config   = val;
    else if (key === 'iframe')   args.iframe   = true;
    else if (key === 'update' || key === 'u') args.update = true;
    else if (key === 'yes' || key === 'y') args.yes = true;
    else if (key === 'create-cape') args.createCape = true;
    else if (key === 'recreate' || key === 'rebuild') args.recreate = true;
    else if (key === 'skip-install') args.skipInstall = true;
    else if (key === 'skip-git') args.skipGit = true;
    else if (key === 'route') {
      const colonIdx = val.indexOf(':');
      if (colonIdx > 0) {
        const id   = val.slice(0, colonIdx);
        const slug = val.slice(colonIdx + 1);
        args.routeOverrides[id] = slug.startsWith('/') ? slug : `/${slug}`;
      }
    }
  }
  return args;
}

/**
 * Validates CLI args after parseArgs().
 * Throws with a clear message for each invalid value so non-interactive
 * runs (CI, scripts) fail fast before any files are written.
 */
function validateArgs(args) {
  if (args.name) {
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(args.name)) {
      throw new Error(`Invalid project name "${args.name}". Use lowercase letters, numbers, and hyphens only (e.g. hema-handdoek-2025).`);
    }
    if (RESERVED_NAMES.has(args.name)) {
      throw new Error(`"${args.name}" is a reserved name. Choose a project-specific slug (e.g. hema-handdoek-2025).`);
    }
  }
  if (args.capeId && !/^\d+$/.test(args.capeId)) {
    throw new Error(`Invalid CAPE ID "${args.capeId}". CAPE IDs are numeric strings (e.g. 54031).`);
  }
  if (args.market && !VALID_MARKETS.has(args.market.toUpperCase())) {
    throw new Error(`Unknown market "${args.market}". Valid markets: ${[...VALID_MARKETS].join(', ')}.`);
  }
}

export function validateConfig({ game = 'none', pages = [], pageTypes = {}, modules = [] }) {
  const errors = [];
  const warnings = [];
  const engine = game || 'none';
  const pageIds = (pages ?? []).map((p) => typeof p === 'string' ? p : p?.id).filter(Boolean);
  const typeOf = (id) => pageTypes[id] ?? basePageType(id);

  let hasGamePage = false;
  for (const pageId of pageIds) {
    let pageType;
    try {
      pageType = typeOf(pageId);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      continue;
    }
    if (pageType === 'game') hasGamePage = true;
  }

  if (engine === 'none' && hasGamePage) {
    errors.push('`game` page requires an engine. Add --engine=unity|r3f|phaser or remove the `game` page.');
  }
  if (engine !== 'none' && !hasGamePage) {
    warnings.push(`Engine "${engine}" selected but no \`game\` page is in the flow. The runtime won't render.`);
  }

  const policy = moduleSelectionPolicy(pageIds, engine);
  const allowedExtras = new Set([...policy.required, ...policy.selectable]);
  for (const moduleId of modules ?? []) {
    if (GAME_ENGINES.includes(moduleId)) continue;
    if (allowedExtras.has(moduleId)) continue;
    warnings.push(`Ignoring module "${moduleId}" because no selected page supports it.`);
  }

  return { errors, warnings };
}

// ─── Flow computation ─────────────────────────────────────────────────────────

/**
 * Given the ordered flow page ids, registration mode, and per-exit
 * overrides, compute the navigation token map.
 *
 * `flowExits` keys are `{pageId}.{exitKey}` -> target page id.
 *
 * Tokens emitted:
 *   {{FLOW_ENTRY}}                   route of the first page
 *   {{NEXT_AFTER_<PAGE_ID>}}         "next" exit per page, uppercased id
 *   {{PLAY_AGAIN_ROUTE}}             result.playAgain destination
 *   {{LANDING_LEADERBOARD_ROUTE}}    landing.leaderboard destination
 *   {{RESULT_LEADERBOARD_ROUTE}}     result.leaderboard destination
 */
function computeFlowTokens(pages, regMode = 'none', flowExits = {}, flowEntry = '', pageTypes = {}, routeMap = {}) {
  let sequence = pages.length > 0 ? [...pages] : [...ALL_PAGES];

  const typeOf = (id) => pageTypes[id] ?? id;

  // regMode: 'after' moves the FIRST register-typed page past the FIRST
  // result-typed page. Drag-to-reorder in the wizard makes this rarely
  // needed; preserved for legacy --reg-mode=after callers.
  if (regMode === 'after') {
    const regIdx    = sequence.findIndex(id => typeOf(id) === 'register');
    const resultIdx = sequence.findIndex(id => typeOf(id) === 'result');
    if (regIdx >= 0 && resultIdx >= 0 && regIdx < resultIdx) {
      const [regId] = sequence.splice(regIdx, 1);
      const newResultIdx = sequence.findIndex(id => typeOf(id) === 'result');
      sequence.splice(newResultIdx + 1, 0, regId);
    }
  }

  const tokens = {};
  const inFlow = (id) => sequence.includes(id);
  /** Route of an page. Canonical singleton pages keep their real app route. */
  const routeOf = (id) => {
    if (!id) return '/';
    return routeFor(id, routeMap);
  };
  /** Find first page whose TYPE matches (for default-target heuristics). */
  const firstOfType = (type) => sequence.find(id => typeOf(id) === type);

  // FLOW_ENTRY → user override if it's still in the flow, otherwise first page.
  const entry = flowEntry && inFlow(flowEntry) ? flowEntry : sequence[0];
  tokens['{{FLOW_ENTRY}}'] = entry ? routeOf(entry) : '/';

  // NEXT_AFTER_* per page — token uses the page ID (uppercased).
  // The wizard does the same when emitting source code via token rename.
  for (let i = 0; i < sequence.length; i++) {
    const id       = sequence[i];
    const tokenKey = `{{NEXT_AFTER_${id.toUpperCase()}}}`;
    const override = flowExits[`${id}.next`];
    if (override && inFlow(override)) {
      tokens[tokenKey] = routeOf(override);
    } else {
      const nextId = sequence[i + 1];
      tokens[tokenKey] = nextId ? routeOf(nextId) : routeOf(sequence[0]) ?? '/';
    }
  }

  // PLAY_AGAIN_ROUTE — caller override (keyed by RESULT page id), then
  // first game / first onboarding / first page.
  const resultId          = firstOfType('result');
  const playAgainOverride = resultId ? flowExits[`${resultId}.playAgain`] : null;
  if (playAgainOverride && inFlow(playAgainOverride)) {
    tokens['{{PLAY_AGAIN_ROUTE}}'] = routeOf(playAgainOverride);
  } else {
    tokens['{{PLAY_AGAIN_ROUTE}}'] =
      routeOf(firstOfType('game')) ||
      routeOf(firstOfType('onboarding')) ||
      routeOf(sequence[0]);
  }

  // ── Secondary optional exits (configurable buttons on landing/result/…). ──
  const SECONDARY_EXITS = [
    { sourceType: 'landing', exitKey: 'leaderboard', token: '{{LANDING_LEADERBOARD_ROUTE}}', defaultTargetType: 'leaderboard' },
    { sourceType: 'result',  exitKey: 'leaderboard', token: '{{RESULT_LEADERBOARD_ROUTE}}',  defaultTargetType: 'leaderboard' },
  ];
  for (const { sourceType, exitKey, token, defaultTargetType } of SECONDARY_EXITS) {
    const sourceId  = firstOfType(sourceType);
    const overrideId = sourceId ? flowExits[`${sourceId}.${exitKey}`] : null;
    if (overrideId && inFlow(overrideId)) {
      tokens[token] = routeOf(overrideId);
    } else {
      const targetId = firstOfType(defaultTargetType);
      tokens[token] = targetId ? routeOf(targetId) : (routeOf(sequence[0]) || '/');
    }
  }

  return tokens;
}

// ─── Interactive wizard ───────────────────────────────────────────────────────

/** Single-shot prompt — creates a fresh readline, asks one question, closes it. */
function promptOnce(question) {
  return new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (a) => { rl.close(); res(a); });
  });
}

function printRouteTable(pages, pageTypes = {}) {
  console.log(`  ${c.bold('Selected pages so far:')}`);
  pages.forEach((pageId, index) => {
    const route = routeFor(pageId);
    console.log(`    ${index + 1}. ${c.cyan(route.padEnd(16))} ${c.dim(`page: ${pageId}`)}`);
  });
}

async function promptName(state, ask = promptOnce) {
  let next;
  do {
    if (next !== undefined) console.log(`  ${c.red('x')} Invalid - use lowercase letters, numbers and hyphens`);
    next = (await ask(`  ${c.cyan('Project name')}: `)).trim();
  } while (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(next));
  state.name = next;
  return state;
}

async function promptCapeId(state, ask = promptOnce) {
  console.log(c.dim('  Existing campaign to bind to. Leave blank to create a new one in the next step.'));
  let next;
  do {
    if (next !== undefined) console.log(`  ${c.red('x')} CAPE ID must be numeric`);
    next = (await ask(`  ${c.cyan('CAPE ID')}: `)).trim();
  } while (next && !/^\d+$/.test(next));
  state.capeId = next;
  return state;
}

async function promptMarket(state, ask = promptOnce) {
  console.log(c.dim('  Two-letter country code. Drives default language, GDPR copy, and CAPE locale. Example: NL'));
  const raw = (await ask(`  ${c.cyan('Market')} ${c.dim(`(options: ${[...VALID_MARKETS].join('/')})`)} : `)).trim().toUpperCase();
  if (!raw) return state;
  if (VALID_MARKETS.has(raw)) state.market = raw;
  else console.log(`  ${c.yellow('!')} Unknown market - keeping ${state.market}`);
  return state;
}

async function promptEngine(state, ask = promptOnce) {
  const raw = (await ask(`  ${c.cyan('Engine')} ${c.dim('(unity/r3f/phaser/pure-react/none)')}: `)).trim();
  if (!raw) return state;
  if (['unity', 'r3f', 'phaser', 'pure-react', 'none'].includes(raw)) {
    state.game = raw;
    if (raw !== 'unity') state.selectedGame = null;
  } else {
    console.log(`  ${c.yellow('!')} Unknown engine - keeping ${state.game || 'none'}`);
  }
  return state;
}

async function promptGame(state, ask = promptOnce, stack = 'next') {
  const unityGames = getGamesByStack('unity', stack);
  console.log('');
  console.log(`  ${c.bold('Unity game:')}`);
  unityGames.forEach((g, i) => {
    console.log(`    ${c.dim(`${i + 1})`)} ${c.cyan(g.name)}  ${c.dim(`- ${g.description}`)}`);
  });
  const customIdx = unityGames.length + 1;
  const newIdx    = unityGames.length + 2;
  console.log(`    ${c.dim(`${customIdx})`)} Existing/custom game  ${c.dim('<- paste CDN URL, game name & scene key')}`);
  console.log(`    ${c.dim(`${newIdx})`)} New game              ${c.dim('<- leave vars empty - fill in later')}`);
  const raw = (await ask(`  ${c.cyan('Select')} ${c.dim('[1-' + newIdx + ', default: 1]')}: `)).trim();
  const choice = parseInt(raw, 10) || 1;
  if (choice >= 1 && choice <= unityGames.length) {
    state.selectedGame = unityGames[choice - 1];
    state.game = 'unity';
    console.log(`      ${c.green('ok')} Template: ${state.selectedGame.name}`);
  } else if (choice === customIdx) {
    const cdnUrl   = (await ask(`  ${c.cyan('CDN URL')} ${c.dim('(e.g. https://cdn.example.com/Build)')}: `)).trim();
    const gameName = (await ask(`  ${c.cyan('Game name')} ${c.dim('(Unity build file prefix, e.g. Game)')}: `)).trim() || 'Game';
    const scene    = (await ask(`  ${c.cyan('Default scene')} ${c.dim('(scene key Unity expects, e.g. Racing)')}: `)).trim() || 'Game';
    state.selectedGame = {
      name: gameName,
      description: 'Custom game',
      engine: 'unity',
      boot: { defaultScene: scene },
      env: {
        NEXT_PUBLIC_UNITY_BASE_URL:  cdnUrl,
        NEXT_PUBLIC_UNITY_GAME_NAME: gameName,
        NEXT_PUBLIC_UNITY_MIN_DPR:   '1',
        NEXT_PUBLIC_UNITY_MAX_DPR:   '1.5',
      },
    };
    state.game = 'unity';
    console.log(`      ${c.green('ok')} CDN: ${c.dim(cdnUrl)}  Game: ${c.dim(gameName)}  Scene: ${c.dim(scene)}`);
  } else {
    state.selectedGame = null;
  }
  return state;
}

async function promptPages(state, ask = promptOnce) {
  const defaults = state.pages?.length ? state.pages : buildDefaultPages(state.game);
  console.log('');
  console.log(`  ${c.bold('Campaign pages')} ${c.dim('(comma-separated numbers or ids):')}`);
  ALL_PAGES.forEach((p, i) => {
    const on = defaults.includes(p) ? c.green('*') : c.dim(' ');
    console.log(`    ${on} ${c.dim(`${i + 1})`)} ${p}${routeFor(p) !== '/' ? c.dim(` (${routeFor(p)})`) : ''}`);
  });
  const raw = (await ask(`  ${c.cyan('Select')} ${c.dim(`[default: ${defaults.map((p) => ALL_PAGES.indexOf(p) + 1).filter((n) => n > 0).join(',')}]`)}: `)).trim();
  let next = defaults;
  if (raw) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const numeric = parts.every((part) => /^\d+$/.test(part));
    next = numeric
      ? parts.map((part) => {
        const n = parseInt(part, 10);
        return (n >= 1 && n <= ALL_PAGES.length) ? ALL_PAGES[n - 1] : null;
      }).filter(Boolean)
      : parts;
  }
  if (state.game && state.game !== 'pure-react' && state.game !== 'none' && !next.includes('game')) next = [...next, 'game'];
  state.pages = next;
  printRouteTable(state.pages);
  return state;
}

async function promptModules(state, ask = promptOnce) {
  const policy = moduleSelectionPolicy(state.pages ?? [], state.game);
  const optional = policy.selectable;
  const suggested = policy.suggested;
  const defaults = state.extraModules?.length
    ? state.extraModules.filter((id) => optional.includes(id))
    : suggested;
  console.log('');
  console.log(`  ${c.bold('Modules')} ${c.dim('(comma-separated numbers or ids):')}`);
  if (policy.required.length > 0) {
    console.log(`  ${c.dim(`Locked by selected pages: ${policy.required.join(', ')}`)}`);
  }
  if (optional.length === 0) {
    console.log(`  ${c.dim('No additional modules available for the current page flow.')}`);
    state.extraModules = [];
    return state;
  }
  if (suggested.length > 0) {
    console.log(`  ${c.dim(`Smart defaults: ${suggested.join(', ')} - pre-selected based on your pages`)}`);
  }
  optional.forEach((id, i) => {
    const on = defaults.includes(id) ? c.green('*') : c.dim(' ');
    const m = (() => { try { return loadManifest(id); } catch { return null; } })();
    const desc = m ? c.dim(` - ${m.description.split('.')[0]}`) : '';
    const adds = m?.implies?.length ? c.dim(` (adds: ${m.implies.join(', ')})`) : '';
    console.log(`    ${on} ${c.dim(`${i + 1})`)} ${id}${adds}${desc}`);
  });
  const raw = (await ask(`  ${c.cyan('Select')} ${c.dim(`[default: ${defaults.map((id) => optional.indexOf(id) + 1).filter((n) => n > 0).join(',')}]`)}: `)).trim();
  if (raw) {
    state.extraModules = raw.split(',').map((s) => {
      const token = s.trim();
      const n = parseInt(token, 10);
      return (n >= 1 && n <= optional.length) ? optional[n - 1] : token;
    }).filter((id) => optional.includes(id));
  } else {
    state.extraModules = defaults;
  }
  return state;
}

async function promptRegMode(state, ask = promptOnce) {
  console.log('');
  console.log(`  ${c.bold('Registration mode:')}`);
  console.log(`    ${c.dim('0)')} Gate - player must register before playing`);
  console.log(`    ${c.dim('1)')} After - register to save score after the game`);
  console.log(`    ${c.dim('2)')} Optional - link from result page, not required`);
  const raw = (await ask(`  ${c.cyan('Select')} ${c.dim('[0-2, default: 1]')}: `)).trim();
  state.regMode = raw === '0' ? 'gate' : raw === '2' ? 'optional' : 'after';
  return state;
}

async function promptGtmId(state, ask = promptOnce) {
  state.gtmId = (await ask(`  ${c.cyan('GTM ID')} ${c.dim('(leave blank to clear)')}: `)).trim();
  return state;
}

async function promptIframe(state, ask = promptOnce) {
  const raw = (await ask(`  ${c.cyan('Iframe mode?')} ${c.dim('[y/N]')}: `)).trim().toLowerCase();
  state.iframe = raw === 'y' || raw === 'yes';
  return state;
}

async function promptOutput(state, ask = promptOnce) {
  const def = resolve(SCAFFOLDER_ROOT, '..', state.name);
  console.log(c.dim(`  Where to scaffold the project. Default ../${state.name} resolves to: ${def}`));
  const raw = (await ask(`  ${c.cyan('Output directory')} ${c.dim(`(default: ${def})`)}: `)).trim();
  state.outputDir = resolve(raw || def);
  return state;
}

const EDIT_OPTIONS = [
  { key: '1',  label: 'Project name',      value: (state) => state.name,                         fn: promptName },
  { key: '2',  label: 'CAPE ID',           value: (state) => state.capeId || 'new/blank',          fn: promptCapeId },
  { key: '3',  label: 'Market',            value: (state) => state.market,                       fn: promptMarket },
  { key: '4',  label: 'Engine',            value: (state) => state.game || 'none',                fn: promptEngine },
  { key: '5',  label: 'Game pick',         value: (state) => state.selectedGame?.name || 'none',  fn: promptGame },
  { key: '6',  label: 'Pages',             value: (state) => (state.pages ?? []).join(', '),      fn: promptPages },
  { key: '7',  label: 'Registration mode', value: (state) => state.regMode,                      fn: promptRegMode },
  { key: '8',  label: 'GTM ID',            value: (state) => state.gtmId || 'none',               fn: promptGtmId },
  { key: '9',  label: 'Iframe',            value: (state) => state.iframe ? 'enabled' : 'disabled', fn: promptIframe },
  { key: '10', label: 'Output dir',        value: (state) => state.outputDir,                    fn: promptOutput },
];

function printEditOptions(state, options = EDIT_OPTIONS) {
  console.log('');
  console.log(`  ${c.bold('Edit field:')}`);
  for (const option of options) {
    console.log(`    ${c.dim(`${option.key})`)} ${option.label.padEnd(18)} ${c.dim(`(${option.value(state)})`)}`);
  }
}

async function runWizard(pre) {
  const rl  = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  console.log('');
  console.log(c.bold('  ┌──────────────────────────────────────────────┐'));
  if (pre.isUpdate) {
    console.log(c.bold('  │   Livewall Campaign Scaffolder — Update      │'));
  } else {
    console.log(c.bold('  │   Livewall Campaign Scaffolder               │'));
  }
  console.log(c.bold('  └──────────────────────────────────────────────┘'));
  if (pre.isUpdate) {
    console.log('');
    console.log(`  ${c.yellow('Update mode')} ${c.dim(`— ${pre.name}  (${pre.stack})`)}`);
    console.log(`  ${c.dim('Stack and project name are fixed. Update pages, elements, modules, or IDs.')}`);
  }
  console.log('');

  // 0. Stack + engine — combined into one prompt
  let stack = pre.stack ?? null;
  let game  = pre.game  ?? null;
  let selectedGame = null;
  if (stack === null) {
    console.log(`  ${c.bold('Pick engine:')}`);
    console.log(`    ${c.dim('1)')} ${c.cyan('Next.js + Unity')}   ${c.dim('← Next.js 16 + Unity WebGL (HaasF1, custom…)')}`);
    console.log(`    ${c.dim('2)')} ${c.cyan('TanStack + Unity')}  ${c.dim('← TanStack Start + Unity WebGL (NHL-Crush, custom…)')}`);
    console.log(`    ${c.dim('3)')} ${c.cyan('React Three Fiber')} ${c.dim('← 3D — R3F / ThreeJS')}`);
    console.log(`    ${c.dim('4)')} ${c.cyan('Phaser 3')}          ${c.dim('← 2D game engine — like Freekick')}`);
    console.log(`    ${c.dim('5)')} ${c.cyan('Frontend')}          ${c.dim('← Pure React — like Hunkemoller memory game')}`);
    console.log(`    ${c.dim('6)')} ${c.cyan('No game')}           ${c.dim('← Next.js 16 — CAPE only, registration flows')}`);
    const v = (await ask(`  ${c.cyan('Select')} ${c.dim('[1-6, default: 1]')}: `)).trim();
    if (v === '2') {
      stack = 'tanstack'; game = 'unity';
    } else if (v === '3') {
      stack = 'next'; game = 'r3f';
    } else if (v === '4') {
      stack = 'next'; game = 'phaser';
    } else if (v === '5') {
      stack = 'next'; game = 'memory';
    } else if (v === '6') {
      stack = 'next'; game = '';
    } else {
      // Default / option 1: Next.js + Unity — game picker runs below
      stack = 'next'; game = 'unity';
    }
  }

  // 1. Project name
  let name = pre.name;
  if (!name) {
    let firstAttempt = true;
    do {
      if (!firstAttempt) {
        if (!name) console.log(`  ${c.red('✘')} Name is required`);
        else console.log(`  ${c.red('✘')} Invalid — use lowercase letters, numbers and hyphens only (e.g. hema-handdoek-2025)`);
      }
      name = (await ask(`  ${c.cyan('Project name')} ${c.dim('(e.g. hema-handdoek-2025)')}: `)).trim();
      firstAttempt = false;
    } while (!name || (!pre.isUpdate && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name)));
  }

  // CAPE ID — deferred until after page/element selections for all stacks
  let capeId = pre.capeId;
  let capeAutoPublished = Boolean(pre.capeAutoPublished);
  let capePublishedUrl  = pre.capePublishedUrl ?? '';

  // 3. Market
  let market = pre.market || 'NL';
  if (!pre.market) {
    console.log(c.dim('  Two-letter country code. Drives default language, GDPR copy, and CAPE locale. Example: NL'));
    let mv = (await ask(`  ${c.cyan('Market')} ${c.dim(`(default: ${market} — options: ${[...VALID_MARKETS].join('/')})`)} : `)).trim();
    if (mv) {
      mv = mv.toUpperCase();
      if (!VALID_MARKETS.has(mv)) {
        console.log(`  ${c.yellow('⚠')} Unknown market "${mv}" — defaulting to NL. You can change this in .env later.`);
      } else {
        market = mv;
      }
    }
  }

  // TanStack — full wizard for pages + elements
  if (stack === 'tanstack') {
    // 3b. Unity game type: existing (CDN URL), NHL-Crush example, or new
    const NHL_CRUSH_CDN = 'https://lw-wave-nhlcrush-unity-test.lwcf5.nl';
    let unityCdnUrl = pre.unityCdnUrl ?? '';
    if (!pre.isUpdate && !unityCdnUrl) {
      console.log('');
      console.log(`  ${c.bold('Unity game:')}`);
      console.log(`    ${c.dim('1)')} ${c.cyan('NHL-Crush')}           ${c.dim('— Hockey shooting game (NHL-Crush CDN)')}`);
      console.log(`    ${c.dim('2)')} Existing/custom game  ${c.dim('← paste CDN URL & scene key')}`);
      console.log(`    ${c.dim('3)')} New game              ${c.dim('← leave CDN vars empty — fill in later')}`);
      const ut = (await ask(`  ${c.cyan('Select')} ${c.dim('[1-3, default: 1]')}: `)).trim();
      const utn = parseInt(ut, 10) || 1;
      if (utn === 1) {
        unityCdnUrl = NHL_CRUSH_CDN;
        console.log(`      ${c.green('✔')} CDN: ${c.dim(unityCdnUrl)}`);
      } else if (utn === 2) {
        unityCdnUrl = (await ask(`  ${c.cyan('CDN URL')} ${c.dim('(e.g. https://cdn.example.com/Build)')}: `)).trim();
      }
      // utn === 3 → leave empty
    }

    // 4. Page selection
    let tsPages = pre.pages.length > 0 ? pre.pages : null;
    const tsDefaultPages = ['launch', 'tutorial', 'game', 'score'];
    if (!tsPages) {
      console.log('');
      console.log(`  ${c.bold('Campaign pages')} ${c.dim('(comma-separated numbers):')}`);
      TS_ALL_PAGES.forEach((p, i) => {
        const on = tsDefaultPages.includes(p) ? c.green('●') : c.dim('○');
        console.log(`    ${on} ${c.dim(`${i + 1})`)} ${p}${TS_PAGE_ROUTES[p] ? c.dim(` (${TS_PAGE_ROUTES[p]})`) : ''}`);
      });
      const v = (await ask(`  ${c.cyan('Select')} ${c.dim(`[default: ${tsDefaultPages.map(p => TS_ALL_PAGES.indexOf(p) + 1).join(',')}]`)}: `)).trim();
      if (v) {
        tsPages = v.split(',').map(s => { const n = parseInt(s.trim(), 10); return (n >= 1 && n <= TS_ALL_PAGES.length) ? TS_ALL_PAGES[n - 1] : null; }).filter(Boolean);
      } else {
        tsPages = tsDefaultPages;
      }
    }
    // game is always included
    if (!tsPages.includes('game')) tsPages.push('game');
    printRouteTable(tsPages);

    // 5. Page builder — element selection per page
    const BUILDABLE_TS = ['launch', 'tutorial', 'score', 'register'];
    const tsPageElementSelections = {};
    for (const page of tsPages.filter(p => BUILDABLE_TS.includes(p))) {
      const available = TS_PAGE_ELEMENTS[page] ?? [];
      if (available.length === 0) continue;
      const defaults = TS_PAGE_DEFAULTS[page] ?? available;

      console.log('');
      console.log(`  ${c.bold('Page builder —')} ${c.cyan(page)} ${c.dim(`(${TS_PAGE_ROUTES[page]})`)}`);
      console.log(`  ${c.dim('Toggle elements on/off (comma-separated numbers):')}`);
      available.forEach((id, i) => {
        const info = TS_ELEMENT_CATALOGUE[id] ?? {};
        const on   = defaults.includes(id) ? c.green('●') : c.dim('○');
        const desc = info.description ? c.dim(` — ${info.description}`) : '';
        console.log(`    ${on} ${c.dim(`${i + 1})`)} ${id}${desc}`);
      });

      const defaultNums = defaults.filter(id => available.includes(id)).map(id => available.indexOf(id) + 1).join(',');
      const v = (await ask(`  ${c.cyan('Select')} ${c.dim(`[default: ${defaultNums}]`)}: `)).trim();
      if (v) {
        tsPageElementSelections[page] = v.split(',').map(s => { const n = parseInt(s.trim(), 10); return (n >= 1 && n <= available.length) ? available[n - 1] : null; }).filter(Boolean);
      } else {
        tsPageElementSelections[page] = defaults.filter(id => available.includes(id));
      }

      // Tutorial step count
      if (page === 'tutorial' && tsPageElementSelections[page].includes('steps')) {
        const sv = (await ask(`  ${c.cyan('How many tutorial steps?')} ${c.dim('[default: 3]')}: `)).trim();
        const n  = parseInt(sv, 10);
        tsPageElementSelections['tutorial__stepCount'] = (!isNaN(n) && n > 0) ? n : 3;
      }
    }

    // 5b. CAPE campaign — now that selections are known, build a project-specific format
    const generatedFormat = buildTanStackCapeFormat({ pages: tsPages, tsPageElementSelections });
    if (!capeId) {
      console.log('');
      const capeOpt = (await ask(`  ${c.cyan('CAPE campaign')}  ${c.dim('[n=create new / e=use existing ID / s=skip]')} ${c.dim('(default: n)')}: `)).trim().toLowerCase();
      if (capeOpt === '' || capeOpt === 'n' || capeOpt === 'new') {
        console.log('');
        try {
          {
            const createdCape = await runCapeCreateFlow(ask, name, market, null, false, generatedFormat);
            capeId = createdCape.campaignId;
            capeAutoPublished = true;
            capePublishedUrl = createdCape.publishedUrl || '';
          }
        } catch (err) {
          console.log(`\n  ${c.red('✘')} ${err.message}`);
          console.log('');

          let recovered = false;
          while (!recovered && !capeId) {
            console.log(`  ${c.bold('Recovery options:')}`);
            console.log(`    ${c.dim('1)')} Retry login            ${c.dim('← clear cache & login fresh')}`);
            console.log(`    ${c.dim('2)')} Open CAPE & retry      ${c.dim('← check account, then login')}`);
            console.log(`    ${c.dim('3)')} Use existing ID        ${c.dim('← enter CAPE campaign ID manually')}`);
            console.log(`    ${c.dim('4)')} Skip                   ${c.dim('← set CAPE_CAMPAIGN_ID in .env later')}`);

            const choice = (await ask(`  ${c.cyan('Select')} ${c.dim('[1-4]')}: `)).trim();

            if (choice === '1') {
              console.log('');
              await clearTokenCache();
              try {
                {
                  const createdCape = await runCapeCreateFlow(ask, name, market, null, true, generatedFormat);
                  capeId = createdCape.campaignId;
                  capeAutoPublished = true;
                  capePublishedUrl = createdCape.publishedUrl || '';
                }
                recovered = true;
              } catch (retryErr) {
                console.log(`  ${c.red('✘')} ${retryErr.message}`);
                console.log('');
              }
            } else if (choice === '2') {
              console.log('');
              console.log(`  ${c.dim('Opening https://engagement.acceptance.campaigndesigner.io ...')}`);
              try {
                const url = 'https://engagement.acceptance.campaigndesigner.io';
                if (process.platform === 'win32') execSync(`start "${url}"`, { stdio: 'ignore', shell: true });
                else if (process.platform === 'darwin') execSync(`open "${url}"`, { stdio: 'ignore' });
                else execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
                console.log(`  ${c.green('✓')} Browser opened. Check your account, then return here.`);
              } catch {
                console.log(`  ${c.yellow('⚠')} Could not open browser. Visit: https://engagement.acceptance.campaigndesigner.io`);
              }
              console.log('');
              await clearTokenCache();
              try {
                {
                  const createdCape = await runCapeCreateFlow(ask, name, market, null, true, generatedFormat);
                  capeId = createdCape.campaignId;
                  capeAutoPublished = true;
                  capePublishedUrl = createdCape.publishedUrl || '';
                }
                recovered = true;
              } catch (retryErr) {
                console.log(`  ${c.red('✘')} ${retryErr.message}`);
                console.log('');
              }
            } else if (choice === '3') {
              console.log('');
              while (!capeId || !/^\d+$/.test(capeId)) {
                if (capeId) console.log(`  ${c.red('✘')} CAPE ID must be numeric (e.g. 54031)`);
                capeId = (await ask(`  ${c.cyan('CAPE campaign ID')}: `)).trim();
              }
              console.log(`  ${c.green('✓')} Using CAPE ID: ${c.cyan(capeId)}`);
              recovered = true;
            } else if (choice === '4') {
              console.log(`  ${c.dim('CAPE skipped — set CAPE_CAMPAIGN_ID in .env to connect later.')}`);
              capeId = '0';
              recovered = true;
            } else {
              console.log(`  ${c.red('✘')} Invalid selection. Please choose 1-4.`);
              console.log('');
            }
          }
        }
        console.log('');
      } else if (capeOpt === 'e' || capeOpt === 'existing') {
        console.log(c.dim('  Existing campaign to bind to. Leave blank to create a new one in the next step.'));
        while (!capeId || !/^\d+$/.test(capeId)) {
          if (capeId) console.log(`  ${c.red('✘')} CAPE ID must be numeric (e.g. 54031)`);
          capeId = (await ask(`  ${c.cyan('CAPE campaign ID')}: `)).trim();
        }
        console.log(`  ${c.green('✓')} Using CAPE ID: ${c.cyan(capeId)}`);
      } else {
        console.log(`  ${c.dim('CAPE skipped — set CAPE_CAMPAIGN_ID in .env to connect later.')}`);
        capeId = '0';
      }
    }

    // 6. GTM ID
    let gtmId = pre.gtmId ?? '';
    if (!gtmId) {
      gtmId = (await ask(`  ${c.cyan('GTM ID')} ${c.dim('(e.g. GTM-XXXXXX — leave blank to fill later)')}: `)).trim();
    }

    // 7. Output directory
    let outputDir = pre.output;
    if (!outputDir) {
      const def = resolve(SCAFFOLDER_ROOT, '..', name);
      console.log(c.dim(`  Where to scaffold the project. Default ../${name} resolves to: ${def}`));
      outputDir = (await ask(`  ${c.cyan('Output directory')} ${c.dim(`(default: ${def})`)}: `)).trim();
      if (!outputDir) outputDir = def;
    }
    outputDir = resolve(outputDir);

    rl.close();

    // Confirm
    const printTsSummary = () => {
      console.log('');
      console.log(c.bold('  ──────────────────────────────────────────────'));
      console.log(`  ${c.bold('Stack:')}    ${c.cyan('TanStack Start + Vite')}`);
      console.log(`  ${c.bold('Project:')} ${c.cyan(name)}`);
      console.log(`  ${c.bold('CAPE ID:')} ${c.cyan(capeId)}  ${c.dim(`(market: ${market})`)}`);
      console.log(`  ${c.bold('Pages:')}   ${tsPages.map(p => c.cyan(p)).join(' → ')}`);
      if (gtmId) console.log(`  ${c.bold('GTM:')}     ${c.cyan(gtmId)}`);
      console.log(`  ${c.bold('Output:')}  ${c.dim(outputDir)}`);
      console.log(c.bold('  ──────────────────────────────────────────────'));
    };

    if (!pre.yes) {
      printTsSummary();
      let done = false;
      while (!done) {
        const ans = (await promptOnce(`\n  Proceed? ${c.dim('[Y/n/e(dit)]')}: `)).trim().toLowerCase();
        if (ans === '' || ans === 'y') { done = true; }
        else if (ans === 'n') { console.log('\n  Aborted.\n'); process.exit(0); }
        else if (ans === 'e' || ans === 'edit') {
          console.log('');
          console.log(`  ${c.bold('Edit field:')}`);
          console.log(`    ${c.dim('1)')} Project name  ${c.dim(`(${name})`)}`);
          console.log(`    ${c.dim('2)')} CAPE ID        ${c.dim(`(${capeId})`)}`);
          console.log(`    ${c.dim('3)')} Market         ${c.dim(`(${market})`)}`);
          console.log(`    ${c.dim('4)')} GTM ID         ${c.dim(`(${gtmId || 'none'})`)}`);
          console.log(`    ${c.dim('5)')} Output dir     ${c.dim(`(${outputDir})`)}`);
          const field = (await promptOnce(`  ${c.cyan('Field')}: `)).trim();
          if (field === '1') {
            let n;
            do {
              if (n !== undefined) console.log(`  ${c.red('✘')} Invalid — use lowercase letters, numbers and hyphens`);
              n = (await promptOnce(`  ${c.cyan('Project name')}: `)).trim();
            } while (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(n));
            name = n;
          } else if (field === '2') {
            let id;
            do {
              if (id !== undefined) console.log(`  ${c.red('✘')} CAPE ID must be numeric`);
              id = (await promptOnce(`  ${c.cyan('CAPE ID')}: `)).trim();
            } while (!/^\d+$/.test(id));
            capeId = id;
          } else if (field === '3') {
            const mv = (await promptOnce(`  ${c.cyan('Market')} ${c.dim(`(options: ${[...VALID_MARKETS].join('/')})`)} : `)).trim().toUpperCase();
            if (VALID_MARKETS.has(mv)) market = mv;
            else console.log(`  ${c.yellow('⚠')} Unknown market — keeping ${market}`);
          } else if (field === '4') {
            gtmId = (await promptOnce(`  ${c.cyan('GTM ID')} ${c.dim('(leave blank to clear)')}: `)).trim();
          } else if (field === '5') {
            const d = (await promptOnce(`  ${c.cyan('Output directory')}: `)).trim();
            if (d) outputDir = resolve(d);
          }
          printTsSummary();
        }
      }
    }

    return { stack, name, capeId, market, game: 'unity', pages: tsPages, regMode: 'none', modules: [], gtmId, iframe: false, outputDir, tsPageElementSelections, unityCdnUrl, capeAutoPublished, capePublishedUrl, isUpdate: pre.isUpdate ?? false };
  }

  // 4b. Game picker — shown when Unity is chosen but no specific game was pre-selected
  if (game === 'unity' && selectedGame === null) {
    const unityGames = getGamesByStack('unity', 'next');
    console.log('');
    console.log(`  ${c.bold('Unity game:')}`);
    unityGames.forEach((g, i) => {
      console.log(`    ${c.dim(`${i + 1})`)} ${c.cyan(g.name)}  ${c.dim(`— ${g.description}`)}`);
    });
    const customIdx = unityGames.length + 1;
    const newIdx    = unityGames.length + 2;
    console.log(`    ${c.dim(`${customIdx})`)} Existing/custom game  ${c.dim('← paste CDN URL, game name & scene key')}`);
    console.log(`    ${c.dim(`${newIdx})`)}   New game              ${c.dim('← leave vars empty — fill in later')}`);
    const gv = (await ask(`  ${c.cyan('Select')} ${c.dim('[1-' + newIdx + ', default: 1]')}: `)).trim();
    const gn = parseInt(gv, 10) || 1;
    if (gn >= 1 && gn <= unityGames.length) {
      selectedGame = unityGames[gn - 1];
      console.log(`      ${c.green('✔')} Template: ${selectedGame.name}`);
    } else if (gn === customIdx) {
      const cdnUrl   = (await ask(`  ${c.cyan('CDN URL')} ${c.dim('(e.g. https://cdn.example.com/Build)')}: `)).trim();
      const gameName = (await ask(`  ${c.cyan('Game name')} ${c.dim('(Unity build file prefix, e.g. Game)')}: `)).trim() || 'Game';
      const scene    = (await ask(`  ${c.cyan('Default scene')} ${c.dim('(scene key Unity expects, e.g. Racing)')}: `)).trim() || 'Game';
      selectedGame = {
        name: gameName,
        description: 'Custom game',
        engine: 'unity',
        boot: { defaultScene: scene },
        env: {
          NEXT_PUBLIC_UNITY_BASE_URL:  cdnUrl,
          NEXT_PUBLIC_UNITY_GAME_NAME: gameName,
          NEXT_PUBLIC_UNITY_MIN_DPR:   '1',
          NEXT_PUBLIC_UNITY_MAX_DPR:   '1.5',
        },
      };
      console.log(`      ${c.green('✔')} CDN: ${c.dim(cdnUrl)}  Game: ${c.dim(gameName)}  Scene: ${c.dim(scene)}`);
    }
    // gn === newIdx → selectedGame stays null, vars left empty for manual setup
  }

  // 5. Campaign pages / flow
  let pages = pre.pages.length > 0 ? pre.pages : null;
  if (!pages) {
    const defaultPages = buildDefaultPages(game);
    console.log('');
    console.log(`  ${c.bold('Campaign pages')} ${c.dim('(comma-separated numbers — current defaults pre-selected):')}`);
    ALL_PAGES.forEach((p, i) => {
      const on = defaultPages.includes(p) ? c.green('●') : c.dim('○');
      console.log(`    ${on} ${c.dim(`${i + 1})`)} ${p}${routeFor(p) !== '/' ? c.dim(` (${routeFor(p)})`) : ''}`);
    });
    const v = (await ask(`  ${c.cyan('Select')} ${c.dim(`[default: ${defaultPages.map((p) => ALL_PAGES.indexOf(p) + 1).join(',')}]`)}: `)).trim();
    if (v) {
      pages = v.split(',').map(s => {
        const n = parseInt(s.trim(), 10);
        return (n >= 1 && n <= ALL_PAGES.length) ? ALL_PAGES[n - 1] : null;
      }).filter(Boolean);
    } else {
      pages = defaultPages;
    }
  }
  // Ensure engine-required pages are present
  if (game && game !== 'pure-react' && game !== 'none' && !pages.includes('game')) pages.push('game');
  printRouteTable(pages);

  // 5b. Page builder — ask what elements each page should have
  const BUILDABLE = ['landing', 'onboarding', 'result', 'menu'];
  const pageElementSelections = {};

  // Always build menu (header button always points to /menu)
  const builderPages = [...new Set([...pages.filter(p => BUILDABLE.includes(p)), 'menu'])];

  for (const page of builderPages) {
    const available = PAGE_ELEMENTS[page] ?? [];
    if (available.length === 0) continue;

    const defaults = PAGE_DEFAULTS[page] ?? available;

    console.log('');
    console.log(`  ${c.bold(`Page builder — `)}${c.cyan(page)} ${c.dim(`(${routeFor(page) ?? '/menu'})`)}`);
    console.log(`  ${c.dim('Toggle elements on/off (comma-separated numbers):')}`);

    available.forEach((id, i) => {
      const info = ELEMENT_CATALOGUE[id] ?? {};
      const on   = defaults.includes(id) ? c.green('●') : c.dim('○');
      const desc = info.description ? c.dim(` — ${info.description}`) : '';
      console.log(`    ${on} ${c.dim(`${i + 1})`)} ${id}${desc}`);
    });

    const defaultNums = defaults
      .filter(id => available.includes(id))
      .map(id => available.indexOf(id) + 1)
      .join(',');

    const v = (await ask(`  ${c.cyan('Select')} ${c.dim(`[default: ${defaultNums}]`)}: `)).trim();

    if (v) {
      pageElementSelections[page] = v.split(',')
        .map(s => { const n = parseInt(s.trim(), 10); return (n >= 1 && n <= available.length) ? available[n - 1] : null; })
        .filter(Boolean);
    } else {
      pageElementSelections[page] = defaults.filter(id => available.includes(id));
    }

    // Step-list: ask how many steps
    if (pageElementSelections[page].includes('step-list') && page === 'onboarding') {
      const sv = (await ask(`  ${c.cyan('How many how-to-play steps?')} ${c.dim('[default: 3]')}: `)).trim();
      const n  = parseInt(sv, 10);
      pageElementSelections[`${page}__stepCount`] = (!isNaN(n) && n > 0) ? n : 3;
    }
  }

  // 5c. CAPE — now that page/element selections are known, build a project-specific format
  if (!capeId) {
    const formatModules = resolveModules(game, pages, []);
    const generatedFormat = buildNextCapeFormat({ pages, pageElementSelections, modules: formatModules });
    console.log('');
    const capeOpt = (await ask(`  ${c.cyan('CAPE campaign')}  ${c.dim('[n=create new / e=use existing ID / s=skip]')} ${c.dim('(default: n)')}: `)).trim().toLowerCase();
    if (capeOpt === '' || capeOpt === 'n' || capeOpt === 'new') {
      console.log('');
      try {
        {
          const createdCape = await runCapeCreateFlow(ask, name, market, null, false, generatedFormat);
          capeId = createdCape.campaignId;
          capeAutoPublished = true;
          capePublishedUrl = createdCape.publishedUrl || '';
        }
      } catch (err) {
        console.log(`\n  ${c.red('✘')} ${err.message}`);
        console.log('');

        let recovered = false;
        while (!recovered && !capeId) {
          console.log(`  ${c.bold('Recovery options:')}`);
          console.log(`    ${c.dim('1)')} Retry login            ${c.dim('← clear cache & login fresh')}`);
          console.log(`    ${c.dim('2)')} Open CAPE & retry      ${c.dim('← check account, then login')}`);
          console.log(`    ${c.dim('3)')} Use existing ID        ${c.dim('← enter CAPE campaign ID manually')}`);
          console.log(`    ${c.dim('4)')} Skip                   ${c.dim('← set CAPE_CAMPAIGN_ID in .env later')}`);

          const choice = (await ask(`  ${c.cyan('Select')} ${c.dim('[1-4]')}: `)).trim();

          if (choice === '1') {
            console.log('');
            await clearTokenCache();
            try {
              {
                const createdCape = await runCapeCreateFlow(ask, name, market, null, true, generatedFormat);
                capeId = createdCape.campaignId;
                capeAutoPublished = true;
                capePublishedUrl = createdCape.publishedUrl || '';
              }
              recovered = true;
            } catch (retryErr) {
              console.log(`  ${c.red('✘')} ${retryErr.message}`);
              console.log('');
            }
          } else if (choice === '2') {
            console.log('');
            console.log(`  ${c.dim('Opening https://engagement.acceptance.campaigndesigner.io ...')}`);
            try {
              const url = 'https://engagement.acceptance.campaigndesigner.io';
              if (process.platform === 'win32') execSync(`start "${url}"`, { stdio: 'ignore', shell: true });
              else if (process.platform === 'darwin') execSync(`open "${url}"`, { stdio: 'ignore' });
              else execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
              console.log(`  ${c.green('✓')} Browser opened. Check your account, then return here.`);
            } catch {
              console.log(`  ${c.yellow('⚠')} Could not open browser. Visit: https://engagement.acceptance.campaigndesigner.io`);
            }
            console.log('');
            await clearTokenCache();
            try {
              {
                const createdCape = await runCapeCreateFlow(ask, name, market, null, true, generatedFormat);
                capeId = createdCape.campaignId;
                capeAutoPublished = true;
                capePublishedUrl = createdCape.publishedUrl || '';
              }
              recovered = true;
            } catch (retryErr) {
              console.log(`  ${c.red('✘')} ${retryErr.message}`);
              console.log('');
            }
          } else if (choice === '3') {
            console.log('');
            while (!capeId || !/^\d+$/.test(capeId)) {
              if (capeId) console.log(`  ${c.red('✘')} CAPE ID must be numeric (e.g. 54031)`);
              capeId = (await ask(`  ${c.cyan('CAPE campaign ID')}: `)).trim();
            }
            console.log(`  ${c.green('✓')} Using CAPE ID: ${c.cyan(capeId)}`);
            recovered = true;
          } else if (choice === '4') {
            console.log(`  ${c.dim('CAPE skipped — set CAPE_CAMPAIGN_ID in .env to connect later.')}`);
            capeId = '0';
            recovered = true;
          } else {
            console.log(`  ${c.red('✘')} Invalid selection. Please choose 1-4.`);
            console.log('');
          }
        }
      }
      console.log('');
    } else if (capeOpt === 'e' || capeOpt === 'existing') {
      console.log(c.dim('  Existing campaign to bind to. Leave blank to create a new one in the next step.'));
      while (!capeId || !/^\d+$/.test(capeId)) {
        if (capeId) console.log(`  ${c.red('✘')} CAPE ID must be numeric (e.g. 54031)`);
        capeId = (await ask(`  ${c.cyan('CAPE campaign ID')}: `)).trim();
      }
      console.log(`  ${c.green('✓')} Using CAPE ID: ${c.cyan(capeId)}`);
    } else {
      console.log(`  ${c.dim('CAPE skipped — set CAPE_CAMPAIGN_ID in .env to connect later.')}`);
      capeId = '0';
    }
  }

  // 6. Registration mode (only if register page selected)
  let regMode = pre.regMode ?? null;
  if (!regMode && pages.includes('register')) {
    console.log('');
    console.log(`  ${c.bold('Registration mode:')}`);
    console.log(`    ${c.dim('0)')} Gate — player must register ${c.bold('before')} playing`);
    console.log(`    ${c.dim('1)')} After  — register to save score ${c.bold('after')} the game`);
    console.log(`    ${c.dim('2)')} Optional — link from result page, not required`);
    const v = (await ask(`  ${c.cyan('Select')} ${c.dim('[0-2, default: 1]')}: `)).trim();
    regMode = v === '0' ? 'gate' : v === '2' ? 'optional' : 'after';
  }
  regMode = regMode ?? 'none';

  // 7. Optional modules
  const policy = moduleSelectionPolicy(pages, game);
  const OPTIONAL = policy.selectable;
  let extraModules = (pre.modules ?? []).filter((id) => policy.selectable.includes(id));
  if (policy.required.length > 0) {
    console.log('');
    console.log(`  ${c.dim(`Auto modules from pages: ${policy.required.join(', ')}`)}`);
  }
  if (extraModules) {
    extraModules = extraModules.filter((id) => OPTIONAL.includes(id));
  }
  if (!extraModules) {
    const suggested = policy.suggested;
    console.log('');
    console.log(`  ${c.bold('Modules')} ${c.dim('(comma-separated numbers):')}`);
    if (policy.required.length > 0) {
      console.log(`  ${c.dim(`Locked by selected pages: ${policy.required.join(', ')}`)}`);
    }
    if (OPTIONAL.length === 0) {
      console.log(`  ${c.dim('No additional modules available for the current page flow.')}`);
      extraModules = [];
    } else {
    if (suggested.length > 0) {
      console.log(`  ${c.dim(`Smart defaults: ${suggested.join(', ')} — pre-selected based on your pages`)}`);
    }
    OPTIONAL.forEach((id, i) => {
      const on = suggested.includes(id) ? c.green('●') : c.dim('○');
      const m  = (() => { try { return loadManifest(id); } catch { return null; } })();
      const desc = m ? c.dim(` — ${m.description.split('.')[0]}`) : '';
      const adds = m?.implies?.length ? c.dim(` (adds: ${m.implies.join(', ')})`) : '';
      console.log(`    ${on} ${c.dim(`${i + 1})`)} ${id}${adds}${desc}`);
    });
    const v = (await ask(`  ${c.cyan('Select')} ${c.dim(`[default: ${suggested.map(id => OPTIONAL.indexOf(id) + 1).filter(n => n > 0).join(',')}]`)}: `)).trim();
    if (v) {
      extraModules = v.split(',').map(s => {
        const n = parseInt(s.trim(), 10);
        return (n >= 1 && n <= OPTIONAL.length) ? OPTIONAL[n - 1] : s.trim();
      }).filter((id) => OPTIONAL.includes(id));
    } else {
      extraModules = suggested;
    }
    }
  }

  // 8. GTM ID
  let gtmId = pre.gtmId ?? '';
  if (extraModules.includes('gtm') && !gtmId) {
    gtmId = (await ask(`  ${c.cyan('GTM ID')} ${c.dim('(e.g. GTM-XXXXXX — leave blank to fill later)')}: `)).trim();
  }

  // 9. Iframe / embedded
  let iframe = pre.iframe ?? null;
  if (iframe === null) {
    const v = (await ask(`  ${c.cyan('Embedded in iframe?')} ${c.dim('[y/N]')}: `)).trim().toLowerCase();
    iframe = v === 'y' || v === 'yes';
  }

  // 10. Output directory
  let outputDir = pre.output;
  if (!outputDir) {
    const def = resolve(SCAFFOLDER_ROOT, '..', name);
    console.log(c.dim(`  Where to scaffold the project. Default ../${name} resolves to: ${def}`));
    outputDir = (await ask(`  ${c.cyan('Output directory')} ${c.dim(`(default: ${def})`)}: `)).trim();
    if (!outputDir) outputDir = def;
  }
  outputDir = resolve(outputDir);

  rl.close();

  // Resolve all modules including engine + page-implied + implies chains
  let allModules = resolveModules(game, pages, extraModules);

  const impliedModuleSummary = () => {
    const implied = new Set();
    for (const id of extraModules) {
      try {
        for (const dep of loadManifest(id).implies ?? []) implied.add(dep);
      } catch { /* ignore missing optional manifests */ }
    }
    const visible = [...implied].filter((id) => allModules.includes(id));
    return visible.length ? ` ${c.dim(`(auto: implied ${visible.join(', ')})`)}` : '';
  };

  // Confirm
  const printNextSummary = () => {
    const ft = computeFlowTokens(pages, regMode);
    console.log('');
    console.log(c.bold('  ──────────────────────────────────────────────'));
    console.log(`  ${c.bold('Project:')}  ${c.cyan(name)}`);
    console.log(`  ${c.bold('CAPE ID:')}  ${c.cyan(capeId)}  ${c.dim(`(market: ${market})`)}`);
    console.log(`  ${c.bold('Engine:')}   ${game ? c.cyan(game) : c.dim('none')}${selectedGame ? c.dim(` (${selectedGame.name})`) : ''}`);
    printRouteTable(pages);
    if (pages.includes('register')) console.log(`  ${c.bold('Reg mode:')} ${c.cyan(regMode)}`);
    console.log(`  ${c.bold('Modules:')} ${allModules.filter(id => !GAME_ENGINES.includes(id)).join(', ') || c.dim('none')}${impliedModuleSummary()}`);
    if (gtmId) console.log(`  ${c.bold('GTM:')}      ${c.cyan(gtmId)}`);
    if (iframe) console.log(`  ${c.yellow('Iframe:    embedded mode enabled')}`);
    console.log(`  ${c.bold('Flow:')}     ${ft['{{FLOW_ENTRY}}']}`);
    console.log(`  ${c.bold('Output:')}  ${c.dim(outputDir)}`);
    console.log(c.bold('  ──────────────────────────────────────────────'));
  };

  if (!pre.yes) {
    printNextSummary();
    let done = false;
    while (!done) {
      const ans = (await promptOnce(`\n  Proceed? ${c.dim('[Y/n/e(dit)]')}: `)).trim().toLowerCase();
      if (ans === '' || ans === 'y') { done = true; }
      else if (ans === 'n') { console.log('\n  Aborted.\n'); process.exit(0); }
      else if (ans === 'e' || ans === 'edit') {
        {
        const state = {
          pre,
          stack: 'next',
          name,
          capeId,
          market,
          game,
          selectedGame,
          pages,
          extraModules,
          regMode,
          gtmId,
          iframe,
          outputDir,
        };
        printEditOptions(state);
        const field = (await promptOnce(`  ${c.cyan('Field')}: `)).trim();
        const option = EDIT_OPTIONS.find((entry) => entry.key === field);
        if (option) {
          await option.fn(state, promptOnce);
          name = state.name;
          capeId = state.capeId;
          market = state.market;
          game = state.game;
          selectedGame = state.selectedGame;
          pages = state.pages;
          extraModules = state.extraModules;
          regMode = state.regMode;
          gtmId = state.gtmId;
          iframe = state.iframe;
          outputDir = state.outputDir;
          allModules = resolveModules(game, pages, extraModules);
        }
        printNextSummary();
        }
        continue;
      }
    }
  }

  return { stack: 'next', name, capeId, market, game, pages, regMode, modules: allModules, gtmId, iframe, outputDir, pageElementSelections, selectedGame, capeAutoPublished, capePublishedUrl, isUpdate: pre.isUpdate ?? false, pageTypes: inferPageTypes(pages) };
}

function buildDefaultPages(game) {
  const pages = ['landing', 'onboarding'];
  if (game && game !== 'video') pages.push('game', 'result');
  if (game === 'video') pages.push('intro-video');
  return pages;
}

function autoModulesForPages(pages, game = '') {
  const mods = new Set();
  const pageTypes = (pages ?? []).map((p) => pageModuleType(p));
  // Page-driven hard requirements
  if (pageTypes.includes('register'))    mods.add('registration');
  if (pageTypes.includes('voucher'))     mods.add('voucher');
  if (pageTypes.includes('video'))       mods.add('video');
  // Smart defaults: leaderboard page → leaderboard + scoring
  if (pageTypes.includes('leaderboard')) { mods.add('leaderboard'); mods.add('scoring'); }
  // Smart defaults: game/result flow → scoring
  if (pageTypes.includes('game') || pageTypes.includes('result')) mods.add('scoring');
  return [...mods];
}

function moduleSelectionPolicy(pages, game = '') {
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

function resolveModules(game, pages, extraModules) {
  const all = new Set();
  const pageTypes = (pages ?? []).map((p) => pageModuleType(p));
  // Game engine module
  if (game && GAME_ENGINES.includes(game) && game !== 'pure-react' && game !== 'video' && game !== 'none') {
    all.add(game);
  }
  // Page-required modules
  for (const [page, mod] of Object.entries(PAGE_REQUIRES_MODULE)) {
    if (pageTypes.includes(page)) all.add(mod);
  }
  // Auto-required modules inferred from page flow (e.g. game/result -> scoring)
  for (const moduleId of autoModulesForPages(pages, game)) {
    all.add(moduleId);
  }
  // User-selected extra modules
  const policy = moduleSelectionPolicy(pages, game);
  const allowedExtras = new Set([...policy.required, ...policy.selectable]);
  for (const m of (extraModules ?? [])) {
    if (allowedExtras.has(m)) all.add(m);
  }
  // Resolve implies chains
  return resolveImplied([...all]);
}

function landingOnboardingFirstRunOnly(wizardMeta) {
  const raw = wizardMeta?.pageSettings?.landing?.onboardingFirstRunOnly;
  return typeof raw === 'boolean' ? raw : true;
}

async function enforceConfigValidation(options, { yes = false } = {}) {
  const { errors, warnings } = validateConfig(options);
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
  if (!warnings.length) return;
  for (const warning of warnings) {
    console.log(`  ${c.yellow('⚠')} ${warning}`);
  }
  if (yes) return;
  const answer = (await promptOnce(`  ${c.cyan('Continue anyway?')} ${c.dim('[y/N]')}: `)).trim().toLowerCase();
  if (answer !== 'y' && answer !== 'yes') {
    console.log('\n  Aborted.\n');
    process.exit(0);
  }
}

// ─── Core scaffolding engine ──────────────────────────────────────────────────

/**
 * Outer scaffold wrapper.
 *
 * Create mode  — writes into a sibling temp dir, then atomically renames it
 *               to the final outputDir only on full success.  A lock file
 *               prevents two runs targeting the same directory from racing.
 *               SIGINT / any thrown error triggers cleanup of the temp dir.
 *
 * Update mode  — operates directly on the existing project.  Git is the
 *               safety net; no temp dir is used.
 */
async function scaffold(options) {
  const { outputDir, isUpdate = false } = options;

  // ── Update mode: no temp dir, git handles rollback ──────────────────────────
  if (isUpdate) {
    if (options.stack === 'tanstack') return scaffoldTanstack(options);
    return scaffoldNext(options);
  }

  // ── Create mode ─────────────────────────────────────────────────────────────
  // 1. Fail fast if final destination already exists.
  if (existsSync(outputDir)) {
    throw new Error(`Output directory already exists: ${outputDir}\nDelete it or choose a different name.`);
  }

  // 2. Acquire lock so concurrent runs on the same target are blocked.
  const lockPath      = acquireLock(outputDir);
  const tempDir       = `${outputDir}.scaffold-tmp-${Date.now()}`;
  const unregister    = registerCleanup(() => {
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
    releaseLock(lockPath);
  });

  try {
    // 3. Run the actual scaffold into the temp dir.
    //    _skipGitInit defers git init to step 4b so no git file handles are
    //    open during the rename — the main cause of EBUSY on Windows.
    //    _displayDir ensures post-scaffold messages show the final path.
    const tempOptions = { ...options, outputDir: tempDir, _displayDir: outputDir, _skipGitInit: true };
    if (options.stack === 'tanstack') {
      await scaffoldTanstack(tempOptions);
    } else {
      await scaffoldNext(tempOptions);
    }

    // 4a. Atomic rename: temp → final.
    //     On Windows, antivirus (Defender) can briefly hold a lock on newly-written
    //     files, causing EBUSY or EPERM.  Retry up to 4 times with back-off; if still
    //     busy/denied, fall back to cpSync + rmSync which always works.
    let renamed = false;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        renameSync(tempDir, outputDir);
        renamed = true;
        break;
      } catch (e) {
        if (e.code !== 'EBUSY' && e.code !== 'EPERM') throw e;
        await new Promise(r => setTimeout(r, attempt * 250));
      }
    }
    if (!renamed) {
      cpSync(tempDir, outputDir, { recursive: true });
      rmSync(tempDir, { recursive: true, force: true });
    }

    // 4b. Git init — runs on the final directory so no .git handles are
    //     open during the rename above.
    if (!options.isUpdate && !options.skipGit) {
      console.log(`\n  ${c.cyan('[git]')} ${c.bold('Initialising git repository…')}`);
      if (gitInit(outputDir, options.name)) {
        console.log(`      ${c.green('✔')} git init + initial commit`);
      } else {
        console.log(`      ${c.yellow('⚠')} git init skipped — run manually: git init && git add . && git commit -m "chore: scaffold"`);
      }
    }

    // 5. Print cd command so the developer can navigate there themselves
    const frontendDir = join(outputDir, 'frontend');
    console.log(`\n  ${c.bold('Ready!')} Navigate to your project:\n`);
    console.log(`  ${c.cyan(`cd "${frontendDir}"`)}\n`);

  } catch (err) {
    // Cleanup temp dir + lock before rethrowing so main() can print the error.
    runCleanup();
    throw err;
  }

  // 6. Success — unregister cleanup (temp dir is now the final dir).
  unregister();
  releaseLock(lockPath);
}

async function scaffoldTanstack({ name, capeId, market, outputDir, pages = [], gtmId = '', tsPageElementSelections = {}, unityCdnUrl = '', capeAutoPublished = false, capePublishedUrl = '', isUpdate = false, updateType = null, _displayDir = null, _skipGitInit = false, skipInstall = false }) {
  const step = (n, msg) => console.log(`\n  ${c.cyan(`[${n}]`)} ${c.bold(msg)}`);
  const ok   = (msg)    => console.log(`      ${c.green('✔')} ${msg}`);
  const warn = (msg)    => console.log(`      ${c.yellow('⚠')} ${msg}`);

  const frontendDir = join(outputDir, 'frontend');

  // 1. Copy boilerplate (skipped in update mode)
  if (isUpdate) {
    step(1, 'Update mode — skipping boilerplate copy.');
  } else {
    const templateDir = TEMPLATES['tanstack-unity'];
    if (!existsSync(templateDir)) {
      throw new Error(
        `TanStack base-template not found at:\n  ${templateDir}\n\n` +
        `The scaffolder repo appears to be incomplete.`
      );
    }
    step(1, 'Copying TanStack base-template…');
    mkdirSync(frontendDir, { recursive: true });
    cpSync(templateDir, frontendDir, {
      recursive: true,
      filter: (src) => {
        const rel = relative(templateDir, src);
        return !rel.startsWith('node_modules') && !rel.startsWith('.output') && !rel.startsWith('dist');
      },
    });
    ok(`Base-template → ${c.dim(frontendDir)}`);
  }

  // Read createdAt from existing marker if updating (used in final write below)
  const _prevCreatedAt = (() => {
    if (!isUpdate) return null;
    try { return JSON.parse(readFileSync(join(outputDir, '.scaffolded'), 'utf8')).createdAt; } catch { return null; }
  })();

  // 1b. Install Livewall brand placeholder images
  step('1b', 'Installing brand placeholder images…');
  const imagesDir = join(frontendDir, 'src', 'assets', 'images');
  mkdirSync(imagesDir, { recursive: true });

  const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="360" viewBox="0 0 720 360">
  <rect width="720" height="360" fill="#C4FF00" rx="16"/>
  <text x="360" y="220" font-family="'Arial Black', 'Impact', sans-serif" font-size="108" font-weight="900" fill="#000000" text-anchor="middle" letter-spacing="-2">livewall</text>
</svg>`;

  const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="100" fill="#C4FF00"/>
  <text x="100" y="130" font-family="'Arial Black', 'Impact', sans-serif" font-size="80" font-weight="900" fill="#000000" text-anchor="middle" letter-spacing="-2">lw</text>
</svg>`;

  writeFileSync(join(imagesDir, 'logo.svg'), LOGO_SVG, 'utf8');
  writeFileSync(join(imagesDir, 'logo-icon.svg'), ICON_SVG, 'utf8');

  // Patch boilerplate file references from logo.png → svg variants + brand fixes
  const logoPatchMap = {
    [join(frontendDir, 'src', 'components', 'containers', 'ViewContainer.tsx')]: (c) => c.replace(/logo\.png/g, 'logo-icon.svg'),
    // Add data URI passthrough so inlined SVGs don't produce warnings
    [join(frontendDir, 'src', 'server', 'ImageBlurUri.ts')]: (c) => c.replace(
      `if (!isRelativeUrl(data.imageUrl)) {`,
      `if (data.imageUrl.startsWith('data:')) { return data.imageUrl; }\n    if (!isRelativeUrl(data.imageUrl)) {`,
    ),
    // Add $brandColor to SCSS variables
    [join(frontendDir, 'src', 'assets', 'styles', '_variables.scss')]: (c) => c.includes('$brandColor') ? c : c.replace(
      `$primaryColor:`,
      `$brandColor: #C4FF00;\n$primaryColor:`,
    ),
    // Apply brand color + CSS custom properties to primary CTA button
    [join(frontendDir, 'src', 'components', 'buttons', 'StyledButton.module.scss')]: (c) => c
      .replace(`background-color: $secondaryColor;`, `background-color: var(--lw-primary, #{$brandColor});`)
      .replace(`background-color: $brandColor;`,     `background-color: var(--lw-primary, #{$brandColor});`)
      .replace(`color: $whiteColor;`, `color: var(--lw-text, #{$blackColor});`)
      .replace(`color: $blackColor;`, `color: var(--lw-text, #{$blackColor});`),
    // Page backgrounds — use CSS custom property so Cape branding overrides them
    [join(frontendDir, 'src', 'routes', 'launch.module.scss')]: (c) => c
      .replace(`background-color: $whiteColor;`, `background-color: var(--lw-bg, #{$whiteColor});`),
    [join(frontendDir, 'src', 'routes', 'score.module.scss')]: (c) => c
      .replace(`background-color: $whiteColor;`, `background-color: var(--lw-bg, #{$whiteColor});`),
    [join(frontendDir, 'src', 'routes', 'register.module.scss')]: (c) => c
      .replace(`background-color: $whiteColor;`, `background-color: var(--lw-bg, #{$whiteColor});`),
    [join(frontendDir, 'src', 'routes', 'tutorial.module.scss')]: (c) => c
      .replace(`background-color: $whiteColor;`, `background-color: var(--lw-bg, #{$whiteColor});`),
    [join(frontendDir, 'src', 'routes', 'leaderboard.module.scss')]: (c) => c
      .replace(`background-color: $whiteColor;`, `background-color: var(--lw-bg, #{$whiteColor});`),
    [join(frontendDir, 'src', 'routes', 'voucher.module.scss')]: (c) => c
      .replace(`background-color: $whiteColor;`, `background-color: var(--lw-bg, #{$whiteColor});`),
    // rootLoader — rename logo.png → logo.svg + add branding color fetch from Cape settings
    [join(frontendDir, 'src', 'routes', '-loaders', 'rootLoader.ts')]: (c) => {
      c = c.replace(/logo\.png/g, 'logo.svg');
      if (c.includes('branding')) return c; // idempotent
      return c
        .replace(
          `const [game, [desktopDesc, desktopQr, loadTitle, loadDesc1, loadDesc2, loadDesc3], gtmId, logoPH, unityEnv] = await Promise.all([`,
          `const [game, [desktopDesc, desktopQr, loadTitle, loadDesc1, loadDesc2, loadDesc3], gtmId, logoPH, unityEnv, [lwPrimary, lwBg, lwText, lwTheme]] = await Promise.all([`,
        )
        .replace(
          `    getUnityEnvironment(),\n  ]);`,
          `    getUnityEnvironment(),\n    getCapeProperty([\n      { type: 'settings', path: ['branding', 'primaryColor'] },\n      { type: 'settings', path: ['branding', 'backgroundColor'] },\n      { type: 'settings', path: ['branding', 'textColor'] },\n      { type: 'settings', path: ['branding', 'themeColor'] },\n    ]),\n  ]);`,
        )
        .replace(
          `    baseUrl: getBaseUrl(),\n  };`,
          `    baseUrl: getBaseUrl(),\n    branding: {\n      primaryColor: lwPrimary.asString('#C4FF00'),\n      backgroundColor: lwBg.asString('#FFFFFF'),\n      textColor: lwText.asString('#000000'),\n      themeColor: lwTheme.asString('#000000'),\n    },\n  };`,
        );
    },
    // __root.tsx — inject CSS custom properties from Cape branding onto #app
    [join(frontendDir, 'src', 'routes', '__root.tsx')]: (c) => {
      if (c.includes('--lw-primary')) return c; // idempotent
      return c.replace(
        `function RootComponent() {\n  return (\n    <main id="app">`,
        `function RootComponent() {\n  const { branding } = Route.useLoaderData();\n  const cssVars = {\n    '--lw-primary': branding?.primaryColor || '#C4FF00',\n    '--lw-bg':      branding?.backgroundColor || '#FFFFFF',\n    '--lw-text':    branding?.textColor || '#000000',\n    '--lw-theme':   branding?.themeColor || '#000000',\n  } as React.CSSProperties;\n  return (\n    <main id="app" style={cssVars}>`,
      );
    },
  };
  for (const [file, patch] of Object.entries(logoPatchMap)) {
    if (existsSync(file)) writeFileSync(file, patch(readFileSync(file, 'utf8')), 'utf8');
  }
  ok('Brand placeholders installed (replace logo.svg / logo-icon.svg with actual assets)');

  // 2. Token replacement
  step(2, 'Replacing tokens…');
  const tokens = {
    '{{PROJECT_NAME}}':              name,
    'engagement-frontend-tanstack':  name,
    '{{CAPE_ID}}':                   capeId,
    '{{MARKET}}':                    market,
  };
  const replaced = tokenReplaceDir(frontendDir, tokens);
  ok(`${replaced} file(s) updated`);

  // 3. Pre-fill .env
  step(3, 'Pre-filling .env…');
  const _envDist    = join(frontendDir, 'env.dist');
  const _envExample = join(frontendDir, '.env.example'); // legacy fallback
  const envSrc  = existsSync(_envDist) ? _envDist : existsSync(_envExample) ? _envExample : null;
  const envDest = join(frontendDir, '.env');
  if (envSrc && !existsSync(envDest)) {
    let envContent = readFileSync(envSrc, 'utf8');
    const devSecret = randomBytes(16).toString('hex');
    envContent = envContent
      // Replace CI/CD shell-variable references with dev-friendly values
      .replace(/^VITE_ENVIRONMENT=\$\S*/m,          'VITE_ENVIRONMENT=development')
      .replace(/^API_URL=(\$\S*)?$/m,               `API_URL=https://wave-${name}-api-acc.lwdev.nl`)
      .replace(/^VITE_API_URL=(\$\S*)?$/m,          `VITE_API_URL=https://wave-${name}-api-acc.lwdev.nl`)
      .replace(/^API_SESSION_SECRET=(\$\S*)?$/m,    `API_SESSION_SECRET=${devSecret}`)
      .replace(/^UNITY_BASE_URL=.*/m,               `UNITY_BASE_URL=${unityCdnUrl || ''}`)
      .replace(/^GCP_REPORTING_NAME=\$\S*/m,        'GCP_REPORTING_NAME=')
      // Disable GCP logging for local dev
      .replace(/^LOG_TO_GCP=.*/m,                    'LOG_TO_GCP=0')
      .replace(/^LOG_STRUCTURED_CONSOLE=.*/m,        'LOG_STRUCTURED_CONSOLE=0')
      // CAPE campaign
      .replace(/^CAPE_CAMPAIGN_ID=.*/m,              `CAPE_CAMPAIGN_ID=${capeId}`)
      .replace(/^CAPE_CAMPAIGN_MARKET=.*/m,          `CAPE_CAMPAIGN_MARKET=${market}`)
      // Legacy Next.js-style CAPE vars (fallback if boilerplate ever includes them)
      .replace(/^NEXT_PUBLIC_CAPE_DEFAULT_ID=.*/m,     `NEXT_PUBLIC_CAPE_DEFAULT_ID=${capeId}`)
      .replace(/^NEXT_PUBLIC_CAPE_DEFAULT_MARKET=.*/m, `NEXT_PUBLIC_CAPE_DEFAULT_MARKET=${market}`);
    writeFileSync(envDest, envContent, 'utf8');
    ok('.env created from env.dist');
  } else {
    warn('env.dist not found — create .env manually');
  }

  // 3b. Remove excluded pages + generate page builder output
  // Non-interactive CLI uses Next.js-style names (landing/onboarding/result);
  // TanStack internals use their own names (launch/tutorial/score). Normalize first.
  const NEXT_TO_TS_PAGE = { landing: 'launch', onboarding: 'tutorial', result: 'score' };
  const normalizedPages = pages.map(p => NEXT_TO_TS_PAGE[p] ?? p);

  const BUILDABLE_TS = ['launch', 'tutorial', 'score', 'register'];
  const ROUTE_FILES  = { launch: 'launch.tsx', tutorial: 'tutorial.tsx', game: 'game.tsx', register: 'register.tsx', score: 'score.tsx' };
  const LOADER_FILES = { launch: 'launchLoader.ts', tutorial: 'tutorialLoader.ts', register: 'registerLoader.ts', score: 'scoreLoader.ts' };
  const routesDir  = join(frontendDir, 'src', 'routes');
  const loadersDir = join(routesDir, '-loaders');

  if (pages.length > 0) {
    step('3b', 'Configuring pages…');
    let removed = 0; let generated = 0;

    for (const page of BUILDABLE_TS) {
      if (normalizedPages.includes(page)) continue;
      for (const f of [join(routesDir, ROUTE_FILES[page]), join(loadersDir, LOADER_FILES[page])]) {
        if (existsSync(f)) { try { rmSync(f); removed++; } catch { /* non-fatal */ } }
      }
    }
    if (removed > 0) ok(`${removed} excluded page file(s) removed`);

    mkdirSync(loadersDir, { recursive: true });
    for (const [page, elements] of Object.entries(tsPageElementSelections)) {
      if (page.includes('__') || !BUILDABLE_TS.includes(page)) continue;
      const stepCount = tsPageElementSelections[`${page}__stepCount`] ?? 3;
      try {
        const { route, loader } = buildTsPage(page, elements, { stepCount, pages: normalizedPages });
        writeFileSync(join(routesDir, ROUTE_FILES[page]), route, 'utf8');
        writeFileSync(join(loadersDir, LOADER_FILES[page]), loader, 'utf8');
        generated++;
      } catch (e) { warn(`[page-builder] ${page}: ${e.message}`); }
    }
    if (generated > 0) ok(`${generated} page(s) generated from page builder`);
  }

  // 3c. Token replacement for GTM
  if (gtmId) {
    step('3c', 'Injecting GTM ID…');
    const gtmReplaced = tokenReplaceDir(frontendDir, { 'GTM-XXXXXXX': gtmId });
    ok(`GTM ID set in ${gtmReplaced} file(s)`);
  }

  // 4. Git
  if (isUpdate) {
    step(4, 'Committing scaffold update…');
    if (gitCommitUpdate(outputDir, name)) ok('scaffold update committed');
    else warn('git commit skipped — commit manually: git add . && git commit -m "chore: scaffold update"');
  } else if (!_skipGitInit) {
    step(4, 'Initialising git repository…');
    if (gitInit(outputDir, name)) ok('git init + initial commit');
    else warn('git init skipped — run manually: git init && git add . && git commit -m "chore: scaffold"');
  }

  // ── Write final .scaffolded with everything that was done ────────────────────
  const scaffoldedConfig = {
    // Identity
    name,
    stack:   'tanstack',
    // CAPE config
    capeId,
    market,
    capeAutoPublished: capeAutoPublished || undefined,
    capePublishedUrl: capePublishedUrl || undefined,
    // Unity game
    unityCdnUrl: unityCdnUrl || undefined,
    // Pages & element selections
    pages,
    tsPageElementSelections,
    // Tooling
    gtmId: gtmId || undefined,
    // Update tracking
    ...(isUpdate && updateType ? { updateType } : {}),
    // Timestamps
    createdAt: _prevCreatedAt ?? new Date().toISOString(),
    ...(isUpdate ? { updatedAt: new Date().toISOString() } : {}),
  };
  writeFileSync(join(outputDir, '.scaffolded'), JSON.stringify(scaffoldedConfig, null, 2), 'utf8');
  ok('.scaffolded config written');
  writeChecklistFile(outputDir, scaffoldedConfig);
  ok('SCAFFOLD_CHECKLIST.md written');
  writeDebugFile(outputDir, scaffoldedConfig);
  ok('SCAFFOLD_DEBUG.json written');

  console.log('');
  const _tsFinalFrontendDir = _displayDir ? join(_displayDir, 'frontend') : frontendDir;
  printPostScaffoldMessage({ projectName: name, capeId, market, modules: [], outputDir: _tsFinalFrontendDir, stack: 'tanstack', capeAutoPublished, capePublishedUrl });
}

async function scaffoldNext({ name, capeId, market, game, stack = 'next', pages, regMode, modules, gtmId, iframe, outputDir, pageElementSelections = {}, selectedGame = null, capeAutoPublished = false, capePublishedUrl = '', isUpdate = false, updateType = null, _displayDir = null, _skipGitInit = false, skipInstall = false, flowExits = {}, flowEntry = '', flowEnabledExits = {}, flowButtonVariants = {}, menuItemsEnabled = {}, menuButtonVariants = {}, pageTypes = {}, _wizardMeta = null, routeMap = {} }) {
  const step = (n, msg) => console.log(`\n  ${c.cyan(`[${n}]`)} ${c.bold(msg)}`);
  const ok   = (msg)    => console.log(`      ${c.green('✔')} ${msg}`);
  const warn = (msg)    => console.log(`      ${c.yellow('⚠')} ${msg}`);

  const frontendDir = join(outputDir, 'frontend');

  // 1. Copy base template (skipped in update mode)
  if (isUpdate) {
    step(1, 'Update mode — skipping base template copy.');
  } else {
    const templateKey = `${stack}-${game || 'none'}`;
    const templateDir = TEMPLATES[templateKey];
    if (!templateDir) throw new Error(`No template found for stack="${stack}" game="${game}". Valid keys: ${Object.keys(TEMPLATES).join(', ')}`);
    step(1, `Copying base template [${templateKey}]…`);
    mkdirSync(frontendDir, { recursive: true });
    cpSync(templateDir, frontendDir, {
      recursive: true,
      filter: (src) => {
        const rel = relative(templateDir, src);
        return !rel.startsWith('node_modules') && !rel.startsWith('.next');
      },
    });
    ok(`Base template → ${c.dim(frontendDir)}`);
  }

  // Read createdAt from existing marker if updating (used in final write below)
  const _prevCreatedAt = (() => {
    if (!isUpdate) return null;
    try { return JSON.parse(readFileSync(join(outputDir, '.scaffolded'), 'utf8')).createdAt; } catch { return null; }
  })();

  // 2. Copy module files
  // Track dest paths written by modules with strategy:"replace" so the page
  // builder (step 3b) doesn't overwrite them with the generic stub.
  const moduleReplacedPaths = new Set();

  if (modules.length > 0) {
    step(2, 'Copying module files…');

    for (const moduleId of modules) {
      try {
        const manifest  = loadManifest(moduleId);
        const moduleDir = join(MODULES_DIR, moduleId);
        let copied = 0;
        for (const file of manifest.files ?? []) {
          if (!file.src || !file.dest) {
            warn(`[${moduleId}] manifest entry missing src or dest: ${JSON.stringify(file)}`);
            continue;
          }
          // Per-file `requires` — skip silently if the named module isn't in
          // the resolved module list. Used for overrides that only make
          // sense when another module is also installed (e.g. unity's
          // video-page override needs the video module to provide VideoIntro).
          if (file.requires && !modules.includes(file.requires)) {
            continue;
          }
          const srcPath  = join(moduleDir, file.src);
          const destPath = join(frontendDir, file.dest);
          if (!existsSync(srcPath)) { warn(`[${moduleId}] source missing: ${file.src}`); continue; }
          try {
            mkdirSync(dirname(destPath), { recursive: true });
            cpSync(srcPath, destPath);
            copied++;
            if (file.strategy === 'replace') moduleReplacedPaths.add(destPath);
          } catch (e) {
            warn(`[${moduleId}] failed to copy ${file.src}: ${e.message}`);
          }
        }
        // copyDirs: recursively copy whole directories (e.g. public/images, public/sounds)
        for (const dir of manifest.copyDirs ?? []) {
          if (!dir.src || !dir.dest) continue;
          const srcDir  = join(moduleDir, dir.src);
          const destDir = join(frontendDir, dir.dest);
          if (!existsSync(srcDir)) { warn(`[${moduleId}] copyDirs source missing: ${dir.src}`); continue; }
          try {
            mkdirSync(destDir, { recursive: true });
            cpSync(srcDir, destDir, { recursive: true });
            copied++;
          } catch (e) {
            warn(`[${moduleId}] failed to copy dir ${dir.src}: ${e.message}`);
          }
        }
        ok(`[${moduleId}] ${copied} file(s) copied`);
      } catch (e) {
        console.log(`      ${c.red('✘')} [${moduleId}] ${e.message}`);
      }
    }
  } else {
    step(2, 'No modules selected — skipping.');
  }

  // 2b-ii. GTM layout patch — mount <GTMScript> as first child of <body>
  if (modules.includes('gtm')) {
    const layoutPath = join(frontendDir, 'app', 'layout.tsx');
    if (existsSync(layoutPath)) {
      let layoutSrc = readFileSync(layoutPath, 'utf8');
      if (!layoutSrc.includes('GTMScript')) {
        layoutSrc = layoutSrc.replace(
          `import DesktopWrapper from '@components/_core/DesktopWrapper/DesktopWrapper';`,
          `import DesktopWrapper from '@components/_core/DesktopWrapper/DesktopWrapper';\nimport GTMScript from '@components/_modules/GTMScript/GTMScript';`,
        );
        layoutSrc = layoutSrc.replace(
          `      <body className="antialiased bg-[var(--surface-base)] text-[var(--text-primary)]">`,
          `      <body className="antialiased bg-[var(--surface-base)] text-[var(--text-primary)]">\n        <GTMScript gtmId={process.env.NEXT_PUBLIC_GTM_ID} nonce={nonce} />`,
        );
        writeFileSync(layoutPath, layoutSrc, 'utf8');
        ok('GTMScript injected into app/layout.tsx');
      }
    }
  }

  // 2b-iii. Cookie-consent layout patch — mount <CookieConsent> as first child of <body>
  if (modules.includes('cookie-consent')) {
    const layoutPath = join(frontendDir, 'app', 'layout.tsx');
    if (existsSync(layoutPath)) {
      let layoutSrc = readFileSync(layoutPath, 'utf8');
      if (!layoutSrc.includes('CookieConsent')) {
        layoutSrc = layoutSrc.replace(
          `import DesktopWrapper from '@components/_core/DesktopWrapper/DesktopWrapper';`,
          `import DesktopWrapper from '@components/_core/DesktopWrapper/DesktopWrapper';\nimport CookieConsent from '@components/_modules/CookieConsent/CookieConsent';`,
        );
        layoutSrc = layoutSrc.replace(
          `      <body className="antialiased bg-[var(--surface-base)] text-[var(--text-primary)]">`,
          `      <body className="antialiased bg-[var(--surface-base)] text-[var(--text-primary)]">\n        <CookieConsent cbid={process.env.NEXT_PUBLIC_COOKIEBOT_CBID} />`,
        );
        writeFileSync(layoutPath, layoutSrc, 'utf8');
        ok('CookieConsent injected into app/layout.tsx');
      }
    }
  }

  // 2c. Explicit video route copies. loading-video, intro-video, and ad-video
  // all use the same module template, with page-specific routing tokens.
  const selectedVideoPages = EXPLICIT_VIDEO_PAGES.filter((id) => pages.includes(id));
  if (selectedVideoPages.length > 0) {
    step('2c', `Copying ${selectedVideoPages.length} explicit video route(s)...`);
    const srcPagePath = join(MODULES_DIR, 'video', 'app', '(campaign)', 'video', 'page.tsx');
    for (const id of selectedVideoPages) {
      const destPagePath = join(frontendDir, 'app', '(campaign)', id, 'page.tsx');
      if (!existsSync(srcPagePath)) {
        warn(`No video module template found - skipping "${id}".`);
        continue;
      }
      try {
        let src = readFileSync(srcPagePath, 'utf8');
        src = src.split('{{VIDEO_PAGE_ID}}').join(id);
        src = src.split('{{NEXT_AFTER_VIDEO_PAGE}}').join(`{{NEXT_AFTER_${id.toUpperCase()}}}`);
        mkdirSync(dirname(destPagePath), { recursive: true });
        writeFileSync(destPagePath, src, 'utf8');
        ok(`Video route "${id}" -> ${c.dim(destPagePath)}`);
      } catch (e) {
        warn(`Failed to write video route "${id}": ${e.message}`);
      }
    }
    const legacyVideoDir = join(frontendDir, 'app', '(campaign)', 'video');
    if (!pages.includes('video') && existsSync(legacyVideoDir)) {
      rmSync(legacyVideoDir, { recursive: true, force: true });
    }
  }

  // 3. Token replacement
  step(3, 'Replacing tokens...');
  const flowTokens = computeFlowTokens(pages, regMode, flowExits, flowEntry, pageTypes, routeMap);
  const availableCampaignRoutes = pages.map((id) => routeFor(id, routeMap));
  const onboardingFirstRunOnly = landingOnboardingFirstRunOnly(_wizardMeta);
  const buttonVariant = (pageId, exitKey, fallback = 'primary') => {
    const value = flowButtonVariants?.[`${pageId}.${exitKey}`];
    return ['primary', 'secondary', 'tertiary', 'dark', 'danger'].includes(value) ? value : fallback;
  };
  const menuVariant = (itemId, fallback = 'secondary') => {
    const value = menuButtonVariants?.[itemId];
    return ['primary', 'secondary', 'tertiary', 'dark', 'danger'].includes(value) ? value : fallback;
  };
  const tokens = {
    '{{PROJECT_NAME}}':       name,
    '{{CAPE_ID}}':            capeId,
    '{{MARKET}}':             market,
    '{{GTM_ID}}':             gtmId || 'GTM-XXXXXXX',
    '{{UNITY_DEFAULT_SCENE}}':    selectedGame?.boot?.defaultScene ?? selectedGame?.defaultScene ?? 'game',
    '{{RETURN_PLAYER_BUTTONS}}': 'false',
    '{{INSTANCE_ID}}':        'video',
    '{{VIDEO_PAGE_ID}}':      'video',
    '{{NEXT_AFTER_VIDEO_PAGE}}': flowTokens['{{NEXT_AFTER_VIDEO}}'] ?? '/landing',
    '{{LANDING_ONBOARDING_FIRST_RUN_ONLY}}': onboardingFirstRunOnly ? 'true' : 'false',
    '{{AVAILABLE_CAMPAIGN_ROUTES}}': availableCampaignRoutes.join('|'),
    '{{BUTTON_VARIANT_LANDING_NEXT}}':        buttonVariant('landing', 'next', 'primary'),
    '{{BUTTON_VARIANT_LANDING_LEADERBOARD}}': buttonVariant('landing', 'leaderboard', 'secondary'),
    '{{BUTTON_VARIANT_ONBOARDING_NEXT}}':     buttonVariant('onboarding', 'next', 'primary'),
    '{{BUTTON_VARIANT_REGISTER_NEXT}}':       buttonVariant('register', 'next', 'primary'),
    '{{BUTTON_VARIANT_RESULT_NEXT}}':         buttonVariant('result', 'next', 'primary'),
    '{{BUTTON_VARIANT_RESULT_PLAY_AGAIN}}':   buttonVariant('result', 'playAgain', 'secondary'),
    '{{BUTTON_VARIANT_RESULT_LEADERBOARD}}':  buttonVariant('result', 'leaderboard', 'tertiary'),
    '{{BUTTON_VARIANT_LEADERBOARD_NEXT}}':    buttonVariant('leaderboard', 'next', 'primary'),
    '{{BUTTON_VARIANT_VOUCHER_NEXT}}':        buttonVariant('voucher', 'next', 'primary'),
    '{{MENU_VARIANT_HOME}}':                  menuVariant('home', 'primary'),
    '{{MENU_VARIANT_RESUME}}':                menuVariant('resume', 'secondary'),
    '{{MENU_VARIANT_HOWTOPLAY}}':             menuVariant('howToPlay', 'secondary'),
    '{{MENU_VARIANT_LEADERBOARD}}':           menuVariant('leaderboard', 'secondary'),
    '{{MENU_VARIANT_VOUCHER}}':               menuVariant('voucher', 'secondary'),
    '{{MENU_VARIANT_TERMS}}':                 menuVariant('terms', 'tertiary'),
    '{{MENU_VARIANT_PRIVACY}}':               menuVariant('privacy', 'tertiary'),
    '{{MENU_VARIANT_FAQ}}':                   menuVariant('faq', 'tertiary'),
    '{{MENU_VARIANT_LEAVE}}':                 menuVariant('leave', 'danger'),
    ...flowTokens,
  };
  const replacedCount = tokenReplaceDir(frontendDir, tokens);
  ok(`${replacedCount} file(s) updated`);

  // Log the flow so the developer can see it
  const flowSequence = pages.map(p => routeFor(p, routeMap));
  ok(`Flow: ${flowSequence.join(' → ')}`);

  // 3b. Generate pages from page builder (overwrites static template pages)
  if (Object.keys(pageElementSelections).length > 0) {
    step('3b', 'Generating pages from page builder…');
    const flowTokens = computeFlowTokens(pages, regMode, flowExits, flowEntry, pageTypes, routeMap);

    // Helpers to get computed next-route from flow tokens
    const nextRoute  = (page) => flowTokens[`{{NEXT_AFTER_${page.toUpperCase()}}}`] ?? '/';
    const retryRoute = flowTokens['{{PLAY_AGAIN_ROUTE}}'] ?? '/gameplay';

    const PAGE_DIR = join(frontendDir, 'app', '(campaign)');
    const BUILDABLE_TO_DIR = {
      landing:    'landing',
      onboarding: 'onboarding',
      gameplay:   'gameplay',
      result:     'result',
      menu:       'menu',
    };

    let generated = 0;
    for (const [page, elements] of Object.entries(pageElementSelections)) {
      if (page.includes('__')) continue; // skip meta keys like onboarding__stepCount
      const dirName = BUILDABLE_TO_DIR[page];
      if (!dirName) continue;

      const opts = {
        nextRoute:  nextRoute(page),
        retryRoute,
        stepCount:  pageElementSelections[`${page}__stepCount`] ?? 3,
        buttonVariants: flowButtonVariants,
        menuButtonVariants,
      };

      try {
        const code    = buildPage(page, elements, opts);
        const pageDir = join(PAGE_DIR, dirName);
        mkdirSync(pageDir, { recursive: true });
        writeFileSync(join(pageDir, 'page.tsx'), code, 'utf8');
        generated++;
      } catch (e) {
        warn(`[page-builder] ${page}: ${e.message}`);
      }
    }

    // Generate gameplay stub — but skip if a module already owns that file
    const gameplayPagePath = join(PAGE_DIR, 'gameplay', 'page.tsx');
    if (pages.includes('game') && !pageElementSelections['gameplay'] && !moduleReplacedPaths.has(gameplayPagePath)) {
      try {
        const code = buildPage('gameplay', [], { nextRoute: nextRoute('game') });
        const dir  = join(PAGE_DIR, 'gameplay');
        mkdirSync(dir, { recursive: true });
        writeFileSync(gameplayPagePath, code, 'utf8');
        generated++;
      } catch (e) {
        warn(`[page-builder] gameplay: ${e.message}`);
      }
    }

    ok(`${generated} page(s) generated`);
  }

  // 3c. Rename (campaign) route folders to match custom routeMap slugs.
  // Runs AFTER module copy and page builder so all files land at default paths
  // first (e.g. `landing/`, `gameplay/`).  Then we atomically rename any folder
  // whose slug differs from the PAGE_ROUTES default so Next.js serves the page
  // at the right path.
  {
    const campaignDir = join(frontendDir, 'app', '(campaign)');
    let renamed = 0;
    for (const pageId of pages) {
      const defaultSlug = (PAGE_ROUTES[pageId] ?? `/${pageId}`).slice(1);
      const customSlug  = (routeMap[pageId]   ?? PAGE_ROUTES[pageId] ?? `/${pageId}`).slice(1);
      if (defaultSlug === customSlug) continue;
      const from = join(campaignDir, defaultSlug);
      const to   = join(campaignDir, customSlug);
      if (existsSync(from) && !existsSync(to)) {
        try {
          renameSync(from, to);
          renamed++;
        } catch (e) {
          warn(`Could not rename "${defaultSlug}" → "${customSlug}": ${e.message}`);
        }
      }
    }
    if (renamed > 0) ok(`${renamed} route folder(s) renamed to match custom routes`);
  }

  // 4. Append env vars + create .env
  const allEnvVars = collectEnvVars(modules);
  if (allEnvVars.length > 0) {
    step(4, 'Appending env vars to env.dist…');
    appendEnvVars(frontendDir, allEnvVars);
    ok(`${allEnvVars.length} var(s) appended`);
  } else {
    step(4, 'No extra env vars.');
  }
  createDevEnv(frontendDir);

  // Inject game-specific env vars from registry
  if (selectedGame) {
    const lines = gameEnvLines(selectedGame, 'next');
    if (lines.length > 0) {
      const envPath = join(frontendDir, '.env');
      const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
      const block = [
        '',
        `# ── Game: ${selectedGame.name} ──────────────────────────────────`,
        ...lines,
      ].join('\n');
      writeFileSync(envPath, existing + block + '\n', 'utf8');
      ok(`Game env vars written (${selectedGame.name})`);
    }
  }

  // 5. Patch CSP
  const allCspPatches = collectCspPatches(modules);
  if (allCspPatches.length > 0) {
    step(5, 'Patching CSP in proxy.ts…');
    const patched = patchMiddlewareCsp(frontendDir, allCspPatches);
    if (patched) ok('proxy.ts updated');
    else warn('CSP auto-patch failed — check proxy.ts manually');
  } else {
    step(5, 'No CSP patches needed.');
  }

  // 6. Iframe mode — relax frame-ancestors
  if (iframe) {
    step(6, 'Enabling iframe / embedded mode…');
    patchIframeMode(frontendDir);
    ok("frame-ancestors set to '*'");
  } else {
    step(6, 'Standalone mode (frame-ancestors: none).');
  }

  // 7. Install packages
  const { prod, dev } = collectPackages(modules);
  if (skipInstall) {
    step(7, 'Skipping dependency install.');
  } else {
    step(7, 'Installing dependencies…');
    try {
      execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });
      ok('base dependencies installed');
    } catch {
      warn('npm install failed — run manually in the project directory');
    }
    if (prod.length > 0) {
      console.log(`      ${c.dim('npm install ' + prod.join(' '))}`);
      try { execSync(`npm install ${prod.join(' ')}`, { cwd: frontendDir, stdio: 'inherit' }); ok(`prod: ${prod.join(', ')}`); }
      catch { warn(`run manually: npm install ${prod.join(' ')}`); }
    }
    if (dev.length > 0) {
      console.log(`      ${c.dim('npm install --save-dev ' + dev.join(' '))}`);
      try { execSync(`npm install --save-dev ${dev.join(' ')}`, { cwd: frontendDir, stdio: 'inherit' }); ok(`dev: ${dev.join(', ')}`); }
      catch { warn(`run manually: npm install --save-dev ${dev.join(' ')}`); }
    }
  }

  // 8. Git
  if (isUpdate) {
    step(8, 'Committing scaffold update…');
    if (gitCommitUpdate(outputDir, name)) ok('scaffold update committed');
    else warn('git commit skipped — commit manually: git add . && git commit -m "chore: scaffold update"');
  } else if (!_skipGitInit) {
    step(8, 'Initialising git repository…');
    if (gitInit(outputDir, name)) ok('git init + initial commit');
    else warn('git init skipped — run manually: git init && git add . && git commit -m "chore: scaffold"');
  }

  // ── Write final .scaffolded with everything that was done ────────────────────
  const _flowTokens       = computeFlowTokens(pages, regMode, flowExits, flowEntry, pageTypes);
  const _packages         = collectPackages(modules);
  const _envVarNames      = collectEnvVars(modules).map(e => e.varName);
  const _cspPatches       = collectCspPatches(modules).map(p => ({ module: p.moduleId, patch: p.cspPatch }));
  const _optionalModules  = modules.filter(id => !GAME_ENGINES.includes(id));

  const scaffoldedConfig = {
    // Identity
    name,
    stack: 'next',
    // CAPE config
    capeId,
    market,
    capeAutoPublished: capeAutoPublished || undefined,
    capePublishedUrl: capePublishedUrl || undefined,
    // Engine & game
    game:         game || undefined,
    selectedGame: selectedGame ? { id: selectedGame.id ?? selectedGame.name, name: selectedGame.name, description: selectedGame.description } : undefined,
    // Flow
    regMode:      regMode !== 'none' ? regMode : undefined,
    pages,
    pageTypes:    Object.keys(pageTypes).length > 0 ? pageTypes : undefined,
    flow:         _flowTokens,
    flowExits:    Object.keys(flowExits).length > 0 ? flowExits : undefined,
    flowEntry:    flowEntry || undefined,
    // Page element selections (page builder output)
    pageElementSelections: Object.keys(pageElementSelections).length > 0 ? pageElementSelections : undefined,
    // Modules (full resolved list + optional-only list)
    modules,
    optionalModules: _optionalModules.length > 0 ? _optionalModules : undefined,
    // Tooling
    gtmId:         gtmId || undefined,
    iframe:        iframe || undefined,
    // What was installed / patched
    packagesInstalled: (_packages.prod.length || _packages.dev.length)
      ? { prod: _packages.prod, dev: _packages.dev }
      : undefined,
    envVarsAdded:  _envVarNames.length > 0 ? _envVarNames : undefined,
    cspPatches:    _cspPatches.length  > 0 ? _cspPatches  : undefined,
    // Wizard-only metadata — preserved here so the web wizard can re-load
    // an existing scaffold and pre-fill every step. Comes through `options`
    // when the wizard scaffold path is used; absent for legacy CLI runs.
    wizard: _wizardMeta ?? undefined,
    // Update tracking
    ...(isUpdate && updateType ? { updateType } : {}),
    // Timestamps
    createdAt: _prevCreatedAt ?? new Date().toISOString(),
    ...(isUpdate ? { updatedAt: new Date().toISOString() } : {}),
  };
  writeFileSync(join(outputDir, '.scaffolded'), JSON.stringify(scaffoldedConfig, null, 2), 'utf8');
  ok('.scaffolded config written');

  // Generate complete CAPE format (with all modules + pages) and write to disk.
  // Always written — for new campaigns the initial push during creation lacked module fields;
  // for existing campaigns it was never pushed at all.
  // Format builder emits one CAPE tab per selected page id.
  // Pass relevance flags so the generated format only contains fields the
  // user can actually fill in.
  const capeFormatSpec = buildNextCapeFormat({
    instances:        pages.map(id => ({ id, type: pageTypes[id] ?? id })),
    pageTypes,
    pageElementSelections,
    modules,
    flowEnabledExits,
    menuItemsEnabled,
    iframe,
  });
  const capeFormatFile = join(outputDir, 'cape-format.json');
  writeFileSync(capeFormatFile, JSON.stringify(capeFormatSpec, null, 2), 'utf8');
  ok('cape-format.json written');

  writeChecklistFile(outputDir, { ...scaffoldedConfig, capeFormatFile });
  ok('SCAFFOLD_CHECKLIST.md written');
  writeDebugFile(outputDir, scaffoldedConfig);
  ok('SCAFFOLD_DEBUG.json written');

  // Done
  console.log('');
  const _nextFinalFrontendDir = _displayDir ? join(_displayDir, 'frontend') : frontendDir;
  printPostScaffoldMessage({ projectName: name, capeId, market, modules: _optionalModules, outputDir: _nextFinalFrontendDir, stack: 'next', capeAutoPublished, capePublishedUrl });
}

// ─── Debug file ───────────────────────────────────────────────────────────────

function buildCliCommand(config) {
  const parts = [`node ${SCAFFOLDER_ROOT.replace(/\\/g, '/')}/cli/scaffold.js`];
  parts.push(`--name=${config.name}`);
  if (config.capeId)  parts.push(`--cape-id=${config.capeId}`);
  if (config.market)  parts.push(`--market=${config.market}`);
  if (config.stack && config.stack !== 'next') parts.push(`--stack=${config.stack}`);
  if (config.game && config.game !== 'none')   parts.push(`--game=${config.game}`);
  for (const page of config.pages ?? [])           parts.push(`--page=${page}`);
  for (const mod  of config.optionalModules ?? []) parts.push(`--module=${mod}`);
  if (config.gtmId)  parts.push(`--gtm-id=${config.gtmId}`);
  if (config.iframe) parts.push('--iframe');
  parts.push('--yes');
  return parts.join(' \\\n  ');
}

function writeDebugFile(outputDir, config) {
  const moduleDetails = (config.modules ?? []).map(id => {
    try {
      const manifest = loadManifest(id);
      return {
        id,
        impliedBy: (manifest.implies ?? []).length > 0 ? manifest.implies : undefined,
        filesCopied: (manifest.files ?? []).map(f => ({
          from: `modules/${id}/${f.src}`,
          to:   f.dest,
          ...(f.strategy ? { strategy: f.strategy } : {}),
        })),
        dirsCopied: (manifest.copyDirs ?? []).map(d => ({ from: `modules/${id}/${d.src}`, to: d.dest })),
        packages:    manifest.packages    ?? [],
        devPackages: manifest.devPackages ?? [],
      };
    } catch {
      return { id, error: 'manifest not found' };
    }
  });

  const debug = {
    recreateCommand: buildCliCommand(config),
    scaffoldedAt: config.createdAt,
    updatedAt:    config.updatedAt,
    options: config,
    moduleDetails,
  };

  writeFileSync(join(outputDir, 'SCAFFOLD_DEBUG.json'), JSON.stringify(debug, null, 2), 'utf8');
}

// ─── Token replacement ────────────────────────────────────────────────────────
const TEXT_EXT = new Set(['.ts','.tsx','.js','.jsx','.json','.md','.env','.example','.css','.html','.txt','.yaml','.yml']);

function tokenReplaceDir(dir, tokens) {
  let count = 0;
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      if (entry === 'node_modules' || entry === '.next') continue;
      const full = join(d, entry);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      const ext = entry.includes('.') ? '.' + entry.split('.').pop() : '';
      if (!TEXT_EXT.has(ext) && !entry.startsWith('.env') && entry !== 'env.dist') continue;
      let content = readFileSync(full, 'utf8');
      let modified = false;
      for (const [from, to] of Object.entries(tokens)) {
        if (content.includes(from)) { content = content.replaceAll(from, to); modified = true; }
      }
      if (modified) { writeFileSync(full, content, 'utf8'); count++; }
    }
  };
  walk(dir);
  return count;
}

// ─── Env var append ───────────────────────────────────────────────────────────
function collectEnvVars(moduleIds) {
  const seen = new Set(); const vars = [];
  for (const id of moduleIds) {
    const m = (() => { try { return loadManifest(id); } catch { return null; } })();
    for (const v of m?.envVars ?? []) {
      if (!seen.has(v)) { seen.add(v); vars.push({ moduleId: id, varName: v }); }
    }
  }
  return vars;
}

function appendEnvVars(outputDir, envVars) {
  const p = existsSync(join(outputDir, 'env.dist')) ? join(outputDir, 'env.dist') : join(outputDir, '.env.example');
  if (!existsSync(p)) return;
  const existing = readFileSync(p, 'utf8');
  const byModule = {};
  for (const { moduleId, varName } of envVars) {
    if (!existing.includes(varName)) (byModule[moduleId] ??= []).push(varName);
  }
  if (!Object.keys(byModule).length) return;
  const lines = ['', '# ─────────────────────────────────────────────', '# Added by lw-scaffold', '# ─────────────────────────────────────────────'];
  for (const [mod, vars] of Object.entries(byModule)) {
    lines.push(`# Module: ${mod}`);
    for (const v of vars) lines.push(`${v}=`);
  }
  writeFileSync(p, existing + lines.join('\n') + '\n', 'utf8');
}

// ─── Concurrent run lock ─────────────────────────────────────────────────────

/**
 * Write a lock file at <outputDir>.scaffold.lock so two simultaneous runs
 * targeting the same directory fail fast instead of corrupting each other.
 * Returns the lock path so callers can register it with registerCleanup().
 */
function acquireLock(outputDir) {
  const lockPath = `${outputDir}.scaffold.lock`;
  if (existsSync(lockPath)) {
    let stale = false;
    let hint  = '';
    try {
      const d = JSON.parse(readFileSync(lockPath, 'utf8'));
      hint = `\n  (PID ${d.pid}, started ${d.startedAt})`;
      // Check if the owning process is still alive. process.kill(pid, 0) throws
      // ESRCH if the PID doesn't exist, EPERM if it exists but we can't signal it.
      try { process.kill(d.pid, 0); }
      catch (e) { if (e.code === 'ESRCH') stale = true; }
    } catch { stale = true; /* unreadable / corrupt lock — treat as stale */ }

    if (stale) {
      console.warn(`  ${c.yellow('⚠')}  Removing stale lock (previous run crashed): ${lockPath}`);
      try { rmSync(lockPath); } catch { /* best-effort */ }
    } else {
      throw new Error(
        `A scaffold run is already in progress for:\n  ${outputDir}${hint}\n\n` +
        `If the previous run crashed, delete the stale lock and retry:\n  del "${lockPath}"`,
      );
    }
  }
  mkdirSync(dirname(lockPath), { recursive: true });
  writeFileSync(lockPath, JSON.stringify({ pid: process.pid, outputDir, startedAt: new Date().toISOString() }), 'utf8');
  return lockPath;
}

function releaseLock(lockPath) {
  try { if (existsSync(lockPath)) rmSync(lockPath); } catch { /* best-effort */ }
}

// ─── CSP patching ─────────────────────────────────────────────────────────────
function collectCspPatches(moduleIds) {
  const patches = [];
  for (const id of moduleIds) {
    const m = (() => { try { return loadManifest(id); } catch { return null; } })();
    if (m?.cspPatch && Object.keys(m.cspPatch).length > 0) patches.push({ moduleId: id, cspPatch: m.cspPatch });
  }
  return patches;
}

/**
 * Validates that a value is a legitimate CSP source expression before it is
 * written into proxy.ts. Rejects anything that would break the CSP header or
 * could be used to inject arbitrary content.
 *
 * Accepted forms:
 *   Keywords  — 'none' 'self' 'unsafe-inline' 'unsafe-eval' 'strict-dynamic'
 *                'unsafe-hashes' 'wasm-unsafe-eval' 'report-sample'
 *   Nonce     — 'nonce-<base64>'
 *   Hash      — 'sha256-<base64>' | 'sha384-<base64>' | 'sha512-<base64>'
 *   Scheme    — data: blob: filesystem: mediastream:
 *   Host      — https://example.com  https://*.example.com  http://localhost:*
 */
function isValidCspSource(val) {
  if (typeof val !== 'string' || !val.trim()) return false;
  const v = val.trim();
  const KEYWORDS = new Set([
    "'none'", "'self'", "'unsafe-inline'", "'unsafe-eval'",
    "'strict-dynamic'", "'unsafe-hashes'", "'wasm-unsafe-eval'", "'report-sample'",
  ]);
  if (KEYWORDS.has(v))                                          return true;
  if (/^'nonce-[A-Za-z0-9+/]+=*'$/.test(v))                   return true;
  if (/^'sha(256|384|512)-[A-Za-z0-9+/]+=*'$/.test(v))        return true;
  if (/^[a-z][a-z0-9+\-.]*:$/.test(v))                        return true;  // scheme-only
  if (/^(https?|wss?):\/\/[^\s;,'"\\]+$/.test(v))             return true;  // host
  return false;
}

function patchMiddlewareCsp(outputDir, patches) {
  const p = join(outputDir, 'proxy.ts');
  if (!existsSync(p)) return false;
  let src = readFileSync(p, 'utf8');
  let changed = false;
  for (const { moduleId, cspPatch } of patches) {
    for (const [directive, values] of Object.entries(cspPatch)) {
      const targets = directive === 'extras' ? values.map(v => ['script-src', v]) : values.map(v => [directive, v]);
      for (const [dir, val] of targets) {
        if (!isValidCspSource(val)) {
          throw new Error(
            `[${moduleId}] Invalid CSP source value "${val}" for directive "${dir}".\n` +
            `  Accepted: keywords like 'self', host origins like https://example.com, data:, blob:\n` +
            `  Fix the manifest at modules/${moduleId}/manifest.json before retrying.`,
          );
        }
        if (!src.includes(val)) { src = appendToCspDirective(src, dir, val); changed = true; }
      }
    }
  }
  if (changed) { writeFileSync(p, src, 'utf8'); return true; }
  return false;
}

function appendToCspDirective(src, directive, value) {
  const lines = src.split('\n');
  // Find an existing directive line (template-literal format: "    directive-name values;")
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (trimmed.startsWith(directive + ' ') || trimmed.startsWith(directive + ';')) {
      const line = lines[i];
      const semiIdx = line.lastIndexOf(';');
      if (semiIdx >= 0) {
        lines[i] = line.slice(0, semiIdx) + ' ' + value + line.slice(semiIdx);
      } else {
        lines[i] = line.trimEnd() + ' ' + value + ';';
      }
      return lines.join('\n');
    }
  }
  // Fallback: insert new directive line (plain string, no backticks) before anchor comment
  const anchorIdx = lines.findIndex(l => l.includes('// lw-scaffold:csp'));
  if (anchorIdx !== -1) { lines.splice(anchorIdx, 0, `    ${directive} ${value};`); return lines.join('\n'); }
  return src;
}

// ─── Iframe mode ──────────────────────────────────────────────────────────────
function patchIframeMode(outputDir) {
  const p = join(outputDir, 'proxy.ts');
  if (!existsSync(p)) return;
  let src = readFileSync(p, 'utf8');
  src = src.replace("`frame-ancestors 'none'`", "`frame-ancestors *`");
  writeFileSync(p, src, 'utf8');
}

// ─── Package collection ───────────────────────────────────────────────────────
function collectPackages(moduleIds) {
  const prod = new Set(); const dev = new Set();
  for (const id of moduleIds) {
    const m = (() => { try { return loadManifest(id); } catch { return null; } })();
    for (const p of m?.packages    ?? []) prod.add(p);
    for (const p of m?.devPackages ?? []) dev.add(p);
  }
  return { prod: [...prod], dev: [...dev] };
}

// ─── Dev .env creation ───────────────────────────────────────────────────────
/**
 * Copy env.dist → .env so the project can boot immediately.
 * CAPE_MOCK stays false — projects use the real CAPE CDN by default.
 */
function createDevEnv(outputDir) {
  const distPath    = join(outputDir, 'env.dist');
  const examplePath = join(outputDir, '.env.example'); // legacy fallback
  const srcPath     = existsSync(distPath) ? distPath : examplePath;
  const envPath     = join(outputDir, '.env');
  if (!existsSync(srcPath) || existsSync(envPath)) return;
  let content = readFileSync(srcPath, 'utf8');
  const devOrigin = getLanDevOrigin();
  if (devOrigin) {
    content = content.replace(/^NEXT_PUBLIC_DEV_ORIGIN=.*$/m, `NEXT_PUBLIC_DEV_ORIGIN=${devOrigin}`);
    if (!/^NEXT_PUBLIC_DEV_ORIGIN=/m.test(content)) {
      content = content.replace(/\s*$/, '') + `\nNEXT_PUBLIC_DEV_ORIGIN=${devOrigin}\n`;
    }
  }
  writeFileSync(envPath, content, 'utf8');
}

function getLanDevOrigin() {
  const nets = networkInterfaces();
  const preferred = [];
  const fallback = [];
  for (const entries of Object.values(nets)) {
    for (const entry of entries ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      if (/^(10|172\.(1[6-9]|2\d|3[01])|192\.168)\./.test(entry.address)) preferred.push(entry.address);
      else fallback.push(entry.address);
    }
  }
  const ip = preferred[0] ?? fallback[0];
  return ip ? `http://${ip}:3000` : '';
}

// ─── Checklist file ──────────────────────────────────────────────────────────

/**
 * Writes SCAFFOLD_CHECKLIST.md to the project root.
 * Covers every section that was touched during scaffold / update.
 *
 * @param {string} outputDir   - project root (where .scaffolded lives)
 * @param {object} cfg         - the full scaffoldedConfig object
 */
function writeChecklistFile(outputDir, cfg) {
  const now   = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const isUpd = cfg.isUpdate || Boolean(cfg.updatedAt);
  const lines = [];

  const h1  = (t)      => lines.push(`# ${t}`, '');
  const h2  = (t)      => lines.push(`## ${t}`, '');
  const h3  = (t)      => lines.push(`### ${t}`, '');
  const row = (k, v)   => lines.push(`- **${k}:** ${v}`);
  const chk = (t)      => lines.push(`- [ ] ${t}`);
  const ok  = (t)      => lines.push(`- [x] ${t}`);
  const br  = ()       => lines.push('');
  const sep = ()       => lines.push('---', '');
  const note= (t)      => lines.push(`> ${t}`, '');

  // ── Header ──────────────────────────────────────────────────────────────────
  h1(`Scaffold Checklist — ${cfg.name}`);
  note(isUpd
    ? `Updated ${now}  |  Originally created ${cfg.createdAt?.slice(0, 10) ?? '?'}${cfg.updateType ? `  |  Update type: **${cfg.updateType}**` : ''}`
    : `Generated ${now}`);
  br();

  // ── Project identity ────────────────────────────────────────────────────────
  h2('Project');
  row('Name',    cfg.name);
  row('Stack',   cfg.stack === 'tanstack' ? 'TanStack Start + Vite  *(Unity-based)*' : 'Next.js 16 App Router  *(Front-end based)*');
  row('CAPE ID', cfg.capeId);
  row('Market',  cfg.market);
  if (cfg.game)     row('Engine',  cfg.game);
  if (cfg.selectedGame) row('Game', `${cfg.selectedGame.name}  —  ${cfg.selectedGame.description}`);
  if (cfg.unityCdnUrl)  row('Unity CDN URL', `\`${cfg.unityCdnUrl}\``);
  if (cfg.gtmId)    row('GTM ID',  cfg.gtmId);
  if (cfg.iframe)   row('Iframe',  'enabled  *(frame-ancestors: *)*');
  if (cfg.regMode)  row('Reg mode', cfg.regMode);
  br();

  // ── Pages & routes ──────────────────────────────────────────────────────────
  sep();
  h2('Pages & Routes');

  const routeMap = {
    landing: '/landing', video: '/video', onboarding: '/onboarding',
    register: '/register', game: '/gameplay', result: '/result',
    leaderboard: '/leaderboard', voucher: '/voucher',
    // TanStack
    launch: '/launch', tutorial: '/tutorial', score: '/score',
  };

  if (cfg.pages?.length > 0) {
    for (const page of cfg.pages) {
      const route = routeMap[page] ?? `/${page}`;
      ok(`**${page}** — \`${route}\``);
    }
    br();
  }

  if (cfg.wizard?.menuItemsEnabled) {
    const menu = cfg.wizard.menuItemsEnabled;
    h3('Menu items');
    note('The menu only links to generated routes or configured external legal URLs.');
    const menuRows = [
      ['home', 'Home', '/landing'],
      ['resume', 'Resume game', routeMap.game],
      ['howToPlay', 'How to play', '/onboarding'],
      ['leaderboard', 'Leaderboard', '/leaderboard'],
      ['voucher', 'My voucher', '/voucher'],
      ['terms', 'Terms', 'general.legal.termsUrl'],
      ['privacy', 'Privacy', 'general.legal.privacyUrl'],
      ['faq', 'FAQ', '/faq'],
      ['leave', 'Leave campaign', '/'],
    ];
    const generatedRoutes = new Set((cfg.pages ?? []).map((page) => routeMap[page] ?? `/${page}`));
    for (const [id, label, route] of menuRows) {
      const enabled = Boolean(menu[id]);
      if (!enabled) {
        const reason = route && route.startsWith('/') && route !== '/' && !generatedRoutes.has(route)
          ? `disabled; \`${route}\` was not generated`
          : 'disabled';
        lines.push(`- [ ] **${id}** — ${reason}`);
      } else {
        lines.push(`- [x] **${id}** — \`${route}\``);
      }
    }
    br();
  }

  if (cfg.flow) {
    h3('Computed flow tokens');
    note('These are injected into the generated files. Verify the routing matches your campaign flow.');
    br();
    for (const [token, route] of Object.entries(cfg.flow)) {
      lines.push(`- \`${token}\` → \`${route}\``);
    }
    br();
  }

  // ── Page builder element selections ────────────────────────────────────────
  const elSel = cfg.pageElementSelections ?? cfg.tsPageElementSelections ?? {};
  const elKeys = Object.keys(elSel).filter(k => !k.includes('__'));
  if (elKeys.length > 0) {
    sep();
    h2('Page Builder — Element Selections');
    note('These were generated into page.tsx / route files. Open each file to verify the output.');
    br();
    for (const page of elKeys) {
      const els      = elSel[page] ?? [];
      const stepKey  = `${page}__stepCount`;
      const steps    = elSel[stepKey];
      h3(page);
      for (const el of els) lines.push(`- [x] \`${el}\``);
      if (steps !== undefined) lines.push(`- [x] Steps: **${steps}**`);
      chk(`Open generated \`${page}\` file and verify all elements render correctly`);
      br();
    }
  }

  // ── Modules ─────────────────────────────────────────────────────────────────
  if (cfg.modules?.length > 0) {
    sep();
    h2('Modules');

    const optionals = cfg.optionalModules ?? cfg.modules;

    h3('Installed');
    for (const m of cfg.modules) ok(m);
    br();

    h3('Module checklist');
    for (const m of optionals) {
      switch (m) {
        case 'unity':
          chk('[unity] Set `NEXT_PUBLIC_UNITY_BASE_URL` in `.env`');
          chk('[unity] Set `NEXT_PUBLIC_UNITY_GAME_NAME` in `.env`');
          chk('[unity] Extend `IUnityInput` in `lib/game-bridge/game-bridge.types.ts` for campaign-specific data');
          chk('[unity] Test: Unity canvas loads and `sendMessage` triggers game events');
          break;
        case 'r3f':
          ok('[r3f] Packages installed: `three` `@react-three/fiber` `@react-three/drei` `@react-three/rapier` `@types/three`');
          chk('[r3f] Uncomment `<Canvas>` in `components/_modules/R3FCanvas/R3FCanvas.tsx`');
          chk('[r3f] Test: canvas renders without console errors');
          break;
        case 'leaderboard':
          chk('[leaderboard] Verify `API_URL` leaderboard endpoint is live');
          chk('[leaderboard] Test: scores appear after a session is ended');
          chk('[leaderboard] Test: personal best row highlights correctly');
          break;
        case 'registration':
          chk('[registration] Update opt-in labels in `components/_modules/RegistrationForm/RegistrationForm.tsx`');
          chk('[registration] Verify opt-in links match the campaign legal URLs');
          chk('[registration] Test: form submits and player is created in CAPE');
          chk('[registration] Test: validation errors display correctly');
          break;
        case 'scoring':
          chk('[scoring] Confirm `API_URL` create-session and end-session paths match backend');
          chk('[scoring] Test: `create-session` action fires on game start');
          chk('[scoring] Test: `end-session` action fires on game end with correct score');
          break;
        case 'voucher':
          chk('[voucher] Test: QR code renders via api.qrserver.com (no package needed by default)');
          chk('[voucher] Optional: swap api.qrserver.com for a self-hosted `qrcode` package in production');
          chk('[voucher] Test: QR code encodes the correct voucher URL');
          break;
        case 'audio':
          ok('[audio] Packages installed: `howler` `@types/howler`');
          chk('[audio] Test: audio plays / pauses and respects browser autoplay policy');
          break;
        case 'cookie-consent':
          ok('[cookie-consent] `<CookieConsent />` auto-injected into `app/layout.tsx`');
          chk('[cookie-consent] Set `NEXT_PUBLIC_COOKIEBOT_CBID` in `.env`');
          chk('[cookie-consent] Test: banner appears on first visit and consent is stored');
          break;
        case 'gtm':
          ok('[gtm] `<GTMScript />` auto-injected into `app/layout.tsx`');
          chk(`[gtm] Verify GTM ID is set: \`${cfg.gtmId || 'NEXT_PUBLIC_GTM_ID'}\``);
          chk('[gtm] Test: GTM container fires on page load (check Network tab)');
          chk('[gtm] Test: dataLayer events fire on key interactions');
          break;
        case 'video':
          chk('[video] Upload intro video in CAPE → Pages → Video → Intro video');
          chk('[video] Test: video plays and auto-advances to the next page');
          chk('[video] Test: skip button appears after 3 seconds');
          break;
        default:
          chk(`[${m}] Verify integration and test manually`);
      }
      br();
    }
  }

  // ── Packages installed ───────────────────────────────────────────────────────
  if (cfg.packagesInstalled && (cfg.packagesInstalled.prod?.length || cfg.packagesInstalled.dev?.length)) {
    sep();
    h2('Packages Installed');
    if (cfg.packagesInstalled.prod?.length) {
      h3('Production');
      for (const p of cfg.packagesInstalled.prod) ok(`\`${p}\``);
      br();
    }
    if (cfg.packagesInstalled.dev?.length) {
      h3('Dev');
      for (const p of cfg.packagesInstalled.dev) ok(`\`${p}\``);
      br();
    }
    br();
  }

  // ── Env vars ────────────────────────────────────────────────────────────────
  sep();
  h2('Environment Variables');
  note('`.env` was created from `env.dist` and points at the real CAPE acceptance CDN. Fill in `API_URL`, `SERVER_SECRET`, and any module-specific vars before running.');
  br();

  // Always-required base vars
  h3('Always required');
  ok(`\`NEXT_PUBLIC_CAPE_DEFAULT_ID\` pre-filled to \`${cfg.capeId}\``);
  ok(`\`NEXT_PUBLIC_CAPE_DEFAULT_MARKET\` pre-filled to \`${cfg.market}\``);
  chk('Set `API_URL` to your backend base URL');
  chk('Set `SERVER_SECRET` to a random secret (32+ chars)');
  br();

  if (cfg.unityCdnUrl) {
    h3('Unity (pre-filled)');
    ok(`\`UNITY_BASE_URL\` = \`${cfg.unityCdnUrl}\``);
    chk('Verify the CDN URL is accessible and the build loads');
    br();
  } else if (cfg.game === 'unity' || cfg.stack === 'tanstack') {
    h3('Unity (needs filling)');
    chk('Set `UNITY_BASE_URL` (or `NEXT_PUBLIC_UNITY_BASE_URL`) to your GCS CDN build path');
    chk('Set `UNITY_GAME_NAME` (or `NEXT_PUBLIC_UNITY_GAME_NAME`) to your Unity output folder name');
    br();
  }

  if (cfg.envVarsAdded?.length > 0) {
    h3('Added by modules');
    for (const v of cfg.envVarsAdded) chk(`Set \`${v}\``);
    br();
  }

  if (cfg.gtmId) {
    h3('GTM (pre-filled)');
    ok(`\`NEXT_PUBLIC_GTM_ID\` pre-filled to \`${cfg.gtmId}\``);
    br();
  } else if (cfg.modules?.includes('gtm')) {
    h3('GTM');
    chk('Set `NEXT_PUBLIC_GTM_ID` in `.env`');
    br();
  }

  // ── CSP patches ─────────────────────────────────────────────────────────────
  if (cfg.cspPatches?.length > 0) {
    sep();
    h2('CSP Patches Applied');
    note('These were written into `proxy.ts`. Verify they are correct for your environment.');
    br();
    for (const { module: mod, patch } of cfg.cspPatches) {
      h3(mod);
      for (const [directive, values] of Object.entries(patch)) {
        const vals = Array.isArray(values) ? values : [values];
        for (const v of vals) {
          ok(`\`${directive}\` ← \`${v}\``);
        }
      }
      chk(`[${mod}] Test: no CSP violations in browser console`);
      br();
    }
  }

  if (cfg.iframe) {
    sep();
    h2('Iframe / Embedded Mode');
    ok('`frame-ancestors` set to `*` in `proxy.ts`');
    chk('Test: page loads correctly inside parent iframe');
    chk('Test: postMessage communication works if used');
    br();
  }

  // ── CAPE ────────────────────────────────────────────────────────────────────
  sep();
  h2('CAPE Integration');
  if (cfg.capeAutoPublished) {
    note(`CAPE campaign creation, format push, defaults, and publish were completed automatically${cfg.capePublishedUrl ? ` — ${cfg.capePublishedUrl}` : ''}.`);
  } else {
    note('Pull manually from `lwg-cli-cape` to inspect the live campaign JSON.');
  }
  br();

  if (cfg.capeFormatFile) {
    h3(cfg.capeAutoPublished ? '1 — Review the generated format' : '1 — Push the generated format');
    note(cfg.capeAutoPublished
      ? '`cape-format.json` was generated with all pages, elements, and modules and was already pushed during campaign creation.'
      : '`cape-format.json` was generated with all pages, elements, and modules. Run these once from `lwg-cli-cape`:');
    br();
    if (!cfg.capeAutoPublished) {
      lines.push('```bash');
      lines.push(`node cli.js push-format "${cfg.capeFormatFile.replace(/\\/g, '/')}" ${cfg.capeId}`);
      lines.push(`node cli.js populate-defaults ${cfg.capeId}`);
      lines.push(`node cli.js publish ${cfg.capeId}`);
      lines.push('```');
      br();
      chk('Run the three commands above from `lwg-cli-cape`');
    }
    chk('Verify CAPE format has all expected pages/tabs');
    br();
    h3('2 — Fill in content');
    note('Fill in copy, upload images, and configure settings in CAPE:');
    br();
  }

  chk(cfg.capeAutoPublished
    ? `Verify campaign \`${cfg.capeId}\` is still published to **acceptance** after your CAPE edits`
    : `Verify campaign \`${cfg.capeId}\` is published to **acceptance** before testing`);
  chk('Run `node cli.js fetch ' + cfg.capeId + '` from `lwg-cli-cape` to inspect campaign data');
  chk('Confirm CAPE design tokens / copy match the campaign brief');
  br();

  // ── Smoke tests ──────────────────────────────────────────────────────────────
  sep();
  h2('Smoke Tests');
  note('Run `npm run dev:full-mock` to test everything locally without external dependencies (no backend, no CAPE CDN, no Unity CDN needed).');
  br();
  h3('General');
  chk('`npm run dev:full-mock` starts without errors  *(uses mock API + mock CAPE + mock game bridge)*');
  chk('`npm run dev` starts without errors  *(requires real .env values)*');
  chk('No TypeScript errors: `npm run ts-compile` (or `npx tsc --noEmit`)');
  chk('No console errors on first page load');
  chk('Navigation flows through all pages in correct order');
  br();

  if (cfg.pages?.length > 0) {
    h3('Per-page');
    for (const page of cfg.pages) {
      const route = routeMap[page] ?? `/${page}`;
      chk(`\`${route}\` — loads without error`);
    }
    br();
  }

  if (cfg.gtmId) {
    h3('GTM');
    chk('Open DevTools → Network → filter `gtm.js` — container loads');
    chk('Check `window.dataLayer` in console — events are pushed correctly');
    br();
  }

  // ── Git ──────────────────────────────────────────────────────────────────────
  sep();
  h2('Git');
  ok(isUpd ? 'Scaffold update committed' : 'Initial scaffold commit created');
  chk('Push to remote origin');
  chk('Open a PR / branch for campaign-specific development');
  br();

  // ── Footer ───────────────────────────────────────────────────────────────────
  sep();
  lines.push(`*Generated by Livewall Campaign Scaffolder — ${now}*`);
  lines.push('');

  writeFileSync(join(outputDir, 'SCAFFOLD_CHECKLIST.md'), lines.join('\n'), 'utf8');
}

// ─── Git init ────────────────────────────────────────────────────────────────
function gitInit(outputDir, projectName) {
  try {
    execSync('git init', { cwd: outputDir, stdio: 'pipe' });
    execSync('git add .', { cwd: outputDir, stdio: 'pipe' });
    execSync(`git commit -m "chore: scaffold ${projectName}"`, { cwd: outputDir, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function gitCommitUpdate(outputDir, projectName) {
  try {
    execSync('git add .', { cwd: outputDir, stdio: 'pipe' });
    execSync(`git commit -m "chore: scaffold update ${projectName}"`, { cwd: outputDir, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ─── Update Mode wizard ───────────────────────────────────────────────────────
/**
 * Targeted three-choice wizard for updating an existing scaffolded project.
 * Shows: Add pages | Add modules | Edit settings
 * Returns a merged options object with isUpdate:true + updateType field,
 * or null if the user aborted.
 */
async function runUpdateWizard(existing, args) {
  const rl  = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  const stack      = existing.stack ?? 'next';
  const allPagesList  = stack === 'tanstack' ? TS_ALL_PAGES  : ALL_PAGES;
  const pageRoutes    = stack === 'tanstack' ? TS_PAGE_ROUTES : PAGE_ROUTES;
  const pageEls       = stack === 'tanstack' ? TS_PAGE_ELEMENTS  : PAGE_ELEMENTS;
  const pageElDefs    = stack === 'tanstack' ? TS_PAGE_DEFAULTS  : PAGE_DEFAULTS;
  const elCatalogue   = stack === 'tanstack' ? TS_ELEMENT_CATALOGUE : ELEMENT_CATALOGUE;
  const buildablePages = stack === 'tanstack'
    ? ['launch', 'tutorial', 'score', 'register']
    : ['landing', 'onboarding', 'result', 'menu'];

  console.log('');
  console.log(c.bold('  ┌──────────────────────────────────────────────┐'));
  console.log(c.bold('  │   Livewall Campaign Scaffolder — Update      │'));
  console.log(c.bold('  └──────────────────────────────────────────────┘'));
  console.log('');
  console.log(`  ${c.yellow('Update mode')} ${c.dim(`— ${existing.name}  (${stack})`)}`);
  console.log(`  ${c.dim('Stack and project name are fixed.')}`);
  console.log('');

  console.log(`  ${c.bold('What do you want to update?')}`);
  console.log(`    ${c.dim('1)')} Add pages    ${c.dim('← inject missing pages into the project')}`);
  console.log(`    ${c.dim('2)')} Add modules  ${c.dim('← install extra modules')}`);
  console.log(`    ${c.dim('3)')} Edit settings ${c.dim('← change iframe mode, CSP or GTM ID')}`);
  console.log(`    ${c.dim('0)')} Abort`);
  const choice = (await ask(`  ${c.cyan('Select')} ${c.dim('[1-3]')}: `)).trim();

  // ── 1. Add pages ─────────────────────────────────────────────────────────────
  if (choice === '1') {
    const alreadyPages = existing.pages ?? [];
    const available    = allPagesList.filter(p => !alreadyPages.includes(p));

    if (available.length === 0) {
      console.log(`\n  ${c.yellow('All pages are already included.')}`);
      rl.close(); return null;
    }

    console.log('');
    console.log(`  ${c.bold('Select NEW pages')} ${c.dim('(comma-separated numbers):')}`);
    console.log(`  ${c.dim('Already present:')} ${alreadyPages.map(p => c.dim(p)).join(', ') || c.dim('(none)')}`);
    console.log('');
    available.forEach((p, i) => {
      const route = pageRoutes[p];
      console.log(`    ${c.dim(`${i + 1})`)} ${p}${route ? c.dim(` (${route})`) : ''}`);
    });

    const v = (await ask(`  ${c.cyan('Choose pages')}: `)).trim();
    if (!v) { rl.close(); return null; }
    const newPages = v.split(',').map(s => {
      const n = parseInt(s.trim(), 10);
      return (n >= 1 && n <= available.length) ? available[n - 1] : null;
    }).filter(Boolean);
    if (newPages.length === 0) { rl.close(); return null; }

    // Page builder for newly added pages
    const existingSelections = existing.pageElementSelections ?? existing.tsPageElementSelections ?? {};
    const pageElementSelections = { ...existingSelections };

    for (const page of newPages.filter(p => buildablePages.includes(p))) {
      const available_els = pageEls[page] ?? [];
      if (available_els.length === 0) continue;
      const defaults = pageElDefs[page] ?? available_els;

      console.log('');
      console.log(`  ${c.bold('Page builder —')} ${c.cyan(page)}`);
      console.log(`  ${c.dim('Toggle elements on/off (comma-separated numbers):')}`);
      available_els.forEach((id, i) => {
        const info = elCatalogue[id] ?? {};
        const on   = defaults.includes(id) ? c.green('●') : c.dim('○');
        const desc = info.description ? c.dim(` — ${info.description}`) : '';
        console.log(`    ${on} ${c.dim(`${i + 1})`)} ${id}${desc}`);
      });

      const defaultNums = defaults.filter(id => available_els.includes(id)).map(id => available_els.indexOf(id) + 1).join(',');
      const pv = (await ask(`  ${c.cyan('Select')} ${c.dim(`[default: ${defaultNums}]`)}: `)).trim();
      if (pv) {
        pageElementSelections[page] = pv.split(',').map(s => { const n = parseInt(s.trim(), 10); return (n >= 1 && n <= available_els.length) ? available_els[n - 1] : null; }).filter(Boolean);
      } else {
        pageElementSelections[page] = defaults.filter(id => available_els.includes(id));
      }

      if (page === 'onboarding' && pageElementSelections[page].includes('step-list')) {
        const sv = (await ask(`  ${c.cyan('How many how-to-play steps?')} ${c.dim('[default: 3]')}: `)).trim();
        const n  = parseInt(sv, 10);
        pageElementSelections[`${page}__stepCount`] = (!isNaN(n) && n > 0) ? n : 3;
      }
      if (page === 'tutorial' && pageElementSelections[page].includes('steps')) {
        const sv = (await ask(`  ${c.cyan('How many tutorial steps?')} ${c.dim('[default: 3]')}: `)).trim();
        const n  = parseInt(sv, 10);
        pageElementSelections[`${page}__stepCount`] = (!isNaN(n) && n > 0) ? n : 3;
      }
    }

    rl.close();
    console.log('');
    console.log(`  ${c.green('✔')} Generating missing files for: ${newPages.map(p => c.cyan(p)).join(', ')}`);

    return {
      ...existing,
      pages: [...alreadyPages, ...newPages],
      pageElementSelections,
      tsPageElementSelections: pageElementSelections,
      isUpdate: true,
      updateType: 'pages',
      newPages,
    };
  }

  // ── 2. Add modules ────────────────────────────────────────────────────────────
  if (choice === '2') {
    const alreadyModules = existing.modules ?? [];
    const policy = moduleSelectionPolicy(existing.pages ?? [], existing.game ?? '');
    const OPTIONAL = policy.selectable;
    const available  = OPTIONAL.filter(m => !alreadyModules.includes(m));

    if (available.length === 0) {
      console.log(`\n  ${c.yellow('No additional page-supported modules are available.')}`);
      rl.close(); return null;
    }

    // Smart defaults: which available modules are suggested based on existing pages
    const smartSuggested = policy.suggested.filter(m => available.includes(m));

    console.log('');
    console.log(`  ${c.bold('Select NEW modules')} ${c.dim('(comma-separated numbers):')}`);
    if (alreadyModules.length > 0) {
      console.log(`  ${c.dim('Already installed:')} ${alreadyModules.map(m => c.dim(m)).join(', ')}`);
    }
    if (smartSuggested.length > 0) {
      console.log(`  ${c.dim(`Smart defaults: ${smartSuggested.join(', ')} — based on current pages`)}`);
    }
    if (policy.required.length > 0) {
      console.log(`  ${c.dim(`Locked by selected pages: ${policy.required.join(', ')}`)}`);
    }
    console.log('');
    available.forEach((id, i) => {
      const on = smartSuggested.includes(id) ? c.green('●') : c.dim('○');
      const m  = (() => { try { return loadManifest(id); } catch { return null; } })();
      const desc = m?.description ? c.dim(` — ${m.description.split('.')[0]}`) : '';
      console.log(`    ${on} ${c.dim(`${i + 1})`)} ${id}${desc}`);
    });

    const defaultNums = smartSuggested.map(id => available.indexOf(id) + 1).filter(n => n > 0).join(',');
    const v = (await ask(`  ${c.cyan('Select')} ${c.dim(`[default: ${defaultNums || 'none'}]`)}: `)).trim();
    let newModules;
    if (v) {
      newModules = v.split(',').map(s => {
        const n = parseInt(s.trim(), 10);
        return (n >= 1 && n <= available.length) ? available[n - 1] : s.trim();
      }).filter(Boolean);
    } else {
      newModules = smartSuggested;
    }

    // GTM ID check
    let gtmId = existing.gtmId ?? '';
    if (newModules.includes('gtm') && !gtmId) {
      gtmId = (await ask(`  ${c.cyan('GTM ID')} ${c.dim('(e.g. GTM-XXXXXX — leave blank to fill later)')}: `)).trim();
    }

    rl.close();

    const allModules = resolveModules(existing.game ?? '', existing.pages ?? [], [...alreadyModules, ...newModules]);
    console.log('');
    console.log(`  ${c.green('✔')} Updating package.json & config for: ${newModules.map(m => c.cyan(m)).join(', ')}`);

    return {
      ...existing,
      modules: allModules,
      gtmId,
      isUpdate: true,
      updateType: 'modules',
      newModules,
    };
  }

  // ── 3. Edit settings ──────────────────────────────────────────────────────────
  if (choice === '3') {
    console.log('');
    console.log(`  ${c.bold('Edit settings')}`);
    console.log(`  ${c.dim('Current values:')}`);
    console.log(`    GTM ID:  ${existing.gtmId ? c.cyan(existing.gtmId) : c.dim('(not set)')}`);
    console.log(`    Iframe:  ${existing.iframe ? c.yellow('enabled') : c.dim('disabled (standalone)')}`);
    console.log('');

    const gtmNew    = (await ask(`  ${c.cyan('GTM ID')} ${c.dim(`(current: ${existing.gtmId || 'none'} — leave blank to keep)`)}: `)).trim();
    const iframeRaw = (await ask(`  ${c.cyan('Embedded in iframe?')} ${c.dim(`(current: ${existing.iframe ? 'yes' : 'no'}) [y/N]`)}: `)).trim().toLowerCase();

    rl.close();

    const iframe = iframeRaw === 'y' || iframeRaw === 'yes' ? true
                 : iframeRaw === 'n' || iframeRaw === 'no'  ? false
                 : existing.iframe ?? false;
    const gtmId  = gtmNew || existing.gtmId || '';

    console.log('');
    console.log(`  ${c.green('✔')} Update .env en middleware — GTM: ${gtmId || c.dim('none')}, iframe: ${iframe ? c.yellow('enabled') : 'disabled'}`);

    return {
      ...existing,
      gtmId,
      iframe,
      isUpdate: true,
      updateType: 'settings',
    };
  }

  // Abort
  rl.close();
  return null;
}

// ─── Entry point ──────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv);

  // ── Recreate mode: delete + re-scaffold from .scaffolded ─────────────────────
  if (args.recreate) {
    const targetDir  = args.output ? resolve(args.output) : process.cwd();
    const markerPath = join(targetDir, '.scaffolded');
    if (!existsSync(markerPath)) {
      throw new Error(
        `No .scaffolded marker found in:\n  ${targetDir}\n\n` +
        `Pass --output=<path> pointing to a scaffolded project, or run from inside one.`
      );
    }
    let existing;
    try { existing = JSON.parse(readFileSync(markerPath, 'utf8')); }
    catch { throw new Error(`Could not read .scaffolded config in ${targetDir}`); }

    console.log('');
    console.log(c.bold('  ┌──────────────────────────────────────────────┐'));
    console.log(c.bold('  │   Livewall Campaign Scaffolder — Recreate    │'));
    console.log(c.bold('  └──────────────────────────────────────────────┘'));
    console.log('');
    console.log(`  ${c.yellow('Recreating')} ${c.cyan(existing.name)}  ${c.dim(`(${existing.stack ?? 'next'} / ${existing.game ?? 'no game'})`)}`);
    console.log(`  ${c.dim('Will DELETE and rebuild:')} ${c.cyan(targetDir)}`);
    console.log('');

    if (!args.yes) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise(res => rl.question(`  ${c.red('Delete and recreate?')} ${c.dim('[y/N]')}: `, res));
      rl.close();
      if (!answer.trim().toLowerCase().startsWith('y')) {
        console.log('\n  Aborted.\n'); process.exit(0);
      }
    }

    console.log(`\n  ${c.dim('Deleting')} ${targetDir}...`);
    rmSync(targetDir, { recursive: true, force: true });

    const options = {
      stack:                 existing.stack ?? 'next',
      name:                  existing.name,
      capeId:                existing.capeId,
      market:                existing.market,
      game:                  existing.game || 'none',
      pages:                 existing.pages ?? [],
      regMode:               existing.regMode || 'none',
      modules:               existing.modules ?? [],
      gtmId:                 existing.gtmId || '',
      iframe:                existing.iframe || false,
      outputDir:             targetDir,
      pageElementSelections: existing.pageElementSelections ?? {},
      tsPageElementSelections: existing.tsPageElementSelections ?? {},
      unityCdnUrl:           existing.unityCdnUrl || '',
      pageTypes:             existing.pageTypes ?? inferPageTypes(existing.pages ?? []),
      flowExits:             existing.flowExits ?? {},
    };

    await enforceConfigValidation(options, { yes: args.yes });
    await scaffold(options);
    return;
  }

  // ── Update mode: auto-detect .scaffolded in CWD or explicit --update flag ────
  const targetDir  = args.output ? resolve(args.output) : process.cwd();
  const markerPath = join(targetDir, '.scaffolded');
  if (args.update || existsSync(markerPath)) {
    if (!existsSync(markerPath)) {
      throw new Error(
        `No .scaffolded marker found in:\n  ${targetDir}\n\n` +
        `Pass --output=<path> pointing to a scaffolded project, or run from inside one.`
      );
    }
    let existing;
    try { existing = JSON.parse(readFileSync(markerPath, 'utf8')); }
    catch { throw new Error(`Could not read .scaffolded config in ${targetDir}`); }
    existing.outputDir = targetDir;

    const options = await runUpdateWizard(existing, args);
    if (!options) { console.log('\n  Geen wijzigingen. Klaar.\n'); process.exit(0); }
    await enforceConfigValidation(options, { yes: args.yes });
    await scaffold(options);
    return;
  }

  // ── Config-file mode (web wizard / CI with rich config) ─────────────────────
  // The web wizard writes a JSON file matching the `options` shape and runs
  // `node cli/scaffold.js --config=/tmp/wizard.json --yes`. We load it,
  // validate the bare minimum, and hand straight to scaffold().
  if (args.config) {
    const configPath = resolve(args.config);
    if (!existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    let cfg;
    try { cfg = JSON.parse(readFileSync(configPath, 'utf8')); }
    catch (e) { throw new Error(`Could not parse config JSON at ${configPath}: ${e.message}`); }

    if (!cfg.name) throw new Error('Config missing required field: name');
    if (!cfg.createCape && !cfg.capeId) {
      throw new Error('Config must set either createCape:true OR provide an existing capeId.');
    }

    const market = cfg.market ?? 'NL';

    // Wizard configs may pass strings or { id } objects. Page ids are now
    // explicit route slugs; type-based page instancing is ignored.
    const rawPages       = Array.isArray(cfg.pages) ? cfg.pages : [];
    const pageIds        = [];
    const pageTypes      = {};
    const routeMap       = {};
    for (const entry of rawPages) {
      if (typeof entry === 'string') {
        pageIds.push(entry);
        routeMap[entry] = PAGE_ROUTES[entry] ?? `/${entry}`;
      } else if (entry && typeof entry === 'object' && entry.id) {
        pageIds.push(entry.id);
        routeMap[entry.id] = entry.route ?? PAGE_ROUTES[entry.id] ?? `/${entry.id}`;
      }
    }

    // ── Auto-create CAPE campaign when requested ──────────────────────────────
    let capeId            = cfg.capeId ?? '';
    let capeAutoPublished = cfg.capeAutoPublished ?? false;
    let capePublishedUrl  = cfg.capePublishedUrl  ?? '';

    if (cfg.createCape) {
      // Check cached auth FIRST so we fail fast with a clean error instead of
      // hanging on a child-process readline prompt that has no stdin.
      const cached = await validateAuth();
      if (!cached) {
        throw new Error(
          'CAPE auth required for createCape mode, but no cached login found.\n' +
          '  → Run `node cli/scaffold.js` once interactively to log in, then retry the wizard.'
        );
      }
      const autoTitle = (cfg.capeTitle && cfg.capeTitle.trim())
        ? cfg.capeTitle.trim()
        : cfg.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      // The wizard sends Next-style page ids (landing, onboarding, result, …)
      // for BOTH stacks — TanStack's legacy launch/tutorial/score vocabulary
      // is only used by the interactive CLI path. So both stacks route to
      // buildNextCapeFormat here; the CAPE schema for these pages is
      // stack-agnostic (only the file-system routes differ).
      const cfgFormat = buildNextCapeFormat({
        instances:         pageIds.map(id => ({ id, type: pageTypes[id] ?? id })),
        pageTypes,
        pageElementSelections: cfg.pageElementSelections ?? {},
        modules:               resolveModules(cfg.game ?? 'unity', pageIds.map(id => pageTypes[id] ?? id), cfg.modules ?? []),
        flowEnabledExits:      cfg.flowEnabledExits ?? {},
        menuItemsEnabled:      cfg.menuItemsEnabled ?? {},
        iframe:                cfg.iframe ?? false,
      });
      console.log(`\n  ${c.bold('Creating CAPE campaign...')}`);
      const created = await runCapeCreateFlow(null, cfg.name, market, autoTitle, false, cfgFormat);
      capeId            = created.campaignId;
      capeAutoPublished = true;
      capePublishedUrl  = created.publishedUrl || '';
      console.log('');
    }

    // Resolve the module list the same way the interactive/non-interactive
    // CLI paths do: game engine → game module, page-required modules
    // (register → registration, voucher → voucher, etc.), implies chains.
    // Without this, picking `game: phaser` in the wizard would leave the
    // gameplay placeholder in place because the phaser module never gets
    // copied.
    const game           = cfg.game ?? 'unity';
    const selectedGame   = cfg.gameId ? getGame(cfg.gameId) : null;
    if (cfg.gameId && !selectedGame) {
      throw new Error(`Unknown gameId "${cfg.gameId}". Expected a games/{id}/game.json manifest.`);
    }
    const pages          = pageIds; // alias for the existing variable name
    const extraModules   = cfg.modules ?? [];
    // resolveModules wants TYPES (it checks against 'register', 'video', etc.).
    // Use the unique set of types the user picked.
    const allTypes       = pageIds.map(id => pageTypes[id] ?? id);
    const resolvedModules = resolveModules(game, allTypes, extraModules);

    const options = {
      stack:                   cfg.stack    ?? 'next',
      name:                    cfg.name,
      capeId,
      market,
      game,
      pages,
      regMode:                 cfg.regMode  ?? 'none',
      modules:                 resolvedModules,
      gtmId:                   cfg.gtmId    ?? '',
      iframe:                  cfg.iframe   ?? false,
      outputDir:               cfg.outputDir ? resolve(cfg.outputDir) : resolve(SCAFFOLDER_ROOT, '..', cfg.name),
      pageElementSelections:   cfg.pageElementSelections   ?? {},
      tsPageElementSelections: cfg.tsPageElementSelections ?? {},
      selectedGame,
      unityCdnUrl:             cfg.unityCdnUrl ?? '',
      capeAutoPublished,
      capePublishedUrl,
      // User-supplied flow overrides. computeFlowTokens consumes these.
      flowExits:               (cfg.flowExits && typeof cfg.flowExits === 'object') ? cfg.flowExits : {},
      flowEntry:               typeof cfg.flowEntry === 'string' ? cfg.flowEntry : '',
      flowEnabledExits:        (cfg.flowEnabledExits && typeof cfg.flowEnabledExits === 'object') ? cfg.flowEnabledExits : {},
      flowButtonVariants:      (cfg.flowButtonVariants && typeof cfg.flowButtonVariants === 'object') ? cfg.flowButtonVariants : {},
      // Menu visibility — drives which menu copy keys make it into the
      // generated CAPE format. The /menu route reads the matching CAPE flags.
      menuItemsEnabled:        (cfg.menuItemsEnabled && typeof cfg.menuItemsEnabled === 'object') ? cfg.menuItemsEnabled : {},
      menuButtonVariants:      (cfg.menuButtonVariants && typeof cfg.menuButtonVariants === 'object') ? cfg.menuButtonVariants : {},
      // Multi-page support: id→type for pages whose id ≠ type
      // (e.g. {'intro-video': 'video'}). Singletons have id === type and
      // don't appear in this map.
      pageTypes,
      // Custom page routes extracted from wizard config: id→route
      // (e.g. {'landing': '/'}). Filled during config-file mode; empty in
      // interactive mode (which uses PAGE_ROUTES directly).
      routeMap,
      // Wizard-only metadata: round-tripped through .scaffolded so the
      // "Open existing" path in the web wizard can re-fill the entire UI.
      // Each field is undefined when missing so JSON.stringify drops it.
      _wizardMeta: {
        pageSettings:       (cfg.pageSettings && Object.keys(cfg.pageSettings).length > 0)             ? cfg.pageSettings       : undefined,
        flowEnabledExits:   (cfg.flowEnabledExits && Object.keys(cfg.flowEnabledExits).length > 0)     ? cfg.flowEnabledExits   : undefined,
        flowButtonVariants: (cfg.flowButtonVariants && Object.keys(cfg.flowButtonVariants).length > 0) ? cfg.flowButtonVariants : undefined,
        menuItemsEnabled:   (cfg.menuItemsEnabled && Object.keys(cfg.menuItemsEnabled).length > 0)     ? cfg.menuItemsEnabled   : undefined,
        menuButtonVariants: (cfg.menuButtonVariants && Object.keys(cfg.menuButtonVariants).length > 0) ? cfg.menuButtonVariants : undefined,
        defaultLanguage:    cfg.defaultLanguage    || undefined,
        supportedLanguages: (Array.isArray(cfg.supportedLanguages) && cfg.supportedLanguages.length > 0) ? cfg.supportedLanguages : undefined,
        timezone:           cfg.timezone           || undefined,
        brand:              cfg.brand              || undefined,
        department:         cfg.department         || undefined,
        capeTitle:          cfg.capeTitle          || undefined,
        createCape:         cfg.createCape ?? undefined,
        gameId:             cfg.gameId || undefined,
      },
    };

    // ── Build mode: 'create' | 'update' | 'recreate' ──────────────────────────
    // The wizard's StepBuild surfaces these when an existing project was
    // loaded. Each one shapes how scaffold(options) runs:
    //   create   - default; scaffold() throws if outputDir exists
    //   update   - in-place rewrite, isUpdate=true; module files + tokens get
    //              re-applied; manual edits stay as a git diff
    //   recreate - we wipe outputDir here, then call scaffold() as a normal create
    const buildMode = (cfg.buildMode === 'update' || cfg.buildMode === 'recreate') ? cfg.buildMode : 'create';

    if (buildMode === 'recreate') {
      if (existsSync(options.outputDir)) {
        console.log(`\n  ${c.yellow('⚠')} Recreate: deleting ${c.cyan(options.outputDir)}…`);
        try {
          rmSync(options.outputDir, { recursive: true, force: true });
          console.log(`  ${c.green('✓')} Cleared.`);
        } catch (e) {
          throw new Error(`Could not delete ${options.outputDir} for recreate: ${e.message}`);
        }
      }
      // Falls through to a fresh create.
    }

    if (buildMode === 'update') {
      if (!existsSync(options.outputDir)) {
        throw new Error(`Update mode requires an existing outputDir, but ${options.outputDir} does not exist.`);
      }
      options.isUpdate   = true;
      options.updateType = 'wizard-config';
      // Preserve createdAt from the existing marker — scaffoldNext re-reads it
      // when isUpdate is set, but only if .scaffolded is at the project root.
    }

    await enforceConfigValidation(options, { yes: true });
    await scaffold(options);

    // ── Merge wizard-supplied settings into mock-cape ───────────────────────
    // Shape mirrors a real CAPE export (ref: 32875_XY.json):
    //   settings.title / brand / department          (campaign metadata)
    //   settings.languages: { EN: "EN - English" }   (flat map of supported langs)
    //   settings.timezone                            (IANA, e.g. Europe/Brussels)
    //   settings.planning.{online,offline}           (datetime strings — left as-is when empty)
    //   settings.maintenance                         (boolean kill-switch)
    //   settings.notifications / admin               (CAPE backend uses; we leave {})
    //   settings.pages.{pageId}.{key}                (our per-page settings layer)
    //
    // `defaultLanguage` is NOT stored in CAPE — CAPE has no notion of "default";
    // the frontend uses NEXT_PUBLIC_CAPE_LANGUAGE for the initial render only.
    const mockCapePath = join(options.outputDir, 'frontend', 'public', 'mock-cape.json');
    if (existsSync(mockCapePath)) {
      try {
        const mock = JSON.parse(readFileSync(mockCapePath, 'utf8'));
        mock.settings = mock.settings ?? {};

        // Top-level metadata
        if (cfg.capeTitle && typeof cfg.capeTitle === 'string' && cfg.capeTitle.trim()) {
          mock.settings.title = cfg.capeTitle.trim();
        } else if (!mock.settings.title && cfg.name) {
          mock.settings.title = cfg.name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
        }
        if (typeof cfg.brand      === 'string') mock.settings.brand      = cfg.brand;
        if (typeof cfg.department === 'string') mock.settings.department = cfg.department;
        if (typeof cfg.timezone   === 'string' && cfg.timezone) mock.settings.timezone = cfg.timezone;

        // Languages — flat map of CODE → "CODE - Name", matching CAPE
        if (Array.isArray(cfg.supportedLanguages) && cfg.supportedLanguages.length > 0) {
          mock.settings.languages = buildLanguagesMap(cfg.supportedLanguages);
        }

        // Defaults that real campaigns always have
        mock.settings.planning      = mock.settings.planning      ?? { online: '', offline: '' };
        mock.settings.maintenance   = mock.settings.maintenance   ?? false;
        mock.settings.notifications = mock.settings.notifications ?? {};
        mock.settings.admin         = mock.settings.admin         ?? {};

        // Drop the obsolete `settings.language.{default,supported}` shape if a
        // previous scaffolder version wrote it.
        if (mock.settings.language) delete mock.settings.language;

        // Per-page settings (the wizard's Page settings section)
        if (cfg.pageSettings && typeof cfg.pageSettings === 'object') {
          mock.settings.pages = mock.settings.pages ?? {};
          for (const [pageId, values] of Object.entries(cfg.pageSettings)) {
            if (!values || typeof values !== 'object') continue;
            const sanitizedValues = Object.fromEntries(
              Object.entries(values).filter(([settingKey]) => !LOCAL_WIZARD_PAGE_SETTINGS.has(settingKey)),
            );
            if (Object.keys(sanitizedValues).length === 0) continue;
            mock.settings.pages[pageId] = {
              ...(mock.settings.pages[pageId] ?? {}),
              ...sanitizedValues,
            };
          }
        }

        // Optional-exit visibility flags. The wizard tracks `flowEnabledExits`
        // keyed by `pageId.exitKey`. We translate those into the CAPE flags
        // the page components actually read at runtime — currently following
        // the convention `settings.pages.{pageId}.show{ExitKey}Button`.
        if (cfg.flowEnabledExits && typeof cfg.flowEnabledExits === 'object') {
          mock.settings.pages = mock.settings.pages ?? {};
          for (const [k, enabled] of Object.entries(cfg.flowEnabledExits)) {
            const [pageId, exitKey] = k.split('.');
            if (!pageId || !exitKey) continue;
            const flag = `show${exitKey[0].toUpperCase()}${exitKey.slice(1)}Button`;
            mock.settings.pages[pageId] = {
              ...(mock.settings.pages[pageId] ?? {}),
              [flag]: Boolean(enabled),
            };
          }
        }

        // Menu item visibility — keyed by item id (home, terms, etc) →
        // `settings.menu.show{Id}` (capitalised). The /menu route reads
        // these flags via getCapeBoolean.
        if (cfg.menuItemsEnabled && typeof cfg.menuItemsEnabled === 'object') {
          mock.settings.menu = mock.settings.menu ?? {};
          for (const [id, enabled] of Object.entries(cfg.menuItemsEnabled)) {
            const flag = `show${id[0].toUpperCase()}${id.slice(1)}`;
            mock.settings.menu[flag] = Boolean(enabled);
          }
        }

        writeFileSync(mockCapePath, JSON.stringify(mock, null, 2) + '\n', 'utf8');
        console.log(`  ${c.green('✓')} Wizard settings written to mock-cape.json`);
      } catch (e) {
        console.warn(`  ${c.yellow('⚠')} Could not merge wizard settings into mock-cape: ${e.message}`);
      }
    }

    // ── Append NEXT_PUBLIC_CAPE_LANGUAGE to .env if not already set ─────────
    if (cfg.defaultLanguage) {
      const envPath = join(options.outputDir, 'frontend', '.env');
      if (existsSync(envPath)) {
        try {
          const envContent = readFileSync(envPath, 'utf8');
          if (!/^NEXT_PUBLIC_CAPE_LANGUAGE=/m.test(envContent)) {
            const next = envContent.replace(/\s*$/, '') + `\nNEXT_PUBLIC_CAPE_LANGUAGE=${cfg.defaultLanguage}\n`;
            writeFileSync(envPath, next, 'utf8');
          }
        } catch { /* non-fatal */ }
      }
    }

    return;
  }

  // ── Normal (create) mode ─────────────────────────────────────────────────────
  // Validate CLI flags early — before any wizard prompts — so non-interactive
  // runs (CI) fail fast with a clear message rather than mid-scaffold.
  validateArgs(args);

  const isNonInteractive = Boolean(args.name && (args.capeId || args.createCape));
  let options;
  if (isNonInteractive) {
    const stack = args.stack || 'next';
    const effectiveGame = args.game != null ? args.game : (stack === 'tanstack' ? 'unity' : '');
    const pages = args.pages.length > 0 ? args.pages : (stack === 'tanstack' ? ['launch', 'tutorial', 'game', 'score'] : buildDefaultPages(effectiveGame));
    const pageTypes = inferPageTypes(pages);
    const allModules = resolveModules(effectiveGame, pages, args.modules);
    const selectedGame = effectiveGame === 'unity'
      ? (args.gameId ? getGame(args.gameId) : (getGamesByStack('unity', stack)[0] ?? null))
      : null;
    if (args.gameId && !selectedGame) {
      throw new Error(`Unknown game id "${args.gameId}". Expected a games/{id}/game.json manifest.`);
    }
    if (selectedGame?.stack && selectedGame.stack !== stack) {
      throw new Error(`Game "${selectedGame.id}" is registered for stack "${selectedGame.stack}", not "${stack}".`);
    }
    let capeAutoPublished = Boolean(args.capeId);
    let capePublishedUrl = '';

    let capeId = args.capeId;
    if (!capeId && args.createCape) {
      const autoTitle = args.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      const formatPages = pages;

      // Both stacks share the Next-style page vocabulary at the wizard /
      // non-interactive level; TanStack's launch/tutorial/score legacy
      // vocabulary is only used inside the interactive CLI flow above.
      const argsFormat = buildNextCapeFormat({
        instances:        formatPages.map(id => ({ id, type: pageTypes[id] ?? id })),
        pageTypes,
        modules:              allModules,
        pageElementSelections: {},
        flowEnabledExits:     {},
        menuItemsEnabled:     {},
        iframe:               args.iframe || false,
      });

      console.log(`\n  ${c.bold('Creating CAPE campaign...')}`);
      const createdCape = await runCapeCreateFlow(null, args.name, args.market || 'NL', autoTitle, false, argsFormat);
      capeId = createdCape.campaignId;
      capeAutoPublished = true;
      capePublishedUrl = createdCape.publishedUrl || '';
      console.log('');
    }

    options = {
      stack,
      name:      args.name,
      capeId,
      market:    args.market,
      game:      effectiveGame,
      pages,
      regMode:   args.regMode || 'none',
      modules:   allModules,
      gtmId:     args.gtmId || '',
      iframe:    args.iframe || false,
      capeAutoPublished,
      capePublishedUrl,
      selectedGame,
      outputDir: args.output ? resolve(args.output) : resolve(SCAFFOLDER_ROOT, '..', args.name),
      skipInstall: Boolean(args.skipInstall),
      skipGit: Boolean(args.skipGit),
      pageTypes,
      flowExits: pages.includes('result') && pages.includes('landing') ? { 'result.next': 'landing' } : {},
      flowEnabledExits: { 'landing.leaderboard': false, 'result.playAgain': true, 'result.leaderboard': false },
      menuItemsEnabled: { home: true, resume: false, howToPlay: true, leaderboard: false, voucher: false, terms: true, privacy: true, faq: false, leave: true },
      _wizardMeta: {
        pageSettings: {
          landing: { onboardingFirstRunOnly: true },
          'intro-video': { skipAfterSeconds: 3 },
          'loading-video': {},
          'ad-video': { skipAfterSeconds: 3 },
          onboarding: { allowSkip: false },
          register: { showInfix: true, requireOptIns: true },
          game: { timerEnabled: true, timerSec: 60 },
          result: { autoNavSec: 0 },
          voucher: { showQr: true, codeLength: 8 },
        },
        flowEnabledExits: { 'landing.leaderboard': false, 'result.playAgain': true, 'result.leaderboard': false },
        menuItemsEnabled: { home: true, resume: false, howToPlay: true, leaderboard: false, voucher: false, terms: true, privacy: true, faq: false, leave: true },
        defaultLanguage: 'EN',
        supportedLanguages: ['EN'],
        timezone: 'Europe/Brussels',
        createCape: true,
        gameId: selectedGame?.id || undefined,
      },
    };
  } else {
    options = await runWizard(args);
  }

  // Build routeMap from --route flags for non-interactive callers (wizard already
  // includes routes in cfg.pages; this covers bare --page + --route invocations).
  if (!options.routeMap) {
    options.routeMap = Object.fromEntries(
      (options.pages ?? []).map(id => [
        id,
        args.routeOverrides?.[id] ?? PAGE_ROUTES[id] ?? `/${id}`
      ])
    );
  }

  await enforceConfigValidation(options, { yes: args.yes });
  await scaffold(options);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(`\n  ${c.red('Error:')} ${err.message}\n`);
    process.exit(1);
  });
}
