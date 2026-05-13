# Custom Route Names per Page Instance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow developers to specify a custom URL slug per page instance at scaffold time; the scaffold uses that slug as the folder name, CAPE settings key, and all navigation token values.

**Architecture:** Add `route: string` to `PageInstance` in `config.ts` (default from `PageMeta.route`). Expose a `defaultRouteForType` helper. In the React wizard, add an inline route input to each FlowCard. In `scaffold.js`, introduce a `routeMap: Record<string, string>` parameter threaded into `routeFor()` and `computeFlowTokens()`; the config-file path extracts it from `cfg.pages[].route` and the CLI path reads `--route=id:slug` flags.

**Tech Stack:** TypeScript (wizard-ui), JavaScript ESM (scaffold.js), React (StepPages.tsx)

---

## Files

| File | Change |
|------|--------|
| `cli/wizard-ui/src/shared/config.ts` | Add `route` to `PageInstance`, export `defaultRouteForType`, update `DEFAULT_CONFIG` |
| `cli/wizard-ui/src/steps/StepPages.tsx` | Update `addInstance`, add `onChangeRoute`, add route input to FlowCard, fix exit route calc |
| `cli/scaffold.js` | Update `routeFor`, `computeFlowTokens`, `scaffoldNext` params, config-file route extraction, `--route` flag |
| `cli/scaffold.test.js` | Add `routeMap` tests for `routeFor` |

---

### Task 1: Add `route` to `PageInstance` and export `defaultRouteForType`

**Files:**
- Modify: `cli/wizard-ui/src/shared/config.ts:309-312`
- Modify: `cli/wizard-ui/src/shared/config.ts` (DEFAULT_CONFIG.pages, around line 539)

- [ ] **Step 1: Verify TypeScript baseline is clean**

```bash
cd cli/wizard-ui && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors before any changes are made.

- [ ] **Step 2: Add `route` field to `PageInstance` and export `defaultRouteForType`**

In `cli/wizard-ui/src/shared/config.ts`, replace lines 309-312:
```typescript
export interface PageInstance {
  id:   string;
  type: string;
}
```
With:
```typescript
export interface PageInstance {
  id:    string;
  type:  string;
  route: string;
}

/** Returns the default URL slug for a page type, e.g. 'game' → '/gameplay'. */
export function defaultRouteForType(type: string): string {
  return ALL_PAGES.find(p => p.id === type)?.route ?? `/${type}`;
}
```

Note: `ALL_PAGES` is defined earlier in the same file — `defaultRouteForType` uses it as the source of defaults. Place the function immediately after the interface, before `PageMeta`.

- [ ] **Step 3: Update DEFAULT_CONFIG.pages to include route values**

Find the `DEFAULT_CONFIG` object (around line 526). Update `pages`:
```typescript
pages: [
  { id: 'landing',    type: 'landing',    route: '/landing'    },
  { id: 'onboarding', type: 'onboarding', route: '/onboarding' },
  { id: 'game',       type: 'game',       route: '/gameplay'   },
  { id: 'result',     type: 'result',     route: '/result'     },
],
```

- [ ] **Step 4: Check TS errors**

```bash
cd cli/wizard-ui && npx tsc --noEmit 2>&1
```
Expected: errors only on files that construct `PageInstance` without the new `route` field (e.g. `StepPages.tsx`, possibly `cape-format-builder.ts`). For each such site, add `route: defaultRouteForType(type)` (or the appropriate default). These are fixed progressively in later tasks. Any _other_ unrelated errors must be investigated first.

- [ ] **Step 5: Commit**

```bash
git add cli/wizard-ui/src/shared/config.ts
git commit -m "feat: add route field to PageInstance and defaultRouteForType helper"
```

---

### Task 2: Route input in wizard UI (StepPages.tsx)

**Files:**
- Modify: `cli/wizard-ui/src/steps/StepPages.tsx:40-43` (addInstance)
- Modify: `cli/wizard-ui/src/steps/StepPages.tsx` (FlowCard — route input + exit route fix)

- [ ] **Step 1: Import `defaultRouteForType` in StepPages.tsx**

Find the existing import from `../shared/config` in `StepPages.tsx`. Add `defaultRouteForType` to it:
```typescript
import { ..., defaultRouteForType } from '../shared/config';
```

- [ ] **Step 2: Update `addInstance` to set default route**

Change `addInstance` (lines 40-43) from:
```typescript
const addInstance = (type: string) => {
  const id = nextInstanceId(type, inFlow);
  setConfig({ ...config, pages: [...inFlow, { id, type }] });
};
```
To:
```typescript
const addInstance = (type: string) => {
  const id    = nextInstanceId(type, inFlow);
  const route = defaultRouteForType(type);
  setConfig({ ...config, pages: [...inFlow, { id, type, route }] });
};
```

- [ ] **Step 3: Add `onChangeRoute` handler (after `removeInstance`)**

```typescript
const onChangeRoute = (instanceId: string, raw: string) => {
  const slug  = raw.startsWith('/') ? raw : `/${raw}`;
  const taken = config.pages.some(p => p.id !== instanceId && p.route === slug);
  if (taken) return; // silently block — duplicate route; UI should show error state
  setConfig({
    ...config,
    pages: config.pages.map(p =>
      p.id === instanceId ? { ...p, route: slug } : p
    ),
  });
};
```

- [ ] **Step 4: Fix the exit route calculation**

Find the line (around 252) that reads:
```typescript
route: i.id === i.type ? m.route : `/${i.id}`,
```
Change it to:
```typescript
route: i.route,
```
This makes exit dropdowns use the instance's stored route rather than re-deriving it.

- [ ] **Step 5: Add route input field inside FlowCard**

Inside the FlowCard component render, find where the page label/id is displayed. Add an input directly beneath it:
```tsx
<div className="flow-card__route">
  <label
    className="flow-card__route-label"
    htmlFor={`route-${i.id}`}
  >
    Route
  </label>
  <input
    id={`route-${i.id}`}
    className="flow-card__route-input"
    type="text"
    value={i.route}
    onChange={e => onChangeRoute(i.id, e.target.value)}
    aria-label={`URL route for ${i.id} page`}
  />
</div>
```

- [ ] **Step 6: Verify TypeScript compiles cleanly**

```bash
cd cli/wizard-ui && npx tsc --noEmit 2>&1
```
Expected: 0 errors (or only errors on other unrelated files that still construct `PageInstance` without `route` — fix those by adding `route: defaultRouteForType(type)` where applicable).

- [ ] **Step 7: Commit**

```bash
git add cli/wizard-ui/src/steps/StepPages.tsx
git commit -m "feat: add inline route input to wizard FlowCard"
```

---

### Task 3: Update `routeFor()` and `computeFlowTokens()` in scaffold.js

**Files:**
- Modify: `cli/scaffold.js:296-298` (routeFor)
- Modify: `cli/scaffold.js:496` and `cli/scaffold.js:517-520` (computeFlowTokens)
- Modify: `cli/scaffold.js:1939` (scaffoldNext signature)
- Modify: `cli/scaffold.js:2129-2156` (call sites inside scaffoldNext)
- Modify: `cli/scaffold.test.js` (add routeMap tests)

- [ ] **Step 1: Write failing tests for `routeFor` with `routeMap`**

In `cli/scaffold.test.js`, add after the existing `routeFor()` tests (after line 38):
```javascript
t('uses routeMap override when provided', () => {
  const routeMap = { landing: '/home', game: '/play' };
  assert.equal(routeFor('landing', routeMap), '/home');
  assert.equal(routeFor('game', routeMap), '/play');
  assert.equal(routeFor('result', routeMap), '/result');   // falls back to PAGE_ROUTES
  assert.equal(routeFor('custom-page', routeMap), '/custom-page'); // falls back to /${id}
});
t('defaults to PAGE_ROUTES when routeMap is empty', () => {
  assert.equal(routeFor('game', {}), '/gameplay');
  assert.equal(routeFor('video-2', {}), '/video-2');
});
```

- [ ] **Step 2: Run tests to confirm new ones fail**

```bash
node cli/scaffold.test.js
```
Expected: 2 new FAIL entries — `routeFor` ignores its second argument today.

- [ ] **Step 3: Update `routeFor` signature**

In `cli/scaffold.js`, change lines 296-298 from:
```javascript
export function routeFor(pageId) {
  return PAGE_ROUTES[pageId] ?? `/${pageId}`;
}
```
To:
```javascript
export function routeFor(pageId, routeMap = {}) {
  return routeMap[pageId] ?? PAGE_ROUTES[pageId] ?? `/${pageId}`;
}
```

- [ ] **Step 4: Add `routeMap` parameter to `computeFlowTokens`**

Change the function signature at line 496 from:
```javascript
function computeFlowTokens(pages, regMode = 'none', flowExits = {}, flowEntry = '', pageTypes = {}) {
```
To:
```javascript
function computeFlowTokens(pages, regMode = 'none', flowExits = {}, flowEntry = '', pageTypes = {}, routeMap = {}) {
```

Then update the `routeOf` local function inside `computeFlowTokens` (around lines 517-520) from:
```javascript
const routeOf = (id) => {
  if (!id) return '/';
  return routeFor(id);
};
```
To:
```javascript
const routeOf = (id) => {
  if (!id) return '/';
  return routeFor(id, routeMap);
};
```

- [ ] **Step 5: Add `routeMap` to `scaffoldNext` and update its internal call sites**

Change the `scaffoldNext` function signature (line 1939) by appending `, routeMap = {}` inside the destructured parameter object. For example, add it after `_wizardMeta = null`:
```javascript
async function scaffoldNext({ ..., _wizardMeta = null, routeMap = {} }) {
```

Update line 2129 (first `computeFlowTokens` call):
```javascript
// Before:
const flowTokens = computeFlowTokens(pages, regMode, flowExits, flowEntry, pageTypes);
// After:
const flowTokens = computeFlowTokens(pages, regMode, flowExits, flowEntry, pageTypes, routeMap);
```

Update line 2130:
```javascript
// Before:
const availableCampaignRoutes = pages.map((id) => routeFor(id));
// After:
const availableCampaignRoutes = pages.map((id) => routeFor(id, routeMap));
```

Update line 2150:
```javascript
// Before:
const flowSequence = pages.map(p => routeFor(p));
// After:
const flowSequence = pages.map(p => routeFor(p, routeMap));
```

Update line 2156 (second `computeFlowTokens` call, inside the page builder block):
```javascript
// Before:
const flowTokens = computeFlowTokens(pages, regMode, flowExits, flowEntry, pageTypes);
// After:
const flowTokens = computeFlowTokens(pages, regMode, flowExits, flowEntry, pageTypes, routeMap);
```

- [ ] **Step 6: Run all tests**

```bash
node cli/scaffold.test.js
```
Expected: all tests pass including the two new routeMap tests.

- [ ] **Step 7: Commit**

```bash
git add cli/scaffold.js cli/scaffold.test.js
git commit -m "feat: add routeMap to routeFor and computeFlowTokens"
```

---

### Task 4: Extract `routeMap` from wizard config in config-file mode

**Files:**
- Modify: `cli/scaffold.js:3379-3465` (config-file mode block)

Context: The web wizard passes `--config=/tmp/wizard.json` with `cfg.pages` containing `PageInstance[]` objects. After Task 1, those objects will have a `route` field. This task reads it.

- [ ] **Step 1: Build `routeMap` alongside `pageIds` in the config-file loop**

Find the loop starting at line 3382 (the `for (const entry of rawPages)` loop) that currently builds `pageIds`. Replace it:

```javascript
// Before:
for (const entry of rawPages) {
  if (typeof entry === 'string') {
    pageIds.push(entry);
  } else if (entry && typeof entry === 'object' && entry.id) {
    pageIds.push(entry.id);
  }
}

// After:
const routeMap = {};
for (const entry of rawPages) {
  if (typeof entry === 'string') {
    pageIds.push(entry);
    routeMap[entry] = PAGE_ROUTES[entry] ?? `/${entry}`;
  } else if (entry && typeof entry === 'object' && entry.id) {
    pageIds.push(entry.id);
    routeMap[entry.id] = entry.route ?? PAGE_ROUTES[entry.id] ?? `/${entry.id}`;
  }
}
```

- [ ] **Step 2: Add `routeMap` to the options object**

Find the `const options = { ... }` object literal around line 3448. Add `routeMap` as a field:
```javascript
const options = {
  stack:  cfg.stack ?? 'next',
  name:   cfg.name,
  // ... all existing fields ...
  routeMap,  // add this
};
```

- [ ] **Step 3: Run tests**

```bash
node cli/scaffold.test.js
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add cli/scaffold.js
git commit -m "feat: extract page routes from wizard config into routeMap"
```

---

### Task 5: Add `--route` CLI flag and thread `routeMap` into non-interactive mode

**Files:**
- Modify: `cli/scaffold.js:394-420` (parseArgs)
- Modify: `cli/scaffold.js` near line 3727-3731 (non-interactive options assembly)

- [ ] **Step 1: Initialize `routeOverrides` in `parseArgs`**

Change line 396 from:
```javascript
const args = { modules: [], pages: [], market: 'NL' };
```
To:
```javascript
const args = { modules: [], pages: [], routeOverrides: {}, market: 'NL' };
```

- [ ] **Step 2: Parse `--route=id:slug` flags**

In the `parseArgs` for-loop, add after the `--skip-git` branch (after line 417):
```javascript
else if (key === 'route') {
  const colonIdx = val.indexOf(':');
  if (colonIdx > 0) {
    const id   = val.slice(0, colonIdx);
    const slug = val.slice(colonIdx + 1);
    args.routeOverrides[id] = slug.startsWith('/') ? slug : `/${slug}`;
  }
}
```

- [ ] **Step 3: Build `routeMap` from `args` for the non-interactive path**

Find where `options = await runWizard(args)` is called (around line 3727) and where `await scaffold(options)` is called (around line 3731). Between these two lines, add:
```javascript
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
```

- [ ] **Step 4: Run tests**

```bash
node cli/scaffold.test.js
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add cli/scaffold.js
git commit -m "feat: add --route=id:slug CLI flag for custom route names"
```

---

### Task 6: Build wizard UI and smoke-test end-to-end

- [ ] **Step 1: Install dependencies**

```bash
cd cli/wizard-ui && npm install
```

- [ ] **Step 2: Build the wizard UI**

```bash
cd cli/wizard-ui && npm run build
```
Expected: build completes with 0 TypeScript errors and 0 build failures.

- [ ] **Step 3: Run all scaffold tests**

```bash
node cli/scaffold.test.js
```
Expected: all pass.

- [ ] **Step 4: Smoke-test custom routes via CLI flag**

```bash
node cli/scaffold.js \
  --name=test-custom-routes \
  --cape-id=99999 \
  --market=NL \
  --page=landing \
  --page=game \
  --page=result \
  --route=landing:/home \
  --route=game:/play \
  --yes
```

Check the generated folder structure:
```bash
ls ../test-custom-routes/frontend/app/\(campaign\)/
```
Expected: `home/` and `play/` folders exist; `landing/` and `gameplay/` do **not**.

Check that navigation tokens resolved correctly:
```bash
grep -r "/home\|/play\|/result" ../test-custom-routes/frontend/app/\(campaign\)/home/page.tsx 2>/dev/null
```
Expected: the landing page's "next" action points to `/play` (or whichever follows it in the sequence).

- [ ] **Step 5: Clean up and commit**

```bash
Remove-Item -Recurse -Force ..\test-custom-routes
git add cli/wizard-ui/
git commit -m "build: wizard UI with route input"
```
