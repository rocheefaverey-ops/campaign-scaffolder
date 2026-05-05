# Dynamic CAPE Format at Campaign Creation

**Date:** 2026-05-05
**Status:** Approved

## Problem

When a new CAPE campaign is created via the web wizard or the `--create-cape` CLI flag, the format pushed to CAPE uses the static `formats/scaffolder-format.json`, which always includes all 10 page tabs (header, desktop, video, landing, onboarding, result, menu, leaderboard, registration, voucher) regardless of what pages and modules were actually selected for the project.

The interactive CLI paths (TanStack wizard and Next.js interactive wizard) already correctly pass a dynamically built format to `runCapeCreateFlow`. The web wizard and non-interactive paths do not.

## Root Cause

Three call sites in `cli/scaffold.js` invoke `runCapeCreateFlow`:

| Location | Path | Passes dynamic format? |
|---|---|---|
| ~line 630 | TanStack interactive wizard | ✓ yes |
| ~line 918 | Next.js interactive wizard | ✓ yes |
| ~line 2945 | Web wizard / `--config` mode | ✗ no — falls back to static file |
| ~line 3193 | Non-interactive `--create-cape` flag | ✗ no — falls back to static file |

`runCapeCreateFlow` accepts an optional `formatOverride`; when `null`, it reads `SCAFFOLDER_FORMAT_FILE` (the static all-pages file).

## Solution — Approach A: Build format inline at each broken site

Pass a dynamically built format as `formatOverride` at each broken call site. No new abstractions introduced — this mirrors what the interactive CLI paths already do.

## Changes

### 1. `cli/scaffold.js` — Web wizard path (~line 2924)

Move the `rawPages → pageIds + pageTypes` normalization block **above** the `if (cfg.createCape)` block (currently it lives below at ~line 2969). Then, inside the `if (cfg.createCape)` block, build the format before calling `runCapeCreateFlow`:

```js
const stack = cfg.stack ?? 'next';
const generatedFormat = stack === 'tanstack'
  ? buildTanStackCapeFormat({
      pages: pageIds,
      tsPageElementSelections: cfg.tsPageElementSelections ?? {},
    })
  : buildNextCapeFormat({
      instances: pageIds.map(id => ({ id, type: pageTypes[id] ?? id })),
      pageTypes,
      pageElementSelections: cfg.pageElementSelections ?? {},
      modules: cfg.modules ?? [],
      flowEnabledExits: cfg.flowEnabledExits ?? {},
      menuItemsEnabled: cfg.menuItemsEnabled ?? {},
      iframe: cfg.iframe ?? false,
    });

const created = await runCapeCreateFlow(null, cfg.name, market, autoTitle, false, generatedFormat);
```

Remove the duplicate normalization at the original location below.

### 2. `cli/scaffold.js` — Non-interactive `--create-cape` path (~line 3190)

`allModules` is already resolved just above this block. Build the format right before the call:

```js
const stack = args.stack || 'next';
const formatPages = args.pages.length > 0
  ? args.pages
  : (stack === 'tanstack' ? ['launch', 'tutorial', 'game', 'score'] : buildDefaultPages(args.game || ''));

const generatedFormat = stack === 'tanstack'
  ? buildTanStackCapeFormat({ pages: formatPages, tsPageElementSelections: {} })
  : buildNextCapeFormat({
      pages: formatPages,
      modules: allModules,
      pageElementSelections: {},
      flowEnabledExits: {},
      menuItemsEnabled: {},
      iframe: args.iframe || false,
    });

const createdCape = await runCapeCreateFlow(null, args.name, args.market || 'NL', autoTitle, false, generatedFormat);
```

### 3. `cli/scaffold.js` — Clean up `runCapeCreateFlow`

Remove the static file fallback inside `runCapeCreateFlow`. Every caller now passes an explicit `formatOverride`, so the `?? JSON.parse(readFileSync(SCAFFOLDER_FORMAT_FILE))` line becomes dead code. Keep the function signature (`formatOverride` param) but treat a missing override as an empty format rather than a static file read.

### 4. `cli/scaffold.js` — Remove `--repush-format` sub-command

Remove the `if (args.repushFormat)` block (~lines 2782–2827). This command is unused and was the last consumer of the static format file.

### 5. `cli/cape-client.js` — Remove `SCAFFOLDER_FORMAT_FILE`

Remove the export constant and its `resolve(...)` declaration. The `resolve` import itself is used elsewhere in `cape-client.js` and must be kept.

### 6. `formats/scaffolder-format.json` — Delete

Delete the file. The `formats/` directory can be removed if empty.

## What Does Not Change

- Interactive CLI paths (lines 630, 918) — already correct, untouched.
- `cape-format-builder.js` — no changes needed; the builder is already fully dynamic.
- `cape-format.json` written to disk at the end of scaffolding — still written as today.
- The `push-format` external tool reference in `SCAFFOLD_CHECKLIST.md` — still valid; that refers to `lwg-cli-cape`, not this scaffolder's own CLI.

## Testing

1. Run web wizard, create a new project with only `landing + game + result` pages, no optional modules. Verify CAPE campaign has exactly those page tabs.
2. Run `node cli/scaffold.js --name=test --create-cape --market=NL --yes` with a Next.js stack. Verify CAPE campaign format matches the default pages.
3. Run with `--stack=tanstack --create-cape`. Verify CAPE campaign gets TanStack page tabs only.
4. Verify `--repush-format` flag is no longer recognised (exits cleanly or falls through to help).
5. Verify `formats/scaffolder-format.json` is gone and nothing in the codebase references it.
