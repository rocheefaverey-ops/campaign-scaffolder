#!/usr/bin/env node

/**
 * cli/scaffold.js
 *
 * Livewall Campaign Scaffolder — Step 3 CLI wizard.
 *
 * Usage (interactive):
 *   node cli/scaffold.js
 *
 * Usage (non-interactive):
 *   node cli/scaffold.js \
 *     --name=hema-handdoek-2025 \
 *     --cape-id=54031 \
 *     --market=NL \
 *     --game=unity \
 *     --module=leaderboard \
 *     --module=registration \
 *     --output=/c/Dev/Livewall/hema-handdoek-2025
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

// ─── Available modules ────────────────────────────────────────────────────────
const GAME_ENGINES = ['unity', 'r3f'];

const OPTIONAL_MODULES = [
  'leaderboard',
  'registration',
  'scoring',
  'voucher',
  'audio',
  'design-tokens',
  'cookie-consent',
];

// modules that game engine selection automatically implies
const ENGINE_IMPLIES = {
  unity: [],
  r3f:   [],
};

// modules that imply other modules (dependency chain)
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
  for (const id of [...GAME_ENGINES, ...OPTIONAL_MODULES]) {
    try { all[id] = loadManifest(id); } catch { /* skip missing */ }
  }
  return all;
}

// ─── Arg parsing ─────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { modules: [], market: 'NL' };
  for (const raw of argv.slice(2)) {
    const [key, ...rest] = raw.replace(/^--/, '').split('=');
    const val = rest.join('=');
    if (key === 'module') args.modules.push(val);
    else if (key === 'name')    args.name    = val;
    else if (key === 'cape-id') args.capeId  = val;
    else if (key === 'market')  args.market  = val;
    else if (key === 'game')    args.game    = val;
    else if (key === 'output')  args.output  = val;
    else if (key === 'yes' || key === 'y') args.yes = true;
  }
  return args;
}

// ─── Interactive wizard ───────────────────────────────────────────────────────
async function runWizard(preArgs) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  console.log('');
  console.log(c.bold('  ┌─────────────────────────────────────────────┐'));
  console.log(c.bold('  │   Livewall Campaign Scaffolder               │'));
  console.log(c.bold('  └─────────────────────────────────────────────┘'));
  console.log('');

  // ── Project name
  let name = preArgs.name;
  if (!name) {
    name = (await ask(`  ${c.cyan('Project name')} ${c.dim('(e.g. hema-handdoek-2025)')}: `)).trim();
  }
  if (!name) { rl.close(); throw new Error('Project name is required.'); }

  // ── CAPE ID
  let capeId = preArgs.capeId;
  if (!capeId) {
    capeId = (await ask(`  ${c.cyan('CAPE campaign ID')} ${c.dim('(numeric, from CAPE dashboard)')}: `)).trim();
  }
  if (!capeId) { rl.close(); throw new Error('CAPE campaign ID is required.'); }

  // ── Market
  let market = preArgs.market || 'NL';
  if (!preArgs.market) {
    const marketInput = (await ask(`  ${c.cyan('Market code')} ${c.dim(`(NL/BE/FR/DE… default: ${market})`)}: `)).trim();
    if (marketInput) market = marketInput.toUpperCase();
  }

  // ── Game engine
  let game = preArgs.game ?? null;
  if (game === null) {
    console.log('');
    console.log(`  ${c.bold('Game engine:')}`);
    console.log(`    ${c.dim('0)')} None`);
    console.log(`    ${c.dim('1)')} Unity WebGL`);
    console.log(`    ${c.dim('2)')} React Three Fiber (R3F)`);
    const engineInput = (await ask(`  ${c.cyan('Select')} ${c.dim('[0-2, default: 0]')}: `)).trim();
    if (engineInput === '1') game = 'unity';
    else if (engineInput === '2') game = 'r3f';
    else game = '';
  }

  // ── Optional modules
  let modules = preArgs.modules.length > 0 ? preArgs.modules : null;
  if (modules === null) {
    console.log('');
    console.log(`  ${c.bold('Optional modules')} ${c.dim('(comma-separated numbers, or press Enter to skip):')}`);
    OPTIONAL_MODULES.forEach((id, i) => {
      const m = (() => { try { return loadManifest(id); } catch { return null; } })();
      const desc = m ? c.dim(` — ${m.description.split('.')[0]}`) : '';
      console.log(`    ${c.dim(`${i + 1})`)} ${id}${desc}`);
    });
    const modInput = (await ask(`  ${c.cyan('Select')}: `)).trim();
    if (modInput) {
      modules = modInput.split(',')
        .map((s) => {
          const n = parseInt(s.trim(), 10);
          if (!isNaN(n) && n >= 1 && n <= OPTIONAL_MODULES.length) return OPTIONAL_MODULES[n - 1];
          const byName = OPTIONAL_MODULES.find((id) => id === s.trim());
          return byName || null;
        })
        .filter(Boolean);
    } else {
      modules = [];
    }
  }

  // ── Output directory
  let outputDir = preArgs.output;
  if (!outputDir) {
    const defaultOut = resolve(SCAFFOLDER_ROOT, '..', name);
    outputDir = (await ask(`  ${c.cyan('Output directory')} ${c.dim(`(default: ${defaultOut})`)}: `)).trim();
    if (!outputDir) outputDir = defaultOut;
  }
  outputDir = resolve(outputDir);

  rl.close();

  // ── Confirm
  const allModules = resolveImplied([...(game ? [game] : []), ...modules]);
  console.log('');
  console.log(c.bold('  ─────────────────────────────────────────────'));
  console.log(`  ${c.bold('Project:')} ${c.cyan(name)}`);
  console.log(`  ${c.bold('CAPE ID:')} ${c.cyan(capeId)}  ${c.dim(`(market: ${market})`)}`);
  console.log(`  ${c.bold('Game:')}    ${game ? c.cyan(game) : c.dim('none')}`);
  console.log(`  ${c.bold('Modules:')} ${allModules.filter(id => !GAME_ENGINES.includes(id)).join(', ') || c.dim('none')}`);
  console.log(`  ${c.bold('Output:')}  ${c.dim(outputDir)}`);
  console.log(c.bold('  ─────────────────────────────────────────────'));

  if (!preArgs.yes) {
    const confirm = (await new Promise((res) => {
      const rl2 = createInterface({ input: process.stdin, output: process.stdout });
      rl2.question(`\n  Proceed? ${c.dim('[Y/n]')}: `, (a) => { rl2.close(); res(a); });
    })).trim().toLowerCase();
    if (confirm === 'n' || confirm === 'no') {
      console.log('\n  Aborted.\n');
      process.exit(0);
    }
  }

  return { name, capeId, market, game, modules: allModules, outputDir };
}

// ─── Core scaffolding engine ──────────────────────────────────────────────────

async function scaffold({ name, capeId, market, game, modules, outputDir }) {
  const step = (n, msg) => console.log(`\n  ${c.cyan(`[${n}]`)} ${c.bold(msg)}`);
  const ok   = (msg)    => console.log(`      ${c.green('✔')} ${msg}`);
  const warn = (msg)    => console.log(`      ${c.yellow('⚠')} ${msg}`);
  const fail = (msg)    => console.log(`      ${c.red('✘')} ${msg}`);

  // 1. Copy base template
  step(1, 'Copying base template…');
  if (existsSync(outputDir)) {
    throw new Error(`Output directory already exists: ${outputDir}\nDelete it first or choose a different name.`);
  }
  mkdirSync(outputDir, { recursive: true });
  cpSync(BASE_TEMPLATE, outputDir, {
    recursive: true,
    filter: (src) => {
      // Skip node_modules and .next if somehow present
      const rel = relative(BASE_TEMPLATE, src);
      return !rel.startsWith('node_modules') && !rel.startsWith('.next');
    },
  });
  ok(`Base template → ${c.dim(outputDir)}`);

  // 2. Copy module files
  const allModuleIds = resolveImplied(modules);
  const selectedOptional = allModuleIds.filter((id) => !GAME_ENGINES.includes(id));

  if (allModuleIds.length > 0) {
    step(2, 'Copying module files…');
    for (const moduleId of allModuleIds) {
      try {
        const manifest = loadManifest(moduleId);
        const moduleDir = join(MODULES_DIR, moduleId);
        let copied = 0;
        for (const file of manifest.files ?? []) {
          const srcPath  = join(moduleDir, file.src);
          const destPath = join(outputDir, file.dest);
          if (!existsSync(srcPath)) {
            warn(`[${moduleId}] source missing: ${file.src}`);
            continue;
          }
          mkdirSync(dirname(destPath), { recursive: true });
          cpSync(srcPath, destPath);
          copied++;
        }
        ok(`[${moduleId}] ${copied} file(s) copied`);
      } catch (e) {
        fail(`[${moduleId}] ${e.message}`);
      }
    }
  } else {
    step(2, 'No modules selected — skipping.');
  }

  // 3. Token replacement
  step(3, 'Replacing template tokens…');
  const tokens = {
    '{{PROJECT_NAME}}': name,
    '{{CAPE_ID}}':      capeId,
    '{{MARKET}}':       market,
  };
  const replacedCount = tokenReplaceDir(outputDir, tokens);
  ok(`${replacedCount} file(s) updated`);

  // 4. Append env vars to .env.example
  const allEnvVars = collectEnvVars(allModuleIds);
  if (allEnvVars.length > 0) {
    step(4, 'Appending module env vars to .env.example…');
    appendEnvVars(outputDir, allEnvVars);
    ok(`${allEnvVars.length} var(s) appended`);
  } else {
    step(4, 'No extra env vars to append.');
  }

  // 5. Patch CSP in middleware.ts
  const allCspPatches = collectCspPatches(allModuleIds);
  if (allCspPatches.length > 0) {
    step(5, 'Patching CSP in middleware.ts…');
    const patched = patchMiddlewareCsp(outputDir, allCspPatches);
    if (patched) ok('middleware.ts CSP updated');
    else warn('Could not auto-patch CSP — see TODO comment in middleware.ts');
  } else {
    step(5, 'No CSP patches needed.');
  }

  // 6. Install packages
  const { prod, dev } = collectPackages(allModuleIds);
  if (prod.length > 0 || dev.length > 0) {
    step(6, 'Installing module packages…');
    if (prod.length > 0) {
      console.log(`      ${c.dim('npm install ' + prod.join(' '))}`);
      try {
        execSync(`npm install ${prod.join(' ')}`, { cwd: outputDir, stdio: 'inherit' });
        ok(`prod: ${prod.join(', ')}`);
      } catch {
        warn(`npm install failed — run manually: npm install ${prod.join(' ')}`);
      }
    }
    if (dev.length > 0) {
      console.log(`      ${c.dim('npm install --save-dev ' + dev.join(' '))}`);
      try {
        execSync(`npm install --save-dev ${dev.join(' ')}`, { cwd: outputDir, stdio: 'inherit' });
        ok(`dev: ${dev.join(', ')}`);
      } catch {
        warn(`npm install --save-dev failed — run manually: npm install --save-dev ${dev.join(' ')}`);
      }
    }
  } else {
    step(6, 'No extra packages to install.');
  }

  // 7. Done — print post-scaffold message
  console.log('');
  printPostScaffoldMessage({
    projectName: name,
    capeId,
    market,
    modules: selectedOptional,
    outputDir,
  });
}

// ─── Token replacement ────────────────────────────────────────────────────────
const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.env', '.example',
  '.css', '.html', '.txt', '.yaml', '.yml',
]);

function tokenReplaceDir(dir, tokens) {
  let count = 0;
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      if (entry === 'node_modules' || entry === '.next') continue;
      const full = join(d, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else {
        const ext = entry.includes('.') ? '.' + entry.split('.').pop() : '';
        if (TEXT_EXTENSIONS.has(ext) || entry.startsWith('.env')) {
          let content = readFileSync(full, 'utf8');
          let modified = false;
          for (const [from, to] of Object.entries(tokens)) {
            if (content.includes(from)) {
              content = content.replaceAll(from, to);
              modified = true;
            }
          }
          if (modified) {
            writeFileSync(full, content, 'utf8');
            count++;
          }
        }
      }
    }
  };
  walk(dir);
  return count;
}

// ─── Env var append ───────────────────────────────────────────────────────────
function collectEnvVars(moduleIds) {
  const seen = new Set();
  const vars = [];
  for (const id of moduleIds) {
    const m = (() => { try { return loadManifest(id); } catch { return null; } })();
    for (const v of m?.envVars ?? []) {
      if (!seen.has(v)) { seen.add(v); vars.push({ moduleId: id, varName: v }); }
    }
  }
  return vars;
}

function appendEnvVars(outputDir, envVars) {
  const envExamplePath = join(outputDir, '.env.example');
  if (!existsSync(envExamplePath)) return;

  const existing = readFileSync(envExamplePath, 'utf8');
  const lines    = [];

  // Group by module
  const byModule = {};
  for (const { moduleId, varName } of envVars) {
    if (!existing.includes(varName)) {
      (byModule[moduleId] ??= []).push(varName);
    }
  }

  if (Object.keys(byModule).length === 0) return;

  lines.push('');
  lines.push('# ─────────────────────────────────────────────');
  lines.push('# Added by lw-scaffold');
  lines.push('# ─────────────────────────────────────────────');
  for (const [moduleId, vars] of Object.entries(byModule)) {
    lines.push(`# Module: ${moduleId}`);
    for (const v of vars) lines.push(`${v}=`);
  }

  writeFileSync(envExamplePath, existing + lines.join('\n') + '\n', 'utf8');
}

// ─── CSP patching ─────────────────────────────────────────────────────────────
function collectCspPatches(moduleIds) {
  const patches = [];
  for (const id of moduleIds) {
    const m = (() => { try { return loadManifest(id); } catch { return null; } })();
    if (m?.cspPatch && Object.keys(m.cspPatch).length > 0) {
      patches.push({ moduleId: id, cspPatch: m.cspPatch });
    }
  }
  return patches;
}

/**
 * Patches middleware.ts CSP using the SCAFFOLD_CSP anchor comment.
 * The anchor looks like:
 *   // lw-scaffold:csp — module injections land here
 *
 * For each module patch directive, we append entries into the existing
 * CSP directive lines using targeted string substitution.
 *
 * Returns true if patched successfully, false if anchor not found.
 */
function patchMiddlewareCsp(outputDir, patches) {
  const mwPath = join(outputDir, 'middleware.ts');
  if (!existsSync(mwPath)) return false;

  let src = readFileSync(mwPath, 'utf8');
  let changed = false;

  for (const { cspPatch } of patches) {
    for (const [directive, values] of Object.entries(cspPatch)) {
      if (directive === 'extras') {
        // extras append to script-src
        for (const val of values) {
          src = appendToCspDirective(src, 'script-src', val);
          changed = true;
        }
      } else {
        for (const val of values) {
          // Skip values already present
          if (!src.includes(val)) {
            src = appendToCspDirective(src, directive, val);
            changed = true;
          }
        }
      }
    }
  }

  if (changed) {
    writeFileSync(mwPath, src, 'utf8');
    return true;
  }
  return false;
}

/**
 * Finds the line containing the `${directive} ` CSP template literal and
 * appends ` ${value}` immediately before its LAST closing backtick.
 *
 * Uses line-by-line scanning + lastIndexOf so nested template literals
 * (e.g. `script-src ... ${unityUrl ? \` ${unityUrl}\` : ''}`) are handled
 * correctly — we always target the outermost closing backtick.
 *
 * Fallback: inserts a new array entry before the lw-scaffold:csp anchor.
 * Note: CSP does NOT support duplicate directive names — the fallback only
 * works for directives not already present in the base template.
 */
function appendToCspDirective(src, directive, value) {
  const lines = src.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match lines that open a template literal starting with this directive
    if (line.includes('`' + directive + ' ') || line.includes('`' + directive + "'")) {
      const lastTick = line.lastIndexOf('`');
      if (lastTick > 0) {
        lines[i] = line.slice(0, lastTick) + ' ' + value + line.slice(lastTick);
        return lines.join('\n');
      }
    }
  }

  // Fallback: insert a new standalone directive line before the scaffold anchor.
  // Only safe for directives not already present (no duplicate directives).
  const anchor = '// lw-scaffold:csp';
  const anchorIdx = lines.findIndex((l) => l.includes(anchor));
  if (anchorIdx !== -1) {
    lines.splice(anchorIdx, 0, `    \`${directive} ${value}\`,`);
    return lines.join('\n');
  }

  return src;
}

// ─── Package collection ───────────────────────────────────────────────────────
function collectPackages(moduleIds) {
  const prod = new Set();
  const dev  = new Set();
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

  // Non-interactive if the two required fields are supplied as flags
  const isNonInteractive = Boolean(args.name && args.capeId);

  let options;
  if (isNonInteractive) {
    const allModules = resolveImplied([...(args.game ? [args.game] : []), ...args.modules]);
    options = {
      name:      args.name,
      capeId:    args.capeId,
      market:    args.market,
      game:      args.game || '',
      modules:   allModules,
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
