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
import { existsSync, mkdirSync, cpSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { printPostScaffoldMessage } from './post-scaffold-message.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const SCAFFOLDER_ROOT = resolve(__dirname, '..');
const BASE_TEMPLATE   = join(SCAFFOLDER_ROOT, 'base-template');
const MODULES_DIR     = join(SCAFFOLDER_ROOT, 'modules');

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

const PAGE_ROUTES = {
  landing:     '/',
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

function loadManifest(moduleId) {
  if (_manifestCache[moduleId]) return _manifestCache[moduleId];
  const p = join(MODULES_DIR, moduleId, 'manifest.json');
  if (!existsSync(p)) throw new Error(`Manifest not found: ${p}`);
  _manifestCache[moduleId] = JSON.parse(readFileSync(p, 'utf8'));
  return _manifestCache[moduleId];
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
    else if (key === 'reg-mode') args.regMode  = val;  // gate | after | none
    else if (key === 'gtm-id')   args.gtmId    = val;
    else if (key === 'output')   args.output   = val;
    else if (key === 'iframe')   args.iframe   = true;
    else if (key === 'yes' || key === 'y') args.yes = true;
  }
  return args;
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
async function runWizard(pre) {
  const rl  = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  console.log('');
  console.log(c.bold('  ┌──────────────────────────────────────────────┐'));
  console.log(c.bold('  │   Livewall Campaign Scaffolder               │'));
  console.log(c.bold('  └──────────────────────────────────────────────┘'));
  console.log('');

  // 1. Project name
  let name = pre.name;
  if (!name) name = (await ask(`  ${c.cyan('Project name')} ${c.dim('(e.g. hema-handdoek-2025)')}: `)).trim();
  if (!name) { rl.close(); throw new Error('Project name is required.'); }

  // 2. CAPE ID
  let capeId = pre.capeId;
  if (!capeId) capeId = (await ask(`  ${c.cyan('CAPE campaign ID')} ${c.dim('(numeric)')}: `)).trim();
  if (!capeId) { rl.close(); throw new Error('CAPE ID is required.'); }

  // 3. Market
  let market = pre.market || 'NL';
  if (!pre.market) {
    const v = (await ask(`  ${c.cyan('Market')} ${c.dim(`(default: ${market})`)}: `)).trim();
    if (v) market = v.toUpperCase();
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
    // Auto-suggest modules based on pages
    const suggested = autoModulesForPages(pages);
    console.log('');
    console.log(`  ${c.bold('Modules')} ${c.dim('(comma-separated numbers):')}`);
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
  const flowTokens = computeFlowTokens(pages, regMode);
  console.log('');
  console.log(c.bold('  ──────────────────────────────────────────────'));
  console.log(`  ${c.bold('Project:')}  ${c.cyan(name)}`);
  console.log(`  ${c.bold('CAPE ID:')}  ${c.cyan(capeId)}  ${c.dim(`(market: ${market})`)}`);
  console.log(`  ${c.bold('Engine:')}   ${game ? c.cyan(game) : c.dim('none')}`);
  console.log(`  ${c.bold('Pages:')}    ${pages.map(p => c.cyan(p)).join(' → ')}`);
  if (pages.includes('register')) console.log(`  ${c.bold('Reg mode:')} ${c.cyan(regMode)}`);
  console.log(`  ${c.bold('Modules:')} ${allModules.filter(id => !GAME_ENGINES.includes(id)).join(', ') || c.dim('none')}`);
  if (gtmId) console.log(`  ${c.bold('GTM:')}      ${c.cyan(gtmId)}`);
  if (iframe) console.log(`  ${c.yellow('Iframe:    embedded mode enabled')}`);
  console.log(`  ${c.bold('Flow:')}     ${flowTokens['{{FLOW_ENTRY}}']}`);
  console.log(`  ${c.bold('Output:')}  ${c.dim(outputDir)}`);
  console.log(c.bold('  ──────────────────────────────────────────────'));

  if (!pre.yes) {
    const confirm = await new Promise((res) => {
      const rl2 = createInterface({ input: process.stdin, output: process.stdout });
      rl2.question(`\n  Proceed? ${c.dim('[Y/n]')}: `, (a) => { rl2.close(); res(a); });
    });
    if (confirm.trim().toLowerCase() === 'n') { console.log('\n  Aborted.\n'); process.exit(0); }
  }

  return { name, capeId, market, game, pages, regMode, modules: allModules, gtmId, iframe, outputDir };
}

function buildDefaultPages(game) {
  const pages = ['landing', 'onboarding'];
  if (game && game !== 'video') pages.push('game', 'result');
  if (game === 'video') pages.push('video');
  return pages;
}

function autoModulesForPages(pages) {
  const mods = [];
  if (pages.includes('register'))    mods.push('registration');
  if (pages.includes('leaderboard')) mods.push('leaderboard');
  if (pages.includes('voucher'))     mods.push('voucher');
  if (pages.includes('video'))       mods.push('video');
  return mods;
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
async function scaffold({ name, capeId, market, game, pages, regMode, modules, gtmId, iframe, outputDir }) {
  const step = (n, msg) => console.log(`\n  ${c.cyan(`[${n}]`)} ${c.bold(msg)}`);
  const ok   = (msg)    => console.log(`      ${c.green('✔')} ${msg}`);
  const warn = (msg)    => console.log(`      ${c.yellow('⚠')} ${msg}`);

  // 1. Copy base template
  step(1, 'Copying base template…');
  if (existsSync(outputDir)) {
    throw new Error(`Output directory already exists: ${outputDir}\nDelete it or choose a different name.`);
  }
  mkdirSync(outputDir, { recursive: true });
  cpSync(BASE_TEMPLATE, outputDir, {
    recursive: true,
    filter: (src) => {
      const rel = relative(BASE_TEMPLATE, src);
      return !rel.startsWith('node_modules') && !rel.startsWith('.next');
    },
  });
  ok(`Base template → ${c.dim(outputDir)}`);

  // 2. Copy module files
  if (modules.length > 0) {
    step(2, 'Copying module files…');
    for (const moduleId of modules) {
      try {
        const manifest  = loadManifest(moduleId);
        const moduleDir = join(MODULES_DIR, moduleId);
        let copied = 0;
        for (const file of manifest.files ?? []) {
          const srcPath  = join(moduleDir, file.src);
          const destPath = join(outputDir, file.dest);
          if (!existsSync(srcPath)) { warn(`[${moduleId}] source missing: ${file.src}`); continue; }
          mkdirSync(dirname(destPath), { recursive: true });
          cpSync(srcPath, destPath);
          copied++;
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
  const replacedCount = tokenReplaceDir(outputDir, tokens);
  ok(`${replacedCount} file(s) updated`);

  // Log the flow so the developer can see it
  const flowSequence = pages.map(p => PAGE_ROUTES[p] ?? p);
  ok(`Flow: ${flowSequence.join(' → ')}`);

  // 4. Append env vars
  const allEnvVars = collectEnvVars(modules);
  if (allEnvVars.length > 0) {
    step(4, 'Appending env vars to .env.example…');
    appendEnvVars(outputDir, allEnvVars);
    ok(`${allEnvVars.length} var(s) appended`);
  } else {
    step(4, 'No extra env vars.');
  }

  // 5. Patch CSP
  const allCspPatches = collectCspPatches(modules);
  if (allCspPatches.length > 0) {
    step(5, 'Patching CSP in middleware.ts…');
    const patched = patchMiddlewareCsp(outputDir, allCspPatches);
    if (patched) ok('middleware.ts updated');
    else warn('CSP auto-patch failed — check middleware.ts manually');
  } else {
    step(5, 'No CSP patches needed.');
  }

  // 6. Iframe mode — relax frame-ancestors
  if (iframe) {
    step(6, 'Enabling iframe / embedded mode…');
    patchIframeMode(outputDir);
    ok("frame-ancestors set to '*'");
  } else {
    step(6, 'Standalone mode (frame-ancestors: none).');
  }

  // 7. Install packages
  const { prod, dev } = collectPackages(modules);
  if (prod.length > 0 || dev.length > 0) {
    step(7, 'Installing module packages…');
    if (prod.length > 0) {
      console.log(`      ${c.dim('npm install ' + prod.join(' '))}`);
      try { execSync(`npm install ${prod.join(' ')}`, { cwd: outputDir, stdio: 'inherit' }); ok(`prod: ${prod.join(', ')}`); }
      catch { warn(`run manually: npm install ${prod.join(' ')}`); }
    }
    if (dev.length > 0) {
      console.log(`      ${c.dim('npm install --save-dev ' + dev.join(' '))}`);
      try { execSync(`npm install --save-dev ${dev.join(' ')}`, { cwd: outputDir, stdio: 'inherit' }); ok(`dev: ${dev.join(', ')}`); }
      catch { warn(`run manually: npm install --save-dev ${dev.join(' ')}`); }
    }
  } else {
    step(7, 'No extra packages to install.');
  }

  // Done
  const selectedOptional = modules.filter(id => !GAME_ENGINES.includes(id));
  console.log('');
  printPostScaffoldMessage({ projectName: name, capeId, market, modules: selectedOptional, outputDir });
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
      if (!TEXT_EXT.has(ext) && !entry.startsWith('.env')) continue;
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
  const p = join(outputDir, '.env.example');
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

// ─── CSP patching ─────────────────────────────────────────────────────────────
function collectCspPatches(moduleIds) {
  const patches = [];
  for (const id of moduleIds) {
    const m = (() => { try { return loadManifest(id); } catch { return null; } })();
    if (m?.cspPatch && Object.keys(m.cspPatch).length > 0) patches.push({ moduleId: id, cspPatch: m.cspPatch });
  }
  return patches;
}

function patchMiddlewareCsp(outputDir, patches) {
  const p = join(outputDir, 'middleware.ts');
  if (!existsSync(p)) return false;
  let src = readFileSync(p, 'utf8');
  let changed = false;
  for (const { cspPatch } of patches) {
    for (const [directive, values] of Object.entries(cspPatch)) {
      const targets = directive === 'extras' ? values.map(v => ['script-src', v]) : values.map(v => [directive, v]);
      for (const [dir, val] of targets) {
        if (!src.includes(val)) { src = appendToCspDirective(src, dir, val); changed = true; }
      }
    }
  }
  if (changed) { writeFileSync(p, src, 'utf8'); return true; }
  return false;
}

function appendToCspDirective(src, directive, value) {
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('`' + directive + ' ') || line.includes('`' + directive + "'")) {
      const lastTick = line.lastIndexOf('`');
      if (lastTick > 0) { lines[i] = line.slice(0, lastTick) + ' ' + value + line.slice(lastTick); return lines.join('\n'); }
    }
  }
  // Fallback: new directive before anchor comment
  const anchorIdx = lines.findIndex(l => l.includes('// lw-scaffold:csp'));
  if (anchorIdx !== -1) { lines.splice(anchorIdx, 0, `    \`${directive} ${value}\`,`); return lines.join('\n'); }
  return src;
}

// ─── Iframe mode ──────────────────────────────────────────────────────────────
function patchIframeMode(outputDir) {
  const p = join(outputDir, 'middleware.ts');
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

// ─── Entry point ──────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv);
  const isNonInteractive = Boolean(args.name && args.capeId);

  let options;
  if (isNonInteractive) {
    const allModules = resolveModules(args.game || '', args.pages, args.modules);
    options = {
      name:      args.name,
      capeId:    args.capeId,
      market:    args.market,
      game:      args.game || '',
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
