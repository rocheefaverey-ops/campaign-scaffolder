#!/usr/bin/env node

/**
 * cli/wizard.js
 *
 * Boots the local web wizard:
 *   1. Spawns the Fastify wizard server on :3737
 *   2. In dev mode, also spawns Vite (HMR) on :5173 — opens the browser there.
 *      In prod mode (UI built to dist/), opens the Fastify-served URL on :3737.
 *
 * Exits cleanly when either child dies. Ctrl-C kills both.
 */

import { spawn }      from 'child_process';
import { existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { platform }   from 'os';

const __filename       = fileURLToPath(import.meta.url);
const __dirname        = dirname(__filename);
const SCAFFOLDER_ROOT  = resolve(__dirname, '..');
const SERVER_DIR       = join(SCAFFOLDER_ROOT, 'cli', 'wizard-server');
const UI_DIR           = join(SCAFFOLDER_ROOT, 'cli', 'wizard-ui');
const UI_DIST          = join(UI_DIR, 'dist');

const PROD = process.argv.includes('--prod') || existsSync(UI_DIST);

const SERVER_PORT = 3737;
const UI_PORT     = 5173;
const OPEN_URL    = `http://localhost:${PROD ? SERVER_PORT : UI_PORT}`;

// ── Pre-flight: confirm deps are installed ──────────────────────────────────
if (!existsSync(join(SERVER_DIR, 'node_modules'))) {
  console.error('\n  [wizard] cli/wizard-server/node_modules missing.');
  console.error('  Run:  cd cli/wizard-server && npm install\n');
  process.exit(1);
}
if (!PROD && !existsSync(join(UI_DIR, 'node_modules'))) {
  console.error('\n  [wizard] cli/wizard-ui/node_modules missing.');
  console.error('  Run:  cd cli/wizard-ui && npm install\n');
  process.exit(1);
}

const isWindows = platform() === 'win32';
const npmCmd    = isWindows ? 'npm.cmd' : 'npm';

// ── Spawn the API server ────────────────────────────────────────────────────
const server = spawn(process.execPath, ['server.js'], {
  cwd:   SERVER_DIR,
  stdio: 'inherit',
  env:   { ...process.env, WIZARD_PORT: String(SERVER_PORT) },
});

// ── Spawn the Vite UI in dev mode ───────────────────────────────────────────
// shell: true is required on Windows — Node 20+ refuses to spawn .cmd / .bat
// files directly (CVE-2024-27980). Harmless on macOS/Linux.
const ui = PROD ? null : spawn(npmCmd, ['run', 'dev', '--', '--port', String(UI_PORT), '--strictPort'], {
  cwd:   UI_DIR,
  stdio: 'inherit',
  shell: isWindows,
});

// ── Open browser once both are warm. We don't have a strict ready signal
//    here yet — a 1.5s delay is enough for Vite + Fastify cold start on dev
//    machines. Good enough for v1; a /ready endpoint poll is a follow-up.
setTimeout(() => { openBrowser(OPEN_URL); }, 1500);

// ── Lifecycle: if either child exits, take the other one down too.
function shutdown(code = 0) {
  for (const child of [server, ui]) {
    if (child && !child.killed) try { child.kill(); } catch { /* ignore */ }
  }
  process.exit(code);
}
server.on('exit', (c) => shutdown(c ?? 0));
if (ui) ui.on('exit',     (c) => shutdown(c ?? 0));
process.on('SIGINT',  () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// ── Cross-platform "open URL in default browser" ────────────────────────────
function openBrowser(url) {
  const p = platform();
  const cmd =
    p === 'darwin' ? 'open' :
    p === 'win32'  ? 'cmd'  :
    'xdg-open';
  const args = p === 'win32' ? ['/c', 'start', '""', url] : [url];
  try {
    // shell: true on Windows — same Node 20+ .cmd/.bat restriction.
    spawn(cmd, args, { stdio: 'ignore', detached: true, shell: p === 'win32' }).unref();
  } catch (err) {
    console.log(`[wizard] could not open browser automatically. Visit ${url}`);
    console.log(`[wizard]   ${err.message}`);
  }
}
