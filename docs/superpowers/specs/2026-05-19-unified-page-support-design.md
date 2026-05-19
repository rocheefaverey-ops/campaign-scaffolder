# Unified Page Support Across All Stacks

**Date:** 2026-05-19
**Status:** Approved

## Problem

The scaffolder wizard restricts available pages by stack:

- `TANSTACK_PAGE_IDS = ['launch', 'tutorial', 'game', 'register', 'score']`
- `NEXT_PAGE_IDS = ['landing', 'video', 'intro-video', 'loading-video', 'ad-video', 'onboarding', 'register', 'game', 'result', 'leaderboard', 'voucher']`

TanStack projects cannot scaffold `leaderboard`, `voucher`, or video pages via the wizard. Module manifests only carry Next.js `dest` paths, so selecting those modules on a TanStack project copies files to the wrong location (or nowhere useful). Three page types have equivalent but differently-named counterparts across stacks (`launch`/`landing`, `score`/`result`, `onboarding`/`tutorial`).

## Goal

All page types available to all stacks. One canonical page ID per concept. Both stacks produce fully working route files with CAPE integration.

## Approach: Stack field on manifest file entries (Approach A)

Add an optional `"stacks": string[]` field to module manifest file entries. `scaffold.js` skips entries whose `stacks` does not include the current stack. Absent `stacks` = applies to all stacks (backward compatible). Each module gains `tanstack/` and `next/` source subdirectories for stack-specific route files.

## Naming Decisions

Three equivalent page pairs are unified under one canonical ID:

| Dropped | Kept | Route | Rationale |
|---------|------|-------|-----------|
| `launch` (TanStack) | `landing` | `/landing/` | More universal; `launch` too engine-specific |
| `score` (TanStack) | `result` | `/result/` | Broader — covers win/lose, not just numeric scores |
| `onboarding` (Next.js) | `tutorial` | `/tutorial/` | Game campaigns always call it a tutorial |

## Changes

### 1. `cli/wizard-ui/src/shared/config.ts`

- Delete `TANSTACK_PAGE_IDS` and `NEXT_PAGE_IDS` exports.
- `pagesForStack()` returns `ALL_PAGES` for any stack.
- `ALL_PAGES`: remove `launch` entry; remove `score` entry; rename `onboarding` → `tutorial` (route `/tutorial`, updated exits/tokens).
- `landing` and `result` entries gain any TanStack-specific exits they were missing (play-again on result, tutorial button on landing).
- `defaultPagesForStack('tanstack')` returns `[landing, tutorial, game, result]` instead of `[launch, tutorial, game, score]`.

### 2. `base-templates/tanstack-unity/src/routes/`

| Before | After |
|--------|-------|
| `launch.tsx` + `launch.module.scss` | `landing/index.tsx` + `landing/landing.module.scss` |
| `score.tsx` + `score.module.scss` | `result/index.tsx` + `result/result.module.scss` |

- Route strings update to `/landing/` and `/result/`.
- Loader files: `src/loaders/LaunchLoader.ts` → `LandingLoader.ts`, `ScoreLoader.ts` → `ResultLoader.ts`.
- CAPE copy keys and component logic stay identical — only names change.
- `tutorial/`, `game/`, `register/` unchanged.
- `leaderboard`, `voucher`, `video` routes are **not** added to the base template — they come from modules only.

**Also update in tanstack-unity:**
- `src/routes/index.tsx`: change `navigate({ to: '/launch' })` and `preloadRoute({ to: '/launch' })` → `/landing`
- `src/routeTree.gen.ts`: regenerate to reflect the renamed routes (or update manually — this file is committed in the template)

### 3. `base-templates/next-*/app/(campaign)/`

Across all five Next.js templates (`next-unity`, `next-r3f`, `next-phaser`, `next-memory`, `next-none`):

- Rename `onboarding/page.tsx` → `tutorial/page.tsx` (route `/tutorial`).
- Loader/copy keys renamed to match.
- All other routes unchanged.

### 4. Module manifests — `leaderboard`, `voucher`, `video`

Each affected `manifest.json` file entry gains a `"stacks"` field:

```json
{
  "files": [
    {
      "src": "next/app/leaderboard/page.tsx",
      "dest": "app/(campaign)/leaderboard/page.tsx",
      "stacks": ["next"]
    },
    {
      "src": "tanstack/routes/leaderboard/index.tsx",
      "dest": "src/routes/leaderboard/index.tsx",
      "stacks": ["tanstack"]
    }
  ]
}
```

Component files (UI-only, no server APIs) have no `stacks` field and copy for all stacks unchanged.

**Action files are stack-specific** — Next.js uses `'use server'` functions; TanStack uses `createServerFn`. Each affected module therefore also needs stack-conditional action entries:

```json
{ "src": "next/actions/get-leaderboard/action.ts",     "dest": "app/actions/get-leaderboard/action.ts",          "stacks": ["next"] },
{ "src": "tanstack/server/getLeaderboard.ts",           "dest": "src/server/api/endpoints/Leaderboard.ts",        "stacks": ["tanstack"] }
```

Affected modules: `leaderboard` (confirmed `'use server'`). `voucher` and `video` have no server action files — no change needed for them.

### 5. `cli/scaffold.js`

One change in the module file-copy loop:

```js
if (entry.stacks && !entry.stacks.includes(currentStack)) continue;
```

No other CLI changes.

### 6. New module TanStack route files

Each file is a fully working TanStack route with `createFileRoute`, a loader, CAPE copy via `Route.useLoaderData()`, and `useGameNavigation` for exits.

| Module | New source file | Route | Key behaviour |
|--------|----------------|-------|---------------|
| `leaderboard` | `tanstack/routes/leaderboard/index.tsx` | `/leaderboard/` | Tabs (daily/weekly/all-time), personal best row, `getLeaderboardAction`, back/CTA exit |
| `leaderboard` | `tanstack/loaders/LeaderboardLoader.ts` | — | CAPE copy fetch for leaderboard page |
| `leaderboard` | `tanstack/server/getLeaderboard.ts` | — | `createServerFn` equivalent of `get-leaderboard/action.ts` |
| `voucher` | `tanstack/routes/voucher/index.tsx` | `/voucher/` | Voucher code display, optional QR (`showQr` CAPE flag), done exit |
| `voucher` | `tanstack/loaders/VoucherLoader.ts` | — | CAPE copy fetch for voucher page |
| `video` | `tanstack/routes/video/index.tsx` | `/video/` | Video player, skip button (respects `minPlaybackSec`), `NEXT_AFTER_VIDEO` exit |
| `video` | `tanstack/routes/intro-video/index.tsx` | `/intro-video/` | Same as video, token `NEXT_AFTER_INTRO_VIDEO` |
| `video` | `tanstack/routes/loading-video/index.tsx` | `/loading-video/` | Loops until Unity game-ready signal; fallback timer (`readyFallbackSec`) |
| `video` | `tanstack/routes/ad-video/index.tsx` | `/ad-video/` | Same as video, token `NEXT_AFTER_AD_VIDEO` |
| `video` | `tanstack/loaders/VideoLoader.ts` | — | CAPE copy fetch shared by all video variants |

Each route file also gets a colocated `*.module.scss` for layout.

### 7. `cli/wizard-ui/src/steps/PreviewPane.tsx`

**Rename renderers:**
- `launch` → `landing`
- `score` → `result`
- `onboarding` → `tutorial`

**Add renderers** (currently blank frame for TanStack flows):
- `leaderboard` — ranked list mock with 3 placeholder rows, personal best row, tab strip (Daily / Weekly / All time)
- `voucher` — code block + QR placeholder square, done button
- `video` / `intro-video` / `ad-video` — video frame placeholder with skip button
- `loading-video` — spinning loader instead of video frame, skip button appears after fallback timer

All renderers are simplified mocks — visual shape only, no real data.

## File count

| Area | Files created | Files renamed/modified |
|------|--------------|----------------------|
| `config.ts` | 0 | 1 |
| `tanstack-unity` routes + loaders | 0 | 6 (landing route+scss+loader, result route+scss+loader) |
| `tanstack-unity` index.tsx + routeTree | 0 | 2 |
| `next-*` templates (×5) | 0 | 5 (onboarding→tutorial rename) |
| Module manifests (×3) | 0 | 3 |
| `scaffold.js` | 0 | 1 |
| Module TanStack route+action files | 18 (routes+scss+loaders+server fn) | 0 |
| `PreviewPane.tsx` | 0 | 1 |
| **Total** | **18** | **19** |

## Out of scope

- Migrating existing generated projects (scaffolder changes only affect new scaffolds).
- Adding `launch`, `score`, `onboarding` as aliases — they are fully dropped.
- Any changes to Next.js-only pages that already work correctly (`landing`, `result`, `leaderboard`, `voucher`, video variants).
