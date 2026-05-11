/**
 * cli/wizard-server/server.js
 *
 * Local-only HTTP server that backs the web wizard UI. Two responsibilities:
 *
 *   1. Accept a ScaffoldConfig from the browser, write it to a temp JSON file,
 *      and spawn `node cli/scaffold.js --config=<file> --yes`.
 *   2. Stream stdout/stderr lines back to the browser over Server-Sent Events
 *      so the user sees the build log in real time.
 *
 * The server intentionally does NOT call scaffold.js's internals directly —
 * spawning the existing CLI keeps a single source of truth for the build
 * pipeline and means CI/headless usage and the wizard hit the exact same
 * code path.
 */

import Fastify from 'fastify';
import cors    from '@fastify/cors';
import fstatic from '@fastify/static';
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { checkAuth, login as capeLogin, clearTokenCache } from '../cape-client.js';
import { loadGameRegistry } from '../game-registry.js';
import { KNOWN_PAGE_TYPES } from '../cape-format-builder.js';

const __filename     = fileURLToPath(import.meta.url);
const __dirname      = dirname(__filename);
const SCAFFOLDER_ROOT = resolve(__dirname, '..', '..');
const SCAFFOLD_JS    = join(SCAFFOLDER_ROOT, 'cli', 'scaffold.js');
const UI_DIST        = join(SCAFFOLDER_ROOT, 'cli', 'wizard-ui', 'dist');

const PORT = Number(process.env.WIZARD_PORT ?? 3737);

const INSTANCE_RE = /^([a-z]+)-(\d+)$/;
const INSTANCEABLE_PAGES = new Set([]);

function basePageType(pageId) {
  const m = String(pageId).match(INSTANCE_RE);
  if (!m) return pageId;
  const base = m[1];
  if (!INSTANCEABLE_PAGES.has(base)) {
    throw new Error(
      `Page "${pageId}" is not an allowed duplicate. ` +
      `Only these pages support multiple instances: ${[...INSTANCEABLE_PAGES].join(', ')}`
    );
  }
  return base;
}

function validateWizardConfig(cfg) {
  const errors = [];
  const warnings = [];
  const pages = Array.isArray(cfg.pages) ? cfg.pages : [];
  const ids = pages.map((p) => typeof p === 'string' ? p : p.id).filter(Boolean);
  const types = [];

  for (const page of pages) {
    try {
      const type = typeof page === 'string' ? basePageType(page) : page.type;
      types.push(type);
      if (!KNOWN_PAGE_TYPES.has(type)) {
        errors.push(`Unknown page type "${type}". Known types: ${[...KNOWN_PAGE_TYPES].join(', ')}.`);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  for (const id of ids) {
    const m = String(id).match(INSTANCE_RE);
    if (!m) continue;
    if (!INSTANCEABLE_PAGES.has(m[1])) {
      errors.push(`Page "${id}" is not an allowed duplicate. Only these pages support multiple instances: ${[...INSTANCEABLE_PAGES].join(', ')}.`);
    }
    if (!ids.includes(m[1])) {
      errors.push(`\`${id}\` is a duplicate instance and requires a \`${m[1]}\` page first.`);
    }
  }

  const engine = cfg.game || 'none';
  const hasGamePage = types.includes('game');
  if (engine === 'none' && hasGamePage) {
    errors.push('`game` page requires an engine. Add --engine=unity|r3f|phaser or remove the `game` page.');
  }
  if (engine !== 'none' && !hasGamePage) {
    warnings.push(`Engine "${engine}" selected but no \`game\` page is in the flow. The runtime won't render.`);
  }

  return { errors, warnings };
}

function loadModuleCatalog() {
  const modulesDir = join(SCAFFOLDER_ROOT, 'modules');
  const out = [];
  for (const name of readdirSync(modulesDir)) {
    const manifestPath = join(modulesDir, name, 'manifest.json');
    if (!existsSync(manifestPath)) continue;
    try {
      const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
      out.push({
        id:          m.id || name,
        name:        m.name || name,
        description: m.description || '',
        implies:     Array.isArray(m.implies) ? m.implies : [],
        packages:    Array.isArray(m.packages) ? m.packages : [],
        engine:      m.engine,
      });
    } catch { /* skip malformed module manifests */ }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

const MODULE_CATALOG = loadModuleCatalog();

// ─── In-memory job registry ──────────────────────────────────────────────────
// Each scaffold run gets a job id. SSE clients connect by id and receive the
// log lines that have already buffered + every new line until the child exits.

/**
 * @typedef {Object} Job
 * @property {string}                  id
 * @property {Array<{level:string,line:string,ts:number}>} buffered
 * @property {Set<import('http').ServerResponse>}          clients
 * @property {boolean}                 done
 * @property {{ok:boolean, code:number, outputDir?:string}|null} result
 */

/** @type {Map<string, Job>} */
const jobs = new Map();

function emit(job, level, line) {
  const ev = { level, line, ts: Date.now() };
  job.buffered.push(ev);
  for (const res of job.clients) {
    res.write(`event: log\ndata: ${JSON.stringify(ev)}\n\n`);
  }
}

function finish(job, result) {
  job.done   = true;
  job.result = result;
  for (const res of job.clients) {
    res.write(`event: done\ndata: ${JSON.stringify(result)}\n\n`);
    res.end();
  }
  job.clients.clear();
}

// ─── Server bootstrap ────────────────────────────────────────────────────────

// Disable ajv type coercion — by default Fastify coerces a string into a
// single-element array (and various other surprises) which would let
// malformed configs (e.g. `pages: "landing"`) sneak past the route schema.
// We want the schema to mean what it says.
const app = Fastify({
  logger: false,
  ajv: { customOptions: { coerceTypes: false, useDefaults: false } },
});
await app.register(cors, { origin: true });

// Serve the built wizard UI when present; in dev Vite serves it on :5173 and
// proxies /api + /events here, so this static handler is a no-op then.
if (existsSync(UI_DIST)) {
  await app.register(fstatic, { root: UI_DIST, prefix: '/' });
}

app.get('/api/ping', async () => ({ ok: true, scaffolder: SCAFFOLDER_ROOT }));

app.get('/api/games', async (req) => {
  const stack = req.query?.stack?.toString() ?? '';
  const games = stack
    ? loadGameRegistry().filter(g => g.stack === stack)
    : loadGameRegistry().filter(g => !!g.stack);
  return {
    games: games.map((game) => ({
      id:          game.id,
      name:        game.name,
      description: game.description ?? '',
      engine:      game.engine,
      cdn:         game.cdn,
      dpr:         game.dpr,
      boot:        game.boot,
      env:         game.env,
    })),
  };
});

app.get('/api/modules', async () => ({ modules: MODULE_CATALOG }));

// ─── Load existing project ──────────────────────────────────────────────────
// The wizard's "Open existing" flow pings this with a directory path. We
// look for a `.scaffolded` marker in either the dir itself OR a `frontend/`
// subdir (the scaffolder writes it next to the frontend folder), parse it,
// and return the raw JSON. The wizard UI then translates it into ScaffoldConfig.
// ─── Git status ─────────────────────────────────────────────────────────────
// Used by StepBuild to decide whether an in-place update or recreate of a
// loaded project is safe. We return clean / dirty / not-a-repo + the list
// of changes; the wizard blocks dangerous combinations from there.

app.post('/api/git-status', async (req, reply) => {
  const { path: rawPath } = req.body ?? {};
  if (!rawPath || typeof rawPath !== 'string') {
    return reply.code(400).send({ error: 'Missing or invalid `path` field.' });
  }
  const cwd = resolve(rawPath);
  if (!existsSync(cwd)) {
    return { ok: true, isRepo: false, exists: false, clean: true, branch: null, files: [] };
  }

  // First check: is this a git work-tree at all?
  const isRepo = await new Promise((res) => {
    const c = spawn('git', ['rev-parse', '--is-inside-work-tree'], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    c.stdout.on('data', (d) => { out += d.toString(); });
    c.on('error', () => res(false));
    c.on('exit', (code) => res(code === 0 && out.trim() === 'true'));
  });

  if (!isRepo) {
    return { ok: true, isRepo: false, exists: true, clean: true, branch: null, files: [] };
  }

  // Branch name
  const branch = await new Promise((res) => {
    const c = spawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    c.stdout.on('data', (d) => { out += d.toString(); });
    c.on('error', () => res(null));
    c.on('exit', (code) => res(code === 0 ? out.trim() : null));
  });

  // Porcelain status — one line per change, machine-readable
  const porcelain = await new Promise((res) => {
    const c = spawn('git', ['status', '--porcelain=v1'], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    c.stdout.on('data', (d) => { out += d.toString(); });
    c.on('error', () => res(''));
    c.on('exit', () => res(out));
  });

  const files = porcelain
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => ({
      status: line.slice(0, 2).trim(),
      path:   line.slice(3),
    }));

  return {
    ok:     true,
    isRepo: true,
    exists: true,
    clean:  files.length === 0,
    branch,
    files,
  };
});

app.post('/api/load-existing', async (req, reply) => {
  const { path: rawPath } = req.body ?? {};
  if (!rawPath || typeof rawPath !== 'string') {
    return reply.code(400).send({ error: 'Missing or invalid `path` field.' });
  }

  const targetDir = resolve(rawPath);
  // Map each candidate marker location to the project ROOT (i.e. the
  // outputDir that scaffold.js used). The wizard's Build step targets the
  // root for in-place update / recreate.
  const candidates = [
    { marker: join(targetDir, '.scaffolded'),               root: targetDir },
    { marker: join(targetDir, 'frontend', '.scaffolded'),   root: targetDir },           // marker accidentally inside frontend
    { marker: join(targetDir, '..', '.scaffolded'),         root: resolve(targetDir, '..') }, // user passed the frontend folder
  ];

  let chosen = null;
  for (const c of candidates) {
    if (existsSync(c.marker)) { chosen = c; break; }
  }
  if (!chosen) {
    return reply.code(404).send({
      error: `No .scaffolded marker found at:\n  ${candidates.map(c => c.marker).join('\n  ')}`,
    });
  }

  try {
    const raw = JSON.parse(readFileSync(chosen.marker, 'utf8'));
    return { ok: true, markerPath: chosen.marker, scaffolded: raw, projectDir: chosen.root };
  } catch (e) {
    return reply.code(500).send({ error: `Could not parse .scaffolded at ${chosen.marker}: ${e.message}` });
  }
});

// ─── CAPE auth ───────────────────────────────────────────────────────────────
// Reuses the same on-disk token cache as the CLI (~/.cape/tokens.json), so
// logging in here also "logs you in" for any future `node cli/scaffold.js`
// run, and vice versa.

app.get('/api/auth/status', async () => {
  try {
    const tokens = await checkAuth();
    if (!tokens?.authToken) return { authenticated: false };
    // authToken format is "userId:token" — surface the userId only, never the token.
    const userId = String(tokens.authToken).split(':')[0] || null;
    return { authenticated: true, userId };
  } catch {
    return { authenticated: false };
  }
});

app.post('/api/auth/login', async (req, reply) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return reply.code(400).send({ ok: false, error: 'Email and password are required.' });
  }
  try {
    const tokens = await capeLogin(String(email), String(password));
    const userId = String(tokens.authToken).split(':')[0] || null;
    return { ok: true, userId };
  } catch (err) {
    return reply.code(401).send({ ok: false, error: err?.message ?? 'Login failed.' });
  }
});

app.post('/api/auth/logout', async () => {
  await clearTokenCache();
  return { ok: true };
});

// JSON Schema for the wizard's ScaffoldConfig. Fastify hands this to ajv and
// returns 400 with a precise error path on any violation — so a malformed
// config can never reach the scaffolder. Domain checks that depend on
// runtime data (e.g. page type ∈ KNOWN_PAGE_TYPES) live in the handler
// below; static-shape checks live here.
const scaffoldConfigSchema = {
  type: 'object',
  required: ['name', 'pages'],
  properties: {
    name:               { type: 'string', minLength: 1, pattern: '^[a-z0-9][a-z0-9-]*[a-z0-9]$' },
    stack:              { type: 'string', enum: ['next', 'tanstack'] },
    game:               { type: 'string' },
    gameId:             { type: 'string' },
    createCape:         { type: 'boolean' },
    capeTitle:          { type: 'string' },
    capeId:             { type: 'string' },
    market:             { type: 'string' },
    defaultLanguage:    { type: 'string' },
    supportedLanguages: { type: 'array', items: { type: 'string' } },
    timezone:           { type: 'string' },
    brand:              { type: 'string' },
    department:         { type: 'string' },
    pages: {
      type: 'array',
      items: {
        oneOf: [
          { type: 'string', minLength: 1 },
          {
            type: 'object',
            required: ['id', 'type'],
            properties: {
              id:   { type: 'string', minLength: 1 },
              type: { type: 'string', minLength: 1 },
            },
          },
        ],
      },
    },
    regMode:          { type: 'string' },
    modules:          { type: 'array', items: { type: 'string' } },
    gtmId:            { type: 'string' },
    iframe:           { type: 'boolean' },
    outputDir:        { type: 'string' },
    pageSettings:     { type: 'object' },
    flowExits:        { type: 'object' },
    flowEntry:        { type: 'string' },
    flowEnabledExits: { type: 'object' },
    menuItemsEnabled: { type: 'object' },
    buildMode:        { type: 'string', enum: ['create', 'update', 'recreate'] },
    loadedProjectDir: { type: 'string' },
    pageElementSelections:   { type: 'object' },
    tsPageElementSelections: { type: 'object' },
  },
};

app.post('/api/scaffold', { schema: { body: scaffoldConfigSchema } }, async (req, reply) => {
  const cfg = req.body;

  // Cross-field check Fastify schemas can't express: createCape OR capeId.
  if (!cfg.createCape && !cfg.capeId) {
    return reply.code(400).send({ error: 'Either createCape:true or an existing capeId is required.' });
  }

  const validation = validateWizardConfig(cfg);
  if (validation.errors.length) {
    return reply.code(400).send({ errors: validation.errors, error: validation.errors.join('\n') });
  }

  const jobId = randomBytes(8).toString('hex');
  const tmp   = join(tmpdir(), `lw-wizard-${jobId}.json`);
  writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8');

  const job = { id: jobId, buffered: [], clients: new Set(), done: false, result: null };
  jobs.set(jobId, job);
  for (const warning of validation.warnings) {
    emit(job, 'warn', warning);
  }

  // Resolve outputDir up-front so we can return it on completion.
  const outputDir = cfg.outputDir
    ? resolve(cfg.outputDir)
    : resolve(SCAFFOLDER_ROOT, '..', cfg.name);

  // Make sure the parent of the output dir exists — scaffold.js will create
  // the output dir itself, but the parent must be reachable.
  try { mkdirSync(dirname(outputDir), { recursive: true }); } catch { /* ignore */ }

  // Spawn the CLI. Inherit no stdio; pipe stdout + stderr line-by-line.
  const child = spawn(process.execPath, [SCAFFOLD_JS, `--config=${tmp}`, '--yes'], {
    cwd:   SCAFFOLDER_ROOT,
    env:   { ...process.env, NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  pipeLines(child.stdout, (line) => emit(job, classify(line), line));
  pipeLines(child.stderr, (line) => emit(job, 'error',         line));

  child.on('error',  (err) => emit(job, 'error', `spawn error: ${err.message}`));
  child.on('exit',   (code) => {
    finish(job, { ok: code === 0, code: code ?? -1, outputDir });
  });

  return { jobId };
});

app.get('/events', async (req, reply) => {
  const jobId = (req.query?.jobId ?? '').toString();
  const job   = jobs.get(jobId);
  if (!job) return reply.code(404).send({ error: 'Unknown jobId' });

  reply.raw.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
  });
  reply.raw.write('\n');

  // Replay buffered logs first so a late-joining client doesn't miss anything.
  for (const ev of job.buffered) {
    reply.raw.write(`event: log\ndata: ${JSON.stringify(ev)}\n\n`);
  }

  if (job.done) {
    reply.raw.write(`event: done\ndata: ${JSON.stringify(job.result)}\n\n`);
    reply.raw.end();
    return reply;
  }

  job.clients.add(reply.raw);
  req.raw.on('close', () => { job.clients.delete(reply.raw); });
  return reply;
});

await app.listen({ port: PORT, host: '127.0.0.1' });
// eslint-disable-next-line no-console
console.log(`[wizard-server] listening on http://127.0.0.1:${PORT}`);

// ─── helpers ─────────────────────────────────────────────────────────────────

function pipeLines(stream, onLine) {
  let buf = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf('\n')) !== -1) {
      const line = stripAnsi(buf.slice(0, idx).replace(/\r$/, ''));
      buf = buf.slice(idx + 1);
      if (line.length) onLine(line);
    }
  });
  stream.on('end', () => {
    const tail = stripAnsi(buf.trim());
    if (tail.length) onLine(tail);
    buf = '';
  });
}

function classify(line) {
  if (/^\s*[✓√]/.test(line)) return 'success';
  if (/^\s*⚠/.test(line))    return 'warn';
  if (/^\s*[✗✘]/.test(line)) return 'error';
  return 'info';
}

function stripAnsi(s) {
  // Minimal ANSI/CSI stripper — good enough for terminal log capture.
  return s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
}
