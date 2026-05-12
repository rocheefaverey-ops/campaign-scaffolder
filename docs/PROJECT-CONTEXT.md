# campaign-scaffolder — Project Context

**Last verified:** 2026-05-12 against working tree on `master`
**Audience:** any agent (or human) picking this codebase up cold across sessions
**Companion docs in this repo:**
- [../CLAUDE.md](../CLAUDE.md) — concise developer guide (the one Claude Code reads each session)
- [../AGENTS.md](../AGENTS.md) — older agent-context dump (richer narrative, may drift)
- [../README.md](../README.md) — consumer-facing usage
- [../IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md) — feature inventory
- [superpowers/](superpowers/) — design specs and implementation plans (one folder per feature)

> If a fact in this doc disagrees with the code, the code wins. File:line references are kept tight so claims are cheap to verify.

---

## 1. What this project is, in one paragraph

`campaign-scaffolder` is the internal Livewall CLI + web wizard that generates new
interactive campaign websites by composing a chosen **base template** (Next.js or
TanStack Start) with a chosen **game** and a chosen set of **modules** (leaderboard,
voucher, registration, audio, GTM, cookie-consent, etc.). Every generated project
is wired to **CAPE** (the Livewall content/campaign service) for branding, copy,
and assets, and to a **game adapter layer** (Unity / R3F / Phaser / memory / video
/ pure-React) for the playable. The scaffolder is the standardised way to spin up
a new client campaign without copy-pasting an old project.

---

## 2. Why it exists — design intentions

Three concerns drove the design and still drive every change:

1. **Composition over forking.** Every previous campaign was a fork of the
   previous one. Drift was inevitable. The scaffolder replaces forking with a
   declarative recipe: pick a stack, pick a game, pick modules, get a project.
2. **Two parallel "gold standards" instead of one.** Next.js is the historical
   default and remains CAPE-heavy and feature-rich. TanStack Start is the newer
   stack for projects that need a thinner runtime or Vite-native tooling. Both
   are first-class; neither is allowed to silently rot. Per user memory:
   *HaasF1* is the Next.js gold standard, *NHL-Crush* is the TanStack gold
   standard, and the "antigravfix-parity" workstream exists specifically to keep
   them visually + behaviourally aligned.
3. **Catch CAPE drift before it ships.** CAPE silently changes its field
   structure. The scaffolder ships defensive layers — schema + warnings +
   pre-push checks + a smoke test — so that "the generated project booted but
   the copy is blank" is loud, not silent. See `cape-format-builder.js` and the
   per-feature CONTEXT docs.

What the project deliberately is **not**:
- It is not a CMS. CAPE is the CMS.
- It is not a game engine. Games live behind a thin adapter interface.
- It is not a runtime — once a project is generated, the scaffolder is gone.

---

## 3. Repo layout (top-level, verified)

```
campaign-scaffolder/
├── base-templates/
│   ├── next/           # Next.js 16 + React 19 + Tailwind v4 + GSAP
│   └── tanstack/       # TanStack Start v1 + Vite + Zustand + SCSS modules
├── modules/            # 12 optional modules (see §6)
├── games/              # Game registry (one game.json per game)
├── cli/                # Scaffolder, wizard server, wizard UI, CAPE client (see §4)
├── docs/
│   ├── superpowers/    # Specs and plans, one per feature
│   └── PROJECT-CONTEXT.md   ← this file
├── scripts/            # Standalone utilities (e.g. verify-antigravfix.js)
├── brand-assets/       # Livewall imagery / design source files
├── examples/           # Example campaign layouts
├── _out/               # Output of test scaffolds (gitignored / scratch)
├── voorbeeld figma designs/   # Reference designs
├── CLAUDE.md           # Per-session agent guide
├── AGENTS.md           # Older long-form agent context
├── README.md           # Consumer-facing
├── IMPLEMENTATION_SUMMARY.md
├── package.json        # `lw-scaffold` bin, scripts (see §11)
├── wizard.bat / scaffold-test.bat / teardown.bat   # Windows convenience launchers
└── .gitignore
```

Verified entries in `cli/`:
```
cape-client.js   cape-format-builder.js   cape-format-builder.test.js
cape-setup.js    game-registry.js         page-builder.js
post-scaffold-message.js                  scaffold.js
scaffold.test.js                          tanstack-page-builder.js
teardown.js      tests/                   wizard.js
wizard-server/   wizard-ui/
```

Verified modules: `audio, cookie-consent, gtm, leaderboard, memory, phaser, r3f,
registration, scoring, unity, video, voucher` — **12 total**.

Verified games: `_template, haas-f1, la-roche-posay, nhl-crush, old-captain-rum-toss, simple-test-game`.

---

## 4. The CLI — what each file does

| File | Role |
|------|------|
| [cli/scaffold.js](../cli/scaffold.js) (3,730 lines) | Main scaffolder. Reads flags or interactive prompts → loads manifests → copies base template → merges modules → patches CSP → runs `npm install` → prints checklist. |
| [cli/wizard.js](../cli/wizard.js) | Launcher: spawns the Fastify server on `:3737` and (in dev mode) Vite on `:5173`. Opens the browser at whichever side serves the UI. |
| [cli/wizard-server/server.js](../cli/wizard-server/server.js) (502 lines) | Fastify API consumed by the wizard UI. Routes: `GET /api/games?stack=…`, `POST /api/scaffold` (streams scaffold stdout via SSE), `GET/POST /api/auth/…` for CAPE login, static-serves the UI build. |
| [cli/wizard-ui/](../cli/wizard-ui/) | Vite + React 19 + TypeScript. Step components in `src/steps/`: StepStack, StepProject, StepCape, StepGames, StepModules, StepPages, StepBuild, plus PreviewPane and PageSettingsCard. Uses `@dnd-kit` for page reordering. |
| [cli/game-registry.js](../cli/game-registry.js) | Loads every `games/*/game.json`. Exports `loadGameRegistry`, `getGamesByEngine`, `getGamesByStack`, `getGame`, `gameEnvLines`, `gameLabel`. **Single source of truth for game metadata.** |
| [cli/cape-client.js](../cli/cape-client.js) | CAPE API client. Shares the token cache at `~/.cape/tokens.json` with `lwg-cli-cape`. Exports `checkAuth`, `login`, `clearTokenCache`, `createCampaign`, `pushFormat`, `populateDefaults`, `publishCampaign`. |
| [cli/cape-format-builder.js](../cli/cape-format-builder.js) | Builds the `interfaceSetup` + `publishProfiles` JSON that CAPE expects, dynamically, from the chosen pages and modules. Exports `buildNextCapeFormat`, `buildTanStackCapeFormat`, `KNOWN_PAGE_TYPES`. |
| [cli/cape-format-builder.test.js](../cli/cape-format-builder.test.js) | Smoke test: every page type in `KNOWN_PAGE_TYPES` must produce a CAPE tab. Catches silent CAPE-format drift. |
| [cli/cape-setup.js](../cli/cape-setup.js) | Legacy CAPE hook (relied on an external `cape` CLI). Effectively superseded by `cape-client.js`. |
| [cli/page-builder.js](../cli/page-builder.js) | Element catalogue for Next.js pages (hero-bg, logo, title, CTA, countdown, score-display, etc.) consumed by `cape-format-builder.js`. |
| [cli/tanstack-page-builder.js](../cli/tanstack-page-builder.js) | Same idea for TanStack pages (`launch`, `tutorial`, `game`, `register`, `score`). |
| [cli/post-scaffold-message.js](../cli/post-scaffold-message.js) | Prints the colour-coded "next steps" checklist after a scaffold completes (and is runnable standalone for preview). |
| [cli/teardown.js](../cli/teardown.js) | Removes scaffolded projects. `--list`, `--all`, or by name. |
| [cli/scaffold.test.js](../cli/scaffold.test.js) | Unit tests for `basePageType`, `routeFor`, `validateConfig`. |
| [cli/tests/game-registry.test.js](../cli/tests/game-registry.test.js) | Tests `getGamesByStack` — see the Game–Stack Hard Lock context doc. |

`scaffold.js` flags worth knowing:

| Flag | Meaning |
|------|---------|
| `--stack=next\|tanstack` | Which base template |
| `--name=…` | Project slug (replaces `{{PROJECT_NAME}}`) |
| `--cape-id=…` | Numeric CAPE campaign id (replaces `{{CAPE_ID}}`) |
| `--market=NL\|BE\|FR\|…` | Market code (replaces `{{MARKET}}`) |
| `--game=unity\|r3f\|phaser\|memory\|video\|pure-react` | Game engine |
| `--page=…` (repeatable) | Pages: landing, intro-video, onboarding, game, result, register, leaderboard, voucher, … |
| `--module=…` (repeatable) | Modules; transitive deps resolved via `implies` |
| `--reg-mode=none\|gate\|after` | When registration appears in the flow |
| `--gtm-id=…` | GTM container id |
| `--iframe` | Loosen `frame-ancestors` for embedded mode |
| `--output=…` | Absolute output path |
| `--yes` / `--y` | Skip confirmation |
| `--config=path.json` | Read full config from JSON (this is what the wizard server uses) |
| `--cape-create-title=…` | Auto-create a new CAPE campaign with this title and use its id |

---

## 5. Base templates

### 5a. Next.js (`base-templates/next/`)
- **Stack:** Next.js 16 (App Router, Turbopack), React 19, TanStack Query 5, TailwindCSS 4, GSAP, Winston (with optional GCP Cloud Logging).
- **Routes:** `app/(campaign)/{landing,onboarding,menu,gameplay,result}/page.tsx`, plus `app/api/[...slug]/` proxy and `app/actions/*` server actions.
- **Game wiring:** `lib/game-bridge/` defines the adapter interface (`IGameBridgeAdapter`, `IGameResult`, `IUnityInput`, …) and `BRIDGE_EVENTS`. Modules drop adapter files here (`unity-adapter.ts`, `r3f-adapter.ts`, …) and a `gameplay/page.tsx` that mounts the right canvas.
- **CAPE wiring:** `lib/cape/` fetches CAPE data server-side with a 5-minute fetch cache. `DesignTokenInjector` (always on, not optional) reads `general.branding` and emits CSS custom properties.
- **Security:** [base-templates/next/proxy.ts:39](../base-templates/next/proxy.ts#L39) carries the literal comment `// lw-scaffold:csp` — every module's `cspPatch` is inserted **above** this marker. A nonce flows from `proxy.ts` → `x-nonce` header → layout → `FontInjector`.
- **Mock mode:** `CAPE_MOCK=true` swaps the CDN fetch for `public/mock-cape.json`. `API_MOCK=true` and `NEXT_PUBLIC_GAME_MOCK=true` stack on top. See `npm run dev:mock` and `dev:full-mock`.

### 5b. TanStack Start (`base-templates/tanstack/`)
- **Stack:** TanStack Start v1.132 + TanStack Router (file-based), React 19, Vite, Zustand, SCSS modules, Motion, Zod.
- **Routes:** `src/routes/{index,launch,tutorial,game,register,score}.tsx`, plus `__root.tsx` and `routes/api/`. Each route has a matching `*.module.scss`.
- **Game wiring:** `src/components/game/UnityContext.tsx` is the equivalent of the Next.js game adapter — currently Unity-only. Stores under `src/hooks/stores/`.
- **CAPE wiring:** `src/components/design-tokens/DesignTokenInjector.tsx`. Loaders in `src/loaders/RootLoader.ts`. CSP handled by `src/server/middleware/SecurityMiddleware.ts`, not a `proxy.ts`.
- **Note:** TanStack has no `CLAUDE.md` of its own yet; conventions are inherited from the root.

---

## 6. Modules

Every module is `modules/{id}/` with a `manifest.json` and a tree under `app/`, `components/`, `lib/` that mirrors where files land in the generated project.

| Module | Purpose | Notable details |
|--------|---------|-----------------|
| **unity** | Unity WebGL embed | Boot pipeline, `version.json` resolution, DPR clamping, platform detection |
| **r3f** | React Three Fiber | Drei helpers, optional Rapier physics |
| **phaser** | Phaser 3 | Scene pipeline (Boot → Load → Main + HUD) |
| **memory** | Card-matching game | Pure React, no engine |
| **video** | Full-screen video page | Reads CAPE `general.video.introVideo` |
| **leaderboard** | Score table | Tabs (daily/weekly/all-time), pagination, personal best. **`implies: ['scoring']`** |
| **registration** | Player registration form | First name, last name, email, opt-ins; calls `PUT /api/users/register` |
| **scoring** | Game-session server actions | `create-session` / `end-session` |
| **voucher** | Reward screen + QR | Reads CAPE `reward.voucherCode`; QR from `api.qrserver.com` |
| **audio** | Background audio | Howler.js; mute toggle synced to `GameContext` |
| **cookie-consent** | Cookiebot banner | Adds CSP origins |
| **gtm** | Google Tag Manager | Typed `gtmPush()` helper |

Manifest schema (every field optional unless marked):

```jsonc
{
  "id": "module-id",                              // required
  "name": "Display Name",
  "description": "One sentence",
  "files":   [ { "src": "...", "dest": "...", "strategy": "merge|replace" } ],
  "packages":    ["npm-pkg"],                     // runtime deps
  "devPackages": ["npm-pkg"],
  "envVars":     ["VAR_NAME"],                    // appended to env.dist
  "cspPatch":    { "script-src": ["..."] },       // merged into proxy.ts
  "implies":     ["scoring"],                     // transitive deps
  "order":       10,                              // copy order
  "injectInto":  { "file": "app/layout.tsx", "instruction": "Mount …" }
}
```

Resolution order: parse flags → resolve `implies` transitively → load manifests
→ copy files → merge env vars → patch CSP at the `lw-scaffold:csp` marker →
`npm install` → post-scaffold message.

---

## 7. Games

Every game is `games/{id}/game.json`. Verified state (2026-05-12):

| Game | engine | stack | Visible? |
|------|--------|-------|----------|
| `haas-f1` | unity | `next` | ✅ Next.js only — **gold standard** |
| `nhl-crush` | unity | `tanstack` | ✅ TanStack only — **gold standard** |
| `la-roche-posay` | unity | _(absent)_ | ❌ hidden until verified |
| `old-captain-rum-toss` | unity | _(absent)_ | ❌ hidden until verified |
| `simple-test-game` | unity | _(absent)_ | ❌ hidden until verified |
| `_template` | unity | _(absent)_ | ❌ skipped (`_` prefix) |

Manifest schema (key fields only):
```jsonc
{
  "id":       "haas-f1",
  "name":     "Haas F1 Racing",
  "engine":   "unity",
  "stack":    "next",          // hard-lock — absent ⇒ hidden everywhere
  "cdn":      { "baseUrl": "...", "gameName": "Game", "compression": "br" },
  "dpr":      { "min": 1, "max": 1.5 },
  "boot":     {
    "gameObjects": { "setup": "WebService", "game": "GameService" },
    "events":      ["ready", "start", "end", "sendEvent"]
  },
  "env":      [ { "key": "NEXT_PUBLIC_UNITY_BASE_URL", "default": "..." } ]
}
```

The `stack` field is enforced at every game-picker call site — see [docs/superpowers/2026-05-11-game-stack-hardlock-CONTEXT.md](superpowers/2026-05-11-game-stack-hardlock-CONTEXT.md) for the complete contract.

---

## 8. CAPE integration

CAPE is the campaign content/branding service. Scaffolder responsibilities:

1. **Generate the campaign's `interfaceSetup` + `publishProfiles`** —
   `cli/cape-format-builder.js` walks the chosen pages and modules and emits a
   complete CAPE format. `KNOWN_PAGE_TYPES` is the registry; the smoke test
   (`cape-format-builder.test.js`) guarantees every type emits a tab.
2. **Optionally create the campaign** — `cli/cape-client.js` can authenticate,
   `createCampaign`, `pushFormat`, `populateDefaults`, and `publishCampaign`.
   Token cache shared with `lwg-cli-cape` at `~/.cape/tokens.json`.
3. **Fetch CAPE data at runtime** — the generated Next.js project's `lib/cape/`
   does server-side fetching with a 5-minute cache. TanStack does the equivalent
   in `loaders/RootLoader.ts`.

**Mock data:** `base-templates/next/public/mock-cape.json` ships with realistic
defaults. `npm run cape:fetch-mock` (inside a scaffolded project) overwrites it
with real CDN data once. **Per user memory: never set `CAPE_MOCK=true` for
demos — always use real CAPE/API data.**

**Why CAPE drift is a recurring problem:** CAPE changes field names and shapes
without strict versioning. The scaffolder's defence is four-layer:

1. Schema (`KNOWN_PAGE_TYPES`)
2. Warnings on unknown types
3. Pre-push check before `pushFormat`
4. The smoke test in `cape-format-builder.test.js`

This is recorded in user memory as **"Scaffolder safety posture"** — preserve it.

---

## 9. Unity protocol (across all Livewall projects)

Per user memory ([Livewall Unity Protocol](../../../../Users/roche/.claude/projects/c--Dev/memory/project_unity_protocol.md)):

3-step boot sequence and a set of standard events that are shared by every
Livewall Unity game. Game manifests declare the GameObject names (e.g.
`Manager` vs `WebService`) so the bridge wires to the right receivers.

The Next.js `lib/game-bridge/` interface and the TanStack `UnityContext.tsx`
both implement this protocol on their respective stacks. If you are adding
support for a new game, check that its `boot.gameObjects` and `boot.events`
match the protocol — and that it has been smoke-tested against the target
stack — **before** you add a `stack` field to its `game.json`.

---

## 10. Conventions worth knowing

- **Token replacement** — every text file in a copied template is run through a
  regex pass that replaces `{{PROJECT_NAME}}`, `{{CAPE_ID}}`, `{{MARKET}}`, and a
  handful of routing tokens (`{{NEXT_AFTER_LANDING}}`, `{{NEXT_AFTER_GAME}}`,
  …). No template engine — just simple substitution.
- **CSP marker** — `// lw-scaffold:csp` at [proxy.ts:39](../base-templates/next/proxy.ts#L39). Module patches inserted **above** this line. Do not move or rename it.
- **`implies` chains** — `resolveImplied()` does transitive closure. `leaderboard` → `scoring` is the current example.
- **Reserved project names** — `next`, `app`, `api`, `src`, `public`, `node_modules`, `build`, `dist`, `test`, `tests`, `frontend`, `backend`, `scaffolder`, `campaign-scaffolder`, `livewall`. Rejected interactively and in non-interactive mode.
- **Cleanup registry** — `registerCleanup(fn)` + `runCleanup()`. SIGINT/SIGTERM trigger rollback of temp dirs and lock files.
- **Lock file** — `.lw-lock` in the output dir prevents concurrent scaffolds on the same project. Removed on success.
- **Default focus per user memory** — when working inside `c:\Dev\Livewall` and the user doesn't name another project, default to `campaign-scaffolder`.
- **Stack hard-lock** — `getGamesByStack(engine, stack)` is the only function any picker should call. `getGamesByEngine` is preserved for env-var injection and validation only.

---

## 11. npm scripts (root `package.json`)

```
scaffold              node cli/scaffold.js
update                node cli/scaffold.js --update
teardown              node cli/teardown.js
teardown:all          node cli/teardown.js --all
teardown:list         node cli/teardown.js --list
preview-message       node cli/post-scaffold-message.js
wizard                node cli/wizard.js
wizard:install        npm --prefix cli/wizard-server install && npm --prefix cli/wizard-ui install
wizard:build          npm --prefix cli/wizard-ui run build
verify:antigravfix    node scripts/verify-antigravfix.js
test                  node cli/cape-format-builder.test.js
                   && node cli/scaffold.test.js
                   && node --test cli/tests/game-registry.test.js
prewizard:build       npm test          # hook — tests must pass before UI build
prewizard             npm test          # hook — tests must pass before wizard launch
```

`engines.node`: `>=18.0.0`. Bin alias: `lw-scaffold`.

Scaffolded **Next.js project** scripts (for reference):
`dev` (Turbopack, binds to `0.0.0.0`), `dev:mock` (CAPE_MOCK), `dev:full-mock`,
`build`, `start`, `lint`, `lint:fix`, `ts-compile`, `analyze`,
`cape:pull` (lwg-cli-cape reminder), `cape:fetch-mock`, `check-env`.

Scaffolded **TanStack project** scripts: `dev` (Vite, port 3000), `build`, `start`, `eslint`, `eslint:fix`.

---

## 12. Testing

| Test | Framework | Covers |
|------|-----------|--------|
| [cli/scaffold.test.js](../cli/scaffold.test.js) | `node:assert` | `basePageType`, `routeFor`, `validateConfig` |
| [cli/cape-format-builder.test.js](../cli/cape-format-builder.test.js) | `node:assert` | Every `KNOWN_PAGE_TYPES` entry produces a CAPE tab (drift smoke test) |
| [cli/tests/game-registry.test.js](../cli/tests/game-registry.test.js) | `node:test` | `getGamesByStack` filters; haas-f1 only on next, nhl-crush only on tanstack, unassigned hidden |

`npm test` runs all three. The `prewizard` and `prewizard:build` hooks ensure
they pass before the wizard launches or builds.

There is also `scripts/verify-antigravfix.js` (run via `npm run verify:antigravfix`) — the parity check between Next.js and TanStack templates, owned by the antigravfix-parity workstream.

---

## 13. Recent work (themes from `git log -50`)

Most-recent first, grouped:

- **Game–Stack Hard Lock (May 11)** — `8f16d9d`…`68e2da4`. Status: shipped. Doc: [superpowers/2026-05-11-game-stack-hardlock-CONTEXT.md](superpowers/2026-05-11-game-stack-hardlock-CONTEXT.md).
- **Antigravfix parity (May 6)** — large workstream (~65 KB plan) keeping Next.js and TanStack templates visually + behaviourally aligned. `verify:antigravfix` script enforces it.
- **Dynamic CAPE format at creation (May 5)** — format is now built per-project from selected pages, not from a static template.
- **Onboarding skip / return-player buttons (May 5)** — skip onboarding for users who've played before; `hasPlayed` persisted in `GameContext` via localStorage.
- **CAPE client unification (April)** — `cape-client.js` now shares the token cache with `lwg-cli-cape`.
- **Initial scaffolder + TanStack stack (March–April)** — dual-template architecture, wizard UI, post-scaffold message, CAPE pull.

Branch state at the time of writing: `master` was 26 commits ahead of `origin/master` (unpushed).

---

## 14. Working-tree state (as of 2026-05-12)

`git status` showed unstaged changes across:
- The root `CLAUDE.md` and `base-templates/next/CLAUDE.md` (docs)
- Many `base-templates/next/` files: every `(campaign)/…/page.tsx`, `app/layout.tsx`, `globals.css`, `tailwind.config.ts`, `tsconfig.json`, `env.dist`, `public/mock-cape.json`, plus core components (`Button`, `DesignTokenInjector`, `DesktopWrapper`, `Layout/PageTransition`, `Loading`), `providers/CapeDataProvider`, `lib/cape/cape.utils.ts`, `utils/getCapeData.ts`, `package.json`, `tsconfig.tsbuildinfo`, `types/window.d.ts`, and assets in `public/assets/`.
- TanStack: `src/components/game/UnityContext.tsx`, `src/loaders/RootLoader.ts`, `src/routes/__root.tsx`, `src/server/middleware/SecurityMiddleware.ts`, `src/utils/Functions.ts`.
- `cli/cape-client.js`.

None of these are committed yet — they look like the antigravfix-parity workstream still being shaken out. If you sit down to "keep working", running `git status` and `git diff` first is the right move.

There are also untracked changes in the sibling `R3F-Stable/` project (visible via the parent git context) — those are unrelated to the scaffolder and should not be touched from here.

---

## 15. Common workflows

### Add a new module
1. `cp -r modules/_template modules/{my-module}` (or hand-create the dir).
2. Fill in `manifest.json`. Add files under `app/`, `components/`, `lib/`.
3. If you need new CSP origins, declare them in `cspPatch`.
4. If you depend on another module, list it in `implies`.
5. Test: `node cli/scaffold.js --name=test-mod --cape-id=99999 --module={my-module} --yes`.
6. Update [CLAUDE.md](../CLAUDE.md) module table.

### Add a new game
1. `cp -r games/_template games/{my-game}` and fill `game.json`.
2. **Do not** add a `stack` field yet. Smoke-test it against the target stack first.
3. Once verified, add `"stack": "next"` or `"tanstack"` and commit.
4. Restart the wizard server if running (registry is cached on first load).

### Add a new page type
1. Add to `KNOWN_PAGE_TYPES` in [cli/cape-format-builder.js](../cli/cape-format-builder.js).
2. Add element definitions in `cli/page-builder.js` (Next) and/or `cli/tanstack-page-builder.js` (TanStack).
3. Add the route file in the relevant base template.
4. Run `npm test` — `cape-format-builder.test.js` will fail loudly if you missed the format wiring.

### Start the web wizard
```bash
cd campaign-scaffolder
npm run wizard:install     # first time only
npm run wizard             # opens http://localhost:5173 (dev) or :3737 (prod)
```

### Run a scaffold non-interactively
```bash
node cli/scaffold.js \
  --stack=next --name=test --cape-id=99999 --market=NL \
  --game=unity --module=leaderboard --module=registration --module=voucher --yes
```

### Tear down test scaffolds
```bash
npm run teardown:list      # show what's removable
npm run teardown -- name   # remove one
npm run teardown:all       # nuke everything
```

---

## 16. Per-feature deep-dive docs

These live in `docs/superpowers/` and are the source of truth for each workstream. Read the spec for "why", the plan for "what was done", and the CONTEXT doc (when present) for "what state are we in now".

| Feature | Spec | Plan | Context |
|---------|------|------|---------|
| Game–Stack Hard Lock | [specs/2026-05-11-game-stack-hardlock-design.md](superpowers/specs/2026-05-11-game-stack-hardlock-design.md) | [plans/2026-05-11-game-stack-hardlock.md](superpowers/plans/2026-05-11-game-stack-hardlock.md) | [2026-05-11-game-stack-hardlock-CONTEXT.md](superpowers/2026-05-11-game-stack-hardlock-CONTEXT.md) |
| Antigravfix parity | [specs/2026-05-06-antigravfix-parity-design.md](superpowers/specs/2026-05-06-antigravfix-parity-design.md) | [plans/2026-05-06-antigravfix-parity.md](superpowers/plans/2026-05-06-antigravfix-parity.md) | _(none — workstream ongoing)_ |
| Dynamic CAPE format at creation | [specs/2026-05-05-dynamic-cape-format-at-creation-design.md](superpowers/specs/2026-05-05-dynamic-cape-format-at-creation-design.md) | [plans/2026-05-05-dynamic-cape-format-at-creation.md](superpowers/plans/2026-05-05-dynamic-cape-format-at-creation.md) | _(none)_ |
| Onboarding skip / return-player buttons | [specs/2026-05-05-onboarding-skip-return-player-buttons-design.md](superpowers/specs/2026-05-05-onboarding-skip-return-player-buttons-design.md) | [plans/2026-05-05-onboarding-skip-return-player-buttons.md](superpowers/plans/2026-05-05-onboarding-skip-return-player-buttons.md) | _(none)_ |

Convention going forward: when a feature ships, add a `<date>-<slug>-CONTEXT.md`
in `docs/superpowers/` summarising current state so the next agent doesn't have
to re-derive it. The Game–Stack Hard Lock doc is the template.

---

## 17. Gotchas and safety mechanisms

- **Registry is cached.** `loadGameRegistry()` caches on first call. Changes to `games/*/game.json` require restarting the wizard server.
- **Mock mode is sticky.** A `.env.local` with `CAPE_MOCK=true` will silently hide real CAPE data in dev. The first thing to check when "CAPE changes aren't showing up" is `.env.local`.
- **CSP marker is load-bearing.** If [proxy.ts:39](../base-templates/next/proxy.ts#L39) loses its `// lw-scaffold:csp` comment, every module that declares a `cspPatch` will silently fail to apply. Don't reformat it away.
- **Reserved names fail loudly.** If you script a scaffold and pick a reserved name, the run aborts. Read the error rather than retrying with `--yes`.
- **Token replacement is unscoped.** A literal `{{PROJECT_NAME}}` inside, say, a code comment or a string will be replaced. Fine for now; worth knowing if behaviour ever looks magic.
- **Two PowerShell quirks** (per environment): `&&` chaining isn't available — use `;` or `if ($?) {…}`. `2>&1` on native exes mangles output; just don't redirect stderr.
- **Don't `git push` casually.** Branch was 26 commits ahead of origin at the time of writing — confirm with the user before pushing.

---

## 18. Per-session memory keys (recall what's already saved)

These memories are auto-loaded into every session via `~/.claude/projects/c--Dev/memory/MEMORY.md`. Worth knowing about so you don't re-derive them:

- **Livewall Architecture Standards** — Two gold standards: Next.js → HaasF1, TanStack → NHL-Crush.
- **Scaffolder Purpose** — Generic Livewall-agency baseline; CAPE re-skins per client.
- **Livewall Unity Protocol** — 3-step Unity boot sequence + standard events.
- **User Profile** — Rochee Faverey, frontend dev at Livewall Group.
- **Never use mock data** — Always use real CAPE/API data, never `CAPE_MOCK=true` for demos.
- **Default focus: scaffolder** — In `c:\Dev\Livewall`, default to campaign-scaffolder unless another project is named.
- **Scaffolder safety posture** — Four-layer defence (schema, warning, pre-push check, snapshot) + smoke test against silent CAPE-format drift.

---

## 19. If something looks wrong

| Symptom | First place to look |
|---------|---------------------|
| `npm test` fails after editing a `game.json` | `cli/tests/game-registry.test.js` — likely a stack-value mismatch. |
| Wizard shows the wrong game on a stack | `games/{id}/game.json` `stack` value, or a picker that's still calling `getGamesByEngine`. |
| Scaffolded project's CSP rejects a script | The module's `cspPatch` is missing the origin, or the `// lw-scaffold:csp` marker was moved/renamed. |
| Token like `{{PROJECT_NAME}}` ends up in the output | File not listed in module's `files[]`, or file isn't UTF-8 (some editors default to UTF-16). |
| `npm install fails after scaffold` with peer-dep errors | Different modules pinned different versions. Update manifest or add `--legacy-peer-deps`. |
| CAPE changes don't appear in dev | `.env.local` has `CAPE_MOCK=true`. Per memory: never enable that for demos. |
| `cape-format-builder.test.js` complains about an unknown page type | You added a page but didn't extend `KNOWN_PAGE_TYPES`. |
| Scaffold leaves a half-baked output dir | A signal handler didn't fire. Manually delete the dir and the `.lw-lock` file. |

---

## 20. What is **not** captured here

Things I deliberately left out because they live better elsewhere:
- Full element catalogues for `page-builder.js` and `tanstack-page-builder.js` — read the files; the lists are long and churn.
- Per-component prop tables for modules — each module has its own README or inline comments.
- The exact CAPE format JSON shape — `cape-format-builder.js` is the single source of truth.
- Visual design and brand spec — `brand-assets/` and the `voorbeeld figma designs/` folder.

If you find yourself needing one of these often, add a note in the relevant feature's CONTEXT doc rather than expanding this file.
