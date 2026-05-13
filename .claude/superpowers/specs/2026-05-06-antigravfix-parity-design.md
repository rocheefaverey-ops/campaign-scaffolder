# Scaffolder ↔ Antigravfix Parity — Design

> Spec date: 2026-05-06
> Driver: Rochee Faverey
> Scope: `campaign-scaffolder/` (this repo)

## Goal

When a user replays the recreate command captured in `antigravfix/SCAFFOLD_DEBUG.json`:

```
node C:/Dev/Livewall/campaign-scaffolder/cli/scaffold.js \
  --name=antigravfix \
  --cape-id=61122 \
  --market=NL \
  --game=unity \
  --page=video --page=landing --page=onboarding \
  --page=video-2 --page=game --page=result \
  --yes
```

…the scaffolder must produce a project **byte-identical** to `c:/Dev/Livewall/antigravfix/` (modulo timestamps, build artefacts, and the npm install state). Zero manual adjustments.

## Source of truth

`antigravfix/` is the canonical snapshot of what the scaffolder *should* output for these settings. Wherever a scaffolder template, module file, or generator output disagrees with antigravfix, **antigravfix wins** and the scaffolder is brought into line.

This rule applies to the structural / mechanical files only:
`base-templates/next/...`, `modules/{unity,video}/...`, `cli/cape-format-builder.js`, `cli/page-builder.js`, `cli/scaffold.js`.

It does **not** propagate per-campaign content (CAPE copy, brand assets, etc.) — only template-level improvements such as added safety controls (Loading.tsx skip button), z-index fixes (UnityGame canvas), default tutorial fallbacks (onboarding `DEFAULT_STEPS`), and `globals.css` layout corrections.

## Gap (verified by `diff -rq` of fresh CLI output vs. antigravfix)

Five categories, in workstream order:

1. **Template content drift** in `base-templates/next/...` — 10 files.
2. **Module content drift** in `modules/{unity,video}/...` — 4 files.
3. **Page-instance generation gap** — wizard emits `--page=video-2` (with `pageTypes: { "video-2": "video" }`), but downstream consumers don't materialize `app/(campaign)/video-2/` and don't emit a CAPE tab for it.
4. **`cape-format.json` field gap** — 551-line diff between the dynamic builder's output and antigravfix's pushed format.
5. **Writer-output drift** in `.scaffolded` (105 lines) and `SCAFFOLD_CHECKLIST.md` (92 lines).

## Architecture

No new modules, no new game definitions. New files: the verification harness (workstream 5c) and one new wizard-UI step component (workstream 6g). All other work lands inside files that already exist:

```
campaign-scaffolder/
├── base-templates/next/                   (workstream 1: copy-back, 10 files)
├── modules/unity/                         (workstream 2a: copy-back, 2 files)
├── modules/video/                         (workstream 2b: copy-back, 2 files)
└── cli/
    ├── scaffold.js                        (workstreams 3, 5a, 5b, 6a–6f — helpers, route gen, writers, prompt copy, validation, back-nav)
    ├── page-builder.js                    (workstream 3 — basePageType lookup)
    ├── cape-format-builder.js             (workstreams 3, 4 — instance tabs + 551-line field gap)
    ├── wizard-server/                     (workstream 6 — schema validation, terminology rename)
    └── wizard-ui/                         (workstream 6 — copy fixes, new StepModules, validation hints)
```

## Workstream details

### 1 + 2 — Copy-back

For each pair below, copy the antigravfix file verbatim into the scaffolder location, then re-tokenise any literal `"antigravfix"` / `61122` / `NL` strings back to `{{PROJECT_NAME}}` / `{{CAPE_ID}}` / `{{MARKET}}` so the scaffolder's existing token-replace pass restores the right values per project.

| # | Source (antigravfix) | Destination (scaffolder) |
|---|---|---|
| 1 | `frontend/app/(campaign)/layout.tsx` | `base-templates/next/app/(campaign)/layout.tsx` |
| 2 | `frontend/app/(campaign)/onboarding/page.tsx` | `base-templates/next/app/(campaign)/onboarding/page.tsx` |
| 3 | `frontend/app/(campaign)/gameplay/page.tsx` | `base-templates/next/app/(campaign)/gameplay/page.tsx` |
| 4 | `frontend/app/(campaign)/result/page.tsx` | `base-templates/next/app/(campaign)/result/page.tsx` |
| 5 | `frontend/app/(campaign)/menu/page.tsx` | `base-templates/next/app/(campaign)/menu/page.tsx` |
| 6 | `frontend/app/globals.css` | `base-templates/next/app/globals.css` |
| 7 | `frontend/components/_core/Loading/Loading.tsx` | `base-templates/next/components/_core/Loading/Loading.tsx` |
| 8 | `frontend/components/_core/DesktopWrapper/DesktopWrapper.tsx` | `base-templates/next/components/_core/DesktopWrapper/DesktopWrapper.tsx` |
| 9 | `frontend/public/mock-cape.json` | `base-templates/next/public/mock-cape.json` |
| 10 | `frontend/tsconfig.json` | `base-templates/next/tsconfig.json` |
| 11 | `frontend/components/_modules/unity/UnityGame.tsx` | `modules/unity/components/UnityGame.tsx` |
| 12 | `frontend/components/_modules/unity/UnityContainer.tsx` | `modules/unity/components/UnityContainer.tsx` |
| 13 | `frontend/components/_modules/VideoIntro/VideoIntro.tsx` | `modules/video/components/VideoIntro/VideoIntro.tsx` |
| 14 | `frontend/app/(campaign)/video/page.tsx` | `modules/video/app/(campaign)/video/page.tsx` |

Notes:

- The video module uses `strategy: "replace"` to overwrite the base template's video page. That mechanism stays as-is.
- No file becomes a *new* path; no module manifest changes are required.
- `tsconfig.json` will be auto-rewritten by Next on first run; the copy-back is purely so the byte-diff is clean on a fresh scaffold.
- `mock-cape.json` is shipped as a static stub; once cape-format-builder is fixed (workstream 4) we may regenerate it dynamically, but that is **out of scope** for this spec.

### 3 — Page-instance support (`video-N` whitelist)

Decision: only `video` supports duplicate instances (`video`, `video-2`, `video-3`, …). Any other suffixed page errors out with a clear message.

Implementation in `cli/scaffold.js`:

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
  const suffix = pageId.match(INSTANCE_RE)?.[2];
  return suffix ? `${baseRoute}-${suffix}` : baseRoute;
}
```

Call sites that change:

- **PAGE_ROUTES lookup** (`scaffold.js:~1682`) — replace `PAGE_ROUTES[pageId]` with `routeFor(pageId)`.
- **Route directory copy** (the loop that writes `app/(campaign)/<route>/page.tsx`) — for each pageId, look up the source template via `basePageType(pageId)` (so `video-2` reuses the video module's page source) and write to a directory named after the **full pageId** (so `video-2/`).
- **`{{INSTANCE_ID}}` token replacement** — when copying a page template, set `{{INSTANCE_ID}}` to the full `pageId` (`"video-2"`) so runtime CAPE lookups (`settings.pages.video-2.mode`) resolve correctly. The first instance keeps `{{INSTANCE_ID}}` = `"video"`.
- **`page-builder.js` `buildPage(pageId, …)`** — call `basePageType(pageId)` at the top to pick the element catalogue. Output filename uses raw `pageId`.
- **`cape-format-builder.js` page-tab loop** — replace the current `KNOWN_PAGE_TYPES` membership check with `basePageType(pageId)` lookup. Tab `key` and CAPE settings path use the full `pageId`. Tab label: `"Video"` for `video`, `"Video 2"` for `video-2`, etc. (label generator: capitalised base + `" " + suffix` when suffix present).

Flow-token computation already works (`.scaffolded` confirms `{{NEXT_AFTER_VIDEO-2}}` is generated); no change required there beyond verification.

### 4 — `cape-format.json` field parity (551-line gap)

Approach: reverse-engineer field-by-field, preserving the dynamic builder.

**Phase 4a — diff classification**. Run the CLI with `--name=antigravfix` (the real name, no `-diff` suffix) and capture the output's `cape-format.json`. Walk the diff against antigravfix's `cape-format.json` and bucket every change as one of:

| Bucket | Action |
|---|---|
| add-field | Add a field-builder call (`inp` / `text` / `color` / `asset` / `bool` / `select`) inside the relevant tab assembler |
| add-tab | Already covered by workstream 3's instance-tab loop |
| add-section | Add a group-emit call |
| field-attribute | Tweak attribute values on the existing call (`label`, `key`, `default`, `helpText`, `validators`) |
| ordering | Reorder calls inside the tab assembler |
| noise | Whitespace / formatting — ignore (canonicalised by `JSON.stringify(_, null, 2)`) |

The classified checklist is the input to the implementation plan.

**Phase 4b — implement the edits**. Edits land in three areas of `cape-format-builder.js`:

1. Per-page tab assemblers (`landing`, `video`, `onboarding`, `gameplay`, `result`, `menu`).
2. Module-driven field contributions (e.g. unity engine settings).
3. Global / settings tab (`general.*`, `settings.pages.<id>.*`).

**Contract preservation**: every CAPE path read by template/module pages via `getCapeText` / `getCapeImage` / `getCapeBoolean` / etc. must be emitted by the builder. Phase 4a includes a scan of `base-templates/next/**/*.tsx` and `modules/**/*.tsx` for these calls; each path must map to a field in the rebuilt format.

**Phase 4c — verification**. Re-diff after each commit; extend `cape-format-builder.test.js` with at least one assertion per added field.

Constraint: builder must remain dynamic. If a project doesn't include the `video` page, no `video` tab is emitted. Snapshot-replay (option Y) was rejected for this reason.

### 5a — `.scaffolded` writer parity (105-line gap)

Locate the `.scaffolded` writer in `scaffold.js`. Match antigravfix's structure:

- Top-level keys: `name`, `stack`, `capeId`, `market`, `capeAutoPublished`, `game`, `selectedGame`, `pages`, `pageTypes`, `flow`, `flowExits`, `modules`, `envVarsAdded`, `cspPatches`, `wizard`, `createdAt`.
- `wizard` block: `pageSettings`, `flowEnabledExits`, `menuItemsEnabled`, `defaultLanguage`, `supportedLanguages`, `timezone`, `createCape`, `gameId`.

When invoked from CLI (no wizard ran), populate the `wizard` block with the same defaults the wizard would surface, so the schema is identical regardless of entrypoint. These defaults need documenting in code (a single `WIZARD_DEFAULTS` constant near the writer).

### 5b — `SCAFFOLD_CHECKLIST.md` writer parity (92-line gap)

Locate `writeChecklistFile()` (`scaffold.js:~2252`). Likely fixes:

- Add per-page entry for `video-2` in **Pages & Routes** and **Per-page** smoke-test list.
- Add `{{NEXT_AFTER_VIDEO-2}}` in **Computed flow tokens**.
- Align section ordering / wording with antigravfix's checklist.

After workstream 3 lands, byte-diff against antigravfix's checklist and normalize.

### 5c — Verification harness

Add `scripts/verify-antigravfix.js`:

1. Clean a temp directory.
2. Run the recreate command into it (`--skip-install`, `--skip-git` if added).
3. Diff against `antigravfix/`, excluding:
   - `.git/`, `.next/`, `node_modules/`, `package-lock.json`, `tsconfig.tsbuildinfo`, `next-env.d.ts`
   - Lines matching `"createdAt"` or `"scaffoldedAt"`
4. Exit non-zero if any diff lines remain.

Wire into `npm test` so future scaffolder edits can't silently reintroduce drift.

Optional flag additions (nice-to-have, not required for byte-diff):

- `--skip-install` — bypass `npm install` (saves ~1 min on Windows).
- `--skip-git` — bypass `git init` (avoids spurious husky warning).

### 6 — Wizard UX upgrades

The wizard (web + CLI) drives the `.scaffolded` shape that the parity work depends on. Seven targeted improvements, ordered by dependency. They are landed *after* parity (workstreams 1–5) is green, so the byte-diff verification harness already exists and protects against accidental regression.

**6a — Standardise user-facing terminology**

The persisted shape in `.scaffolded` (`game: "unity"` for engine, `selectedGame.id` / `wizard.gameId` for the game pick) is locked by workstream 5a and stays as-is. Only *user-facing labels* change so the spoken/UI vocabulary is unambiguous:

- **"engine"** in all prompts and UI labels = `unity` | `r3f` | `phaser` | `pure-react` | `none`
- **"game"** in all prompts and UI labels = the pre-built game definition (Haas F1, NHL Crush, …)

Touch points:

- `cli/scaffold.js` — prompt heading "Pick game" → "Pick engine"; summary panel field "Engine" already says "Engine" (good, no change). The `--game` CLI flag is renamed in *help text* to `--engine` while continuing to accept `--game` as an alias (no deprecation warning — `antigravfix/SCAFFOLD_DEBUG.json`'s recreate command uses `--game=unity` and must keep working).
- `cli/wizard-ui/` — rename the engine sub-step heading inside `StepStack` from "Game" to "Engine"; keep the existing `StepGames` step (game pick) and tighten its heading to make the distinction obvious. Internal config keys (`game`, `gameId`) **do not change** — they map cleanly to `.scaffolded`'s persisted shape.
- `cli/wizard-server/` — no schema changes; only any user-visible error strings get the new wording.

Net effect: **no config-key renames, no `.scaffolded` shape change** — purely a copy / label cleanup so users stop conflating engine with game.

**6b — Surface module implications inline**

`cli/scaffold.js` modules prompt: append `(adds: scoring)` to any module that implies others. Final summary shows:

```
Modules: leaderboard, registration, scoring (auto: implied by leaderboard, registration)
```

Web wizard's new `StepModules` (workstream 6g) shows the same info as a badge under each pre-checked auto-implied card.

**6c — Live route preview in the page picker (CLI)**

After each addition/removal in the page picker, reprint the current selection as a route table:

```
Selected pages so far:
  1. /video       (instance: video)
  2. /landing     (instance: landing)
  …
```

The summary panel at the end of the wizard replaces the bare comma-separated `Pages:` line with the same table. Web wizard already does this; this brings CLI to parity.

**6d — Validation gates**

Three rules, enforced in `cli/scaffold.js` (CLI + `--yes` mode) and in `cli/wizard-server/` schema validation (web):

1. `engine === 'none'` AND a `game` page is in `pages` → reject: *"`game` page requires an engine. Add `--engine=unity|r3f|phaser` or remove the `game` page."*
2. `pageId` matches `/^[a-z]+-\d+$/` AND base type isn't in `pages` → reject: *"`<pageId>` is a duplicate instance and requires a `<base>` page first."*
3. `engine !== 'none'` AND no `game` page in `pages` → warn (don't block): *"Engine `<engine>` selected but no `game` page is in the flow. The runtime won't render. Continue anyway? [y/N]"*

Rules 1 + 2 also ship as web-form-level field validators so the user sees the error at edit time, not on submit.

**6e — Helper text for cryptic fields**

One-line clarifier under each prompt (CLI) / under each form field (web):

- **Market** — *"Two-letter country code. Drives default language, GDPR copy, and CAPE locale. Example: `NL`"*
- **Output directory** — *"Where to scaffold the project. Default `../{name}` resolves to: `<absolute-path>`"* (CLI computes and shows the resolved absolute path so Windows users see what `..` means)
- **CAPE ID** — *"Existing campaign to bind to. Leave blank to create a new one in the next step."*

Web wizard reuses its existing helper-text component pattern.

**6f — CLI back-navigation parity**

Refactor each prompt in `runWizard()` (`cli/scaffold.js`) into a callable `promptXxx(state)` function returning the updated state. Extend the post-summary edit menu from the current 6 fields to: `name, capeId, market, engine, game, pages, modules, regMode, gtmId, iframe, output`. Each menu choice re-invokes the matching `promptXxx`.

This is the largest mechanical change in workstream 6 — moves prompt logic from inlined scripts to small functions. **No behaviour change for `--yes` mode** (which skips prompts entirely).

**6g — Add the missing Modules step to the web wizard**

Insert `StepModules` between `StepGames` and `StepCape` in `cli/wizard-ui/App.tsx`. Implementation pattern mirrors `StepGames`:

- Renders one card per module from a static catalog (sourced from `modules/*/manifest.json` — server-side list endpoint, e.g. `/api/modules`, returning `{ id, name, description, implies, packages }`).
- Auto-implied modules (from page picks) are pre-checked and disabled, with a "added by `<page>`" badge.
- Modules with implications show an "implies: X" badge.
- The `gtm` card expands inline to capture `gtmId` (no separate step). Helper text under the input from workstream 6e.
- Validation: nothing required — modules are all optional.

New files:

- `cli/wizard-ui/src/steps/StepModules.tsx`
- `cli/wizard-ui/src/steps/StepModules.module.css` (or whichever styling pattern the existing steps use)
- New endpoint in `cli/wizard-server/`: `GET /api/modules` reads `modules/*/manifest.json` once at startup and returns the catalog.

State plumbing: the existing `ScaffoldConfig` already has `modules: string[]` and `gtmId?: string` — no schema changes needed beyond exposing them in the UI.

## Execution order

```
1. Workstreams 1 + 2 (copy-back)             [parallelisable, no logic risk]
2. Workstream 3 (page-instance support)      [enables 4 + 5b]
3. Workstream 4 (cape-format field gap)      [depends on 3]
4. Workstreams 5a + 5b (writer parity)       [depends on 1–3]
5. Workstream 5c (verification harness)      [depends on all above; gates merge of 1–5]
6. Workstream 6 (UX upgrades)                [lands after 5c is green]
   ├── 6a (terminology)                      [foundation; touches every later step]
   ├── 6b, 6c, 6e (CLI polish)               [parallelisable after 6a]
   ├── 6d (validation gates)                 [parallelisable after 6a]
   ├── 6f (CLI back-nav refactor)            [touches the same prompt code; land after 6b/6c/6e]
   └── 6g (web Modules step)                 [parallelisable with 6b–6f]
```

## Out of scope (explicit YAGNI)

- Generic page-instance support for non-video pages.
- Refactoring `scaffold.js` beyond the helpers, call sites, and prompt extraction needed for workstreams 3 and 6f.
- Backporting changes to `tanstack` template or `tanstack-page-builder.js` — antigravfix is Next.js only.
- New module types or new game definitions.
- Replacing the static `mock-cape.json` with dynamic generation.
- Auto-deriving project names from brand+market.
- Adding timezone / language prompts to the CLI (web wizard handles these; CLI users can edit `.env`).
- ASCII flow diagram in the CLI summary — workstream 6c's route table covers the same need with less terminal noise.

## Success criterion

Two checkpoints, both required:

1. **Parity** — `node scripts/verify-antigravfix.js` exits 0: the recreate command produces output byte-identical to `antigravfix/` after the documented exclusions.
2. **UX** — Manual smoke of the wizard (web + CLI) confirms each of the seven 6a–6g changes is in place. No automated test for the UX work; the parity test from checkpoint 1 guards against regression of the underlying scaffold output.
