# campaign-scaffolder

Universal Campaign Scaffolder for Livewall interactive campaign websites.

## Repo Structure

```
campaign-scaffolder/
├── base-templates/    # Six lean engine-specific templates (one per stack selection)
│   ├── next-unity/    # Next.js + Unity WebGL baked in
│   ├── next-r3f/      # Next.js + React Three Fiber baked in
│   ├── next-phaser/   # Next.js + Phaser 3 baked in
│   ├── next-memory/   # Next.js + pure React (no engine)
│   ├── next-none/     # Next.js CAPE-only (no game)
│   └── tanstack-unity/# TanStack Start + Unity baked in
├── modules/           # Optional module library — CLI copies per selection
│   ├── leaderboard/   # Score table (tabs, pagination, personal best)
│   ├── registration/  # Player registration form (fields + opt-ins)
│   ├── scoring/       # create-session / end-session actions
│   ├── voucher/       # Reward screen + QR code
│   ├── audio/         # Howler.js audio player
│   ├── cookie-consent/# Cookiebot consent banner
│   ├── gtm/           # Google Tag Manager script + helper
│   ├── video/         # Intro / loading / ad video routes
│   └── memory/        # Card memory mini-game (next-memory template)
├── games/             # Per-game manifests (engine, CDN, boot, env)
└── cli/
    ├── scaffold.js          # main scaffolder (next + tanstack)
    ├── cape-format-builder.js  # generates CAPE schema per campaign
    ├── wizard.js            # boots wizard server + UI
    ├── wizard-server/       # Fastify API for the wizard
    └── wizard-ui/           # React + Vite wizard (dist/ is the prod build)

> `DesignTokenInjector` (CAPE branding → CSS custom properties) is built into
> every base template and always on. It is not an optional module.
```

## Module Structure Convention

Every module directory contains:
```
{module}/
├── manifest.json          # CLI reads this — files, packages, env vars, CSP patches
├── app/                   # Route/action files → copied to base-template/app/
├── components/            # UI components → copied to base-template/components/_modules/
└── lib/                   # Infrastructure → copied to base-template/lib/
```

## CLI Usage

### Interactive web wizard (recommended)
```bash
pnpm run wizard
```
Boots the Fastify server on `:3737` and (in dev) Vite on `:5173`. Opens the browser. Walks through project → stack → game → pages → modules → build.

### CLI (non-interactive, CI / known config)
```bash
node cli/scaffold.js \
  --name=hema-handdoek-2025 \
  --cape-id=54031 \
  --market=NL \
  --stack=tanstack \
  --game=unity \
  --gameId=nhl-crush \
  --page=intro-video --page=landing --page=tutorial --page=loading-video \
  --page=game --page=result --page=leaderboard \
  --output=/c/Dev/Livewall/hema-handdoek-2025 \
  --yes
```
The `leaderboard` page auto-implies the `leaderboard` + `scoring` modules — explicit `--module=` flags are only needed for opt-in extras (voucher, registration, audio, cookie-consent, gtm).

### Most-used flags
| Flag | Description |
|------|-------------|
| `--stack` | `next` (default) or `tanstack` |
| `--name` | Project slug — folder name + `{{PROJECT_NAME}}` token |
| `--cape-id` | Numeric CAPE campaign ID |
| `--market` | NL / BE / FR / DE / … (default `NL`) |
| `--game` | `unity` \| `r3f` \| `phaser` \| `memory` \| `none` |
| `--gameId` | Pick a specific manifest from `games/` (e.g. `nhl-crush`) |
| `--page` | Repeatable; see README Pages table |
| `--module` | Repeatable; auto-resolved `implies` chains |
| `--output` | Absolute or relative path |
| `--update` | Re-apply to an existing project (preserves uncommitted changes) |
| `--yes` | Skip confirmation prompt |

See the README for the full flag list and the page/module catalogue.

### What the CLI does (TanStack flow, similar for Next)
1. Copies `base-templates/{stack-engine}/` to the output directory
2. For each selected module: reads `manifest.json`, mirrors files at their `dest` paths
3. Resolves `implies` chains (e.g. `leaderboard` → adds `scoring` automatically)
4. Token-replaces `{{PROJECT_NAME}}`, `{{CAPE_ID}}`, `{{MARKET}}`, `{{NEXT_AFTER_*}}` flow tokens, `{{MENU_SHOW_*}}` visibility, branding patches, etc.
5. Appends module-specific env vars to `.env.example`
6. Patches `proxy.ts` CSP with `manifest.cspPatch` entries (Next stack)
7. Builds the CAPE format schema (`cape-format-builder.js`) and uploads it if requested
8. Runs `pnpm install` for any packages declared in manifests
9. `git init` + initial commit, prints a colour-coded post-scaffold checklist

## Module Development

### Creating a new module

1. Create a directory in `modules/{module-name}/`
2. Add `manifest.json`:
```json
{
  "name": "{module-name}",
  "files": [
    { "src": "app/...", "dest": "app/..." },
    { "src": "components/...", "dest": "components/_modules/{module-name}/..." }
  ],
  "packages": ["package-name"],
  "envVars": ["MODULE_VAR"],
  "cspPatch": {
    "script-src": ["https://cdn.example.com"]
  },
  "implies": ["other-module"]
}
```
3. Organize code in `app/`, `components/`, `lib/` directories
4. Use `{{PROJECT_NAME}}`, `{{CAPE_ID}}`, `{{MARKET}}` tokens for dynamic replacements
5. Test with: `node cli/scaffold.js --module={module-name} --yes`

### Common module gotchas

- **CSP conflicts**: Check `proxy.ts` if adding external scripts — duplicate directives cause issues
- **Import paths**: Always use relative imports from `_modules/{module-name}/`, not absolute aliases
- **Env vars**: Document required vars in manifest; missing ones cause runtime errors
- **Implies chains**: Test transitive dependencies (if A implies B and B implies C, verify C installs)

## Testing

### Run the full test suite
```bash
pnpm test
```
Runs three suites in order:
1. `cape-format-builder.test.js` — drift check between CAPE schema (`KNOWN_PAGE_TYPES`) and wizard config (`ALL_PAGES`), plus smoke tests for the format builder.
2. `scaffold.test.js` — scaffolder integration smoke tests.
3. `cli/tests/*.test.js` — node `--test` unit suite.

`pnpm prewizard` runs the same suite before launching the wizard — keeps drift from sneaking in.

### Validate a base template manually
```bash
cd base-templates/tanstack-unity && pnpm install && pnpm run ts-compile
# or for Next:
cd base-templates/next-unity && pnpm install && pnpm run ts-compile
```

### Test a scaffolded project end-to-end
```bash
node cli/scaffold.js --name=test-campaign --cape-id=99999 --market=NL --stack=tanstack --yes
cd ../test-campaign/frontend     # tanstack writes under frontend/
pnpm install && pnpm dev
# Verify CAPE integration, DesignTokenInjector branding, and any selected modules.
```

### Test module inclusion
```bash
node cli/scaffold.js \
  --name=test-with-modules \
  --cape-id=99999 \
  --market=NL \
  --stack=next \
  --module=leaderboard \
  --module=registration \
  --yes
cd ../test-with-modules
pnpm install && pnpm dev
# Verify leaderboard, registration, and their implied dependencies load (scoring etc.).
```

## How CAPE drives runtime behavior

The scaffolder generates code that's intentionally thin — CAPE is the runtime source of truth for everything brand- or campaign-specific. The boundaries:

| Lives in CAPE | Lives in code |
|---|---|
| All multilingual copy (titles, kickers, button labels, menu labels) | Page structure, flow, event wiring |
| `settings.branding.*` — colours, fonts, logo, hero/background images | The CSS variable hookup (`DesignTokenInjector`) + neutral fallbacks |
| `settings.menu.show*` — menu item visibility | The hamburger button + `/menu` route shell |
| `settings.menu.variant*` — menu button styles (`primary` \| `secondary` \| `tertiary` \| `dark` \| `danger`) | The variant CSS in `StyledButton.module.scss` |
| `settings.pages.{id}.show*Button` — optional CTA visibility | The buttons themselves + their navigation targets |
| `settings.pages.{id}.screenLayout`, `stepCount`, etc. | The renderer that switches on those values |

CAPE schema for every campaign is generated by [`cli/cape-format-builder.js`](cli/cape-format-builder.js). When you add a new tunable, edit:
- The schema in `cape-format-builder.js` so CAPE exposes the field.
- The loader (e.g. `MenuLoader.ts`, `ResultLoader.ts`) so the frontend reads it.
- The renderer so the new value actually affects the UI.

Build-time seeds (used as the in-code fallback when CAPE returns nothing) come from CLI tokens, sourced from the wizard's config (e.g. `{{MENU_SHOW_HOME}}`, `{{BUTTON_VARIANT_RESULT_NEXT}}`). The CLI's route-gating step *also* sets non-existent menu items to a hard `false` regardless of wizard intent — so a scaffold without a `/voucher` route can't surface a voucher menu link even if CAPE later turns it on.

### Blocks are the single source of truth; legacy maps are derived

The wizard's **block editor** is the primary editing surface. CTA buttons (`cta-group`), menu items (`menu-item-list`), step count (`step-indicator`), timer (`timer`), skip (`nav-controls`), QR (`qr-display`), and consent (`opt-in-list`) are all edited as blocks. The legacy per-page maps the scaffold/CAPE still read — `flowExits` / `flowEnabledExits` / `flowButtonVariants` / `menuItemsEnabled` — are **derived from the blocks at build time** by [`cli/flow-bridge.js`](cli/flow-bridge.js) (`deriveFlowFromBlocks`, `deriveMenuItemsEnabled`, `mergeDerivedFlow`), merged in `scaffold()` before token/CAPE computation. The wizard preview applies the same derivation (`withDerivedFlow` in `PreviewPane.tsx`). Only non-visual flow/engine behaviors with no block (Unity boot timing, returning-player tutorial skip, kiosk auto-continue, tutorial screen layout, voucher code length) remain in the small "Page behavior" section of `PAGE_SETTINGS_SCHEMA`.

### Stack config divergence (Next vs TanStack)

The **Next** stack is block-driven (`buildBlockDrivenPage`) and honors rich block settings. The **TanStack** stack uses fixed template routes with a smaller set of semantic slots, so several block settings only affect Next output and are silently dropped on TanStack: per-button/menu **variants** (`{{BUTTON_VARIANT_*}}` / `{{MENU_VARIANT_*}}` exist only in next-* templates), **timer duration**, **leaderboard tabs**, **field ordering / extra opt-ins**, `status-chip`, `top-n-highlight`, `pre-gate-modal`, `loading-indicator.kind`, and any CTA button that doesn't map to a fixed semantic exit (these emit a build-time warning via `deriveFlowFromBlocks`). TanStack also has no leaderboard/voucher/end routes. This is by design — do not generalize the TanStack templates without an explicit decision.

## Architecture Decisions

**Why manifest.json?**
- Single source of truth for module metadata (files, packages, env vars, CSP)
- Enables CLI to compose modules declaratively without hardcoding paths
- Makes module dependencies explicit via `implies` chains

**Why token replacement?**
- Avoids template engines or build-time config files
- Works across all text files (JS, CSS, env, etc.) consistently
- Simple to understand and debug; no hidden transformations

**Why DesignTokenInjector is built-in?**
- CAPE branding is non-negotiable for all campaigns
- Prevents opt-out mistakes that break visual identity
- Centralizes color/spacing logic for consistency

**Why agency-default fonts live in CAPE seed, not globals.css?**
- The Livewall display font is *agency branding*; campaigns can override it via `branding.displayFontFamily`.
- Hardcoding it in `globals.css` as the fallback would silently mis-brand unbranded campaigns. Keeping it as the CAPE *seed default* makes it explicit and overridable through the normal CMS flow, while CSS fallbacks stay neutral.

## Contribution Guidelines

### Adding a feature to base-template or a module
1. Make changes in the source directory
2. Run tests: `npm run ts-compile` in affected directory
3. Test a full scaffold: `node cli/scaffold.js ... --yes` and verify the output
4. Commit with clear message: "feat: ...", "fix: ...", "docs: ..."

### Creating a new module (checklist)
- [ ] `manifest.json` is valid JSON (test with `node -e "require('./modules/{name}/manifest.json')"`)
- [ ] All paths in `files` exist and target correct destinations
- [ ] Token replacements `{{PROJECT_NAME}}`, `{{CAPE_ID}}`, `{{MARKET}}` are placed correctly
- [ ] Implied modules exist in `modules/`
- [ ] CSP patches are specific and non-conflicting
- [ ] README or inline comments explain module purpose and setup
- [ ] Tested with `node cli/scaffold.js --module={name} --yes`

### Code style
- Use TypeScript in base-template and modules
- Follow existing naming: camelCase for JS, kebab-case for filenames
- Keep components small and focused
- Document non-obvious dependencies in comments

## Troubleshooting

**"Cannot find module 'manifest.json'"**
- Ensure `manifest.json` exists in `modules/{module-name}/`
- Check JSON syntax with `node -e "require('./path/to/manifest.json')"`

**"Token `{{PROJECT_NAME}}` not replaced in generated file"**
- Verify file is listed in module's `manifest.json` `files` array
- Check file encoding is UTF-8 (some text editors default to UTF-16)

**"CSP violation for script" after scaffolding**
- Check `proxy.ts` for duplicate `script-src` directives
- Module's `cspPatch` may conflict with base-template defaults
- Use `--yes` to bypass, inspect output before adding to CSP

**"npm install fails with peer dependency warnings"**
- Peer deps from different modules may conflict
- Update manifest to match `base-template/package.json` versions
- Or add `--legacy-peer-deps` to `package.json` after scaffold

**Scaffold output is missing files**
- Verify `files[].src` paths exist relative to module root
- Check `files[].dest` paths don't collide with existing files
- Run with explicit `--module=name` rather than relying on `implies` chains
