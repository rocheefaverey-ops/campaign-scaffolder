# Antigravfix Parity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the recreate command in `antigravfix/SCAFFOLD_DEBUG.json` produce a project byte-identical to `antigravfix/`, then ship seven UX upgrades to the wizard so future projects use a clearer interface.

**Architecture:** Six workstreams. The first task builds a verification harness (`scripts/verify-antigravfix.js`) that diffs scaffolder output against `antigravfix/`; this harness is the regression guard for every subsequent task — it goes red on Task 1, gradually shrinks as copy-back tasks land, and goes green only after all parity workstreams (1–5) complete. UX upgrades (workstream 6) land last, using the green harness as a backstop against accidental output drift.

**Tech Stack:** Node 18+ (CommonJS/ESM mix), Fastify (wizard server), React 19 + Vite (wizard UI). No new runtime dependencies.

**Reference paths:**
- Spec: [docs/superpowers/specs/2026-05-06-antigravfix-parity-design.md](../specs/2026-05-06-antigravfix-parity-design.md)
- Source of truth: `c:/Dev/Livewall/antigravfix/`
- Working repo: `c:/Dev/Livewall/campaign-scaffolder/`

**Conventions used in this plan:**
- "Re-tokenise" means: open the file, replace every literal `antigravfix` → `{{PROJECT_NAME}}`, every literal `61122` → `{{CAPE_ID}}`, every literal `NL` (only when used as a market) → `{{MARKET}}`, and every literal `"haas-f1"` (only in game-id context) → leave as-is (game id is part of selection, not template). Do *not* tokenise occurrences inside comments or strings that name the project for documentation purposes.
- "Run the harness" means: `node scripts/verify-antigravfix.js` from the scaffolder repo root.
- All file paths are relative to `c:/Dev/Livewall/campaign-scaffolder/` unless prefixed with `antigravfix/`.

---

## Phase 0 — Verification harness (the test that drives everything)

### Task 0: Build `scripts/verify-antigravfix.js`

**Files:**
- Create: `scripts/verify-antigravfix.js`
- Modify: `package.json` (add npm script + extend `npm test` chain)

- [ ] **Step 1: Create the scripts directory**

```bash
mkdir scripts
```

- [ ] **Step 2: Write the harness**

Create `scripts/verify-antigravfix.js`:

```js
#!/usr/bin/env node
/**
 * Verifies that running the antigravfix recreate command produces output
 * byte-identical to c:/Dev/Livewall/antigravfix/ (modulo build artefacts and
 * dynamic timestamps).
 *
 * Usage: node scripts/verify-antigravfix.js
 * Exit:  0 = clean, 1 = drift detected (prints diff), 2 = harness error
 */

import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT  = resolve(dirname(__filename), '..');
const ANTIGRAV   = resolve(REPO_ROOT, '..', 'antigravfix');
const TMP_PARENT = resolve(REPO_ROOT, '..');
const TMP_DIR    = join(TMP_PARENT, '_verify_antigravfix_tmp');

// Paths excluded from the diff. Build artefacts, lockfiles, and Next-generated
// files differ between fresh installs and committed snapshots.
const IGNORED_PATHS = new Set([
  'frontend/.next',
  'frontend/node_modules',
  'frontend/package-lock.json',
  'frontend/tsconfig.tsbuildinfo',
  'frontend/next-env.d.ts',
  '.git',
]);

// Lines containing these substrings are masked before byte-comparison; they
// reflect non-deterministic state (timestamps) or paths that vary by run.
const TIMESTAMP_LINE_RX = /"(createdAt|scaffoldedAt)":\s*"[^"]+"/g;
const RECREATE_LINE_RX  = /"recreateCommand":\s*"[\s\S]*?"(?=,?\n)/;

function clean(dir) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

function run() {
  clean(TMP_DIR);
  mkdirSync(TMP_DIR, { recursive: true });

  const result = spawnSync('node', [
    join(REPO_ROOT, 'cli', 'scaffold.js'),
    '--name=antigravfix',
    '--cape-id=61122',
    '--market=NL',
    '--game=unity',
    '--page=video',
    '--page=landing',
    '--page=onboarding',
    '--page=video-2',
    '--page=game',
    '--page=result',
    `--output=${TMP_DIR}`,
    '--skip-install',
    '--skip-git',
    '--yes',
  ], { stdio: 'inherit', cwd: REPO_ROOT });

  if (result.status !== 0) {
    console.error('[verify] Scaffold failed; aborting diff.');
    process.exit(2);
  }
}

function* walk(root) {
  for (const name of readdirSync(root)) {
    const full = join(root, name);
    const rel  = relative(TMP_DIR, full).replace(/\\/g, '/');
    if (IGNORED_PATHS.has(rel)) continue;
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function readMasked(path) {
  let text = readFileSync(path, 'utf8');
  text = text.replace(TIMESTAMP_LINE_RX, '"$1": "<MASKED>"');
  text = text.replace(RECREATE_LINE_RX, '"recreateCommand": "<MASKED>"');
  return text;
}

function diff() {
  const drift = [];
  // Walk the *expected* tree (antigravfix) so missing files in the temp dir
  // count as drift.
  for (const expectedFull of walk(ANTIGRAV).constructor === Function ? [] : []) {} // placeholder, see below
  // Implemented as helper below to keep the iteration clear:
  return walkAndDiff(drift);
}

function walkAndDiff() {
  const drift = [];
  function visit(rootA, rootB, rel) {
    const fullA = rel ? join(rootA, rel) : rootA;
    const fullB = rel ? join(rootB, rel) : rootB;
    const relPosix = (rel || '').replace(/\\/g, '/');
    if (IGNORED_PATHS.has(relPosix)) return;
    const stA = existsSync(fullA) ? statSync(fullA) : null;
    const stB = existsSync(fullB) ? statSync(fullB) : null;
    if (!stA && !stB) return;
    if (stA && !stB) { drift.push(`MISSING in scaffold output: ${relPosix}`); return; }
    if (!stA && stB) { drift.push(`UNEXPECTED in scaffold output: ${relPosix}`); return; }
    if (stA.isDirectory() !== stB.isDirectory()) {
      drift.push(`TYPE MISMATCH (file vs dir): ${relPosix}`); return;
    }
    if (stA.isDirectory()) {
      const namesA = new Set(readdirSync(fullA));
      const namesB = new Set(readdirSync(fullB));
      for (const n of new Set([...namesA, ...namesB])) {
        visit(rootA, rootB, rel ? join(rel, n) : n);
      }
      return;
    }
    const a = readMasked(fullA);
    const b = readMasked(fullB);
    if (a !== b) drift.push(`CONTENT DIFFERS: ${relPosix}`);
  }
  visit(ANTIGRAV, TMP_DIR, '');
  return drift;
}

run();
const drift = walkAndDiff();
if (drift.length === 0) {
  console.log('[verify] OK — scaffolder output matches antigravfix/.');
  clean(TMP_DIR);
  process.exit(0);
}
console.error('[verify] Drift detected:');
for (const line of drift) console.error('  ' + line);
console.error(`\n[verify] ${drift.length} drift entr${drift.length === 1 ? 'y' : 'ies'}. Output kept at: ${TMP_DIR}`);
process.exit(1);
```

(Note: the `diff()` placeholder is unused — `walkAndDiff()` is the real implementation. Leaving the dead helper in is OK — but if it bothers you, delete the `diff()` function before committing.)

- [ ] **Step 3: Add `--skip-install` and `--skip-git` flags to `cli/scaffold.js`**

These flags are referenced by the harness but don't exist yet. Find the flag-parsing function (`parseArgs()` around line 342) and add to the recognised flag list:

```js
// Inside parseArgs(), add to the boolean-flag handling:
'--skip-install': () => { args.skipInstall = true; },
'--skip-git':     () => { args.skipGit     = true; },
```

Then find the `npm install` call site (search for `Installing dependencies`) and skip it when `args.skipInstall === true`. Similarly find `git init` (search for `Initialising git repository`) and skip when `args.skipGit === true`. Each guard is a single `if (args.skipInstall) { /* skip */ }` early-return.

- [ ] **Step 4: Add npm scripts**

In `package.json`, replace the `scripts` block's `test` line and add `verify`:

```json
"verify:antigravfix": "node scripts/verify-antigravfix.js",
"test": "node cli/cape-format-builder.test.js && node scripts/verify-antigravfix.js"
```

(Test chain runs format builder unit tests first — fast — then the slower full-scaffold verify.)

- [ ] **Step 5: Run the harness — confirm it goes RED**

```bash
node scripts/verify-antigravfix.js
```

Expected: exit code 1, with drift entries listing the files we know are wrong (campaign pages, Loading.tsx, UnityGame.tsx, missing video-2/, etc.). Save the output for later comparison:

```bash
node scripts/verify-antigravfix.js > /tmp/drift-baseline.txt 2>&1; echo "exit=$?"
wc -l /tmp/drift-baseline.txt
```

Note the line count — every subsequent task should reduce it.

- [ ] **Step 6: Commit**

```bash
git add scripts/verify-antigravfix.js cli/scaffold.js package.json
git commit -m "test: add verify-antigravfix harness + --skip-install/--skip-git flags

The harness runs the recreate command from antigravfix/SCAFFOLD_DEBUG.json
into a temp dir and diffs the output against antigravfix/. It is currently
red (expected) and turns green only when all parity workstreams land.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 1 — Template copy-back (workstream 1)

Each task in this phase: read the antigravfix file, re-tokenise, write to the scaffolder location, run the harness, see drift line removed, commit.

### Task 1: Copy-back campaign route pages

**Files:**
- Modify: `base-templates/next/app/(campaign)/layout.tsx`
- Modify: `base-templates/next/app/(campaign)/onboarding/page.tsx`
- Modify: `base-templates/next/app/(campaign)/gameplay/page.tsx`
- Modify: `base-templates/next/app/(campaign)/result/page.tsx`
- Modify: `base-templates/next/app/(campaign)/menu/page.tsx`

- [ ] **Step 1: Copy each file's contents from antigravfix to scaffolder**

For each pair below, read the antigravfix source and write it to the scaffolder destination:

| Read from | Write to |
|---|---|
| `c:/Dev/Livewall/antigravfix/frontend/app/(campaign)/layout.tsx` | `base-templates/next/app/(campaign)/layout.tsx` |
| `c:/Dev/Livewall/antigravfix/frontend/app/(campaign)/onboarding/page.tsx` | `base-templates/next/app/(campaign)/onboarding/page.tsx` |
| `c:/Dev/Livewall/antigravfix/frontend/app/(campaign)/gameplay/page.tsx` | `base-templates/next/app/(campaign)/gameplay/page.tsx` |
| `c:/Dev/Livewall/antigravfix/frontend/app/(campaign)/result/page.tsx` | `base-templates/next/app/(campaign)/result/page.tsx` |
| `c:/Dev/Livewall/antigravfix/frontend/app/(campaign)/menu/page.tsx` | `base-templates/next/app/(campaign)/menu/page.tsx` |

- [ ] **Step 2: Re-tokenise each file**

For each file, search for and replace any literal occurrences (likely none in TSX files, but verify):
- `antigravfix` → `{{PROJECT_NAME}}`
- `61122` → `{{CAPE_ID}}` (these only appear in env files; TSX shouldn't have them)

If `grep -n "antigravfix\|61122\|\"NL\"" base-templates/next/app/\(campaign\)/...` returns hits, replace; otherwise leave unchanged. The page files reference CAPE keys (`general.legal.termsUrl` etc.), not literal IDs.

- [ ] **Step 3: Run the harness**

```bash
node scripts/verify-antigravfix.js 2>&1 | grep "CONTENT DIFFERS" | wc -l
```

Expected: line count drops by 5 vs Task 0's baseline.

- [ ] **Step 4: Commit**

```bash
git add base-templates/next/app/\(campaign\)/
git commit -m "feat(templates): copy-back campaign route pages from antigravfix

Adds DEFAULT_STEPS fallback to onboarding, /video-2 to PAGES_WITHOUT_HEADER
in (campaign)/layout, and other improvements promoted from antigravfix.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2: Copy-back core components

**Files:**
- Modify: `base-templates/next/components/_core/Loading/Loading.tsx`
- Modify: `base-templates/next/components/_core/DesktopWrapper/DesktopWrapper.tsx`

- [ ] **Step 1: Copy each file**

| Read from | Write to |
|---|---|
| `antigravfix/frontend/components/_core/Loading/Loading.tsx` | `base-templates/next/components/_core/Loading/Loading.tsx` |
| `antigravfix/frontend/components/_core/DesktopWrapper/DesktopWrapper.tsx` | `base-templates/next/components/_core/DesktopWrapper/DesktopWrapper.tsx` |

- [ ] **Step 2: Re-tokenise (verify clean)**

```bash
grep -nE "antigravfix|61122" base-templates/next/components/_core/Loading/Loading.tsx base-templates/next/components/_core/DesktopWrapper/DesktopWrapper.tsx
```

Expected: no output. Both files reference CAPE keys, not literal project values.

- [ ] **Step 3: Run the harness, confirm 2 fewer drift entries**

- [ ] **Step 4: Commit**

```bash
git add base-templates/next/components/_core/
git commit -m "feat(templates): copy-back core components (Loading skip button, DesktopWrapper)

Loading.tsx gains a 10-second safety-skip control and additional
description lines; DesktopWrapper picks up the visibility refinement.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 3: Copy-back top-level template files

**Files:**
- Modify: `base-templates/next/app/globals.css`
- Modify: `base-templates/next/tsconfig.json`
- Modify: `base-templates/next/public/mock-cape.json`

- [ ] **Step 1: Copy each file**

| Read from | Write to |
|---|---|
| `antigravfix/frontend/app/globals.css` | `base-templates/next/app/globals.css` |
| `antigravfix/frontend/tsconfig.json` | `base-templates/next/tsconfig.json` |
| `antigravfix/frontend/public/mock-cape.json` | `base-templates/next/public/mock-cape.json` |

- [ ] **Step 2: Re-tokenise mock-cape.json**

`mock-cape.json` may contain the campaign id `61122`. Replace it:

```bash
sed -i 's/61122/{{CAPE_ID}}/g' base-templates/next/public/mock-cape.json
sed -i 's/"antigravfix"/"{{PROJECT_NAME}}"/g' base-templates/next/public/mock-cape.json
```

Verify with `grep -nE "antigravfix|61122" base-templates/next/public/mock-cape.json` (expect: no output).

- [ ] **Step 3: Run the harness, confirm 3 fewer drift entries**

- [ ] **Step 4: Commit**

```bash
git add base-templates/next/app/globals.css base-templates/next/tsconfig.json base-templates/next/public/mock-cape.json
git commit -m "feat(templates): copy-back globals.css, tsconfig.json, mock-cape.json"
```

---

## Phase 2 — Module copy-back (workstream 2)

### Task 4: Copy-back unity module

**Files:**
- Modify: `modules/unity/components/UnityGame.tsx`
- Modify: `modules/unity/components/UnityContainer.tsx`

- [ ] **Step 1: Copy each file**

| Read from | Write to |
|---|---|
| `antigravfix/frontend/components/_modules/unity/UnityGame.tsx` | `modules/unity/components/UnityGame.tsx` |
| `antigravfix/frontend/components/_modules/unity/UnityContainer.tsx` | `modules/unity/components/UnityContainer.tsx` |

- [ ] **Step 2: Re-tokenise (verify clean)**

```bash
grep -nE "antigravfix|61122" modules/unity/components/UnityGame.tsx modules/unity/components/UnityContainer.tsx
```

Expected: no output.

- [ ] **Step 3: Run the harness, confirm 2 fewer drift entries**

- [ ] **Step 4: Commit**

```bash
git add modules/unity/components/
git commit -m "feat(unity): copy-back UnityGame canvas z-10 + UnityContainer refinements"
```

### Task 5: Copy-back video module

**Files:**
- Modify: `modules/video/components/VideoIntro/VideoIntro.tsx`
- Modify: `modules/video/app/(campaign)/video/page.tsx`

- [ ] **Step 1: Copy each file**

| Read from | Write to |
|---|---|
| `antigravfix/frontend/components/_modules/VideoIntro/VideoIntro.tsx` | `modules/video/components/VideoIntro/VideoIntro.tsx` |
| `antigravfix/frontend/app/(campaign)/video/page.tsx` | `modules/video/app/(campaign)/video/page.tsx` |

- [ ] **Step 2: Re-tokenise the video page template**

The video page reads `instanceId` at runtime via a hard-coded string. Replace the literal `'video'` with `'{{INSTANCE_ID}}'` in this assignment specifically (the line that derives `instanceId`):

Open `modules/video/app/(campaign)/video/page.tsx`, find the line containing `instanceId` definition (something like `const instanceId = 'video';`), and change it to:

```ts
const instanceId = '{{INSTANCE_ID}}';
```

Other `'video'` strings (e.g. inside CSS class names like `'video-bg'`) remain literal. If unsure whether a hit is the right one, the rule is: only replace string literals used as the lookup key into `settings.pages[...]`.

- [ ] **Step 3: Run the harness**

The harness will still report `app/(campaign)/video/page.tsx` as differing (because the scaffolder's template now has `{{INSTANCE_ID}}` and the temp output has it replaced with literal `video`, while antigravfix has literal `video` too — so they should match after token replacement runs). Confirm 2 drift entries removed; if `video/page.tsx` still differs, inspect:

```bash
diff <(node scripts/verify-antigravfix.js 2>&1; ls /tmp) /tmp/drift-baseline.txt
```

(If the page still drifts, the {{INSTANCE_ID}} token isn't being replaced in the route-page-copy step yet. That's OK — workstream 3 covers the token-replace pass for instance pages. Defer this drift entry until Task 9.)

- [ ] **Step 4: Commit**

```bash
git add modules/video/
git commit -m "feat(video): copy-back VideoIntro and video page; introduce {{INSTANCE_ID}} token"
```

---

## Phase 3 — Page-instance support (workstream 3)

### Task 6: Add unit tests for `basePageType()` and `routeFor()`

**Files:**
- Create: `cli/scaffold.test.js`

- [ ] **Step 1: Create the test file**

Create `cli/scaffold.test.js`:

```js
/**
 * Unit tests for cli/scaffold.js helpers.
 * Run with: node cli/scaffold.test.js
 * Exits 0 on pass, non-zero on failure (matches cape-format-builder.test.js pattern).
 */

import assert from 'node:assert/strict';
import { basePageType, routeFor, INSTANCEABLE_PAGES, PAGE_ROUTES } from './scaffold.js';

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); console.log(`  ok  ${name}`); pass++; }
  catch (e) { console.error(`  FAIL ${name}\n    ${e.message}`); fail++; }
}

console.log('basePageType()');
t('returns the page id when no suffix', () => {
  assert.equal(basePageType('video'), 'video');
  assert.equal(basePageType('landing'), 'landing');
});
t('strips numeric suffix for whitelisted types', () => {
  assert.equal(basePageType('video-2'), 'video');
  assert.equal(basePageType('video-9'), 'video');
});
t('throws for non-whitelisted suffixed types', () => {
  assert.throws(() => basePageType('landing-2'), /not an allowed duplicate/);
  assert.throws(() => basePageType('result-3'),  /not an allowed duplicate/);
});
t('does not match malformed suffixes', () => {
  // "video-x" or "video-1a" — non-numeric or trailing chars — pass through unchanged
  assert.equal(basePageType('video-x'),  'video-x');
  assert.equal(basePageType('video-1a'), 'video-1a');
});

console.log('routeFor()');
t('returns base route when no suffix', () => {
  assert.equal(routeFor('video'),    '/video');
  assert.equal(routeFor('game'),     '/gameplay');
  assert.equal(routeFor('landing'),  '/landing');
});
t('appends suffix to base route for instances', () => {
  assert.equal(routeFor('video-2'),  '/video-2');
  assert.equal(routeFor('video-3'),  '/video-3');
});
t('throws for non-whitelisted suffixed types', () => {
  assert.throws(() => routeFor('result-2'), /not an allowed duplicate/);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
node cli/scaffold.test.js
```

Expected: import error (`basePageType` is not exported yet) — exit code 1.

### Task 7: Implement `basePageType()` and `routeFor()`

**Files:**
- Modify: `cli/scaffold.js` (near the top, before `parseArgs`)

- [ ] **Step 1: Add helpers and export them**

Insert near the existing `PAGE_ROUTES` constant (around line 1682). If `PAGE_ROUTES` is not currently exported, add it to the module exports:

```js
const INSTANCE_RE = /^([a-z]+)-(\d+)$/;
const INSTANCEABLE_PAGES = new Set(['video']);

function basePageType(pageId) {
  const m = pageId.match(INSTANCE_RE);
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

function routeFor(pageId) {
  const baseRoute = PAGE_ROUTES[basePageType(pageId)];
  if (!baseRoute) throw new Error(`Unknown page type: ${pageId}`);
  const m = pageId.match(INSTANCE_RE);
  return m ? `${baseRoute}-${m[2]}` : baseRoute;
}

export { basePageType, routeFor, INSTANCEABLE_PAGES, PAGE_ROUTES };
```

If `cli/scaffold.js` is currently CommonJS-style or has a different export idiom, follow the existing pattern (look near the bottom of the file for how other helpers are exported / re-exported). The test file uses ESM `import` — adjust both files to match if needed.

- [ ] **Step 2: Run the test — expect pass**

```bash
node cli/scaffold.test.js
```

Expected: all assertions pass, exit 0.

- [ ] **Step 3: Update `npm test` chain**

In `package.json` extend the `test` script to include `scaffold.test.js`:

```json
"test": "node cli/cape-format-builder.test.js && node cli/scaffold.test.js && node scripts/verify-antigravfix.js"
```

- [ ] **Step 4: Commit**

```bash
git add cli/scaffold.js cli/scaffold.test.js package.json
git commit -m "feat(scaffold): add basePageType() and routeFor() helpers with tests"
```

### Task 8: Replace `PAGE_ROUTES[pageId]` lookups with `routeFor(pageId)`

**Files:**
- Modify: `cli/scaffold.js`

- [ ] **Step 1: Find call sites**

```bash
grep -n "PAGE_ROUTES\[" cli/scaffold.js
```

- [ ] **Step 2: Replace each call**

For each match, replace `PAGE_ROUTES[pageId]` (or whatever variable name is used) with `routeFor(pageId)`. The semantics differ: `PAGE_ROUTES['video-2']` returns `undefined`; `routeFor('video-2')` returns `'/video-2'`. This is the desired change.

If a call site uses `PAGE_ROUTES[pageId]` for *membership* (i.e. "is this a known page?"), do not replace it — instead replace with `Boolean(PAGE_ROUTES[basePageType(pageId)])` so the membership test honours instances.

- [ ] **Step 3: Run the harness**

```bash
node scripts/verify-antigravfix.js 2>&1 | grep "CONTENT DIFFERS\|MISSING" | head -20
```

The harness should still be red (we haven't generated the `video-2` directory yet), but the flow tokens in `.scaffolded` should now be correct. Inspect to confirm:

```bash
grep "video-2\|VIDEO-2" /Dev/Livewall/_verify_antigravfix_tmp/.scaffolded
```

Expected: shows `{{NEXT_AFTER_VIDEO-2}}` and `/video-2` in the flow block.

- [ ] **Step 4: Commit**

```bash
git add cli/scaffold.js
git commit -m "feat(scaffold): use routeFor() for all page-route lookups"
```

### Task 9: Generate the `video-2/` route directory

**Files:**
- Modify: `cli/scaffold.js` (the loop that writes `app/(campaign)/<route>/page.tsx`)

- [ ] **Step 1: Find the route-page write loop**

Search for the function that handles per-page file copy / generation. Likely candidates: a section in `scaffoldNext()` that iterates `pages[]` and either calls `page-builder.js` or copies a module's page template:

```bash
grep -n "app/(campaign)\|buildPage\|app(campaign)" cli/scaffold.js | head -20
```

- [ ] **Step 2: Update the loop to handle instance pages**

For each `pageId` in `pages[]`:

1. Compute `const baseId = basePageType(pageId);`
2. Compute `const route = routeFor(pageId);`
3. The destination path is `app/(campaign)/${pageId}/page.tsx` (use the full pageId, including suffix, as the directory name — matches antigravfix).
4. The source template is whatever the existing logic resolves for `baseId` (a module-replaced page like `modules/video/app/(campaign)/video/page.tsx`, or the base template's `base-templates/next/app/(campaign)/<baseId>/page.tsx`).
5. After writing, run the existing token-replace pass with `{{INSTANCE_ID}}` → `pageId` (full, including suffix).

Concrete diff (illustrative — adapt to actual code shape):

```js
// Before:
for (const pageId of pages) {
  const route = PAGE_ROUTES[pageId];
  const dest = path.join(outDir, 'app/(campaign)', pageId, 'page.tsx');
  const src  = resolvePageTemplate(pageId);  // returns module-overridden or base
  copyFile(src, dest);
  tokenReplaceFile(dest, { '{{INSTANCE_ID}}': pageId });
}

// After:
for (const pageId of pages) {
  const baseId = basePageType(pageId);
  const route  = routeFor(pageId);
  const dest   = path.join(outDir, 'app/(campaign)', pageId, 'page.tsx');
  const src    = resolvePageTemplate(baseId);  // <-- look up by base, write by full id
  copyFile(src, dest);
  tokenReplaceFile(dest, { '{{INSTANCE_ID}}': pageId });
}
```

(Function names are illustrative — match the existing helpers in `scaffold.js`.)

- [ ] **Step 3: Run the harness**

```bash
node scripts/verify-antigravfix.js 2>&1 | grep -E "MISSING|CONTENT DIFFERS" | wc -l
```

Drift count should drop by 2 (the missing `video-2/` directory + the previously-deferred `video/page.tsx` content drift from Task 5).

Verify the directory exists:

```bash
ls c:/Dev/Livewall/_verify_antigravfix_tmp/frontend/app/\(campaign\)/video-2/
```

Expected: `page.tsx`. Inspect the file to confirm `{{INSTANCE_ID}}` was replaced with `'video-2'`:

```bash
grep "instanceId" c:/Dev/Livewall/_verify_antigravfix_tmp/frontend/app/\(campaign\)/video-2/page.tsx
```

Expected: `const instanceId = 'video-2';`

- [ ] **Step 4: Commit**

```bash
git add cli/scaffold.js
git commit -m "feat(scaffold): generate route directories for page instances (video-N)"
```

### Task 10: Update `cli/page-builder.js` to use `basePageType()`

**Files:**
- Modify: `cli/page-builder.js`

- [ ] **Step 1: Find the page-type lookup site**

```bash
grep -n "PAGE_DEFAULTS\|ELEMENT_CATALOGUE\|buildPage" cli/page-builder.js
```

- [ ] **Step 2: Add basePageType call at the top of `buildPage()`**

Import the helper at the top of `page-builder.js`:

```js
import { basePageType } from './scaffold.js';
```

(or `require` if the file is CommonJS — match existing style).

Inside `buildPage(pageId, ...)`, on the first line that uses `pageId` as a lookup key (e.g. `PAGE_DEFAULTS[pageId]`), replace with `basePageType(pageId)`:

```js
function buildPage(pageId, elements, ctx) {
  const baseId = basePageType(pageId);
  const defaults = PAGE_DEFAULTS[baseId];
  const catalogue = ELEMENT_CATALOGUE[baseId];
  // ... rest of function uses defaults/catalogue, output filename uses raw pageId
}
```

- [ ] **Step 3: Run the harness**

```bash
node scripts/verify-antigravfix.js
```

Drift entries should remain stable (no regression). If `cli/scaffold.test.js` is in the npm test chain, run it: no failures.

- [ ] **Step 4: Commit**

```bash
git add cli/page-builder.js
git commit -m "feat(page-builder): route page-type lookups through basePageType()"
```

### Task 11: Update `cli/cape-format-builder.js` for instance tabs

**Files:**
- Modify: `cli/cape-format-builder.js`
- Modify: `cli/cape-format-builder.test.js`

- [ ] **Step 1: Find the page-tab loop**

```bash
grep -n "KNOWN_PAGE_TYPES\|buildNextCapeFormat\|Unknown page type" cli/cape-format-builder.js
```

- [ ] **Step 2: Replace `KNOWN_PAGE_TYPES` membership with `basePageType` lookup**

Import the helper:

```js
import { basePageType } from './scaffold.js';
```

In the loop that emits page tabs, for each `pageId`:

```js
let baseId;
try {
  baseId = basePageType(pageId);
} catch (e) {
  // Re-throw as a builder-specific error so the caller can format it nicely.
  throw new Error(`[cape-format-builder] ${e.message}`);
}
if (!KNOWN_PAGE_TYPES.has(baseId)) {
  console.warn(`[cape-format-builder] Unknown page type "${baseId}" (instance "${pageId}") — no CAPE tab will be created.`);
  continue;
}

// Build the tab using baseId for the field structure but pageId for the key + label
const tab = buildTabFor(baseId, {
  key:   `pages-${pageId}`,
  label: tabLabelFor(pageId),
  settingsPath: `settings.pages.${pageId}`,
});
tabs.push(tab);
```

Add a small helper `tabLabelFor(pageId)`:

```js
function tabLabelFor(pageId) {
  const m = pageId.match(/^([a-z]+)-(\d+)$/);
  if (!m) return capitalise(pageId);
  return `${capitalise(m[1])} ${m[2]}`;  // "Video 2"
}
function capitalise(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
```

(If `capitalise` already exists in the file, reuse it.)

- [ ] **Step 3: Add a unit test**

In `cli/cape-format-builder.test.js`, add:

```js
test('emits a tab for video-2 with the correct key, label, and settings path', () => {
  const out = buildNextCapeFormat({
    pages: ['video', 'video-2', 'game', 'result'],
    /* ...other required fields... */
  });
  const tab = out.interfaceSetup.tabs.find(t => t.key === 'pages-video-2');
  assert.ok(tab, 'expected a tab keyed pages-video-2');
  assert.equal(tab.label, 'Video 2');
  // settings path is reflected somewhere in the tab definition; assert it's referenced:
  const json = JSON.stringify(tab);
  assert.match(json, /settings\.pages\.video-2/);
});
```

(Adapt to the existing test style in that file — match its `test(...)` / `assert.*` idiom.)

- [ ] **Step 4: Run the tests + harness**

```bash
node cli/cape-format-builder.test.js  # new test passes
node scripts/verify-antigravfix.js
```

Harness drift count drops further — but the cape-format diff is still substantial (workstream 4 closes that gap).

- [ ] **Step 5: Commit**

```bash
git add cli/cape-format-builder.js cli/cape-format-builder.test.js
git commit -m "feat(cape-format): emit per-instance tabs for video-N pages"
```

---

## Phase 4 — `cape-format.json` field parity (workstream 4)

This phase has variable size — depends on what the diff classification reveals.

### Task 12: Phase 4a — diff classification

**Files:**
- Create: `docs/superpowers/working-notes/2026-05-06-cape-format-classification.md`

- [ ] **Step 1: Generate a fresh cape-format.json against the latest builder**

```bash
mkdir -p /tmp && rm -rf c:/Dev/Livewall/_verify_antigravfix_tmp
node scripts/verify-antigravfix.js > /tmp/harness-output.txt 2>&1 || true
# The harness leaves the temp dir behind on drift. cape-format.json is at the project root inside it:
cp c:/Dev/Livewall/_verify_antigravfix_tmp/cape-format.json /tmp/builder-cape.json
diff -u /tmp/builder-cape.json c:/Dev/Livewall/antigravfix/cape-format.json > /tmp/cape-diff.txt || true
wc -l /tmp/cape-diff.txt
```

- [ ] **Step 2: Walk the diff and classify each block**

Open `/tmp/cape-diff.txt`. For each contiguous diff block, categorise it and write to `docs/superpowers/working-notes/2026-05-06-cape-format-classification.md` using this format:

```markdown
# CAPE format diff classification — 2026-05-06

## Add-field

| Tab | Field key | Type | Builder helper to call |
|---|---|---|---|
| general | `loading.description1` | text | `text({ key: 'loading.description1', label: 'Loading description (line 1)' })` |
| general | `loading.description2` | text | … |
| onboarding | `step4Title` | text | … |
…

## Add-section

| Tab | Group key | Children |
|---|---|---|
| video | `videoSettings` | `mode`, `minPlaybackSec`, `readyFallbackSec`, `alwaysSkip` |
…

## Field-attribute

| Tab | Field key | Attribute | Old | New |
|---|---|---|---|---|
| settings | `settings-header-enabled` | `label` | "Show header" | "Show header globally" |
…

## Ordering

(List of fields whose position differs, in the order antigravfix expects.)

## Noise

(Whitespace / canonicalisation differences — no action.)
```

- [ ] **Step 3: Cross-check against template `getCapeXxx` calls**

```bash
grep -rE "getCapeText|getCapeImage|getCapeBoolean|getCapeNumber" base-templates/next/ modules/ | grep -oE "'[^']+'" | sort -u > /tmp/cape-paths-used.txt
wc -l /tmp/cape-paths-used.txt
```

For each path in the file, verify it's listed somewhere in your classification doc (i.e. either present in both, or added in the "Add-field" section). Append a "Coverage check" section:

```markdown
## Coverage check

All `getCapeXxx` paths used by templates and modules have a corresponding emitter in the rebuilt format. Verified by intersection of `/tmp/cape-paths-used.txt` and the field key list. Gaps:

- (none)
```

- [ ] **Step 4: Commit the classification**

```bash
git add docs/superpowers/working-notes/2026-05-06-cape-format-classification.md
git commit -m "docs: classify cape-format.json drift for workstream 4"
```

### Task 13: Implement add-field / add-section edits, one tab at a time

**Files:**
- Modify: `cli/cape-format-builder.js`
- Modify: `cli/cape-format-builder.test.js`

For each of the following tabs, do one task each (TDD: test first, then implementation, then verify, then commit). Group all add-field / add-section / field-attribute changes for a given tab in the same task.

The tabs in approximately diff-size order (largest first — biggest harness wins early):

- [ ] **Task 13a — General / settings tab**: add the global fields the classification identified (header settings, theme tokens, etc.). Add at least one assertion per added field in the test file.
- [ ] **Task 13b — Onboarding tab**: extra step fields (4–6), helper text, defaults.
- [ ] **Task 13c — Video tab**: the `videoSettings` group (`mode`, `minPlaybackSec`, `readyFallbackSec`, `alwaysSkip`).
- [ ] **Task 13d — Loading tab**: `description1/2/3` fields, skip-button copy.
- [ ] **Task 13e — Result tab**: any drift.
- [ ] **Task 13f — Menu tab**: any drift.
- [ ] **Task 13g — Landing tab**: any drift.
- [ ] **Task 13h — Gameplay tab**: any drift.

**Standard task structure (apply to each 13a–13h):**

- [ ] **Step 1: Write the failing test**

In `cli/cape-format-builder.test.js`, add tests asserting each added field appears with the right key, label, and (where relevant) `default`. Example pattern:

```js
test('general tab includes loading.description1 field', () => {
  const out = buildNextCapeFormat({ pages: ['landing', 'game', 'result'], /* … */ });
  const tab = out.interfaceSetup.tabs.find(t => t.key === 'general');
  const field = findField(tab, 'loading.description1');
  assert.ok(field, 'loading.description1 missing from general tab');
  assert.equal(field.label, 'Loading description (line 1)');
});
```

(`findField` is a small helper at the top of the test file; if it doesn't exist, add it once: a recursive walk over a tab/group/field tree returning the first node whose `key` matches.)

- [ ] **Step 2: Run the test — confirm it fails**

```bash
node cli/cape-format-builder.test.js
```

Expected: the new assertions fail.

- [ ] **Step 3: Implement the fields in the relevant tab assembler**

Open `cli/cape-format-builder.js`, find the function that builds the tab (e.g. `buildGeneralTab(...)`). Add the new field calls, in the order the classification document lists them. Use the existing helper functions (`text`, `inp`, `color`, `bool`, `select`, `asset`).

- [ ] **Step 4: Run the test — pass**

```bash
node cli/cape-format-builder.test.js
```

Expected: all assertions pass.

- [ ] **Step 5: Run the harness — confirm progress**

```bash
node scripts/verify-antigravfix.js 2>&1 | grep "cape-format" || echo "cape-format clean for this tab"
```

If the harness reports `cape-format.json` still differs, diff manually to see what's left for *this* tab:

```bash
diff -u /tmp/builder-cape.json c:/Dev/Livewall/antigravfix/cape-format.json | head -60
```

- [ ] **Step 6: Commit**

```bash
git add cli/cape-format-builder.js cli/cape-format-builder.test.js
git commit -m "feat(cape-format): add fields/sections for the <tab-name> tab to match antigravfix"
```

### Task 14: Final cape-format parity check

**Files:** none modified — verification only

- [ ] **Step 1: Run the harness; expect cape-format.json to be clean**

```bash
node scripts/verify-antigravfix.js 2>&1 | grep "cape-format"
```

Expected: empty output (no drift on `cape-format.json`).

- [ ] **Step 2: If anything remains, classify and resolve**

If the harness still reports drift on `cape-format.json`, `diff -u` and add a follow-up sub-task under whichever tab owns the remaining fields. Repeat the standard task structure (test → implement → verify → commit).

---

## Phase 5 — Writer parity (workstreams 5a, 5b)

### Task 15: `.scaffolded` writer parity

**Files:**
- Modify: `cli/scaffold.js`

- [ ] **Step 1: Locate the `.scaffolded` writer**

```bash
grep -n "'\\.scaffolded'\\|writeScaffoldedFile\\|scaffolded:" cli/scaffold.js
```

- [ ] **Step 2: Compare output to antigravfix's**

After Tasks 1–14 land, run the harness and inspect the resulting `.scaffolded`:

```bash
diff -u c:/Dev/Livewall/_verify_antigravfix_tmp/.scaffolded c:/Dev/Livewall/antigravfix/.scaffolded
```

- [ ] **Step 3: Align field set + ordering**

Build the options object in the same shape and order as antigravfix's `.scaffolded`:

```js
const scaffoldedOut = {
  name:                 args.name,
  stack:                args.stack || 'next',
  capeId:               String(args.capeId),
  market:               args.market || 'NL',
  capeAutoPublished:    Boolean(capeResult?.published),
  game:                 args.game || 'unity',
  selectedGame:         selectedGame ? { id: selectedGame.id, name: selectedGame.name, description: selectedGame.description } : null,
  pages:                pages,
  pageTypes:            buildPageTypes(pages),  // { 'video-2': 'video', ... }
  flow:                 flowTokens,
  flowExits:            flowExits,
  modules:              resolvedModules,
  envVarsAdded:         envVarsAdded,
  cspPatches:           cspPatches,
  wizard:               buildWizardBlock(args),  // see WIZARD_DEFAULTS below
  createdAt:            new Date().toISOString(),
};
```

Add a `WIZARD_DEFAULTS` constant that matches the wizard's surfaced defaults:

```js
const WIZARD_DEFAULTS = {
  pageSettings: {
    video:      { mode: 'loadingScreen', alwaysSkip: false, minPlaybackSec: 3, readyFallbackSec: 8 },
    onboarding: { allowSkip: false },
    register:   { showInfix: true, requireOptIns: true },
    game:       { timerEnabled: true, timerSec: 60 },
    result:     { autoNavSec: 0 },
    voucher:    { showQr: true, codeLength: 8 },
  },
  flowEnabledExits: {
    'landing.leaderboard': false,
    'result.playAgain':    true,
    'result.leaderboard':  false,
  },
  menuItemsEnabled: {
    home: true, resume: false, howToPlay: true, leaderboard: false,
    voucher: false, terms: true, privacy: true, faq: false, leave: true,
  },
  defaultLanguage:    'EN',
  supportedLanguages: ['EN'],
  timezone:           'Europe/Brussels',
  createCape:         true,
  gameId:             null,
};

function buildWizardBlock(args) {
  return {
    ...WIZARD_DEFAULTS,
    gameId: args.gameId || (selectedGame?.id ?? null),
    // wizard config passed via --config=... overrides defaults:
    ...(args.wizardConfig || {}),
  };
}

function buildPageTypes(pages) {
  const types = {};
  for (const p of pages) {
    if (basePageType(p) !== p) types[p] = basePageType(p);
  }
  return types;
}
```

- [ ] **Step 4: Run the harness — confirm `.scaffolded` is clean (modulo timestamp masking)**

```bash
node scripts/verify-antigravfix.js 2>&1 | grep ".scaffolded"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add cli/scaffold.js
git commit -m "feat(scaffold): align .scaffolded writer with antigravfix shape"
```

### Task 16: `SCAFFOLD_CHECKLIST.md` writer parity

**Files:**
- Modify: `cli/scaffold.js` (around `writeChecklistFile()` — line ~2252)

- [ ] **Step 1: Diff the checklist outputs**

```bash
diff -u c:/Dev/Livewall/_verify_antigravfix_tmp/SCAFFOLD_CHECKLIST.md c:/Dev/Livewall/antigravfix/SCAFFOLD_CHECKLIST.md
```

- [ ] **Step 2: Apply the differences to `writeChecklistFile()`**

Common fixes expected:
- `Pages & Routes` section — add per-instance entry: `[x] **video-2** — `/video-2``
- `Computed flow tokens` — add `{{NEXT_AFTER_VIDEO-2}}` row
- `Per-page` smoke test list — add `/video-2` entry
- Any wording / order drift

The function uses template literals; align line-by-line with antigravfix's checklist.

- [ ] **Step 3: Run the harness — confirm checklist is clean**

```bash
node scripts/verify-antigravfix.js 2>&1 | grep SCAFFOLD_CHECKLIST
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add cli/scaffold.js
git commit -m "feat(scaffold): SCAFFOLD_CHECKLIST.md parity (instance entries, ordering)"
```

### Task 17: Phase-1–5 green check

**Files:** none modified — gates the move to Phase 6

- [ ] **Step 1: Run the full test chain**

```bash
npm test
```

Expected: all unit tests pass; verify-antigravfix exits 0.

- [ ] **Step 2: Tag the commit**

```bash
git tag parity-green
```

This is the safety point; UX changes in Phase 6 must not regress this tag.

---

## Phase 6 — Wizard UX upgrades (workstream 6)

### Task 18: 6a — Standardise user-facing terminology

**Files:**
- Modify: `cli/scaffold.js` (CLI prompt strings)
- Modify: `cli/wizard-ui/src/steps/StepStack.tsx` (engine sub-step heading)

- [ ] **Step 1: Update CLI prompt headings**

In `cli/scaffold.js`, find prompt strings using "game" where the meaning is *engine*:

```bash
grep -n "Pick game\|Game engine\|Game:\|Pick a game" cli/scaffold.js
```

Replace user-visible occurrences as follows:
- "Pick game" / "Pick game engine" → "Pick engine"
- Help text mentioning `--game` flag (engine sense) → "`--engine` (alias: `--game`)"
- The summary panel "Engine:" stays as-is.

The `--game` flag itself **stays** — recreate commands depend on it. No deprecation warnings.

- [ ] **Step 2: Update web wizard sub-step heading**

In `cli/wizard-ui/src/steps/StepStack.tsx`, find the engine selection sub-step. Rename the heading from "Game" (or similar) to "Engine". Ensure the existing `StepGames` step's heading clearly says "Game" (the pre-built game pick) — adjust if it currently says something ambiguous.

- [ ] **Step 3: Smoke-test the CLI prompt**

```bash
node cli/scaffold.js
# Walk through to the engine prompt; confirm it says "Pick engine" (or similar)
# Ctrl+C to exit
```

- [ ] **Step 4: Run the harness**

```bash
node scripts/verify-antigravfix.js
```

Expected: still green. (Terminology fixes are user-facing only; output unchanged.)

- [ ] **Step 5: Commit**

```bash
git add cli/scaffold.js cli/wizard-ui/src/steps/StepStack.tsx
git commit -m "ux(wizard): standardise engine-vs-game terminology in user-facing labels"
```

### Task 19: 6b — Surface module implications

**Files:**
- Modify: `cli/scaffold.js` (modules prompt + summary panel)

- [ ] **Step 1: Find the modules prompt**

```bash
grep -n "Modules:\|Available modules\|implies\|resolveImplied" cli/scaffold.js
```

- [ ] **Step 2: Append "(adds: …)" to module choices**

For each module shown in the prompt list, look up its manifest's `implies` array. If non-empty, append `(adds: <comma-separated>)` to the displayed line:

```js
function moduleLabel(manifest) {
  const base = manifest.name || manifest.id;
  if (!manifest.implies?.length) return base;
  return `${base}  (adds: ${manifest.implies.join(', ')})`;
}
```

- [ ] **Step 3: Update the summary panel**

In the section that prints the resolved modules list, separate user-picked from auto-implied:

```js
const userPicked  = modules.filter(m => !impliedBy[m]);
const autoImplied = modules.filter(m =>  impliedBy[m]);
console.log(`  Modules: ${userPicked.join(', ')}` +
  (autoImplied.length ? `  (auto: implied by ${[...new Set(Object.values(impliedBy))].join(', ')})` : ''));
```

(`impliedBy` is built during `resolveImplied()`. If that function doesn't return it, refactor to return `{ modules, impliedBy }` and update the call site.)

- [ ] **Step 4: Smoke-test**

```bash
node cli/scaffold.js --name=ux-test --cape-id=99999 --market=NL --game=unity --module=leaderboard --yes 2>&1 | grep -A3 "Modules:"
```

Expected: shows `leaderboard` user-picked and `scoring  (auto: implied by leaderboard)`.

- [ ] **Step 5: Run the harness — confirm green**

- [ ] **Step 6: Commit**

```bash
git add cli/scaffold.js
git commit -m "ux(scaffold): surface module implication chains in prompt + summary"
```

### Task 20: 6c — Live route preview in CLI page picker

**Files:**
- Modify: `cli/scaffold.js` (page picker prompt, summary panel)

- [ ] **Step 1: Find the page picker**

```bash
grep -n "Campaign pages\|Pick pages\|Pages:" cli/scaffold.js
```

- [ ] **Step 2: After each page-picker selection, print the route table**

Add a helper:

```js
function printPageTable(pages) {
  if (!pages.length) { console.log('  (no pages selected)'); return; }
  console.log('Selected pages so far:');
  pages.forEach((pageId, i) => {
    const route = routeFor(pageId);
    console.log(`  ${i + 1}. ${route.padEnd(14)} (instance: ${pageId})`);
  });
}
```

Call it immediately after the page picker resolves selections (before moving to the next prompt). Also call it from the summary panel, *replacing* the bare `Pages: video, landing, ...` line.

- [ ] **Step 3: Smoke-test**

```bash
node cli/scaffold.js
# Walk through to page selection; pick video, landing, video, game, result
# Confirm route table prints with /video and /video-2 distinct rows
```

- [ ] **Step 4: Run the harness — confirm green**

- [ ] **Step 5: Commit**

```bash
git add cli/scaffold.js
git commit -m "ux(scaffold): live route table in page picker + summary"
```

### Task 21: 6d — Validation gates (3 rules)

**Files:**
- Modify: `cli/scaffold.js` (validation function called before scaffold)
- Modify: `cli/scaffold.test.js` (tests for the gates)
- Modify: `cli/wizard-server/server.js` (server-side schema + the same checks)

- [ ] **Step 1: Write tests for the gates**

In `cli/scaffold.test.js`, add:

```js
import { validateConfig } from './scaffold.js';

console.log('validateConfig() gates');
t('rejects engine=none with a game page', () => {
  const errs = validateConfig({ game: 'none', pages: ['landing', 'game', 'result'] });
  assert.ok(errs.some(e => /game.+page.+requires an engine/i.test(e)),
    'expected an engine-required error');
});
t('rejects video-2 without video', () => {
  const errs = validateConfig({ game: 'unity', pages: ['video-2', 'game', 'result'] });
  assert.ok(errs.some(e => /requires a `video` page first/i.test(e)),
    'expected an instance-base error');
});
t('warns (not errors) when engine is set but no game page', () => {
  const result = validateConfig({ game: 'unity', pages: ['landing', 'video', 'result'] });
  // validateConfig returns { errors, warnings } if warnings exist; otherwise array-of-errors only.
  // Adapt assertions to whatever shape you choose — the convention is locked here:
  const warnings = Array.isArray(result) ? [] : result.warnings ?? [];
  assert.ok(warnings.some(w => /engine.+selected.+no.+game.+page/i.test(w)),
    'expected an engine-without-game warning');
});
t('passes a valid config', () => {
  const errs = validateConfig({ game: 'unity', pages: ['video', 'landing', 'video-2', 'game', 'result'] });
  const errors = Array.isArray(errs) ? errs : errs.errors;
  assert.equal(errors.length, 0);
});
```

- [ ] **Step 2: Run tests — fail**

```bash
node cli/scaffold.test.js
```

Expected: `validateConfig` is undefined.

- [ ] **Step 3: Implement `validateConfig()`**

In `cli/scaffold.js`:

```js
export function validateConfig({ game, pages }) {
  const errors = [];
  const warnings = [];

  const hasGamePage = pages.some(p => basePageType(p) === 'game');
  if (game === 'none' && hasGamePage) {
    errors.push('`game` page requires an engine. Add --engine=unity|r3f|phaser or remove the `game` page.');
  }
  if (game !== 'none' && !hasGamePage) {
    warnings.push(`Engine "${game}" selected but no \`game\` page is in the flow. The runtime won't render. Continue anyway?`);
  }

  for (const p of pages) {
    const m = p.match(/^([a-z]+)-(\d+)$/);
    if (!m) continue;
    const base = m[1];
    if (!pages.includes(base)) {
      errors.push(`\`${p}\` is a duplicate instance and requires a \`${base}\` page first.`);
    }
  }

  return { errors, warnings };
}
```

- [ ] **Step 4: Wire it into the scaffold flow**

After all prompts (or after `parseArgs` in `--yes` mode), call `validateConfig`. On `errors.length > 0`, print and exit 1. On `warnings.length > 0` and not `--yes`, prompt `[y/N]`; in `--yes` mode, print warning and continue.

- [ ] **Step 5: Mirror the validation server-side**

In `cli/wizard-server/server.js`, after JSON-schema validation but before spawning scaffold.js, import and call `validateConfig`. On errors, return HTTP 400 with the error array. On warnings, include them in the success response so the UI can show them.

```js
import { validateConfig } from '../scaffold.js';

// inside the /api/scaffold POST handler:
const { errors, warnings } = validateConfig(body);
if (errors.length) {
  return reply.code(400).send({ errors });
}
if (warnings.length) {
  // proceed but include warnings in the SSE stream as info-level lines
  job.buffered.push({ level: 'warn', line: warnings.join('\n'), ts: Date.now() });
}
```

- [ ] **Step 6: Run tests + harness — green**

```bash
node cli/scaffold.test.js
node scripts/verify-antigravfix.js
```

- [ ] **Step 7: Commit**

```bash
git add cli/scaffold.js cli/scaffold.test.js cli/wizard-server/server.js
git commit -m "ux(scaffold): validation gates for engine/game-page coherence and instance bases"
```

### Task 22: 6e — Helper text for cryptic fields

**Files:**
- Modify: `cli/scaffold.js` (CLI prompt printers)
- Modify: `cli/wizard-ui/src/steps/StepProject.tsx` (Market, Output dir helpers)
- Modify: `cli/wizard-ui/src/steps/StepCape.tsx` (CAPE ID helper)

- [ ] **Step 1: Add CLI helper-text under each prompt**

In `cli/scaffold.js`, find the market prompt, output-dir prompt, and cape-id prompt. Below each, print a dim-coloured one-liner:

```js
// Market:
console.log(c.dim('  Two-letter country code. Drives default language, GDPR copy, and CAPE locale. Example: NL'));
// Output directory:
const resolvedAbs = path.resolve(process.cwd(), defaultOutputDir);
console.log(c.dim(`  Where to scaffold the project. Default ${defaultOutputDir} resolves to: ${resolvedAbs}`));
// CAPE ID:
console.log(c.dim('  Existing campaign to bind to. Leave blank to create a new one in the next step.'));
```

(`c.dim` is whatever ANSI helper is in use; reuse the existing pattern.)

- [ ] **Step 2: Add web-UI helper text**

In `StepProject.tsx`, locate the Market and Output Directory inputs. The existing component pattern probably accepts a `helperText` prop or renders a sibling `<p class="helper">`. Use the same pattern:

```tsx
<TextInput label="Market" value={market} onChange={setMarket}
  helperText="Two-letter country code. Drives default language, GDPR copy, and CAPE locale. Example: NL" />

<TextInput label="Output directory" value={outputDir} onChange={setOutputDir}
  helperText={`Where to scaffold the project. Default \`../${name}\` resolves to: ${resolvedAbsoluteOutput}`} />
```

In `StepCape.tsx`, the CAPE ID input gets:

```tsx
<TextInput label="CAPE ID" ... helperText="Existing campaign to bind to. Leave blank to create a new one in the next step." />
```

If the existing component doesn't have a helper-text slot, add one — single-line `<p>` with a `.helper` class styled to match the wizard theme.

- [ ] **Step 3: Smoke-test both surfaces**

CLI: walk through prompts, confirm dim helper text appears.
Web: `npm run wizard`, confirm helper text under each field.

- [ ] **Step 4: Run the harness — green**

- [ ] **Step 5: Commit**

```bash
git add cli/scaffold.js cli/wizard-ui/src/steps/
git commit -m "ux(wizard): helper text for Market, Output dir, CAPE ID"
```

### Task 23: 6f — CLI back-navigation parity

**Files:**
- Modify: `cli/scaffold.js`

- [ ] **Step 1: Identify each prompt as a candidate function**

Scan `runWizard()` for prompt blocks. For each (project name, cape ID, market, engine, game pick, pages, modules, regMode, gtmId, iframe, output), confirm it's a clearly-bounded chunk of prompt code.

- [ ] **Step 2: Extract each prompt into a `promptXxx(state)` function**

Refactor each block into a callable that takes the running `state` object, prompts, mutates `state`, and returns it:

```js
async function promptName(state) {
  while (true) {
    const v = await ask('Project name (kebab-case): ', state.name);
    if (/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(v)) { state.name = v; return state; }
    console.log(c.red('  Invalid. Use lowercase letters, digits, and hyphens.'));
  }
}
async function promptCapeId(state)   { /* ... */ }
async function promptMarket(state)   { /* ... */ }
async function promptEngine(state)   { /* ... */ }
async function promptGame(state)     { /* ... */ }
async function promptPages(state)    { /* ... */ }
async function promptModules(state)  { /* ... */ }
async function promptRegMode(state)  { /* ... */ }
async function promptGtmId(state)    { /* ... */ }
async function promptIframe(state)   { /* ... */ }
async function promptOutput(state)   { /* ... */ }
```

`runWizard` becomes a sequence of `state = await promptX(state)` calls.

- [ ] **Step 3: Extend the edit menu**

Find the existing post-summary edit loop (the one that asks `[y/n/e]`). Replace its hard-coded 6-option menu with a generated one keyed on the prompt functions:

```js
const EDIT_OPTIONS = [
  { key: '1', label: 'Project name',      fn: promptName },
  { key: '2', label: 'CAPE ID',           fn: promptCapeId },
  { key: '3', label: 'Market',            fn: promptMarket },
  { key: '4', label: 'Engine',            fn: promptEngine },
  { key: '5', label: 'Game pick',         fn: promptGame },
  { key: '6', label: 'Pages',             fn: promptPages },
  { key: '7', label: 'Modules',           fn: promptModules },
  { key: '8', label: 'Registration mode', fn: promptRegMode },
  { key: '9', label: 'GTM ID',            fn: promptGtmId },
  { key: '10', label: 'Iframe',           fn: promptIframe },
  { key: '11', label: 'Output dir',       fn: promptOutput },
];

async function editLoop(state) {
  while (true) {
    printSummary(state);
    const choice = await ask('Proceed? [y]es / [n]o / [e]dit: ');
    if (choice === 'y' || choice === '') return state;
    if (choice === 'n') { console.log('Aborted.'); process.exit(0); }
    if (choice === 'e') {
      EDIT_OPTIONS.forEach(o => console.log(`  ${o.key}. ${o.label}`));
      const which = await ask('Edit which? ');
      const target = EDIT_OPTIONS.find(o => o.key === which);
      if (target) state = await target.fn(state);
    }
  }
}
```

- [ ] **Step 4: Smoke-test back-nav**

```bash
node cli/scaffold.js
# Walk through, hit 'e' at confirmation, pick "Pages", re-edit, hit 'y'
# Confirm pages were updated and summary reflects it
```

- [ ] **Step 5: Run the harness — green**

(Refactor must not change `--yes` behaviour, which skips prompts entirely. Verify by running the full chain `npm test`.)

- [ ] **Step 6: Commit**

```bash
git add cli/scaffold.js
git commit -m "ux(scaffold): refactor wizard into per-prompt functions; extend edit menu to all fields"
```

### Task 24: 6g — Add Modules step to web wizard (server)

**Files:**
- Modify: `cli/wizard-server/server.js`

- [ ] **Step 1: Add `GET /api/modules` endpoint**

In `cli/wizard-server/server.js`, after the existing route handlers:

```js
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

function loadModuleCatalog() {
  const modulesDir = join(SCAFFOLDER_ROOT, 'modules');
  const out = [];
  for (const name of readdirSync(modulesDir)) {
    const manifestPath = join(modulesDir, name, 'manifest.json');
    try {
      const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
      out.push({
        id:          m.id || name,
        name:        m.name || name,
        description: m.description || '',
        implies:     m.implies || [],
        packages:    m.packages || [],
        engine:      m.engine,  // some modules are engine-bound (unity/phaser/r3f)
      });
    } catch (_) { /* skip malformed manifests */ }
  }
  return out;
}

const MODULE_CATALOG = loadModuleCatalog();

fastify.get('/api/modules', async () => MODULE_CATALOG);
```

- [ ] **Step 2: Smoke-test**

```bash
node cli/wizard.js  # in one terminal
curl http://localhost:3737/api/modules | jq '.[0]'
```

Expected: JSON array with id/name/description/implies. Sample first item shows e.g. unity or audio.

- [ ] **Step 3: Commit**

```bash
git add cli/wizard-server/server.js
git commit -m "ux(wizard-server): expose GET /api/modules for the new Modules step"
```

### Task 25: 6g — Add Modules step to web wizard (UI)

**Files:**
- Create: `cli/wizard-ui/src/steps/StepModules.tsx`
- Modify: `cli/wizard-ui/src/App.tsx`
- Modify: `cli/wizard-ui/src/shared/config.ts` (if module list / gtmId aren't already in `ScaffoldConfig`)

- [ ] **Step 1: Create `StepModules.tsx`**

Mirror the pattern of `StepGames.tsx` (card grid, info panel, validate function). Skeleton:

```tsx
import { useEffect, useState } from 'react';
import type { ScaffoldConfig } from '../shared/config';

interface ModuleEntry {
  id: string;
  name: string;
  description: string;
  implies: string[];
  packages: string[];
  engine?: string;
}

interface Props {
  config: ScaffoldConfig;
  onChange: (next: Partial<ScaffoldConfig>) => void;
}

export default function StepModules({ config, onChange }: Props) {
  const [catalog, setCatalog] = useState<ModuleEntry[]>([]);

  useEffect(() => {
    fetch('/api/modules').then(r => r.json()).then(setCatalog);
  }, []);

  // Auto-implied modules from page picks (server-side resolveImplied also runs;
  // this is for visual feedback only):
  const autoFromPages = autoModulesForPages(config.pages || []);
  const transitivelyImplied = resolveTransitive(autoFromPages, catalog);
  const userPicked = config.modules || [];

  const isAutoImplied = (id: string) => transitivelyImplied.has(id) && !userPicked.includes(id);

  function toggle(id: string) {
    if (isAutoImplied(id)) return;  // disabled
    const next = userPicked.includes(id)
      ? userPicked.filter(x => x !== id)
      : [...userPicked, id];
    onChange({ modules: next });
  }

  return (
    <div className="step step-modules">
      <h2>Modules</h2>
      <p className="helper">Optional add-ons. Modules implied by your page or engine choices are pre-checked.</p>
      <div className="card-grid">
        {catalog.map(m => {
          const checked = userPicked.includes(m.id) || isAutoImplied(m.id);
          const auto = isAutoImplied(m.id);
          return (
            <label key={m.id} className={`card ${checked ? 'is-checked' : ''} ${auto ? 'is-auto' : ''}`}>
              <input type="checkbox" checked={checked} disabled={auto} onChange={() => toggle(m.id)} />
              <div className="card-title">{m.name}</div>
              <div className="card-desc">{m.description}</div>
              {m.implies.length > 0 && (
                <div className="badge">implies: {m.implies.join(', ')}</div>
              )}
              {auto && (
                <div className="badge badge-auto">auto-added by your selections</div>
              )}
              {m.id === 'gtm' && checked && (
                <input
                  className="inline-input"
                  type="text"
                  placeholder="GTM-XXXXXX"
                  value={config.gtmId || ''}
                  onChange={e => onChange({ gtmId: e.target.value })}
                />
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

StepModules.validate = (_config: ScaffoldConfig) => null;  // no required fields

// ---- helpers ----
function autoModulesForPages(pages: string[]): Set<string> {
  const auto = new Set<string>();
  if (pages.includes('register'))    auto.add('registration');
  if (pages.includes('leaderboard')) auto.add('leaderboard');
  if (pages.includes('voucher'))     auto.add('voucher');
  return auto;
}

function resolveTransitive(seed: Set<string>, catalog: ModuleEntry[]): Set<string> {
  const out = new Set(seed);
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of catalog) {
      if (out.has(m.id)) {
        for (const i of m.implies) {
          if (!out.has(i)) { out.add(i); changed = true; }
        }
      }
    }
  }
  return out;
}
```

- [ ] **Step 2: Insert `StepModules` into the App flow**

In `cli/wizard-ui/src/App.tsx`, find the steps array (or whatever drives the breadcrumb). Add `StepModules` between `StepGames` and `StepCape`:

```tsx
import StepModules from './steps/StepModules';

const STEPS = [
  { id: 'stack',   label: 'Stack',    component: StepStack },
  { id: 'project', label: 'Project',  component: StepProject },
  { id: 'pages',   label: 'Pages',    component: StepPages },
  { id: 'games',   label: 'Game',     component: StepGames },
  { id: 'modules', label: 'Modules',  component: StepModules },  // <-- NEW
  { id: 'cape',    label: 'CAPE',     component: StepCape },
  { id: 'build',   label: 'Build',    component: StepBuild },
];
```

- [ ] **Step 3: Update `ScaffoldConfig` shared type if needed**

In `cli/wizard-ui/src/shared/config.ts`, ensure these fields exist:

```ts
export interface ScaffoldConfig {
  // ... existing fields
  modules: string[];
  gtmId?: string;
}
```

If they were already there, no change.

- [ ] **Step 4: Smoke-test the UI**

```bash
npm run wizard
```

Open `http://localhost:5173`. Walk through to the new Modules step. Confirm:
- Module cards appear from `/api/modules`
- Auto-implied modules are pre-checked and disabled
- GTM card shows inline input when checked
- Selection survives navigating back/forward

- [ ] **Step 5: Run the harness — green**

```bash
npm test
```

UI changes don't affect output for the recreate command (which uses CLI flags, not the wizard). Harness must still be green.

- [ ] **Step 6: Commit**

```bash
git add cli/wizard-ui/src/steps/StepModules.tsx cli/wizard-ui/src/App.tsx cli/wizard-ui/src/shared/config.ts
git commit -m "ux(wizard-ui): add StepModules between Game and CAPE"
```

---

## Phase 7 — Final verification & merge

### Task 26: Full green-light pass

- [ ] **Step 1: Run the full test chain**

```bash
npm test
```

All three runners green:
- `cape-format-builder.test.js`
- `scaffold.test.js`
- `verify-antigravfix.js`

- [ ] **Step 2: Walk both wizards end-to-end manually**

Web wizard (`npm run wizard`):
- Stack → Engine label says "Engine" ✓
- Project → Market and Output have helper text ✓
- Pages → flow with /video and /video-2 visible ✓
- Game → game pick clearly distinct from engine ✓
- Modules → new step with cards, GTM inline input, auto-implied badges ✓
- CAPE → CAPE ID has helper text ✓
- Build → succeeds, output matches expected

CLI (`node cli/scaffold.js`):
- Engine prompt says "Pick engine" ✓
- Page picker prints route table after selection ✓
- Modules prompt shows `(adds: scoring)` ✓
- Summary panel shows route table + auto-implied ✓
- Edit menu offers all 11 fields ✓
- Validation gates trigger (try `--page=video-2` without `video`)

- [ ] **Step 3: Tag the green commit**

```bash
git tag antigravfix-parity-complete
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "Antigravfix parity + wizard UX upgrades" --body "$(cat <<'EOF'
Implements the spec in docs/superpowers/specs/2026-05-06-antigravfix-parity-design.md.

## What changed

- **Parity (workstreams 1–5):** Templates, modules, page-instance generation, cape-format builder, and writer parity all aligned with antigravfix/. The recreate command in antigravfix/SCAFFOLD_DEBUG.json now produces byte-identical output.
- **UX (workstream 6):** Seven sub-improvements landed — terminology, module implications, route preview, validation gates, helper text, CLI back-nav, web Modules step.
- **Verification:** scripts/verify-antigravfix.js wired into npm test as a regression guard.

## Verification

```
npm test
```

All green. Tag: antigravfix-parity-complete.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

**Spec coverage** (each spec workstream → covered task):
- Workstream 1 (template copy-back): Tasks 1, 2, 3 ✓
- Workstream 2 (module copy-back): Tasks 4, 5 ✓
- Workstream 3 (page-instance support): Tasks 6, 7, 8, 9, 10, 11 ✓
- Workstream 4 (cape-format field gap): Tasks 12, 13a–13h, 14 ✓
- Workstream 5a (.scaffolded writer): Task 15 ✓
- Workstream 5b (checklist writer): Task 16 ✓
- Workstream 5c (verification harness): Task 0 ✓
- Workstream 6a–6g (UX): Tasks 18, 19, 20, 21, 22, 23, 24, 25 ✓
- Final verification: Task 17 (parity-green tag), Task 26 (full pass) ✓

**Type / name consistency:**
- `basePageType` and `routeFor` used consistently across Tasks 7, 8, 9, 10, 11, 15, 21.
- `validateConfig` returns `{ errors, warnings }` (defined in Task 21, used in Task 26).
- `WIZARD_DEFAULTS` defined in Task 15, no later references.
- `INSTANCE_RE` regex consistent across helpers and validation.

**No placeholders:** All steps contain concrete code or exact commands. The only "you'll discover this from the data" task is 13a–13h (cape-format edits), which is deliberate — Task 12 produces the classification document that drives them.
