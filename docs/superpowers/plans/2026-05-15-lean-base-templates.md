# Lean Base Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two generic base templates (`next/`, `tanstack/`) with six lean, engine-specific templates that have engine code baked in, and remove the three engine modules (unity, r3f, phaser).

**Architecture:** A one-time Node.js generation script copies the existing base templates and applies module manifests to produce six standalone template directories. Once generated and committed, the script is deleted. The CLI's template selection is updated to use a `TEMPLATES` map keyed by `${stack}-${game||'none'}` instead of two constants.

**Tech Stack:** Node.js ESM, `fs` built-ins (cpSync, rmSync, mkdirSync), scaffold.js, npm

---

> **Naming note:** The spec used `next-pure-react` as a friendly label — the actual code value for option 5 ("Frontend") is `game='memory'`, so the template directory is `next-memory`. Option 6 ("No game") sets `game=''`, so the key becomes `next-none` via `game || 'none'`.

---

## File Map

| Action | Path |
|--------|------|
| Create | `scripts/generate-templates.mjs` (deleted after use in Task 3) |
| Create | `base-templates/next-unity/` |
| Create | `base-templates/next-r3f/` |
| Create | `base-templates/next-phaser/` |
| Create | `base-templates/next-memory/` |
| Create | `base-templates/next-none/` |
| Create | `base-templates/tanstack-unity/` |
| Modify | `cli/scaffold.js` lines 41–44 (TEMPLATES map) |
| Modify | `cli/scaffold.js` line 1961 (scaffoldNext copy) |
| Modify | `cli/scaffold.js` lines 1708–1722 (scaffoldTanstack copy) |
| Modify | `cli/scaffold.js` lines 2047–2065 (delete Unity layout patch block) |
| Modify | `cli/scaffold.js` lines 1985–1993 (simplify sort — no engine flag) |
| Delete | `base-templates/next/` |
| Delete | `base-templates/tanstack/` |
| Delete | `modules/unity/` |
| Delete | `modules/r3f/` |
| Delete | `modules/phaser/` |

---

## Task 1: Write the template generation script

**Files:**
- Create: `scripts/generate-templates.mjs`

This script is a one-time migration tool. It reads the existing base templates and the three engine module manifests, then produces the six lean template directories.

- [ ] **Step 1: Create the script**

```js
// scripts/generate-templates.mjs
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT        = join(__dirname, '..');
const NEXT_SRC    = join(ROOT, 'base-templates', 'next');
const TS_SRC      = join(ROOT, 'base-templates', 'tanstack');
const MODULES_DIR = join(ROOT, 'modules');
const OUT         = join(ROOT, 'base-templates');

function copyBase(src, destName) {
  const dest = join(OUT, destName);
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, {
    recursive: true,
    filter: (s) => {
      const rel = s.slice(src.length).replace(/\\/g, '/');
      return !rel.startsWith('/node_modules') &&
             !rel.startsWith('/.next') &&
             !rel.startsWith('/dist') &&
             !rel.startsWith('/.output');
    },
  });
  return dest;
}

function applyModuleFiles(moduleId, destRoot) {
  const manifestPath = join(MODULES_DIR, moduleId, 'manifest.json');
  const manifest     = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const moduleDir    = join(MODULES_DIR, moduleId);

  for (const file of manifest.files ?? []) {
    if (!file.src || !file.dest) continue;
    if (file.requires) continue; // conditional on another module — skip
    const src  = join(moduleDir, file.src);
    const dest = join(destRoot, file.dest);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
  }

  for (const dir of manifest.copyDirs ?? []) {
    if (!dir.src || !dir.dest) continue;
    const src  = join(moduleDir, dir.src);
    const dest = join(destRoot, dir.dest);
    if (!existsSync(src)) continue;
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
  }
}

function applyUnityRootLayoutPatch(destRoot) {
  // The unity module replaces app/(campaign)/layout.tsx but the ROOT
  // app/layout.tsx also needs UnityContainer injected — same patch scaffold.js
  // applies at scaffold time (lines 2047-2065). We bake it in here instead.
  const layoutPath = join(destRoot, 'app', 'layout.tsx');
  if (!existsSync(layoutPath)) {
    console.warn('  ⚠ app/layout.tsx not found — skipping UnityContainer patch');
    return;
  }
  let src = readFileSync(layoutPath, 'utf8');
  if (src.includes('UnityContainer')) return; // already patched
  src = src.replace(
    `import DesktopWrapper from '@components/_core/DesktopWrapper/DesktopWrapper';`,
    `import DesktopWrapper from '@components/_core/DesktopWrapper/DesktopWrapper';\nimport UnityContainer from '@components/_modules/unity/UnityContainer';`,
  );
  src = src.replace(
    `          <DesktopWrapper>\n            <div className="desktop-wrapper__app-shell">\n              {children}\n            </div>\n          </DesktopWrapper>`,
    `          <DesktopWrapper>\n            <div className="desktop-wrapper__app-shell">\n              <UnityContainer>\n                {children}\n              </UnityContainer>\n            </div>\n          </DesktopWrapper>`,
  );
  writeFileSync(layoutPath, src, 'utf8');
}

// ── 1. next-unity ─────────────────────────────────────────────────────────
console.log('→ next-unity');
const nextUnity = copyBase(NEXT_SRC, 'next-unity');
applyModuleFiles('unity', nextUnity);
applyUnityRootLayoutPatch(nextUnity);

// ── 2. next-r3f ───────────────────────────────────────────────────────────
console.log('→ next-r3f');
const nextR3f = copyBase(NEXT_SRC, 'next-r3f');
applyModuleFiles('r3f', nextR3f);

// ── 3. next-phaser ────────────────────────────────────────────────────────
console.log('→ next-phaser');
const nextPhaser = copyBase(NEXT_SRC, 'next-phaser');
applyModuleFiles('phaser', nextPhaser);

// ── 4. next-memory (Frontend / pure React — no engine overlay) ────────────
console.log('→ next-memory');
copyBase(NEXT_SRC, 'next-memory');

// ── 5. next-none (CAPE-only — remove gameplay page) ───────────────────────
console.log('→ next-none');
const nextNone = copyBase(NEXT_SRC, 'next-none');
rmSync(join(nextNone, 'app', '(campaign)', 'gameplay'), { recursive: true, force: true });

// ── 6. tanstack-unity ─────────────────────────────────────────────────────
console.log('→ tanstack-unity');
copyBase(TS_SRC, 'tanstack-unity');

console.log('\n✓ All 6 templates generated.');
```

- [ ] **Step 2: Verify the script runs without error (dry-run check)**

```bash
node scripts/generate-templates.mjs
```

Expected output:
```
→ next-unity
→ next-r3f
→ next-phaser
→ next-memory
→ next-none
→ tanstack-unity

✓ All 6 templates generated.
```

---

## Task 2: Verify generated template contents

- [ ] **Step 1: Confirm next-unity has UnityGame and UnityContainer**

```bash
# Should print the path if the file exists
node -e "const {existsSync}=require('fs'); console.log(existsSync('base-templates/next-unity/components/_modules/unity/UnityGame.tsx'));"
```
Expected: `true`

- [ ] **Step 2: Confirm next-unity root layout has UnityContainer**

```bash
node -e "const {readFileSync}=require('fs'); console.log(readFileSync('base-templates/next-unity/app/layout.tsx','utf8').includes('UnityContainer'));"
```
Expected: `true`

- [ ] **Step 3: Confirm next-r3f has R3FCanvas**

```bash
node -e "const {existsSync}=require('fs'); console.log(existsSync('base-templates/next-r3f/components/_modules/R3FCanvas/R3FCanvas.tsx'));"
```
Expected: `true`

- [ ] **Step 4: Confirm next-phaser has phaser game scenes**

```bash
node -e "const {existsSync}=require('fs'); console.log(existsSync('base-templates/next-phaser/game/scenes/Main.ts'));"
```
Expected: `true`

- [ ] **Step 5: Confirm next-none has no gameplay directory**

```bash
node -e "const {existsSync}=require('fs'); console.log(existsSync('base-templates/next-none/app/(campaign)/gameplay'));"
```
Expected: `false`

- [ ] **Step 6: Confirm tanstack-unity has src/routes/**

```bash
node -e "const {existsSync}=require('fs'); console.log(existsSync('base-templates/tanstack-unity/src/routes'));"
```
Expected: `true`

---

## Task 3: Install engine-specific npm packages into r3f and phaser templates

The r3f and phaser module manifests declare npm packages. Since these are now baked into the templates, their `package.json` must include the dependencies (with resolved versions) so `npm install` works in scaffolded projects.

- [ ] **Step 1: Install r3f packages into next-r3f template**

```bash
cd base-templates/next-r3f && npm install three @react-three/fiber @react-three/drei @react-three/rapier && npm install --save-dev @types/three
```

Expected: completes without error, `package.json` and `package-lock.json` updated with pinned versions.

- [ ] **Step 2: Install phaser package into next-phaser template**

```bash
cd base-templates/next-phaser && npm install phaser
```

Expected: completes without error, `package.json` updated.

- [ ] **Step 3: Verify no unexpected changes to next-unity or next-memory package.json**

Unity module declares no npm packages (`"packages": []`), and next-memory needs no additions. Spot-check:

```bash
node -e "const p=JSON.parse(require('fs').readFileSync('base-templates/next-unity/package.json','utf8')); console.log(Object.keys(p.dependencies).includes('phaser'));"
```
Expected: `false` (unity template should not have phaser)

---

## Task 4: Commit the six generated templates and delete the script

- [ ] **Step 1: Stage the new template directories**

```bash
git add base-templates/next-unity base-templates/next-r3f base-templates/next-phaser base-templates/next-memory base-templates/next-none base-templates/tanstack-unity
```

- [ ] **Step 2: Delete the one-time generation script**

```bash
rm scripts/generate-templates.mjs
```

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "feat: add six lean engine-specific base templates"
```

---

## Task 5: Update scaffold.js — replace template constants with TEMPLATES map

**Files:**
- Modify: `cli/scaffold.js` lines 41–44

- [ ] **Step 1: Replace the two constants with a TEMPLATES map**

Find this block (lines 41–44):
```js
const NEXT_TEMPLATE      = join(SCAFFOLDER_ROOT, 'base-templates', 'next');
const TANSTACK_TEMPLATE  = join(SCAFFOLDER_ROOT, 'base-templates', 'tanstack');
// Kept as an alias so existing references still resolve during the transition.
const TANSTACK_BOILERPLATE = TANSTACK_TEMPLATE;
```

Replace with:
```js
const TEMPLATES = {
  'next-unity':    join(SCAFFOLDER_ROOT, 'base-templates', 'next-unity'),
  'next-r3f':      join(SCAFFOLDER_ROOT, 'base-templates', 'next-r3f'),
  'next-phaser':   join(SCAFFOLDER_ROOT, 'base-templates', 'next-phaser'),
  'next-memory':   join(SCAFFOLDER_ROOT, 'base-templates', 'next-memory'),
  'next-none':     join(SCAFFOLDER_ROOT, 'base-templates', 'next-none'),
  'tanstack-unity':join(SCAFFOLDER_ROOT, 'base-templates', 'tanstack-unity'),
};
```

- [ ] **Step 2: Verify no remaining references to the old constants**

```bash
node -e "
const src = require('fs').readFileSync('cli/scaffold.js', 'utf8');
const hits = ['NEXT_TEMPLATE', 'TANSTACK_TEMPLATE', 'TANSTACK_BOILERPLATE'].filter(k => src.includes(k));
console.log('Remaining references:', hits);
"
```
Expected: `Remaining references: []`

---

## Task 6: Update scaffoldNext to use the TEMPLATES map

**Files:**
- Modify: `cli/scaffold.js` around line 1961

- [ ] **Step 1: Update the template copy in scaffoldNext**

Find this block (inside `scaffoldNext`, the `if (!isUpdate)` branch, ~line 1959):
```js
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
```

Replace with:
```js
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
```

Note: `stack` and `game` are already in scope as named parameters of `scaffoldNext`.

- [ ] **Step 2: Verify scaffold.js parses without errors**

```bash
node --input-type=module -e "import './cli/scaffold.js';" 2>&1 | head -5
```
Expected: no syntax errors (the process will likely hang waiting for input — Ctrl-C after 2 seconds is fine; the point is no `SyntaxError`).

---

## Task 7: Update scaffoldTanstack to use TEMPLATES map

**Files:**
- Modify: `cli/scaffold.js` around line 1708

- [ ] **Step 1: Update the template copy in scaffoldTanstack**

Find this block (inside `scaffoldTanstack`, the `if (!isUpdate)` branch, ~line 1708):
```js
    if (!existsSync(TANSTACK_TEMPLATE)) {
      throw new Error(
        `TanStack base-template not found at:\n  ${TANSTACK_TEMPLATE}\n\n` +
        `The scaffolder repo appears to be incomplete.`
      );
    }
    step(1, 'Copying TanStack base-template…');
    mkdirSync(frontendDir, { recursive: true });
    cpSync(TANSTACK_TEMPLATE, frontendDir, {
      recursive: true,
      filter: (src) => {
        const rel = relative(TANSTACK_TEMPLATE, src);
        return !rel.startsWith('node_modules') && !rel.startsWith('.output') && !rel.startsWith('dist');
      },
    });
    ok(`Base-template → ${c.dim(frontendDir)}`);
```

Replace with:
```js
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
```

---

## Task 8: Remove Unity layout patch block from scaffoldNext

The layout patch (lines 2047–2065) injected `<UnityContainer>` into the root `app/layout.tsx` at scaffold time. This is now baked directly into `base-templates/next-unity/app/layout.tsx` by the generation script. Keeping the patch would double-apply it.

**Files:**
- Modify: `cli/scaffold.js` lines 2047–2065

- [ ] **Step 1: Delete the Unity layout patch block**

Find and remove this entire block:
```js
  // 2b. Unity layout patch — wrap children in <UnityContainer> so Unity persists across routes
  if (modules.includes('unity')) {
    const layoutPath = join(frontendDir, 'app', 'layout.tsx');
    if (existsSync(layoutPath)) {
      let layoutSrc = readFileSync(layoutPath, 'utf8');
      if (!layoutSrc.includes('UnityContainer')) {
        layoutSrc = layoutSrc.replace(
          `import DesktopWrapper from '@components/_core/DesktopWrapper/DesktopWrapper';`,
          `import DesktopWrapper from '@components/_core/DesktopWrapper/DesktopWrapper';\nimport UnityContainer from '@components/_modules/unity/UnityContainer';`,
        );
        layoutSrc = layoutSrc.replace(
          `          <DesktopWrapper>\n            <div className="desktop-wrapper__app-shell">\n              {children}\n            </div>\n          </DesktopWrapper>`,
          `          <DesktopWrapper>\n            <div className="desktop-wrapper__app-shell">\n              <UnityContainer>\n                {children}\n              </UnityContainer>\n            </div>\n          </DesktopWrapper>`,
        );
        writeFileSync(layoutPath, layoutSrc, 'utf8');
        ok('UnityContainer injected into app/layout.tsx');
      }
    }
  }
```

The comment `// 2b-ii. GTM layout patch` that follows should NOT be removed — that one stays.

- [ ] **Step 2: Verify parse is clean**

```bash
node --input-type=module -e "import './cli/scaffold.js';" 2>&1 | head -5
```
Expected: no SyntaxError output.

---

## Task 9: Simplify engine module sort in scaffoldNext

The engine-module sort (lines 1985–1993) prioritised engine modules to run first. Since there are no more engine modules, the sort condition using `manifest.engine` is always false. Remove it and leave a simple identity sort (or remove sorting entirely since order matters only for engine modules).

**Files:**
- Modify: `cli/scaffold.js` lines 1982–1994

- [ ] **Step 1: Remove the engine-first sort**

Find:
```js
    // Sort modules so engine-specific modules (unity, phaser, r3f) run first.
    // Flow modules can then provide route-specific overrides on top.
    const sortedModules = [...modules].sort((a, b) => {
      const mA = loadManifest(a);
      const mB = loadManifest(b);
      const scoreA = mA.engine ? -10 : 0;
      const scoreB = mB.engine ? -10 : 0;
      return scoreA - scoreB;
    });

    for (const moduleId of sortedModules) {
```

Replace with:
```js
    for (const moduleId of modules) {
```

---

## Task 10: Delete old directories

- [ ] **Step 1: Delete old base templates**

```bash
rm -rf base-templates/next base-templates/tanstack
```

- [ ] **Step 2: Delete engine modules**

```bash
rm -rf modules/unity modules/r3f modules/phaser
```

- [ ] **Step 3: Verify the right directories still exist**

```bash
node -e "
const {existsSync} = require('fs');
const check = (p, expected) => console.log((existsSync(p) === expected ? '✓' : '✗'), p);
// Should exist
check('base-templates/next-unity', true);
check('base-templates/next-r3f', true);
check('base-templates/next-phaser', true);
check('base-templates/next-memory', true);
check('base-templates/next-none', true);
check('base-templates/tanstack-unity', true);
check('modules/audio', true);
check('modules/leaderboard', true);
// Should not exist
check('base-templates/next', false);
check('base-templates/tanstack', false);
check('modules/unity', false);
check('modules/r3f', false);
check('modules/phaser', false);
"
```
Expected: all lines start with `✓`.

---

## Task 11: Smoke test all six stacks

Run a non-interactive scaffold for each stack and verify no crash and the correct template is used.

- [ ] **Step 1: Smoke test next-unity**

```bash
node cli/scaffold.js --name=smoke-unity --cape-id=99999 --market=NL --stack=next --game=unity --skip-install --skip-git --output=/tmp/smoke-unity --yes
```
Expected: no error, `/tmp/smoke-unity/frontend/components/_modules/unity/UnityGame.tsx` exists.

```bash
node -e "console.log(require('fs').existsSync('/tmp/smoke-unity/frontend/components/_modules/unity/UnityGame.tsx'));"
```
Expected: `true`

- [ ] **Step 2: Smoke test next-r3f**

```bash
node cli/scaffold.js --name=smoke-r3f --cape-id=99999 --market=NL --stack=next --game=r3f --skip-install --skip-git --output=/tmp/smoke-r3f --yes
```
```bash
node -e "console.log(require('fs').existsSync('/tmp/smoke-r3f/frontend/components/_modules/R3FCanvas/R3FCanvas.tsx'));"
```
Expected: `true`

- [ ] **Step 3: Smoke test next-phaser**

```bash
node cli/scaffold.js --name=smoke-phaser --cape-id=99999 --market=NL --stack=next --game=phaser --skip-install --skip-git --output=/tmp/smoke-phaser --yes
```
```bash
node -e "console.log(require('fs').existsSync('/tmp/smoke-phaser/frontend/game/scenes/Main.ts'));"
```
Expected: `true`

- [ ] **Step 4: Smoke test next-memory**

```bash
node cli/scaffold.js --name=smoke-memory --cape-id=99999 --market=NL --stack=next --game=memory --skip-install --skip-git --output=/tmp/smoke-memory --yes
```
```bash
# Gameplay page should exist (base next template has one); R3FCanvas should NOT
node -e "
const {existsSync} = require('fs');
console.log('gameplay exists:', existsSync('/tmp/smoke-memory/frontend/app/(campaign)/gameplay'));
console.log('R3FCanvas absent:', !existsSync('/tmp/smoke-memory/frontend/components/_modules/R3FCanvas'));
"
```
Expected: both `true`

- [ ] **Step 5: Smoke test next-none**

```bash
node cli/scaffold.js --name=smoke-none --cape-id=99999 --market=NL --stack=next --skip-install --skip-git --output=/tmp/smoke-none --yes
```
```bash
node -e "console.log('gameplay absent:', !require('fs').existsSync('/tmp/smoke-none/frontend/app/(campaign)/gameplay'));"
```
Expected: `true`

- [ ] **Step 6: Smoke test tanstack-unity**

```bash
node cli/scaffold.js --name=smoke-tanstack --cape-id=99999 --market=NL --stack=tanstack --skip-install --skip-git --output=/tmp/smoke-tanstack --yes
```
```bash
node -e "console.log(require('fs').existsSync('/tmp/smoke-tanstack/frontend/src/routes'));"
```
Expected: `true`

- [ ] **Step 7: Clean up smoke dirs**

```bash
rm -rf /tmp/smoke-unity /tmp/smoke-r3f /tmp/smoke-phaser /tmp/smoke-memory /tmp/smoke-none /tmp/smoke-tanstack
```

---

## Task 12: Commit all CLI and deletion changes

- [ ] **Step 1: Stage all changes**

```bash
git add cli/scaffold.js
git add -u  # picks up deleted base-templates/next, base-templates/tanstack, modules/unity, modules/r3f, modules/phaser
```

- [ ] **Step 2: Verify staged diff looks correct**

```bash
git diff --cached --stat
```
Expected: shows `cli/scaffold.js` modified; 5 directory trees deleted.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: wire CLI to lean templates, remove engine modules"
```

---

## Task 13: Update CLAUDE.md

The root `CLAUDE.md` references the old `base-template/` path and lists `unity` and `r3f` in the module table.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the repo structure section**

Replace the `base-template/` and old modules table with the new structure. Find:
```
├── base-template/     # Core Next.js project — always copied in full
└── modules/           # Optional module library — CLI copies per selection
    ├── unity/         # Unity WebGL game (adapter + UnityCanvas + gameplay page)
    ├── r3f/           # React Three Fiber game
    ├── leaderboard/   # Score table (tabs, pagination, personal best)
```

Replace with:
```
├── base-templates/    # Six lean engine-specific templates (one per stack selection)
│   ├── next-unity/    # Next.js + Unity WebGL baked in
│   ├── next-r3f/      # Next.js + React Three Fiber baked in
│   ├── next-phaser/   # Next.js + Phaser 3 baked in
│   ├── next-memory/   # Next.js + pure React (no engine)
│   ├── next-none/     # Next.js CAPE-only (no game)
│   └── tanstack-unity/# TanStack Start + Unity baked in
└── modules/           # Optional module library — CLI copies per selection
    ├── leaderboard/   # Score table (tabs, pagination, personal best)
```

- [ ] **Step 2: Commit the docs update**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for lean base templates"
```
