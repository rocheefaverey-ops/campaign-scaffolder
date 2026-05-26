# Livewall Campaign Scaffolder

Internal Livewall tool for generating ready-to-run campaign frontends through a visual wizard UI.

The wizard is the intended way to use this repo. It lets you choose a stack, game, pages, modules, CAPE settings, flow, and output folder, then scaffolds a complete campaign frontend.

Do not publish this repository publicly.

---

## Clone

Use the GitLab `development` branch:

```bash
git clone -b development https://git.lwservice.nl/lwhq/stages/stage-rochee/stage-rochee-frontend.git
cd stage-rochee-frontend
```

If you already cloned the repo, make sure you are on `development`:

```bash
git switch development
git pull
```

---

## Prerequisites

- Node.js 20+ recommended
- pnpm 10+
- GitLab access to this private repository
- CAPE access if you want the wizard to create or update campaigns

Install pnpm if needed:

```bash
npm i -g pnpm
```

---

## Start The Wizard

Install the root dependencies and the wizard dependencies:

```bash
pnpm install
pnpm run wizard:install
```

Launch the wizard:

```bash
pnpm run wizard
```

The wizard opens at:

```text
http://localhost:3737
```

Use the wizard steps to configure the campaign:

1. Project details
2. Stack
3. Game
4. Pages
5. Modules
6. Flow
7. CAPE/build settings
8. Scaffold

The generated project is written to the output folder you choose in the wizard, usually as a sibling folder next to this repo.

---

## Run A Generated Project

After scaffolding, open the generated frontend:

```bash
cd ../my-campaign/frontend
cp .env.example .env
pnpm install
pnpm dev
```

For Next.js templates that do not create a `frontend/` subfolder, run the same commands from the generated project root.

The generated `.env.example` is meant as a starting point. Fill in real API, CAPE, GTM, logging, and deployment values before using the project outside local development.

---

## Daily Workflow

This repo should be developed from the GitLab `development` branch.

```bash
git switch development
git pull
```

After making changes:

```bash
git status
git add .
git commit -m "your commit message"
git push
```

This local checkout is configured so `git push` targets `lwservice/development`.

---

## What The Wizard Generates

The scaffolder supports two frontend families:

| Stack | Best for |
| --- | --- |
| Next.js | CAPE-heavy flows, multi-page campaigns, registration, result pages, leaderboards |
| TanStack Start + Vite | Unity-first experiences such as NHL Crush and HEMA Stapelgek |

Both stacks include:

- CAPE content and branding wiring
- Runtime design tokens from CAPE
- Page flow configuration
- Optional modules such as registration, leaderboard, scoring, voucher, audio, GTM, and cookie consent
- CSP/env/package patching based on selected modules
- A generated CAPE format/schema for the campaign
- A ready-to-run frontend project with an initial git commit

---

## Pages

Selectable pages in the wizard:

| Page | Route | Notes |
| --- | --- | --- |
| `intro-video` | `/intro-video` | Brand video page |
| `loading-video` | `/loading-video` | Loading video while the game boots |
| `ad-video` | `/ad-video` | Interstitial advert video |
| `landing` | `/landing` | Hero/CTA entry page |
| `tutorial` | `/tutorial` | Tutorial or instruction flow |
| `register` | `/register` | Registration form |
| `game` | `/gameplay` | Main game canvas |
| `result` | `/result` | Score/result page |
| `leaderboard` | `/leaderboard` | Score table |
| `voucher` | `/voucher` | Reward/voucher page |

The wizard flow editor decides where each page goes next. For TanStack + Unity campaigns, the `game` page settings also include **Unity boot timing**: preload Unity from the start page, or wait until the visitor reaches the game page.

---

## Modules

Optional modules live under `modules/` and are selected through the wizard.

| Module | Purpose |
| --- | --- |
| `registration` | Player registration |
| `leaderboard` | Score table and personal best views |
| `scoring` | Session and score submission actions |
| `voucher` | Reward/voucher screen |
| `audio` | Howler-backed audio controls |
| `cookie-consent` | Cookie consent integration |
| `gtm` | Google Tag Manager integration |
| `video` | Video page templates |
| `memory` | Pure React memory game support |

Some modules are included automatically when required. For example, selecting the leaderboard page also brings in leaderboard/scoring support.

---

## Games

Game manifests live in:

```text
games/{game-id}/game.json
```

Each manifest describes the game engine, CDN/build URL, DPR settings, boot methods, expected events, translations, and default environment values.

Existing game manifests include:

```text
acmea-autozeker
bubble-pop
freekick
haas-f1
hunkemoller-memory
la-roche-posay
nhl-crush
simple-test-game
stapel-gek
```

To add a game, copy `games/_template/game.json` to `games/{your-game}/game.json`, fill it in, and restart the wizard.

---

## Tests

Run the test suite before pushing changes to the scaffolder:

```bash
pnpm test
```

The test command covers:

- CAPE format builder drift checks
- Scaffolder smoke tests
- Node test files under `cli/tests/`

The wizard also runs tests before launching through the `prewizard` script.

---

## Rebuild The Wizard UI

If you change files under `cli/wizard-ui/src/`, rebuild before pushing:

```bash
pnpm run wizard:build
```

The wizard uses the built production UI when `cli/wizard-ui/dist/` exists. Otherwise it starts the Vite dev UI.

---

## CLI

The CLI still exists because the wizard uses it internally, but people creating campaigns should use the wizard UI.

Maintainers can run the CLI directly for automation or debugging:

```bash
node cli/scaffold.js --help
```

Example:

```bash
node cli/scaffold.js \
  --name=hema-handdoek-2025 \
  --cape-id=54031 \
  --market=NL \
  --stack=tanstack \
  --game=unity \
  --gameId=nhl-crush \
  --page=landing --page=tutorial --page=game --page=result --page=leaderboard \
  --output=../hema-handdoek-2025 \
  --yes
```

---

## Repo Layout

```text
campaign-scaffolder/
  cli/
    scaffold.js              main scaffolder engine used by the wizard
    cape-format-builder.js   CAPE format/schema generation
    tanstack-page-builder.js TanStack page generation
    wizard.js                starts the wizard server and UI
    wizard-server/           Fastify API used by the wizard
    wizard-ui/               React + Vite wizard UI
  base-templates/            Next.js and TanStack base templates
  modules/                   Optional campaign modules
  games/                     Per-game manifests
  scripts/                   Helper scripts
```

---

## Troubleshooting

**Wizard does not open**

Run:

```bash
pnpm install
pnpm run wizard:install
pnpm run wizard
```

Then open `http://localhost:3737`.

**Tests fail before the wizard starts**

`pnpm run wizard` runs the test suite first. Run `pnpm test` directly to see the failing test output.

**CAPE login fails**

Check your CAPE credentials and access. The wizard stores CAPE auth outside the repo in your user profile, not in git.

**Generated project does not boot**

Check the generated `.env`, run `pnpm install` in the generated frontend, and confirm the selected game/CAPE settings are valid.

---

## License

Internal - Livewall Group.
