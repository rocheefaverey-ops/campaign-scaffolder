# Lean Per-Stack Base Templates

**Date:** 2026-05-15
**Status:** Approved

## Problem

The scaffolder currently has two base templates (`base-templates/next/` and `base-templates/tanstack/`) that are engine-agnostic. Engine-specific code (Unity, R3F, Phaser) is added on top via the module system at scaffold time. This means every Next.js template starts identical regardless of which engine the user selected, and engine logic lives in two places (the module manifest and the CLI wiring).

## Goal

Replace the two generic base templates with six lean, engine-specific templates — one per selection option in the CLI wizard. Engine code is baked directly into each template. The existing engine modules are removed entirely.

## Approach

**Approach A — 6 fully independent template directories** (chosen).

Each template is a complete, standalone directory that gets copied wholesale at scaffold time. No merging, no overlay composition. Simple to inspect, simple to copy.

## Directory Structure

```
base-templates/
├── next-unity/        # Next.js + App Router + Unity WebGL
├── next-r3f/          # Next.js + App Router + React Three Fiber
├── next-phaser/       # Next.js + App Router + Phaser 3
├── next-pure-react/   # Next.js + App Router, pure React UI (no engine)
├── next-none/         # Next.js + App Router, no game — CAPE flows only
└── tanstack-unity/    # TanStack Start + Vite + Unity WebGL
```

Old `base-templates/next/` and `base-templates/tanstack/` are deleted.

## Template Contents

### Shared across all five `next-*` templates

Duplicated (not merged) into each:

- Framework config: `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`
- CAPE integration: design token injector, middleware with CSP, `app/api/[...slug]/` proxy route
- Server actions: `authenticate/`, `complete-onboarding/`, `info-logging/`
- Core pages: `(campaign)/landing/`, `(campaign)/onboarding/`, `(campaign)/result/`
- `providers.tsx`, `layout.tsx`, `globals.css`, `env.dist`

### Per-template differences

| Template | Gameplay page | Extra pages | Baked-in dependencies |
|---|---|---|---|
| `next-unity` | Unity WebGL embed + messaging bridge | `(campaign)/menu/` (pause/resume) | Unity adapter files from `modules/unity/` |
| `next-r3f` | R3F canvas setup | — | `@react-three/fiber`, `@react-three/drei` in `package.json` |
| `next-phaser` | Phaser 3 game instance | — | `phaser` in `package.json` |
| `next-pure-react` | Plain React UI shell | — | No extra dependencies |
| `next-none` | No gameplay page | — | No extra dependencies |
| `tanstack-unity` | Unity WebGL embed + messaging bridge | `routes/tutorial/`, `routes/score/` | Unity adapter, TanStack Start, Vite |

## Module System Changes

### Deleted modules

- `modules/unity/` — engine code now lives in `next-unity/` and `tanstack-unity/`
- `modules/r3f/` — engine code now lives in `next-r3f/`
- `modules/phaser/` — engine code now lives in `next-phaser/`

### Unchanged modules (still apply on top of any template)

audio, cookie-consent, gtm, leaderboard, memory, registration, scoring, video, voucher

## CLI Changes (`cli/scaffold.js`)

### Template constants

**Before:**
```js
const NEXT_TEMPLATE     = join(SCAFFOLDER_ROOT, 'base-templates', 'next');
const TANSTACK_TEMPLATE = join(SCAFFOLDER_ROOT, 'base-templates', 'tanstack');
```

**After:**
```js
const TEMPLATES = {
  'next-unity':      join(SCAFFOLDER_ROOT, 'base-templates', 'next-unity'),
  'next-r3f':        join(SCAFFOLDER_ROOT, 'base-templates', 'next-r3f'),
  'next-phaser':     join(SCAFFOLDER_ROOT, 'base-templates', 'next-phaser'),
  'next-pure-react': join(SCAFFOLDER_ROOT, 'base-templates', 'next-pure-react'),
  'next-none':       join(SCAFFOLDER_ROOT, 'base-templates', 'next-none'),
  'tanstack-unity':  join(SCAFFOLDER_ROOT, 'base-templates', 'tanstack-unity'),
};
```

The template key is derived from `${stack}-${engine}` after the user's selection. The exact string values for `engine` when the user picks options 5 (pure React) and 6 (no game) must be verified against lines 824-846 of `scaffold.js` before implementing the lookup — directory names should match whatever the CLI assigns.

### Removed logic

- `applyModule('unity')` call path — deleted
- `applyModule('r3f')` call path — deleted
- `applyModule('phaser')` call path — deleted

### Unchanged

- The 6-option selection prompt (lines 824-846) — same UX, same options
- `scaffoldNext()` and `scaffoldTanstack()` dispatch functions — only the template source path changes
- Non-engine module application pipeline — untouched
- Game registration, env var injection, CAPE format generation — untouched

## What Does Not Change

- The wizard UI and interactive flow
- Non-engine modules and their manifests
- The game registry (`games/`)
- CAPE client and format builder
- Page builder logic
- The `--stack` and `--engine` CLI flags

## Success Criteria

1. Running the CLI wizard and selecting any of the 6 options scaffolds a project using the correct lean template with engine code already present.
2. No engine module application step occurs for unity, r3f, or phaser.
3. Non-engine modules (audio, leaderboard, etc.) still apply correctly on top of any template.
4. The old `base-templates/next/` and `base-templates/tanstack/` directories no longer exist.
5. `modules/unity/`, `modules/r3f/`, `modules/phaser/` no longer exist.
