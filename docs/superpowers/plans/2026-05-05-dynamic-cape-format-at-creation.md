# Dynamic CAPE Format at Campaign Creation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix CAPE campaign creation so the format pushed at creation time only contains the pages and modules the user actually selected, for all stacks.

**Architecture:** Two broken call sites in `cli/scaffold.js` pass `null` as the `formatOverride` to `runCapeCreateFlow`, causing it to fall back to a static all-pages format file. We build the correct dynamic format from the available config at each site and pass it as the override. The static file and the `--repush-format` sub-command that consumed it are removed.

**Tech Stack:** Node.js ESM, `cli/scaffold.js`, `cli/cape-client.js`, `cli/cape-format-builder.js`

---

### Task 1: Remove the static format file and `SCAFFOLDER_FORMAT_FILE` export

**Files:**
- Delete: `formats/scaffolder-format.json`
- Modify: `cli/cape-client.js:29-30`
- Modify: `cli/scaffold.js` — remove `SCAFFOLDER_FORMAT_FILE` from the import at line 35

**Context:** `formats/scaffolder-format.json` contains a hardcoded all-pages format. It is exported as `SCAFFOLDER_FORMAT_FILE` from `cape-client.js` and imported in `scaffold.js`. After this task it must not be referenced anywhere.

- [ ] **Step 1: Delete the static format file**

  Delete `formats/scaffolder-format.json`. If the `formats/` directory is now empty, delete that too.

  ```bash
  rm formats/scaffolder-format.json
  rmdir formats   # only if empty; ignore error if not
  ```

- [ ] **Step 2: Remove `SCAFFOLDER_FORMAT_FILE` from `cape-client.js`**

  In `cli/cape-client.js`, find and remove these two lines (around line 26-30):

  ```js
  /** Base format all new scaffolded campaigns are created from. */
  export const DEFAULT_FORMAT_PATH = 'livewall_scaffolder_test';

  /** Bundled interfaceSetup + publishProfiles for scaffolded campaigns. */
  export const SCAFFOLDER_FORMAT_FILE = resolve(SCAFFOLDER_ROOT, 'formats', 'scaffolder-format.json');
  ```

  Replace with just:

  ```js
  /** Base format all new scaffolded campaigns are created from. */
  export const DEFAULT_FORMAT_PATH = 'livewall_scaffolder_test';
  ```

  (`resolve` is still used for `SCAFFOLDER_ROOT` on line 17 — do not remove the `resolve` import.)

- [ ] **Step 3: Remove `SCAFFOLDER_FORMAT_FILE` from the import in `scaffold.js`**

  In `cli/scaffold.js`, find the import line (around line 35):

  ```js
  import { checkAuth, login, clearTokenCache, createCampaign, pushFormat, populateDefaults, publishCampaign, SCAFFOLDER_FORMAT_FILE } from './cape-client.js';
  ```

  Remove `SCAFFOLDER_FORMAT_FILE` from the named imports:

  ```js
  import { checkAuth, login, clearTokenCache, createCampaign, pushFormat, populateDefaults, publishCampaign } from './cape-client.js';
  ```

- [ ] **Step 4: Verify the module still loads**

  ```bash
  node --input-type=module <<'EOF'
  import './cli/cape-client.js';
  console.log('ok');
  EOF
  ```

  Expected output: `ok`

- [ ] **Step 5: Commit**

  ```bash
  git add cli/cape-client.js cli/scaffold.js
  git rm formats/scaffolder-format.json
  git commit -m "chore: remove static scaffolder-format.json and SCAFFOLDER_FORMAT_FILE export"
  ```

---

### Task 2: Remove the `--repush-format` sub-command from `scaffold.js`

**Files:**
- Modify: `cli/scaffold.js:2782-2827`

**Context:** `--repush-format` was the only remaining user of the static format file. It is unused in practice. The block to remove starts at `if (args.repushFormat) {` and ends at `return;` — roughly lines 2782–2827. After removing it, the `repushFormat` property on `args` can be left as-is in `parseArgs` (harmless) or removed too — leave it as-is to keep this task minimal.

- [ ] **Step 1: Remove the `--repush-format` block**

  In `cli/scaffold.js`, find and delete the entire block starting with:

  ```js
  // ── Repush format mode: push scaffolder format + publishProfiles to existing campaign ──
  if (args.repushFormat) {
  ```

  and ending with (inclusive):

  ```js
    console.log(`\n  ${c.green('✓')}  Done. Open the campaign in CAPE and verify the Publish tab is visible.\n`);
    return;
  }
  ```

  The next non-blank line after removal should be the `// ── Recreate mode` comment.

- [ ] **Step 2: Verify `scaffold.js` still parses**

  ```bash
  node --input-type=module <<'EOF'
  import('./cli/scaffold.js');
  EOF
  ```

  Expected: no syntax errors (the process will try to run `main()` but that's fine — Ctrl-C after a second).

  Alternatively, just check for syntax:

  ```bash
  node --check cli/scaffold.js
  ```

  Expected output: nothing (exit 0).

- [ ] **Step 3: Commit**

  ```bash
  git add cli/scaffold.js
  git commit -m "chore: remove unused --repush-format sub-command"
  ```

---

### Task 3: Clean up `runCapeCreateFlow` — remove static file fallback

**Files:**
- Modify: `cli/scaffold.js:124-134` (inside `runCapeCreateFlow`)

**Context:** `runCapeCreateFlow` currently falls back to the deleted static file when `formatOverride` is `null`. After Tasks 1 and 2 that fallback would throw a `readFileSync` error. We simplify it: use the override directly, and if it is missing, use an empty format so that `populateDefaults` (which follows) still receives a valid `interfaceSetup`.

Current code (around lines 124–134):

```js
// 4. Push format — use dynamic override if provided, else static scaffolder-format.json
process.stdout.write(`  ${c.dim('Pushing format...')} `);
let formatFile;
try {
  formatFile = formatOverride ?? JSON.parse(readFileSync(SCAFFOLDER_FORMAT_FILE, 'utf8'));
  await pushFormat(tokens, campaignId, formatFile);
  console.log(`${c.green('✓')}`);
} catch (err) {
  console.log(`${c.yellow('⚠')}  ${err.message} (continuing)`);
  if (!formatFile) formatFile = { interfaceSetup: { pages: [] } };
}
```

- [ ] **Step 1: Replace the fallback line**

  Replace the block above with:

  ```js
  // 4. Push format — dynamic format built from scaffold selections
  process.stdout.write(`  ${c.dim('Pushing format...')} `);
  let formatFile = formatOverride ?? { interfaceSetup: { pages: [] }, publishProfiles: {} };
  try {
    await pushFormat(tokens, campaignId, formatFile);
    console.log(`${c.green('✓')}`);
  } catch (err) {
    console.log(`${c.yellow('⚠')}  ${err.message} (continuing)`);
  }
  ```

  The `readFileSync` call and `SCAFFOLDER_FORMAT_FILE` reference are gone. The empty-format fallback is inlined into the declaration so `formatFile` is always defined.

- [ ] **Step 2: Check `readFileSync` is no longer used for format loading**

  Verify `readFileSync` still has other legitimate uses in the file (it does — it's used to read `.scaffolded`, `mock-cape.json`, etc.), so do not remove the import.

  Quick check:

  ```bash
  grep -n "SCAFFOLDER_FORMAT_FILE" cli/scaffold.js
  ```

  Expected: no output.

- [ ] **Step 3: Syntax check**

  ```bash
  node --check cli/scaffold.js
  ```

  Expected: exit 0, no output.

- [ ] **Step 4: Commit**

  ```bash
  git add cli/scaffold.js
  git commit -m "fix: remove static format fallback from runCapeCreateFlow"
  ```

---

### Task 4: Fix the web wizard / `--config` path

**Files:**
- Modify: `cli/scaffold.js` — the config-file branch, around lines 2924–2986

**Context:** In the config-file branch (`if (configPath)`), the page normalization (`rawPages → pageIds + pageTypes`) currently sits AFTER the `if (cfg.createCape)` block. We move it above so it is available when building the format. Then inside `if (cfg.createCape)` we build the format and pass it as `formatOverride`. The original normalization block is then removed (it would be a duplicate).

Current structure (condensed):

```js
const market = cfg.market ?? 'NL';

// lines 2927–2950
let capeId = cfg.capeId ?? '';
...
if (cfg.createCape) {
  ...
  const created = await runCapeCreateFlow(null, cfg.name, market, autoTitle);   // ← broken
  ...
}

// lines 2964–2986
const game = cfg.game ?? 'unity';
const selectedGame = ...
const rawPages = Array.isArray(cfg.pages) ? cfg.pages : [];
const pageIds  = [];
const pageTypes = {};
for (const entry of rawPages) { ... }
const pages = pageIds;
const extraModules = cfg.modules ?? [];
const allTypes = pageIds.map(id => pageTypes[id] ?? id);
const resolvedModules = resolveModules(game, allTypes, extraModules);
```

- [ ] **Step 1: Move `rawPages`/`pageIds`/`pageTypes` normalization above the `createCape` block**

  Cut the following lines from their current position (around line 2969):

  ```js
  const rawPages       = Array.isArray(cfg.pages) ? cfg.pages : [];
  const pageIds        = [];
  const pageTypes      = {};
  for (const entry of rawPages) {
    if (typeof entry === 'string') {
      pageIds.push(entry);
      // type === id by convention; no entry needed in pageTypes.
    } else if (entry && typeof entry === 'object' && entry.id) {
      pageIds.push(entry.id);
      if (entry.type && entry.type !== entry.id) pageTypes[entry.id] = entry.type;
    }
  }
  ```

  Paste them immediately after `const market = cfg.market ?? 'NL';` (around line 2924), so they appear before the `let capeId` declaration.

  The `const pages = pageIds;` alias and the `game`, `selectedGame`, `extraModules`, `allTypes`, `resolvedModules` lines remain in their original place.

- [ ] **Step 2: Build the format and pass it inside `if (cfg.createCape)`**

  Replace:

  ```js
  if (cfg.createCape) {
    // Check cached auth FIRST so we fail fast with a clean error instead of
    // hanging on a child-process readline prompt that has no stdin.
    const cached = await checkAuth();
    if (!cached) {
      throw new Error(
        'CAPE auth required for createCape mode, but no cached login found.\n' +
        '  → Run `node cli/scaffold.js` once interactively to log in, then retry the wizard.'
      );
    }
    const autoTitle = (cfg.capeTitle && cfg.capeTitle.trim())
      ? cfg.capeTitle.trim()
      : cfg.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    console.log(`\n  ${c.bold('Creating CAPE campaign...')}`);
    const created = await runCapeCreateFlow(null, cfg.name, market, autoTitle);
    capeId            = created.campaignId;
    capeAutoPublished = true;
    capePublishedUrl  = created.publishedUrl || '';
    console.log('');
  }
  ```

  With:

  ```js
  if (cfg.createCape) {
    // Check cached auth FIRST so we fail fast with a clean error instead of
    // hanging on a child-process readline prompt that has no stdin.
    const cached = await checkAuth();
    if (!cached) {
      throw new Error(
        'CAPE auth required for createCape mode, but no cached login found.\n' +
        '  → Run `node cli/scaffold.js` once interactively to log in, then retry the wizard.'
      );
    }
    const autoTitle = (cfg.capeTitle && cfg.capeTitle.trim())
      ? cfg.capeTitle.trim()
      : cfg.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const cfgStack = cfg.stack ?? 'next';
    const cfgFormat = cfgStack === 'tanstack'
      ? buildTanStackCapeFormat({
          pages:                  pageIds,
          tsPageElementSelections: cfg.tsPageElementSelections ?? {},
        })
      : buildNextCapeFormat({
          instances:            pageIds.map(id => ({ id, type: pageTypes[id] ?? id })),
          pageTypes,
          pageElementSelections: cfg.pageElementSelections ?? {},
          modules:               cfg.modules ?? [],
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
  ```

- [ ] **Step 3: Syntax check**

  ```bash
  node --check cli/scaffold.js
  ```

  Expected: exit 0, no output.

- [ ] **Step 4: Smoke-test the format builder with a realistic config**

  ```bash
  node --input-type=module <<'EOF'
  import { buildNextCapeFormat } from './cli/cape-format-builder.js';
  const pages = ['landing', 'game', 'result'];
  const f = buildNextCapeFormat({
    instances: pages.map(id => ({ id, type: id })),
    pageTypes: {},
    pageElementSelections: {},
    modules: [],
    flowEnabledExits: {},
    menuItemsEnabled: {},
    iframe: false,
  });
  const tabs = f.interfaceSetup.pages.find(p => p.path === 'pages')?.tabs ?? [];
  console.log('tabs:', tabs.map(t => t.path));
  EOF
  ```

  Expected output:

  ```
  tabs: [ 'header', 'desktop', 'landing', 'result', 'menu' ]
  ```

  (No `video`, `onboarding`, `leaderboard`, `registration`, or `voucher` tabs.)

- [ ] **Step 5: Commit**

  ```bash
  git add cli/scaffold.js
  git commit -m "fix: pass dynamic format to runCapeCreateFlow in web wizard path"
  ```

---

### Task 5: Fix the non-interactive `--create-cape` path

**Files:**
- Modify: `cli/scaffold.js` — the non-interactive branch, around lines 3189–3198

**Context:** In the non-interactive branch (`isNonInteractive`), `allModules` is already resolved at line 3185 before the `if (!capeId && args.createCape)` block. We build the format there and pass it as `formatOverride`.

Current code (around lines 3189–3198):

```js
let capeId = args.capeId;
if (!capeId && args.createCape) {
  const autoTitle = args.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  console.log(`\n  ${c.bold('Creating CAPE campaign...')}`);
  const createdCape = await runCapeCreateFlow(null, args.name, args.market || 'NL', autoTitle);
  capeId = createdCape.campaignId;
  capeAutoPublished = true;
  capePublishedUrl = createdCape.campaignPublishedUrl || '';
  console.log('');
}
```

- [ ] **Step 1: Replace the `runCapeCreateFlow` call with a format-aware version**

  Replace the block above with:

  ```js
  let capeId = args.capeId;
  if (!capeId && args.createCape) {
    const autoTitle = args.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const formatPages = args.pages.length > 0
      ? args.pages
      : (stack === 'tanstack' ? ['launch', 'tutorial', 'game', 'score'] : buildDefaultPages(args.game || ''));

    const argsFormat = stack === 'tanstack'
      ? buildTanStackCapeFormat({ pages: formatPages, tsPageElementSelections: {} })
      : buildNextCapeFormat({
          pages:                formatPages,
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
  ```

- [ ] **Step 2: Syntax check**

  ```bash
  node --check cli/scaffold.js
  ```

  Expected: exit 0, no output.

- [ ] **Step 3: Smoke-test with TanStack pages**

  ```bash
  node --input-type=module <<'EOF'
  import { buildTanStackCapeFormat } from './cli/cape-format-builder.js';
  const f = buildTanStackCapeFormat({ pages: ['launch', 'game', 'score'], tsPageElementSelections: {} });
  const tabs = f.interfaceSetup.pages.find(p => p.path === 'pages')?.tabs ?? [];
  console.log('ts tabs:', tabs.map(t => t.path));
  EOF
  ```

  Expected output:

  ```
  ts tabs: [ 'desktop' ]
  ```

  `launch` and `score` tabs return `null` when `tsPageElementSelections` is empty (those tab functions require at least one element to be toggled on). The important thing is that `tutorial` and `register` are absent — they were not in the pages list. In the interactive TanStack CLI path, element selections are always passed so tabs are non-empty; the non-interactive path produces a minimal format.

- [ ] **Step 4: Commit**

  ```bash
  git add cli/scaffold.js
  git commit -m "fix: pass dynamic format to runCapeCreateFlow in non-interactive CLI path"
  ```

---

### Task 6: Verify no remaining references to the deleted file or export

- [ ] **Step 1: Grep for any remaining references**

  ```bash
  grep -rn "scaffolder-format\|SCAFFOLDER_FORMAT_FILE" cli/ formats/ --include="*.js" --include="*.ts" --include="*.json"
  ```

  Expected: no output.

- [ ] **Step 2: Confirm the `formats/` directory is gone**

  ```bash
  node -e "const fs = require('fs'); console.log(fs.existsSync('formats'));"
  ```

  Expected output: `false`

- [ ] **Step 3: Full syntax check on both touched files**

  ```bash
  node --check cli/scaffold.js && node --check cli/cape-client.js && echo "all ok"
  ```

  Expected output: `all ok`

- [ ] **Step 4: Final commit (cleanup / docs update)**

  Update the jsdoc comment on `runCapeCreateFlow` in `scaffold.js` to remove the mention of the static file:

  Find (around line 59):

  ```js
   * @param {object|null}   formatOverride  dynamically generated format; falls back to static scaffolder-format.json
  ```

  Replace with:

  ```js
   * @param {object|null}   formatOverride  dynamically generated format; uses empty format if omitted
  ```

  Then commit:

  ```bash
  git add cli/scaffold.js
  git commit -m "docs: update runCapeCreateFlow jsdoc after static format removal"
  ```
