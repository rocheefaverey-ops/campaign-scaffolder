# Campaign Scaffolder — AI Agent Context

> Drop this file into any AI coding agent (Claude Code, Cursor, Copilot, Windsurf, etc.) for full project context.
> Also readable as `CLAUDE.md` by Claude Code, `.cursorrules` by Cursor, or `.github/copilot-instructions.md` by Copilot.

---

## What this repo is

A CLI scaffolder that generates Livewall interactive campaign websites in seconds.
Livewall builds branded, gamified web campaigns (spin-to-win, memory games, quizzes, etc.) for brands like Hema, NHL, Carrefour.

Two output stacks:
- **Next.js 16** (`base-templates/next/`) — CAPE-heavy, registration flows, SSR, most common
- **TanStack Start + Vite** (cloned from `unity-tanstack-boilerplate`) — Unity WebGL focus, NHL-Crush pattern

The repo lives at: `https://github.com/rocheefaverey-ops/campaign-scaffolder`

---

## Repo structure

```
campaign-scaffolder/
├── cli/
│   ├── scaffold.js              # Main CLI — wizard + scaffolding engine
│   ├── cape-client.js           # Self-contained CAPE API client (create campaign, push format, publish)
│   ├── page-builder.js          # Next.js per-page element selector
│   ├── tanstack-page-builder.js # TanStack per-page element selector
│   ├── post-scaffold-message.js # Post-scaffold dev checklist printer
│   ├── game-registry.js         # Game engine metadata
│   └── teardown.js              # Removes scaffolded test projects
├── base-templates/
│   └── next/                    # Full Next.js 16 project — copied verbatim then patched
├── modules/                     # Optional injectable modules
│   ├── audio/                   # Howler.js audio player
│   ├── cookie-consent/          # Cookiebot banner
│   ├── design-tokens/           # CAPE → CSS custom properties
│   ├── gtm/                     # Google Tag Manager
│   ├── leaderboard/             # Score table (implies: scoring)
│   ├── phaser/                  # Phaser game engine
│   ├── r3f/                     # React Three Fiber game engine
│   ├── registration/            # Player registration form (implies: scoring)
│   ├── scoring/                 # create-session / end-session API actions
│   ├── unity/                   # Unity WebGL adapter + bridge
│   ├── video/                   # Video player page
│   └── voucher/                 # Reward screen + QR code
├── formats/
│   └── scaffolder-format.json   # CAPE interfaceSetup pushed to new campaigns
├── examples/
│   └── campaign-pages/          # Reference page implementations
├── games/
│   └── simple-test-game/        # Minimal game stub for testing
├── wizard.bat                   # Double-click → interactive wizard
├── scaffold-test.bat            # Random smoke-test scaffold
└── teardown.bat                 # Delete all .scaffolded test projects
```

---

## CAPE CMS — the headless CMS

CAPE is Livewall's in-house headless CMS. Every campaign has a campaign ID and a JSON blob published to a CDN.

### CDN URL pattern
```
https://storage-acceptance.bycape.io/account-60/fixed/{campaignId}_{MARKET}.json
```

### Data path conventions (dot-notation)

All content uses dot-notation paths. The unified format has these top-level namespaces:

| Namespace | Contents |
|-----------|----------|
| `copy.*` | All text content (multilanguage) |
| `files.*` | Images/assets specific to a stack or page |
| `desktop.*` | Desktop wrapper config (logo, bg, QR text) |
| `loading.*` | Loading screen text |
| `intro.*` | Intro video src |
| `settings.*` | Language, branding config |
| `general.*` | **DEPRECATED** — old path prefix, do not use |

### Key CAPE path examples

```
copy.landing.title          copy.landing.subtitle       copy.landing.ctaLabel
copy.onboarding.title       copy.onboarding.step1Title  copy.onboarding.ctaLabel
copy.result.title           copy.result.scoreLabel      copy.result.ctaLabel
copy.menu.home              copy.menu.leaderboard       copy.menu.close
copy.leaderboard.headline   copy.leaderboard.ctaDone
copy.register.headline      copy.register.subline       copy.register.cta
copy.register.labelFirstName copy.register.labelEmail   copy.register.optIn1
copy.voucher.headline       copy.voucher.cta
copy.video.headline         copy.video.cta
copy.game.headline
desktop.useDesktopWrapper   desktop.logo                desktop.backgroundIllustration
desktop.description         desktop.qrText
loading.title
files.result.winImage       files.result.loseImage
files.voucher.voucherImage
intro.video.src
```

### CAPE utilities — Next.js

File: `utils/getCapeData.ts`

```ts
getCapeText(capeData, 'copy.landing.title', 'fallback')
getCapeImage(capeData, 'desktop.logo')           // returns URL string
getCapeBoolean(capeData, 'desktop.useDesktopWrapper', true)
getCapeNumber(capeData, 'some.number', 0)
```

In client components: `const { capeData } = useCapeData()` (hook)
In server components / layout: `await getCapeDataServer()` (server-only)

### CAPE utilities — TanStack

```ts
// getCapeCopy automatically prepends 'copy.' — so ['landing','title'] reads copy.landing.title
const [title, subtitle] = await getCapeCopy(language, [
  ['landing', 'title'],
  ['landing', 'subtitle'],
]);

// For non-copy fields (images, files):
const logo = await getCapeTranslatedProperty(language, { type: 'files', path: ['desktop', 'logo'] });
```

### Mock mode (Next.js)

```bash
npm run dev           # hits live CDN (CAPE_MOCK=false in .env)
npm run dev:mock      # serves public/mock-cape.json (CAPE_MOCK=true via cross-env)
npm run cape:fetch-mock  # fetches live CDN → saves to public/mock-cape.json
```

The `.env` file has `CAPE_MOCK=false`. Only `npm run dev:mock` activates mock mode.

### CAPE format

The canonical format is `formats/scaffolder-format.json`.
Push it to a campaign via `cape push-format scaffolder-format.json {campaignId}` from `lwg-cli-cape/`.

**IMPORTANT**: When renaming paths in the format (e.g. `general.x` → `copy.x`), the live CDN JSON retains old keys. New keys will be empty until the editor re-enters content in CAPE and re-publishes. Don't use `general.*` paths in new code.

---

## CLI — scaffold.js

### Running it

```bash
node cli/scaffold.js                    # interactive wizard
node cli/scaffold.js --name=x --cape-id=12345 --market=NL --stack=next --yes
wizard.bat                              # Windows shortcut
```

### All flags

| Flag | Values | Default |
|------|--------|---------|
| `--name` | lowercase slug (e.g. `hema-handdoek-2025`) | — (required) |
| `--cape-id` | numeric CAPE campaign ID | — (required non-interactively) |
| `--market` | NL BE FR DE UK ES IT PL AT CH LU DK SE NO FI | NL |
| `--stack` | `next` \| `tanstack` | `next` |
| `--game` | `unity` \| `r3f` \| `phaser` \| `video` \| `none` | none |
| `--page` | repeatable — page names (see below) | auto |
| `--module` | repeatable — module IDs (see below) | auto |
| `--gtm-id` | GTM-XXXXXX | — |
| `--iframe` | flag — enables iframe embed mode | false |
| `--output` | absolute path | sibling of scaffolder dir |
| `--yes` | skip confirmation | false |

### What the CLI does (in order)

1. Wizard or flag parse → resolves options
2. Optionally creates a CAPE campaign via `cape-client.js` (login → create → push format → populate defaults → publish)
3. Acquires a `.scaffold.lock` file (auto-cleared if PID is stale)
4. Copies `base-templates/next/` into a temp dir (or clones TanStack boilerplate)
5. For each module: reads `manifest.json`, copies files to `dest` paths
6. Resolves `implies` chains (`leaderboard` → adds `scoring`)
7. Runs page builder — generates page files from element selections
8. Token-replaces `{{PROJECT_NAME}}`, `{{CAPE_ID}}`, `{{MARKET}}`, `{{GTM_ID}}`, `{{FLOW_*}}` in all text files
9. Appends env vars to `.env`
10. Patches `proxy.ts` CSP headers with `manifest.cspPatch` entries
11. Atomically renames temp dir to final output path
12. Runs `git init` + `npm install`
13. Prints post-scaffold checklist

### Token replacement

These tokens are replaced in every text file in the output:

| Token | Replaced with |
|-------|---------------|
| `{{PROJECT_NAME}}` | project slug |
| `{{CAPE_ID}}` | numeric campaign ID |
| `{{MARKET}}` | market code (NL, BE…) |
| `{{GTM_ID}}` | GTM-XXXXXX or empty |
| `{{FLOW_ENTRY}}` | first page route (e.g. `/landing`) |
| `{{FLOW_LANDING}}` | next route after landing |
| `{{FLOW_ONBOARDING}}` | next route after onboarding |
| `{{FLOW_GAME}}` | next route after game |
| `{{FLOW_RESULT}}` | next route after result |
| `{{FLOW_REGISTER}}` | next route after register |

---

## Pages

### Next.js pages

| Page ID | Route | Required module |
|---------|-------|-----------------|
| `landing` | `/landing` | — |
| `onboarding` | `/onboarding` | — |
| `game` | `/gameplay` | game engine module |
| `result` | `/result` | — |
| `leaderboard` | `/leaderboard` | `leaderboard` |
| `register` | `/register` | `registration` |
| `voucher` | `/voucher` | `voucher` |
| `video` | `/video` | `video` |

Default pages (no game): `landing, onboarding`
Default pages (with game): `landing, onboarding, game, result`

### TanStack pages

| Page ID | Route |
|---------|-------|
| `launch` | `/launch` |
| `tutorial` | `/tutorial` |
| `game` | `/game` |
| `register` | `/register` |
| `score` | `/score` |

Default pages: `launch, tutorial, game, score`

---

## Module system

Every module in `modules/{id}/` has a `manifest.json`:

```json
{
  "id": "leaderboard",
  "name": "Leaderboard",
  "description": "Score table with tabs and pagination",
  "files": [
    { "src": "components/Leaderboard/Leaderboard.tsx", "dest": "components/_modules/Leaderboard/Leaderboard.tsx" },
    { "src": "app/(campaign)/leaderboard/page.tsx",    "dest": "app/(campaign)/leaderboard/page.tsx" }
  ],
  "packages": [],
  "envVars": [],
  "implies": ["scoring"],
  "cspPatch": {}
}
```

`src` paths are relative to the module directory.
`dest` paths are relative to the scaffolded project root.
`implies` auto-adds other modules.

### All modules quick reference

| Module | Packages | Implies | Env vars |
|--------|----------|---------|----------|
| `unity` | — | — | NEXT_PUBLIC_UNITY_BASE_URL, NEXT_PUBLIC_UNITY_GAME_NAME, NEXT_PUBLIC_UNITY_VERSION, NEXT_PUBLIC_UNITY_COMPRESSION |
| `r3f` | three, @react-three/fiber, @react-three/drei, @react-three/rapier | — | — |
| `phaser` | phaser | — | — |
| `leaderboard` | — | scoring | — |
| `registration` | — | scoring | — |
| `scoring` | — | — | — |
| `voucher` | — | — | — |
| `video` | — | — | — |
| `audio` | howler | — | — |
| `gtm` | — | — | NEXT_PUBLIC_GTM_ID |
| `design-tokens` | — | — | — |
| `cookie-consent` | — | — | NEXT_PUBLIC_COOKIEBOT_CBID |

---

## CAPE client (cape-client.js)

Self-contained CAPE API client — does NOT depend on `lwg-cli-cape` being installed.
Shares `~/.cape/tokens.json` with the CLI (same location), so a user logged in via the CLI is also logged in here.

```js
import { checkAuth, login, createCampaign, pushFormat, populateDefaults, publishCampaign } from './cape-client.js';

const tokens = await checkAuth();               // null if not logged in
const tokens = await login(email, password);    // saves to ~/.cape/tokens.json
const id     = await createCampaign(tokens, { title, market });
await pushFormat(tokens, id, formatFile);       // formatFile = { interfaceSetup, publishProfiles }
await populateDefaults(tokens, id, interfaceSetup);
await publishCampaign(tokens, id);             // polls until done (~30s)
```

CAPE API base: `https://api-acceptance.campaigndesigner.io`
Auth: Bearer token stored as `{userId}:{token}` in `~/.cape/tokens.json`

---

## Next.js base template structure

```
base-templates/next/
├── app/
│   ├── layout.tsx              # Root layout — mounts CapeProvider, DesktopWrapper, Header
│   ├── globals.css
│   └── (campaign)/
│       ├── landing/page.tsx
│       ├── onboarding/page.tsx
│       ├── gameplay/page.tsx
│       ├── result/page.tsx
│       └── ...
├── components/
│   ├── _core/                  # Always-present: Button, Header, Loading, DesktopWrapper
│   └── _modules/               # Injected by modules (never edit directly in scaffolder)
├── contexts/
│   ├── CapeProvider.tsx        # Fetches + distributes CAPE data client-side
│   └── GameContext.tsx         # Score, session state
├── hooks/
│   └── useCapeData.ts          # Client hook → reads from CapeProvider
├── lib/
│   └── cape/
│       ├── cape.server.ts      # Server-only fetcher with 5-min TTL cache + mock mode
│       └── cape.types.ts
├── utils/
│   └── getCapeData.ts          # getCapeText / getCapeImage / getCapeBoolean / getCapeNumber
├── public/
│   └── mock-cape.json          # Local CAPE stub for dev:mock mode
├── env.dist                    # Template — copy to .env and fill in values
└── .env.mock                   # Full mock env — copy to .env for offline dev
```

### Key conventions (Next.js)

- **Client components** use `useCapeData()` hook
- **Server components / layout** use `getCapeDataServer()` directly
- **Pages** are `'use client'` by default and use `useCapeData()`
- **CAPE paths** always use `copy.*` prefix for text, never `general.*`
- **Module components** go in `components/_modules/` — never edit these in the base template
- **CSS**: Tailwind 4 by default. Module SCSS in `{component}/module.scss` if needed

---

## TanStack boilerplate notes

The TanStack stack is cloned from `unity-tanstack-boilerplate` (sibling repo).
It must exist at `../unity-tanstack-boilerplate/frontend` relative to the scaffolder.

Key differences vs Next.js:
- File-based routing via TanStack Router (`src/routes/`)
- Loaders run server-side, data passed via `Route.useLoaderData()`
- `getCapeCopy(language, paths)` auto-prepends `'copy.'`
- `getCapeTranslatedProperty(language, {type, path})` for images/files
- No `useCapeData()` hook — data comes from loader
- Unity-only game engine (no R3F/Phaser support)

---

## Common tasks

### Add a new module

1. Create `modules/{id}/manifest.json` with files, packages, implies, cspPatch
2. Create the actual source files the manifest references
3. Add the module ID to the wizard's module list in `cli/scaffold.js` (search `ALL_MODULE_IDS`)

### Add a new Next.js page to the base template

1. Create `base-templates/next/app/(campaign)/{page}/page.tsx`
2. Add the page to `ALL_PAGES` in `scaffold.js`
3. Add its route to `PAGE_ROUTES` in `scaffold.js`
4. Add any required module to `PAGE_REQUIRES_MODULE` if applicable
5. Add `copy.{page}.*` paths to `formats/scaffolder-format.json`

### Update the CAPE format

1. Edit `formats/scaffolder-format.json`
2. Push to a campaign: from `lwg-cli-cape/`, run `node cli.js push-format ../campaign-scaffolder/formats/scaffolder-format.json {campaignId}`
3. **Never rename existing paths** without a migration plan — live CDN retains old keys

### Run a test scaffold

```bat
scaffold-test.bat   # random stack + modules, outputs to sibling dir
teardown.bat        # removes all .scaffolded projects
```

### Update an existing scaffolded project

```bash
node cli/scaffold.js --update    # or just run wizard — detects .scaffolded marker
```

---

## Environment variables (Next.js projects)

| Var | Description |
|-----|-------------|
| `NEXT_PUBLIC_CAPE_URL` | CAPE CDN base URL |
| `NEXT_PUBLIC_CAPE_DEFAULT_ID` | Numeric campaign ID |
| `NEXT_PUBLIC_CAPE_DEFAULT_MARKET` | Market code (NL, BE…) |
| `NEXT_PUBLIC_CAPE_LANGUAGE` | Language code for text (nl, en…) |
| `CAPE_MOCK` | `true` = serve mock-cape.json, `false` = hit CDN |
| `API_URL` | Backend API base URL |
| `SERVER_SECRET` | JWT signing secret |
| `NEXT_PUBLIC_GTM_ID` | GTM-XXXXXX (gtm module) |
| `NEXT_PUBLIC_UNITY_BASE_URL` | Unity CDN build folder URL |
| `NEXT_PUBLIC_UNITY_GAME_NAME` | Unity game name |
| `NEXT_PUBLIC_COOKIEBOT_CBID` | Cookiebot domain group ID |

---

## Gotchas / non-obvious things

- **`CAPE_MOCK=false` in `.env` but app shows mock data** → you're running `npm run dev:mock`, not `npm run dev`
- **Live CDN has stale old paths** → publish the campaign in CAPE after pushing a new format; old `general.*` keys stay in the CDN JSON forever, `copy.*` keys will be empty until re-entered
- **5-minute cache in dev** → bypassed — `cape.server.ts` uses `cache: 'no-store'` in development, so changes appear immediately
- **TanStack `getCapeCopy`** → automatically prepends `'copy.'` — pass `['landing','title']` not `['copy','landing','title']`
- **Stale `.scaffold.lock` files** → auto-cleared now if the owner PID is dead; previously required manual deletion
- **Module `implies`** → resolved recursively but safely — no infinite loop risk even with circular implies
- **`general.*` CAPE paths** → deprecated, all replaced with `copy.*`. Never add new `general.*` references
- **Non-interactive TanStack** → must pass `--page=launch --page=tutorial --page=game --page=score` or it defaults to those four automatically
- **Market ask in CAPE create flow** → asked once upfront; later market prompt is skipped if already set
- **`teardown.bat`** → only removes folders with a `.scaffolded` marker file; manually deleted marker = can't teardown
- **Format file in scaffolder** → `formats/scaffolder-format.json` is a snapshot; keep it in sync when updating CAPE format paths

---

## Key files to know

| File | Why it matters |
|------|----------------|
| `cli/scaffold.js` | Everything — wizard, scaffolding engine, token replacement, module installation |
| `cli/cape-client.js` | CAPE API integration — create campaign, push format, populate, publish |
| `formats/scaffolder-format.json` | The CAPE interfaceSetup for all scaffolded campaigns |
| `base-templates/next/utils/getCapeData.ts` | All CAPE data reading utilities |
| `base-templates/next/lib/cape/cape.server.ts` | Server fetcher — cache, mock mode |
| `base-templates/next/public/mock-cape.json` | Local CAPE data stub |
| `modules/*/manifest.json` | What each module installs |
