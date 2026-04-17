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
import { existsSync, mkdirSync, cpSync, rmSync, renameSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { printPostScaffoldMessage } from './post-scaffold-message.js';
import { PAGE_ELEMENTS, PAGE_DEFAULTS, ELEMENT_CATALOGUE, buildPage } from './page-builder.js';
import { TS_PAGE_ELEMENTS, TS_PAGE_DEFAULTS, TS_ELEMENT_CATALOGUE, TS_ALL_PAGES, TS_PAGE_ROUTES, buildTsPage } from './tanstack-page-builder.js';
import { getGamesByEngine, getGame, gameEnvLines, gameLabel } from './game-registry.js';
import { checkAuth, login, createCampaign, pushFormat, populateDefaults, publishCampaign, SCAFFOLDER_FORMAT_FILE } from './cape-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const SCAFFOLDER_ROOT    = resolve(__dirname, '..');
const NEXT_TEMPLATE      = join(SCAFFOLDER_ROOT, 'base-templates', 'next');
const TANSTACK_BOILERPLATE = resolve(SCAFFOLDER_ROOT, '..', 'unity-tanstack-boilerplate', 'frontend');
const MODULES_DIR        = join(SCAFFOLDER_ROOT, 'modules');

// ─── CAPE campaign creation helper ───────────────────────────────────────────

/**
 * Interactive CAPE campaign creation flow.
 * Checks/prompts for auth, creates a campaign, pushes the scaffolder format,
 * populates defaults, and publishes to acceptance.
 * Returns the new numeric campaign ID string.
 */
async function runCapeCreateFlow(ask, projectName, market) {
  // 1. Auth
  let tokens = await checkAuth();
  if (!tokens) {
    console.log(`\n  ${c.yellow('⚠')}  Not logged in to CAPE. Enter your credentials:`);
    const email    = (await ask(`  ${c.cyan('CAPE email')}: `)).trim();
    const password = (await ask(`  ${c.cyan('CAPE password')}: `)).trim();
    try {
      tokens = await login(email, password);
      console.log(`  ${c.green('✓')}  Logged in.`);
    } catch (err) {
      throw new Error(`CAPE login failed: ${err.message}`);
    }
  }

  // 2. Campaign title
  const defaultTitle = projectName
    .split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const rawTitle = (await ask(`  ${c.cyan('Campaign title')} ${c.dim(`(default: ${defaultTitle})`)}: `)).trim();
  const title    = rawTitle || defaultTitle;

  // 3. Create campaign
  process.stdout.write(`  ${c.dim('Creating campaign...')} `);
  let campaignId;
  try {
    campaignId = await createCampaign(tokens, { title, market });
    console.log(`${c.green('✓')}  ID: ${c.cyan(campaignId)}`);
  } catch (err) {
    throw new Error(`Campaign creation failed: ${err.message}`);
  }

  // 4. Push format
  process.stdout.write(`  ${c.dim('Pushing format...')} `);
  try {
    const formatFile = JSON.parse(readFileSync(SCAFFOLDER_FORMAT_FILE, 'utf8'));
    await pushFormat(tokens, campaignId, formatFile);
    console.log(`${c.green('✓')}`);
  } catch (err) {
    console.log(`${c.yellow('⚠')}  ${err.message} (continuing)`);
  }

  // 5. Populate defaults
  process.stdout.write(`  ${c.dim('Populating defaults...')} `);
  try {
    const formatFile = JSON.parse(readFileSync(SCAFFOLDER_FORMAT_FILE, 'utf8'));
    const count = await populateDefaults(tokens, campaignId, formatFile.interfaceSetup);
    console.log(`${c.green('✓')}  ${count} fields`);
  } catch (err) {
    console.log(`${c.yellow('⚠')}  ${err.message} (continuing)`);
  }

  // 6. Publish
  process.stdout.write(`  ${c.dim('Publishing to acceptance...')} `);
  try {
    await publishCampaign(tokens, campaignId);
    console.log(`${c.green('✓')}`);
  } catch (err) {
    console.log(`${c.yellow('⚠')}  ${err.message} (you can publish manually in CAPE)`);
  }

  return campaignId;
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

const GAME_ENGINES = ['unity', 'r3f', 'phaser', 'video', 'pure-react'];

const ALL_PAGES = ['landing', 'video', 'onboarding', 'register', 'game', 'result', 'leaderboard', 'voucher'];

const VALID_MARKETS = new Set(['NL', 'BE', 'FR', 'DE', 'UK', 'ES', 'IT', 'PL', 'AT', 'CH', 'LU', 'DK', 'SE', 'NO', 'FI']);

/** Names that would conflict with framework directories or reserved paths */
const RESERVED_NAMES = new Set(['next', 'app', 'api', 'src', 'public', 'node_modules', 'build', 'dist', 'test', 'tests', 'frontend', 'backend', 'scaffolder', 'campaign-scaffolder', 'livewall']);

const PAGE_ROUTES = {
  landing:     '/landing',
  video:       '/video',
  onboarding:  '/onboarding',
  register:    '/register',
  game:        '/gameplay',
  result:      '/result',
  leaderboard: '/leaderboard',
  voucher:     '/voucher',
};

/** Pages that require a specific module to be present */
const PAGE_REQUIRES_MODULE = {
  register:    'registration',
  leaderboard: 'leaderboard',
  voucher:     'voucher',
  video:       'video',
};

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
  const args = { modules: [], pages: [], market: 'NL' };
  for (const raw of argv.slice(2)) {
    const [key, ...rest] = raw.replace(/^--/, '').split('=');
    const val = rest.join('=');
    if      (key === 'module')   args.modules.push(val);
    else if (key === 'page')     args.pages.push(val);
    else if (key === 'name')     args.name     = val;
    else if (key === 'cape-id')  args.capeId   = val;
    else if (key === 'market')   args.market   = val;
    else if (key === 'game')     args.game     = val;
    else if (key === 'stack')    args.stack    = val;
    else if (key === 'reg-mode') args.regMode  = val;
    else if (key === 'gtm-id')   args.gtmId    = val;
    else if (key === 'output')   args.output   = val;
    else if (key === 'iframe')   args.iframe   = true;
    else if (key === 'update' || key === 'u') args.update = true;
    else if (key === 'yes' || key === 'y') args.yes = true;
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

// ─── Flow computation ─────────────────────────────────────────────────────────

/**
 * Given selected pages and registration mode, compute the navigation token map.
 *
 * Canonical order: landing → video → onboarding → register(gate) → game →
 *                  result → register(after) → leaderboard → voucher
 *
 * Returns an object like:
 *   { '{{FLOW_ENTRY}}': '/onboarding', '{{NEXT_AFTER_GAME}}': '/result', ... }
 */
function computeFlowTokens(pages, regMode = 'none') {
  // Build the ordered sequence from canonical order, filtered to selected pages
  let sequence = ALL_PAGES.filter(p => pages.includes(p));

  // Reorder register based on mode
  if (regMode === 'after' && sequence.includes('register')) {
    sequence = sequence.filter(p => p !== 'register');
    const resultIdx = sequence.indexOf('result');
    if (resultIdx >= 0) sequence.splice(resultIdx + 1, 0, 'register');
    else sequence.push('register');
  }

  const tokens = {};

  // FLOW_ENTRY → first page
  tokens['{{FLOW_ENTRY}}'] = sequence.length > 0 ? PAGE_ROUTES[sequence[0]] : '/';

  // NEXT_AFTER_* for each page
  for (let i = 0; i < sequence.length; i++) {
    const page    = sequence[i];
    const nextPg  = sequence[i + 1];
    const tokenKey = `{{NEXT_AFTER_${page.toUpperCase()}}}`;
    tokens[tokenKey] = nextPg ? PAGE_ROUTES[nextPg] : PAGE_ROUTES[sequence[0]] ?? '/';
  }

  // PLAY_AGAIN_ROUTE → prefer onboarding, then game, then first page
  tokens['{{PLAY_AGAIN_ROUTE}}'] =
    sequence.includes('onboarding') ? PAGE_ROUTES.onboarding :
    sequence.includes('game')       ? PAGE_ROUTES.game :
    PAGE_ROUTES[sequence[0]] ?? '/';

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

  // 0. Stack
  let stack = pre.stack ?? null;
  if (stack === null) {
    console.log(`  ${c.bold('Experience / Engine:')}`);
    console.log(`    ${c.dim('0)')} Front-end based   ${c.dim('← Next.js 16 — CAPE-heavy, registration flows, SSR')}`);
    console.log(`    ${c.dim('1)')} Unity-based        ${c.dim('← TanStack + Vite (NHL-Crush pattern)')}`);
    const v = (await ask(`  ${c.cyan('Select')} ${c.dim('[0-1, default: 0]')}: `)).trim();
    stack = v === '1' ? 'tanstack' : 'next';
  }

  // 1. Project name
  let name = pre.name;
  if (!name) name = (await ask(`  ${c.cyan('Project name')} ${c.dim('(e.g. hema-handdoek-2025)')}: `)).trim();
  if (!name) { rl.close(); throw new Error('Project name is required.'); }
  if (!pre.isUpdate && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name)) {
    rl.close();
    throw new Error(`Invalid project name "${name}". Use lowercase letters, numbers, and hyphens only (e.g. hema-handdoek-2025).`);
  }

  // 2. CAPE campaign — create new or use existing
  let capeId = pre.capeId;
  if (!capeId) {
    const choice = (await ask(`  ${c.cyan('CAPE campaign')}  ${c.dim('[n=create new / e=use existing ID]')} ${c.dim('(default: n)')}: `)).trim().toLowerCase();
    if (choice === '' || choice === 'n' || choice === 'new') {
      // Market may not be set yet for Next.js — ask here so createCampaign has it
      let mktForCape = pre.market || 'NL';
      if (!pre.market && stack !== 'tanstack') {
        const mv = (await ask(`  ${c.cyan('Market')} ${c.dim(`(default: ${mktForCape})`)} : `)).trim().toUpperCase();
        if (VALID_MARKETS.has(mv)) mktForCape = mv;
      }
      console.log('');
      capeId = await runCapeCreateFlow(ask, name, mktForCape);
      console.log('');
      // Pre-fill market so the later market step is skipped
      if (!pre.market) pre = { ...pre, market: mktForCape };
    } else {
      // Use existing
      while (!capeId || !/^\d+$/.test(capeId)) {
        if (capeId) console.log(`  ${c.red('✘')} CAPE ID must be a numeric string (e.g. 54031) — got "${capeId}"`);
        capeId = (await ask(`  ${c.cyan('CAPE campaign ID')} ${c.dim('(numeric, e.g. 54031)')}: `)).trim();
      }
    }
  }

  // 3. Market
  let market = pre.market || 'NL';
  if (!pre.market) {
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
    // 3b. Unity game type: existing (CDN URL) or new
    let unityCdnUrl = pre.unityCdnUrl ?? '';
    if (!pre.isUpdate && !unityCdnUrl) {
      console.log('');
      console.log(`  ${c.bold('Type Unity Game:')}`);
      console.log(`    ${c.dim('1)')} Bestaande game   ${c.dim('← Plak de CDN URL (Build-map URL)')}`);
      console.log(`    ${c.dim('2)')} Nieuwe game      ${c.dim('← Lege CDN vars — later invullen')}`);
      const ut = (await ask(`  ${c.cyan('Select')} ${c.dim('[1-2, default: 2]')}: `)).trim();
      if (ut === '1') {
        unityCdnUrl = (await ask(`  ${c.cyan('CDN URL')} ${c.dim('(e.g. https://cdn.example.com/Build)')}: `)).trim();
      }
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

    // 6. GTM ID
    let gtmId = pre.gtmId ?? '';
    if (!gtmId) {
      gtmId = (await ask(`  ${c.cyan('GTM ID')} ${c.dim('(e.g. GTM-XXXXXX — leave blank to fill later)')}: `)).trim();
    }

    // 7. Output directory
    let outputDir = pre.output;
    if (!outputDir) {
      const def = resolve(SCAFFOLDER_ROOT, '..', name);
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

    return { stack, name, capeId, market, game: 'unity', pages: tsPages, regMode: 'none', modules: [], gtmId, iframe: false, outputDir, tsPageElementSelections, unityCdnUrl, isUpdate: pre.isUpdate ?? false };
  }

  // 4. Experience / engine
  let game = pre.game ?? null;
  if (game === null) {
    console.log('');
    console.log(`  ${c.bold('Experience type:')}`);
    console.log(`    ${c.dim('0)')} No game (registration / voucher only)`);
    console.log(`    ${c.dim('1)')} Unity WebGL`);
    console.log(`    ${c.dim('2)')} React Three Fiber (3D)`);
    console.log(`    ${c.dim('3)')} Phaser 3 (2D)`);
    console.log(`    ${c.dim('4)')} Video experience`);
    console.log(`    ${c.dim('5)')} Pure React (custom — you wire it in)`);
    const v = (await ask(`  ${c.cyan('Select')} ${c.dim('[0-5, default: 0]')}: `)).trim();
    const MAP = { '1': 'unity', '2': 'r3f', '3': 'phaser', '4': 'video', '5': 'pure-react' };
    game = MAP[v] ?? '';
  }

  // 4b. Game picker — shown when a game engine is selected
  let selectedGame = null;
  if (game === 'unity') {
    const unityGames = getGamesByEngine('unity');
    if (unityGames.length > 0) {
      console.log('');
      console.log(`  ${c.bold('Which Unity game?')}`);
      unityGames.forEach((g, i) => {
        console.log(`    ${c.dim(`${i + 1})`)} ${c.cyan(g.name)}  ${c.dim(`— ${g.description}`)}`);
      });
      console.log(`    ${c.dim(`${unityGames.length + 1})`)} New game ${c.dim('(blank template — fill in CDN details manually)')}`);
      const v = (await ask(`  ${c.cyan('Select')} ${c.dim('[1-' + (unityGames.length + 1) + ']')}: `)).trim();
      const n = parseInt(v, 10);
      if (n >= 1 && n <= unityGames.length) {
        selectedGame = unityGames[n - 1];
        console.log(`      ${c.green('✔')} Selected: ${selectedGame.name}`);
      }
    }
  }

  // 5. Campaign pages / flow
  let pages = pre.pages.length > 0 ? pre.pages : null;
  if (!pages) {
    const defaultPages = buildDefaultPages(game);
    console.log('');
    console.log(`  ${c.bold('Campaign pages')} ${c.dim('(comma-separated numbers — current defaults pre-selected):')}`);
    ALL_PAGES.forEach((p, i) => {
      const on = defaultPages.includes(p) ? c.green('●') : c.dim('○');
      console.log(`    ${on} ${c.dim(`${i + 1})`)} ${p}${PAGE_ROUTES[p] !== '/' ? c.dim(` (${PAGE_ROUTES[p]})`) : ''}`);
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
  if (game && game !== 'pure-react' && !pages.includes('game')) pages.push('game');

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
    console.log(`  ${c.bold(`Page builder — `)}${c.cyan(page)} ${c.dim(`(${PAGE_ROUTES[page] ?? '/menu'})`)}`);
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
  const OPTIONAL = ['leaderboard', 'registration', 'scoring', 'audio', 'design-tokens', 'cookie-consent', 'gtm'];
  let extraModules = pre.modules.length > 0 ? pre.modules : null;
  if (!extraModules) {
    // Smart defaults: pre-select modules based on chosen pages + engine
    const suggested = autoModulesForPages(pages, game);
    console.log('');
    console.log(`  ${c.bold('Modules')} ${c.dim('(comma-separated numbers):')}`);
    if (suggested.length > 0) {
      console.log(`  ${c.dim(`Smart defaults: ${suggested.join(', ')} — pre-selected based on your pages`)}`);
    }
    OPTIONAL.forEach((id, i) => {
      const on = suggested.includes(id) ? c.green('●') : c.dim('○');
      const m  = (() => { try { return loadManifest(id); } catch { return null; } })();
      const desc = m ? c.dim(` — ${m.description.split('.')[0]}`) : '';
      console.log(`    ${on} ${c.dim(`${i + 1})`)} ${id}${desc}`);
    });
    const v = (await ask(`  ${c.cyan('Select')} ${c.dim(`[default: ${suggested.map(id => OPTIONAL.indexOf(id) + 1).filter(n => n > 0).join(',')}]`)}: `)).trim();
    if (v) {
      extraModules = v.split(',').map(s => {
        const n = parseInt(s.trim(), 10);
        return (n >= 1 && n <= OPTIONAL.length) ? OPTIONAL[n - 1] : s.trim();
      }).filter(Boolean);
    } else {
      extraModules = suggested;
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
    outputDir = (await ask(`  ${c.cyan('Output directory')} ${c.dim(`(default: ${def})`)}: `)).trim();
    if (!outputDir) outputDir = def;
  }
  outputDir = resolve(outputDir);

  rl.close();

  // Resolve all modules including engine + page-implied + implies chains
  const allModules = resolveModules(game, pages, extraModules);

  // Confirm
  const printNextSummary = () => {
    const ft = computeFlowTokens(pages, regMode);
    console.log('');
    console.log(c.bold('  ──────────────────────────────────────────────'));
    console.log(`  ${c.bold('Project:')}  ${c.cyan(name)}`);
    console.log(`  ${c.bold('CAPE ID:')}  ${c.cyan(capeId)}  ${c.dim(`(market: ${market})`)}`);
    console.log(`  ${c.bold('Engine:')}   ${game ? c.cyan(game) : c.dim('none')}${selectedGame ? c.dim(` (${selectedGame.name})`) : ''}`);
    console.log(`  ${c.bold('Pages:')}    ${pages.map(p => c.cyan(p)).join(' → ')}`);
    if (pages.includes('register')) console.log(`  ${c.bold('Reg mode:')} ${c.cyan(regMode)}`);
    console.log(`  ${c.bold('Modules:')} ${allModules.filter(id => !GAME_ENGINES.includes(id)).join(', ') || c.dim('none')}`);
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
        console.log('');
        console.log(`  ${c.bold('Edit field:')}`);
        console.log(`    ${c.dim('1)')} Project name  ${c.dim(`(${name})`)}`);
        console.log(`    ${c.dim('2)')} CAPE ID        ${c.dim(`(${capeId})`)}`);
        console.log(`    ${c.dim('3)')} Market         ${c.dim(`(${market})`)}`);
        console.log(`    ${c.dim('4)')} GTM ID         ${c.dim(`(${gtmId || 'none'})`)}`);
        console.log(`    ${c.dim('5)')} Iframe mode    ${c.dim(`(${iframe ? 'enabled' : 'disabled'})`)}`);
        console.log(`    ${c.dim('6)')} Output dir     ${c.dim(`(${outputDir})`)}`);
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
          const v = (await promptOnce(`  ${c.cyan('Iframe mode?')} ${c.dim('[y/N]')}: `)).trim().toLowerCase();
          iframe = v === 'y' || v === 'yes';
        } else if (field === '6') {
          const d = (await promptOnce(`  ${c.cyan('Output directory')}: `)).trim();
          if (d) outputDir = resolve(d);
        }
        printNextSummary();
      }
    }
  }

  return { stack: 'next', name, capeId, market, game, pages, regMode, modules: allModules, gtmId, iframe, outputDir, pageElementSelections, selectedGame, isUpdate: pre.isUpdate ?? false };
}

function buildDefaultPages(game) {
  const pages = ['landing', 'onboarding'];
  if (game && game !== 'video') pages.push('game', 'result');
  if (game === 'video') pages.push('video');
  return pages;
}

function autoModulesForPages(pages, game = '') {
  const mods = new Set();
  // Page-driven hard requirements
  if (pages.includes('register'))    mods.add('registration');
  if (pages.includes('voucher'))     mods.add('voucher');
  if (pages.includes('video'))       mods.add('video');
  // Smart defaults: leaderboard page → leaderboard + scoring
  if (pages.includes('leaderboard')) { mods.add('leaderboard'); mods.add('scoring'); }
  // Smart defaults: game/result flow → scoring
  if (pages.includes('game') || pages.includes('result')) mods.add('scoring');
  // Smart defaults: GTM almost always useful for multi-page campaigns
  if (pages.length >= 2) mods.add('gtm');
  return [...mods];
}

function resolveModules(game, pages, extraModules) {
  const all = new Set();
  // Game engine module
  if (game && GAME_ENGINES.includes(game) && game !== 'pure-react' && game !== 'video') {
    all.add(game);
  }
  // Page-required modules
  for (const [page, mod] of Object.entries(PAGE_REQUIRES_MODULE)) {
    if (pages.includes(page)) all.add(mod);
  }
  // User-selected extra modules
  for (const m of extraModules) all.add(m);
  // Resolve implies chains
  return resolveImplied([...all]);
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
    //     files, causing EBUSY.  Retry up to 4 times with back-off; if still busy,
    //     fall back to cpSync + rmSync (skip .git — there is none yet) which always works.
    let renamed = false;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        renameSync(tempDir, outputDir);
        renamed = true;
        break;
      } catch (e) {
        if (e.code !== 'EBUSY') throw e;
        await new Promise(r => setTimeout(r, attempt * 250));
      }
    }
    if (!renamed) {
      cpSync(tempDir, outputDir, { recursive: true });
      rmSync(tempDir, { recursive: true, force: true });
    }

    // 4b. Git init — runs on the final directory so no .git handles are
    //     open during the rename above.
    if (!options.isUpdate) {
      console.log(`\n  ${c.cyan('[git]')} ${c.bold('Initialising git repository…')}`);
      if (gitInit(outputDir, options.name)) {
        console.log(`      ${c.green('✔')} git init + initial commit`);
      } else {
        console.log(`      ${c.yellow('⚠')} git init skipped — run manually: git init && git add . && git commit -m "chore: scaffold"`);
      }
    }

  } catch (err) {
    // Cleanup temp dir + lock before rethrowing so main() can print the error.
    runCleanup();
    throw err;
  }

  // 5. Success — unregister cleanup (temp dir is now the final dir).
  unregister();
  releaseLock(lockPath);
}

async function scaffoldTanstack({ name, capeId, market, outputDir, pages = [], gtmId = '', tsPageElementSelections = {}, unityCdnUrl = '', isUpdate = false, updateType = null, _displayDir = null, _skipGitInit = false }) {
  const step = (n, msg) => console.log(`\n  ${c.cyan(`[${n}]`)} ${c.bold(msg)}`);
  const ok   = (msg)    => console.log(`      ${c.green('✔')} ${msg}`);
  const warn = (msg)    => console.log(`      ${c.yellow('⚠')} ${msg}`);

  const frontendDir = join(outputDir, 'frontend');

  // 1. Copy boilerplate (skipped in update mode)
  if (isUpdate) {
    step(1, 'Update mode — skipping boilerplate copy.');
  } else {
    if (!existsSync(TANSTACK_BOILERPLATE)) {
      throw new Error(
        `TanStack boilerplate not found at:\n  ${TANSTACK_BOILERPLATE}\n\n` +
        `Make sure unity-tanstack-boilerplate is cloned as a sibling of this repo.`
      );
    }
    step(1, 'Copying TanStack boilerplate…');
    mkdirSync(frontendDir, { recursive: true });
    cpSync(TANSTACK_BOILERPLATE, frontendDir, {
      recursive: true,
      filter: (src) => {
        const rel = relative(TANSTACK_BOILERPLATE, src);
        return !rel.startsWith('node_modules') && !rel.startsWith('.output') && !rel.startsWith('dist');
      },
    });
    ok(`Boilerplate → ${c.dim(frontendDir)}`);
  }

  // Read createdAt from existing marker if updating (used in final write below)
  const _prevCreatedAt = (() => {
    if (!isUpdate) return null;
    try { return JSON.parse(readFileSync(join(outputDir, '.scaffolded'), 'utf8')).createdAt; } catch { return null; }
  })();

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
    envContent = envContent
      .replace(/^CAPE_CAMPAIGN_ID=.*/m,         `CAPE_CAMPAIGN_ID=${capeId}`)
      .replace(/^CAPE_CAMPAIGN_MARKET=.*/m,      `CAPE_CAMPAIGN_MARKET=${market}`)
      .replace(/^NEXT_PUBLIC_CAPE_DEFAULT_ID=.*/m,     `NEXT_PUBLIC_CAPE_DEFAULT_ID=${capeId}`)
      .replace(/^NEXT_PUBLIC_CAPE_DEFAULT_MARKET=.*/m, `NEXT_PUBLIC_CAPE_DEFAULT_MARKET=${market}`);
    writeFileSync(envDest, envContent, 'utf8');
    ok('.env created from env.dist');
  } else {
    warn('env.dist not found — create .env manually');
  }

  // 3b. Remove excluded pages + generate page builder output
  const BUILDABLE_TS = ['launch', 'tutorial', 'score', 'register'];
  const ROUTE_FILES  = { launch: 'launch.tsx', tutorial: 'tutorial.tsx', game: 'game.tsx', register: 'register.tsx', score: 'score.tsx' };
  const LOADER_FILES = { launch: 'launchLoader.ts', tutorial: 'tutorialLoader.ts', register: 'registerLoader.ts', score: 'scoreLoader.ts' };
  const routesDir  = join(frontendDir, 'src', 'routes');
  const loadersDir = join(routesDir, '-loaders');

  if (pages.length > 0) {
    step('3b', 'Configuring pages…');
    let removed = 0; let generated = 0;

    for (const page of BUILDABLE_TS) {
      if (pages.includes(page)) continue;
      for (const f of [join(routesDir, ROUTE_FILES[page]), join(loadersDir, LOADER_FILES[page])]) {
        if (existsSync(f)) { try { rmSync(f); removed++; } catch { /* non-fatal */ } }
      }
    }
    if (removed > 0) ok(`${removed} excluded page file(s) removed`);

    for (const [page, elements] of Object.entries(tsPageElementSelections)) {
      if (page.includes('__') || !BUILDABLE_TS.includes(page)) continue;
      const stepCount = tsPageElementSelections[`${page}__stepCount`] ?? 3;
      try {
        const { route, loader } = buildTsPage(page, elements, { stepCount });
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

  console.log('');
  const _tsFinalFrontendDir = _displayDir ? join(_displayDir, 'frontend') : frontendDir;
  printPostScaffoldMessage({ projectName: name, capeId, market, modules: [], outputDir: _tsFinalFrontendDir, stack: 'tanstack' });
}

async function scaffoldNext({ name, capeId, market, game, pages, regMode, modules, gtmId, iframe, outputDir, pageElementSelections = {}, selectedGame = null, isUpdate = false, updateType = null, _displayDir = null, _skipGitInit = false }) {
  const step = (n, msg) => console.log(`\n  ${c.cyan(`[${n}]`)} ${c.bold(msg)}`);
  const ok   = (msg)    => console.log(`      ${c.green('✔')} ${msg}`);
  const warn = (msg)    => console.log(`      ${c.yellow('⚠')} ${msg}`);

  const frontendDir = join(outputDir, 'frontend');

  // 1. Copy base template (skipped in update mode)
  if (isUpdate) {
    step(1, 'Update mode — skipping base template copy.');
  } else {
    step(1, 'Copying base template…');
    mkdirSync(frontendDir, { recursive: true });
    cpSync(NEXT_TEMPLATE, frontendDir, {
      recursive: true,
      filter: (src) => {
        const rel = relative(NEXT_TEMPLATE, src);
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
          const srcPath  = join(moduleDir, file.src);
          const destPath = join(frontendDir, file.dest);
          if (!existsSync(srcPath)) { warn(`[${moduleId}] source missing: ${file.src}`); continue; }
          try {
            mkdirSync(dirname(destPath), { recursive: true });
            cpSync(srcPath, destPath);
            copied++;
          } catch (e) {
            warn(`[${moduleId}] failed to copy ${file.src}: ${e.message}`);
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

  // 3. Token replacement (project metadata + flow routing)
  step(3, 'Replacing tokens…');
  const flowTokens = computeFlowTokens(pages, regMode);
  const tokens = {
    '{{PROJECT_NAME}}': name,
    '{{CAPE_ID}}':      capeId,
    '{{MARKET}}':       market,
    '{{GTM_ID}}':       gtmId || 'GTM-XXXXXXX',
    ...flowTokens,
  };
  const replacedCount = tokenReplaceDir(frontendDir, tokens);
  ok(`${replacedCount} file(s) updated`);

  // Log the flow so the developer can see it
  const flowSequence = pages.map(p => PAGE_ROUTES[p] ?? p);
  ok(`Flow: ${flowSequence.join(' → ')}`);

  // 3b. Generate pages from page builder (overwrites static template pages)
  if (Object.keys(pageElementSelections).length > 0) {
    step('3b', 'Generating pages from page builder…');
    const flowTokens = computeFlowTokens(pages, regMode);

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

    // Always generate gameplay from page builder (no element choices, just route tokens)
    if (pages.includes('game') && !pageElementSelections['gameplay']) {
      try {
        const code = buildPage('gameplay', [], { nextRoute: nextRoute('game') });
        const dir  = join(PAGE_DIR, 'gameplay');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'page.tsx'), code, 'utf8');
        generated++;
      } catch (e) {
        warn(`[page-builder] gameplay: ${e.message}`);
      }
    }

    ok(`${generated} page(s) generated`);
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
    const lines = gameEnvLines(selectedGame);
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
  const _flowTokens       = computeFlowTokens(pages, regMode);
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
    // Engine & game
    game:         game || undefined,
    selectedGame: selectedGame ? { id: selectedGame.id ?? selectedGame.name, name: selectedGame.name, description: selectedGame.description } : undefined,
    // Flow
    regMode:      regMode !== 'none' ? regMode : undefined,
    pages,
    flow:         _flowTokens,
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

  // Done
  console.log('');
  const _nextFinalFrontendDir = _displayDir ? join(_displayDir, 'frontend') : frontendDir;
  printPostScaffoldMessage({ projectName: name, capeId, market, modules: _optionalModules, outputDir: _nextFinalFrontendDir, stack: 'next' });
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
    let hint = '';
    try {
      const d = JSON.parse(readFileSync(lockPath, 'utf8'));
      hint = `\n  (PID ${d.pid}, started ${d.startedAt})`;
    } catch { /* ignore parse errors */ }
    throw new Error(
      `A scaffold run is already in progress for:\n  ${outputDir}${hint}\n\n` +
      `If the previous run crashed, delete the stale lock and retry:\n  del "${lockPath}"`,
    );
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
  const content = readFileSync(srcPath, 'utf8');
  writeFileSync(envPath, content, 'utf8');
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
          chk('[r3f] Run: `npm install three @react-three/fiber @react-three/drei`');
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
          chk('[voucher] Run: `npm install next-qrcode`');
          chk('[voucher] Uncomment QR code in `components/_modules/Voucher/QRCode.tsx`');
          chk('[voucher] Test: QR code renders and encodes the correct voucher URL');
          break;
        case 'audio':
          chk('[audio] Run: `npm install howler @types/howler`');
          chk('[audio] Uncomment Howler import in `components/_modules/AudioPlayer/AudioPlayer.tsx`');
          chk('[audio] Test: audio plays / pauses and respects browser autoplay policy');
          break;
        case 'cookie-consent':
          chk('[cookie-consent] Set `NEXT_PUBLIC_COOKIEBOT_CBID` in `.env`');
          chk('[cookie-consent] Mount `<CookieConsent />` in `app/layout.tsx`');
          chk('[cookie-consent] Test: banner appears on first visit and consent is stored');
          break;
        case 'design-tokens':
          chk('[design-tokens] Mount `<DesignTokenInjector capeData={capeData} />` in `app/providers.tsx`');
          chk('[design-tokens] Test: CAPE brand colours appear as CSS custom properties on `:root`');
          break;
        case 'gtm':
          chk(`[gtm] Verify GTM ID is set: \`${cfg.gtmId || 'GTM-XXXXXXX'}\``);
          chk('[gtm] Test: GTM container fires on page load (check Network tab)');
          chk('[gtm] Test: dataLayer events fire on key interactions');
          break;
        case 'video':
          chk('[video] Set video source URL in the video page component');
          chk('[video] Test: video plays and auto-advances to the next page');
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
  chk(`Set \`NEXT_PUBLIC_CAPE_DEFAULT_ID\` = \`${cfg.capeId}\``);
  chk(`Set \`NEXT_PUBLIC_CAPE_DEFAULT_MARKET\` = \`${cfg.market}\``);
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
    ok(`\`GTM_ID\` = \`${cfg.gtmId}\``);
    br();
  } else if (cfg.modules?.includes('gtm')) {
    h3('GTM');
    chk('Set `GTM_ID` in `.env`');
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
  note('**Never automate CAPE writes.** Pull manually from `lwg-cli-cape`.');
  br();
  chk(`Verify campaign \`${cfg.capeId}\` is published to **acceptance** before testing`);
  chk('Run `node cli.js fetch ' + cfg.capeId + '` from `lwg-cli-cape` to inspect campaign data');
  chk('Confirm CAPE design tokens / copy match the campaign brief');
  chk('**NEVER run** `node cli.js push / patch / publish` — modifies ALL live campaigns');
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

  console.log(`  ${c.bold('Wat wil je updaten?')}`);
  console.log(`    ${c.dim('1)')} Pagina toevoegen   ${c.dim('← voeg ontbrekende pagina\'s toe')}`);
  console.log(`    ${c.dim('2)')} Module toevoegen   ${c.dim('← installeer extra modules')}`);
  console.log(`    ${c.dim('3)')} Settings aanpassen ${c.dim('← Iframe/CSP of GTM ID wijzigen')}`);
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
    console.log(`  ${c.bold('Selecteer NIEUWE pagina\'s')} ${c.dim('(comma-separated numbers):')}`);
    console.log(`  ${c.dim('Al aanwezig:')} ${alreadyPages.map(p => c.dim(p)).join(', ') || c.dim('(none)')}`);
    console.log('');
    available.forEach((p, i) => {
      const route = pageRoutes[p];
      console.log(`    ${c.dim(`${i + 1})`)} ${p}${route ? c.dim(` (${route})`) : ''}`);
    });

    const v = (await ask(`  ${c.cyan('Kies pagina\'s')}: `)).trim();
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
    console.log(`  ${c.green('✔')} Genereer alleen ontbrekende files voor: ${newPages.map(p => c.cyan(p)).join(', ')}`);

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
    const OPTIONAL = ['leaderboard', 'registration', 'scoring', 'audio', 'design-tokens', 'cookie-consent', 'gtm'];
    const available  = OPTIONAL.filter(m => !alreadyModules.includes(m));

    if (available.length === 0) {
      console.log(`\n  ${c.yellow('All modules are already included.')}`);
      rl.close(); return null;
    }

    // Smart defaults: which available modules are suggested based on existing pages
    const smartSuggested = autoModulesForPages(existing.pages ?? [], existing.game ?? '').filter(m => available.includes(m));

    console.log('');
    console.log(`  ${c.bold('Selecteer NIEUWE modules')} ${c.dim('(comma-separated numbers):')}`);
    if (alreadyModules.length > 0) {
      console.log(`  ${c.dim('Al aanwezig:')} ${alreadyModules.map(m => c.dim(m)).join(', ')}`);
    }
    if (smartSuggested.length > 0) {
      console.log(`  ${c.dim(`Smart defaults: ${smartSuggested.join(', ')} — gebaseerd op huidige pagina's`)}`);
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
    console.log(`  ${c.green('✔')} Update package.json & config voor: ${newModules.map(m => c.cyan(m)).join(', ')}`);

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
    console.log(`  ${c.bold('Settings aanpassen')}`);
    console.log(`  ${c.dim('Huidige waarden:')}`);
    console.log(`    GTM ID:  ${existing.gtmId ? c.cyan(existing.gtmId) : c.dim('(not set)')}`);
    console.log(`    Iframe:  ${existing.iframe ? c.yellow('enabled') : c.dim('disabled (standalone)')}`);
    console.log('');

    const gtmNew    = (await ask(`  ${c.cyan('GTM ID')} ${c.dim(`(huidig: ${existing.gtmId || 'none'} — leeglaten om te bewaren)`)}: `)).trim();
    const iframeRaw = (await ask(`  ${c.cyan('Embedded in iframe?')} ${c.dim(`(huidig: ${existing.iframe ? 'yes' : 'no'}) [y/N]`)}: `)).trim().toLowerCase();

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
    await scaffold(options);
    return;
  }

  // ── Normal (create) mode ─────────────────────────────────────────────────────
  // Validate CLI flags early — before any wizard prompts — so non-interactive
  // runs (CI) fail fast with a clear message rather than mid-scaffold.
  validateArgs(args);

  const isNonInteractive = Boolean(args.name && args.capeId);
  let options;
  if (isNonInteractive) {
    const stack = args.stack || 'next';
    const allModules = stack === 'tanstack' ? [] : resolveModules(args.game || '', args.pages, args.modules);
    options = {
      stack,
      name:      args.name,
      capeId:    args.capeId,
      market:    args.market,
      game:      args.game || 'unity',
      pages:     args.pages.length > 0 ? args.pages : buildDefaultPages(args.game || ''),
      regMode:   args.regMode || 'none',
      modules:   allModules,
      gtmId:     args.gtmId || '',
      iframe:    args.iframe || false,
      outputDir: args.output ? resolve(args.output) : resolve(SCAFFOLDER_ROOT, '..', args.name),
    };
  } else {
    options = await runWizard(args);
  }

  await scaffold(options);
}

main().catch((err) => {
  console.error(`\n  ${c.red('Error:')} ${err.message}\n`);
  process.exit(1);
});
