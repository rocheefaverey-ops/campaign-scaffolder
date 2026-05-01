# Livewall Campaign Scaffolder

CLI and wizard that generate ready-to-run campaign frontends for Livewall. It can scaffold a Next.js 15 App Router app (CAPE-heavy flows) or a TanStack Start + Vite app (Unity-focused).

## Remote Configuration

This project is configured with two remotes:

### GitHub (primary)
```bash
git remote -v
# origin  https://github.com/rocheefaverey-ops/campaign-scaffolder.git
```

### LWService GitLab
```bash
# Add remote (if not already added)
git remote add lwservice https://git.lwservice.nl/lwhq/stages/stage-rochee/stage-rochee-frontend

# Push to LWService
git push lwservice master:main
```

> **Note:** The LWService remote protects the `master` branch, so push to `main` instead.

## What it does
- Asks (or reads flags for) project name, CAPE campaign id + market, stack, game engine, pages, registration mode, modules, GTM id, iframe mode, and output path.
- Copies the base template (`base-templates/next` or `base-templates/tanstack`) depending on the selected stack.
- Drops selected modules from `modules/*` (files, env vars, CSP patches, npm deps).
- Fills routing tokens between pages, writes `.env` and `.env.example`, optionally injects game-specific env vars from `games/{id}/game.json`.
- Patches CSP, enables iframe mode if requested, installs module packages, and does a `git init` + initial commit.
- Prints a post-scaffold checklist (env, CAPE pull reminder, npm install/dev).

## Prerequisites
- Node.js 18+ (TanStack stack requires Node 24+).
- Web UI: `cd cli/wizard-server && node server.js` → http://localhost:3456
- CLI: `wizard.bat` (Windows) or `node cli/scaffold.js`

## Quick start
**Recommended (Web UI):**
```bash
# Start the wizard server + UI
cd cli/wizard-server
node server.js
# Then open http://localhost:3456 in your browser
```

**CLI (alternative):**
```bash
node cli/scaffold.js
# or on Windows
wizard.bat
```

Non-interactive example (Next stack):
```bash
node cli/scaffold.js \
  --name=hema-handdoek-2025 \
  --cape-id=54031 \
  --market=NL \
  --game=unity \
  --page=landing --page=onboarding --page=game --page=result --page=leaderboard \
  --reg-mode=gate \
  --module=registration --module=leaderboard --module=audio --module=gtm \
  --gtm-id=GTM-XXXXXXX \
  --output=../hema-handdoek-2025 \
  --yes
```

Quick Unity TanStack run:
```bash
node cli/scaffold.js --stack=tanstack --name=nhl-crush-2026 --cape-id=54031 --market=NL --output=../nhl-crush-2026 --yes
```

`test-scaffold.bat` shows a complete flag set and wipes the previous output folder before running.

## CLI flags
- `--stack` `next|tanstack` (default: `next`)
- `--name` project folder / app name (required in non-interactive)
- `--cape-id` numeric CAPE id (required in non-interactive)
- `--market` market code (default `NL`)
- `--game` `unity|r3f|phaser|video|pure-react` (ignored for tanstack; defaults to `unity` when non-interactive)
- `--page` repeatable; choose from `landing`, `video`, `onboarding`, `register`, `game`, `result`, `leaderboard`, `voucher`
- `--reg-mode` `none|gate|after` (controls where the register page sits in the flow)
- `--module` repeatable; see module list below
- `--gtm-id` GTM container id
- `--iframe` allow embedding (loosens `frame-ancestors`)
- `--output` absolute or relative path for the generated app (default `../{name}`)
- `--yes` skip confirmation prompts

Defaults: if you omit pages, the wizard suggests a sensible flow per engine; module dependencies are auto-resolved (e.g., leaderboard pulls in scoring).

## Modules (Next stack)
| id | description |
| --- | --- |
| `unity` | Unity WebGL embed with boot pipeline and messaging bridge. |
| `r3f` | React Three Fiber canvas with Drei/Rapier helpers. |
| `phaser` | Phaser 3 canvas with EventEmitter bridge. |
| `video` | Full-screen interstitial video page. |
| `pure-react` | (engine choice only) Use your own React experience. |
| `registration` | Registration form with opt-ins, sends `PUT /api/users/register`. |
| `leaderboard` | Paged score table (daily/weekly/all-time); implies `scoring`. |
| `scoring` | Server actions to create/end game sessions. |
| `voucher` | Reward screen with unique code and optional QR. |
| `audio` | Background audio via Howler with mute toggle. |
| `cookie-consent` | Cookiebot banner + CSP additions. |
| `gtm` | Google Tag Manager script + typed `gtmPush` helper. |

> CAPE branding tokens (colours, fonts) are flowed to CSS custom properties automatically via the built-in `DesignTokenInjector` in the base template — no module needed.

Modules can add env vars, CSP directives, npm deps, and files listed in their `manifest.json`.

## Games registry
- Location: `games/{id}/game.json`. Existing examples: `haas-f1`, `la-roche-posay`, `nhl-crush`, `old-captain-rum-toss`.
- Each manifest declares engine, CDN info, DPR bounds, boot methods, events, translations, and env var defaults.
- To add a game: copy `games/_template/game.json` to `games/{your-id}/game.json`, fill it out, and keep the `engine` in sync with your choice in the wizard. The CLI auto-injects any `env` keys into the generated `.env`.

## Page builder (Next stack)
- Elements per page type are defined in `cli/page-builder.js` (e.g., hero background, logo, title, CTA buttons, countdown, step list, score display, rank badge).
- The wizard uses defaults; non-interactive runs can stick with template pages, but the builder can generate bespoke pages when element selections are provided programmatically.

## What the scaffolded app looks like
- Next stack: App Router, TypeScript, Tailwind, middleware CSP, CAPE data fetching, mock mode enabled by default (`CAPE_MOCK=true` in `.env`).
- TanStack stack: Vite + TanStack Start boilerplate tuned for Unity.
- Both stacks end with a post-scaffold checklist in the console: fill `.env`, manually pull CAPE data via `lwg-cli-cape` (read-only), then `npm install` and `npm run dev`.

## Repo layout
- `cli/` wizard + scaffolding logic.
- `modules/` reusable slices controlled by manifests.
- `base-templates/next/` starter Next.js app.
- `games/` registry of game manifests (`_template` for new ones).
- `wizard.bat`, `test-scaffold.bat` convenience launchers.

Happy scaffolding!

