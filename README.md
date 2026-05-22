# Livewall Campaign Scaffolder

CLI + visual wizard that generates ready-to-run campaign frontends for Livewall. Pick a stack and a game engine, plus the pages and modules you need, and you get a working app wired up to CAPE for content + branding, with a sensible dev/prod setup out of the box.

Two stacks are supported, each as its own lean base template:

- **Next.js 16** (App Router, Tailwind v4, server actions, CSP middleware) — the default for CAPE-heavy flows, multi-page registration, etc.
- **TanStack Start + Vite** — used when Unity WebGL is the centre of the experience (NHL Crush, HEMA Stapelgek, etc.) and SSR + file-based routing is the right fit.

CAPE owns runtime content: copy in every language, branding colours, the menu's visibility *and* button styles, per-page settings (button visibility, tutorial step count, etc.). The scaffolder generates the schema for that CAPE format alongside the frontend, so the CMS is ready the moment the project boots.

---

## Prerequisites

- **Node.js 20+** (Node 24 recommended for the TanStack stack)
- **pnpm 10+** — `npm i -g pnpm` if you don't have it
- A CAPE campaign ID (or pick "create one for me" in the wizard)

That's it. No global installs, no Docker.

---

## Quick start

```bash
# 1. Clone + install
git clone https://github.com/rocheefaverey-ops/campaign-scaffolder.git
cd campaign-scaffolder
pnpm install
pnpm run wizard:install   # installs deps for the wizard server + UI

# 2. Launch the wizard
pnpm run wizard
```

The wizard opens at <http://localhost:3737> in your browser. Walk through the steps (project → stack → game → pages → modules → build), then click **Scaffold**. The generated project lands as a sibling folder, e.g. `../my-campaign/`.

After it finishes:

```bash
cd ../my-campaign/frontend     # tanstack lives under /frontend
cp .env.example .env           # fill in API_URL etc.
pnpm install
pnpm dev
```

### CLI alternative (CI / known config)

```bash
node cli/scaffold.js \
  --name=hema-handdoek-2025 \
  --cape-id=54031 \
  --market=NL \
  --stack=tanstack \
  --game=unity \
  --page=intro-video --page=landing --page=tutorial --page=loading-video \
  --page=game --page=result --page=leaderboard \
  --output=../hema-handdoek-2025 \
  --yes
```

The same flags apply to the Next.js stack — just pass `--stack=next` and pick from its page set.

---

## What you get

Both stacks ship with the same baseline ready out of the box:

- **CAPE wiring** — fetches at root layout / root loader, cached server-side. Helpers (`getCapeCopy`, `getCapeProperty`) for type-safe lookups.
- **`DesignTokenInjector`** — reads `settings.branding.*` from CAPE and applies it to `:root` CSS custom properties. The agency-default Livewall palette is the fallback; per-campaign overrides flow at runtime.
- **Brand fonts via CAPE** — `settings.branding.fontFamily` / `settings.branding.displayFontFamily` drive `--default-font-family` / `--display-font-family`. New CAPE formats seed the Livewall display font on titles; campaigns override it from the CMS.
- **Menu system** — a hamburger button on every hero page opens `/menu`. Items + button styles are CAPE-driven (`settings.menu.show*`, `settings.menu.variant*`). The CLI hard-disables items whose target route wasn't scaffolded, so the menu can never link to a 404.
- **Page flow tokens** — the wizard's flow editor decides what `Continue` does on each page; the CLI bakes the chosen targets into the generated code.
- **CSP, GTM, analytics hooks** — pre-wired in middleware/layout; modules can extend without touching shared config.

The post-scaffold output is a complete, committable project — `git init` is run for you with an initial commit.

---

## Stacks

| Stack | Base template | Best for |
|---|---|---|
| `next` + `unity` | `base-templates/next-unity/` | Unity WebGL campaigns built on Next.js |
| `next` + `r3f` | `base-templates/next-r3f/` | React Three Fiber experiences |
| `next` + `phaser` | `base-templates/next-phaser/` | Phaser 3 2D games |
| `next` + `memory` | `base-templates/next-memory/` | Pure React mini-games (e.g. card memory) |
| `next` + `none` | `base-templates/next-none/` | CAPE-only campaigns, no game |
| `tanstack` + `unity` | `base-templates/tanstack-unity/` | Unity-first campaigns with SSR (NHL Crush pattern) |

Pick `--stack` + `--game` on the CLI, or use the wizard's Stack step.

---

## Pages

Selectable in the wizard's Pages step (or `--page=` repeatable on the CLI):

| Page | Route | Notes |
|---|---|---|
| `intro-video` | `/intro-video` | Brand video bleed, click to continue. |
| `loading-video` | `/loading-video` | Loop while Unity boots; auto-advances on ready. |
| `ad-video` | `/ad-video` | Interstitial advert page. |
| `landing` | `/landing` | Hero CTA into the experience. |
| `tutorial` | `/tutorial` | Step slider, layout configurable (full-bleed or card). |
| `register` | `/register` | Registration form (requires `registration` module). |
| `game` | `/gameplay` | The engine canvas. |
| `result` | `/result` | Score reveal + Continue / Play again / Leaderboard. |
| `leaderboard` | `/leaderboard` | Tabbed score table (daily / weekly / total). |
| `voucher` | `/voucher` | Reward + optional QR (requires `voucher` module). |

The wizard's flow editor decides exits per page (what `Continue` does, which optional CTAs show). Each scaffolded route reads those settings from CAPE at runtime, so post-scaffold tweaks don't need a code change.

---

## Modules

Optional add-ins under `modules/`. The CLI applies them based on `--module=` flags (or wizard selection), resolves `implies` chains automatically, and patches CSP / env / packages as declared in each `manifest.json`.

| id | description |
|---|---|
| `registration` | Player registration with first/last/email + opt-ins. |
| `leaderboard` | Score table (tabs, pagination, personal best). Implies `scoring`. |
| `scoring` | Server actions for `create-session` / `end-session`. |
| `voucher` | Reward screen with unique code + optional QR. |
| `audio` | Howler-backed audio player with mute toggle. |
| `cookie-consent` | Cookiebot banner + CSP rules. |
| `gtm` | Google Tag Manager script + typed `gtmPush` helper. |
| `video` | Video pages (intro/loading/ad). Source for the explicit video route templates. |
| `memory` | Pure-React card-memory game (consumed by `next-memory` template). |

Note: the `leaderboard` module is auto-included whenever you select the `leaderboard` page, and the `scoring` module is auto-included whenever you select `leaderboard` or `registration`. You don't need to add them manually.

---

## Games registry (`games/`)

Each Unity / R3F / Phaser game gets a manifest in `games/{id}/game.json` declaring the engine, CDN URL, DPR bounds, boot methods, expected events, translations, and env defaults. Existing manifests: `acmea-autozeker`, `bubble-pop`, `freekick`, `haas-f1`, `hunkemoller-memory`, `la-roche-posay`, `nhl-crush`, `simple-test-game`, `stapel-gek`.

To add a new game: copy `games/_template/game.json`, fill it in, and pick it from the wizard's Games step (or pass `--game=` on the CLI with a matching `--gameId=`). The CLI auto-injects any `env` keys from the manifest into the scaffolded `.env.example`.

---

## CLI flag reference

| Flag | Description |
|---|---|
| `--stack` | `next` \| `tanstack` (default: `next`) |
| `--name` | Project slug — folder name + replaces `{{PROJECT_NAME}}` tokens |
| `--cape-id` | Numeric CAPE campaign id |
| `--market` | `NL` \| `BE` \| `FR` \| `DE` (default: `NL`) |
| `--game` | `unity` \| `r3f` \| `phaser` \| `memory` \| `none` |
| `--gameId` | Pick a specific manifest from `games/` (e.g. `nhl-crush`) |
| `--page` | Repeatable — see the Pages table above |
| `--module` | Repeatable — see the Modules table above |
| `--reg-mode` | `none` \| `gate` \| `after` (where the register page sits in the flow) |
| `--gtm-id` | Google Tag Manager container id |
| `--iframe` | Loosen `frame-ancestors` so the page can be embedded |
| `--output` | Absolute or relative path for the generated project |
| `--yes` | Skip interactive confirmation |
| `--update` | Re-apply scaffolder changes to an existing project (preserves uncommitted work) |

Run `node cli/scaffold.js --help` for the live list.

---

## After scaffolding

The CLI ends with a colour-coded checklist. The short version:

```bash
cd <output>/frontend     # tanstack writes a frontend/ subdir; next-* uses the root
cp .env.example .env     # fill in API_URL, GTM, etc.
pnpm install
pnpm dev
```

CAPE data is pulled with the separate [`lwg-cli-cape`](https://github.com/livewall/lwg-cli-cape) tool (read-only). Wave/API endpoints are configured per environment via env vars.

`CAPE_MOCK=true` is set in the generated `.env.example` so the dev server boots even before you've connected real CAPE — disable it the moment you wire up the campaign.

---

## Extending the scaffolder

### Add a module

1. Create `modules/{module-name}/` with a `manifest.json` (see existing modules for the shape).
2. Drop files into `app/`, `components/`, or `lib/` under the module dir — the CLI mirrors them to the scaffolded project at the `dest` paths you declare.
3. Use `{{PROJECT_NAME}}`, `{{CAPE_ID}}`, `{{MARKET}}` tokens for dynamic replacements.
4. Add CSP / env vars / npm deps to the manifest as needed.
5. Run `pnpm test` to make sure the smoke + drift tests still pass.
6. Test a real scaffold: `node cli/scaffold.js --module={your-id} --yes` and dev-run the output.

### Add a game manifest

1. Copy `games/_template/game.json` to `games/{your-id}/game.json` and fill it in.
2. Set `engine` to match the wizard's game-engine choices.
3. The wizard's Games step picks it up automatically.

### Add a page type

Page types are declared in `cli/wizard-ui/src/shared/config.ts` (`ALL_PAGES` + `PAGE_SETTINGS_SCHEMA`) **and** mirrored in `cli/cape-format-builder.js` (`KNOWN_PAGE_TYPES` + the switch in `buildNextCapeFormat`). A drift check runs in `pnpm test` — keep both in sync.

### Rebuild the wizard UI

If you change anything under `cli/wizard-ui/src/`, rebuild before pushing:

```bash
pnpm run wizard:build
```

The wizard launches the production bundle when `cli/wizard-ui/dist/` exists, or Vite + HMR when it doesn't.

---

## Tests

```bash
pnpm test
```

Runs three suites:

1. `cape-format-builder.test.js` — drift check between CAPE schema and wizard config, plus smoke tests for the format builder.
2. `scaffold.test.js` — scaffolder integration smoke tests.
3. `cli/tests/*.test.js` — node `--test` unit suite.

`pnpm prewizard` runs the same tests automatically before launching the wizard.

For a full manual journey before a release — scaffold → wizard → boot the generated app → click through every page → CAPE override smoke — see **[TESTING.md](TESTING.md)**.

---

## Repo layout

```
campaign-scaffolder/
├── cli/
│   ├── scaffold.js              # main entry — Next + TanStack scaffolders
│   ├── cape-format-builder.js   # generates CAPE format JSON for each campaign
│   ├── tanstack-page-builder.js # bespoke page generation for the TanStack stack
│   ├── wizard.js                # boots wizard server + UI
│   ├── wizard-server/           # Fastify API the wizard calls
│   └── wizard-ui/               # React + Vite wizard (build output in dist/)
├── base-templates/
│   ├── next-unity/   next-r3f/   next-phaser/   next-memory/   next-none/
│   └── tanstack-unity/
├── modules/                     # Composable add-ins: registration, leaderboard, …
├── games/                       # Per-game manifests (engine, CDN, boot config)
└── scripts/                     # wizard.bat, scaffold-test.bat, helper scripts
```

---

## Troubleshooting

**`spawn EINVAL` when launching the wizard or starting a preview (Windows)**
Node 20+ refuses to spawn `.cmd` / `.bat` files directly. The wizard server handles this with `shell: true` on Windows; if you wrote a new spawn call, mirror that pattern.

**"Drift: KNOWN_PAGE_TYPES contains type(s) the wizard doesn't expose"**
The CAPE schema (`cape-format-builder.js`) and wizard config (`wizard-ui/src/shared/config.ts`) are out of sync. Add the missing page type to `ALL_PAGES`, or remove it from `KNOWN_PAGE_TYPES`.

**Generated CSS module class names look wrong (button is invisible / rectangular)**
Component-level `.module.scss` files under `src/components/` are auto-wrapped in `@layer components` by the vite config. Unlayered rules in `globals.css` win over layered rules; if a style is being stripped, override it from `globals.css` rather than the module.

**`CAPE_MOCK=true` leftover in production**
The scaffolded `.env.example` ships with `CAPE_MOCK=true` so the dev server boots before CAPE is wired. Remove that line before deploying.

---

## License

Internal — Livewall Group.
