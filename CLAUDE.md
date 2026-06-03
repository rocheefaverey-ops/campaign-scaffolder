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
├── components/_blocks/# Shared block components (reusable across templates)
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
├── tools/
│   └── lwg-cli-cape/  # CAPE CLI — manage campaigns, formats, publishing
└── cli/
    ├── scaffold.js          # main scaffolder (next + tanstack)
    ├── cape-format-builder.js  # generates CAPE schema per campaign
    ├── cape-client.js       # CAPE API client (create, push, publish, seed)
    ├── flow-bridge.js       # derives legacy flow maps from block state
    ├── block-defaults.js    # default block configs per page type
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

Both **Next** and **TanStack** are block-driven. Next uses `buildBlockDrivenPage`; TanStack uses `buildTsBlockDrivenPage` / `buildTsBlockDrivenLoader` in `cli/tanstack-block-page-builder.js`. The wizard block list, CTA/menu derivation, and page types should stay aligned across both stacks. The only shipped TanStack template is `tanstack-unity`; adding TanStack R3F/Phaser/Memory/None requires new base templates, not just generator changes.

## CAPE CLI (`tools/lwg-cli-cape/`)

Standalone CLI for managing campaigns on the CAPE platform. Replaces manual clicking in the CAPE editor. Can be used as a terminal tool, an MCP server, or via the `/cape` slash command in Claude Code.

### Setup
```bash
cd tools/lwg-cli-cape
cp .env.example .env   # fill in CAPE_EMAIL and CAPE_PASSWORD
npm install && npm run setup
cape login
```

### Recommended workflow: new campaign
```bash
# 1. Scaffold the project (generates format + frontend code)
node cli/scaffold.js --name=my-campaign --cape-id=12345 --market=NL --stack=tanstack --yes

# 2. Fetch the campaign data locally for inspection/editing
cape fetch 12345

# 3. Edit workspace/campaign-12345.json as needed

# 4. Push changes back
cape push workspace/campaign-12345.json 12345

# 5. ALWAYS fetch before publishing (CAPE can publish stale data otherwise)
cape fetch 12345
cape publish 12345
```

### Recommended workflow: update existing campaign format
```bash
# 1. Fetch current state
cape fetch <campaignId>

# 2. Edit the workspace JSON locally

# 3. Push format changes (interfaceSetup)
cape push-format workspace/campaign-<id>.json <campaignId>

# 4. Push campaign data (content values)
cape push workspace/campaign-<id>.json <campaignId>

# 5. Verify + publish
cape fetch <campaignId>
cape publish <campaignId>
```

### Key commands
| Command | Purpose |
|---------|---------|
| `cape fetch <id>` | Download campaign → `workspace/campaign-<id>.json` |
| `cape push <file> <id>` | Upload campaign data |
| `cape push-format <file> <id>` | Push interfaceSetup (format structure) |
| `cape publish <id>` | Publish to acceptance (~30s, polls automatically) |
| `cape get-format <id>` | Inspect format structure |
| `cape create-campaign <formatPath> <title> <market>` | Create new campaign from format |
| `cape populate-defaults <id>` | Fill empty campaign with format defaults |
| `cape validate <formatId>` | Run guards against format |
| `cape create-copy-doc <id>` | Generate styled XLSX for copywriters |
| `cape upload-file <path>` | Upload asset to CAPE media |
| `cape rehost <url> <filename>` | Download external URL, re-host on CAPE |
| `cape log-learning "## Title" "body"` | Log finding to LEARNINGS.md |

### Critical rules (will cause silent data loss if violated)
- **Never push multiple times without `fetch` in between** — CAPE silently drops data without the correct `versionNr`
- **Never `fetch` between local edits and `push-format`** — fetch overwrites the local file
- **Never use `id=0` in format saves** — creates orphaned format not linked to campaign
- **Always send the full `interfaceSetup`** — never push a single page in isolation

### Guards system
`push-format` auto-validates against 25+ known CAPE bugs (e.g. slider defaultValue must be number, `select` options must be objects not arrays, `color` requires `picker: "picker"`). Use `--force` only when the format has pre-existing violations you can't fix.

### CAPE field type gotchas
| Type | Rule |
|------|------|
| `text` | Campaign data must be `{"value":"...", "updated":true, "copy":true}` — not a plain string |
| `textMultiLanguage` | Data: `{multilanguage:true, EN:{value:"..."}, NL:{value:"..."}}` |
| `select` / `radioList` | Options must be `{"val":"label"}` objects — never arrays |
| `checkboxList` | No `defaultValue` in format; set via campaign data push |
| `subSection` | Use `title`, not `label` — `label` renders `[object Object]` |
| `assetSelector` | No defaultValue support; set via campaign data push |

### push-format strips string defaultValues
Large payloads cause CAPE to silently drop pages. `push-format` automatically strips string `defaultValue`s. After pushing a format, `populate-defaults` only works for `number`, `toggle`, `checkboxList`, `languageSelector`, `dateRange`. Text/color/select fields must be set via campaign data push.

## CAPE Format Generation Pipeline

The scaffolder generates CAPE formats dynamically from wizard selections. The pipeline:

```
Wizard selections (pages, blocks, modules)
  → cli/cape-format-builder.js   → interfaceSetup (pages/tabs/blocks/items)
  → cli/cape-client.js           → POST to CAPE API (create, push-format, seed assets)
  → cli/flow-bridge.js           → derive legacy flow maps from block state
```

### How blocks become CAPE fields
Each block component declares `capeBindings` in its manifest — semantic metadata like field type, language support, and description. The format builder maps these:
- `i18n-string` / `markdown` → `textMultiLanguage`
- `image` / `asset` → `asset` / `assetVideo` / `assetLogo`
- `boolean` → `switch`
- `number` / `select` → direct CAPE equivalents

### CAPE data model
```
Campaign (ID)
  └── Format (ID, versioned — CAPE creates a new ID on every save)
        └── interfaceSetup
              └── pages[]
                    └── tabs[]
                          └── blocks[]
                                └── items[]  ← fields (type, model, label, defaultValue)
```
- **Format** = template structure (field types, ordering, constraints)
- **Campaign Data** = actual values (texts, colours, images)
- Model paths: `settings.*` and `general.*` are campaign-global; `copy.{pageId}.*` and `files.{pageId}.*` are page-scoped

### Critical contract
Every string, image, or color the frontend reads via CAPE (`getCapeText()`, `getCapeImage()`, `getCapeProperty()`) **must** have a matching field in `cape-format-builder.js`. If you add a block binding without wiring its CAPE field, the CAPE editor won't show the field and the frontend will render a fallback.

### Adding a new CAPE-tunable property
1. Add the field in `cape-format-builder.js` so CAPE exposes it
2. Add the loader call (e.g. `getCapeProperty()` in `ResultLoader.ts`) so the frontend reads it
3. Wire the renderer so the new value affects the UI
4. Run `pnpm test` — the drift check catches mismatches between `KNOWN_PAGE_TYPES` and wizard config

## Architecture Decisions

- **manifest.json** — single source of truth for module metadata; makes module composition declarative
- **Token replacement** — simple `{{TOKEN}}` substitution across all text files; no template engine needed
- **DesignTokenInjector built-in** — CAPE branding is non-negotiable; prevents opt-out mistakes
- **Agency fonts in CAPE seed, not globals.css** — the Livewall display font is agency branding, overridable via `branding.displayFontFamily`; CSS fallbacks stay neutral
- **Block-driven pages** — blocks are the single source of truth; legacy flow/menu maps are derived at build time via `flow-bridge.js`

## Contribution Guidelines

1. Make changes in the source directory
2. Run `pnpm test` + `pnpm run ts-compile` in affected base template
3. Test a full scaffold: `node cli/scaffold.js ... --yes` and verify output
4. TypeScript in base-templates and modules; camelCase for JS, kebab-case for filenames

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
