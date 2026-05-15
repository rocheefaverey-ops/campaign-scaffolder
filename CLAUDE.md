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
└── modules/           # Optional module library — CLI copies per selection
    ├── leaderboard/   # Score table (tabs, pagination, personal best)
    ├── registration/  # Player registration form (fields + opt-ins)
    ├── scoring/       # create-session / end-session actions
    ├── voucher/       # Reward screen + QR code
    ├── audio/         # Howler.js audio player
    └── cookie-consent/# Cookiebot consent banner

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

### Interactive wizard (recommended)
```bash
node cli/scaffold.js
```
Prompts for: project name, CAPE ID, market, game engine, optional modules, output directory.

### Non-interactive (CI / known config)
```bash
node cli/scaffold.js \
  --name=hema-handdoek-2025 \
  --cape-id=54031 \
  --market=NL \
  --game=unity \
  --module=leaderboard \
  --module=registration \
  --module=voucher \
  --output=/c/Dev/Livewall/hema-handdoek-2025 \
  --yes
```

### Available flags
| Flag | Description |
|------|-------------|
| `--name` | Project slug (used as folder name + token replacement) |
| `--cape-id` | Numeric CAPE campaign ID |
| `--market` | Market code: NL / BE / FR / DE … |
| `--game` | Game engine: `unity` or `r3f` (optional) |
| `--module` | Optional module to include (repeatable) |
| `--output` | Absolute output path (default: sibling dir of scaffolder) |
| `--yes` / `--y` | Skip confirmation prompt |

### What the CLI does
1. Copies `base-template/` to the output directory
2. For each selected module: reads `manifest.json`, copies files to their `dest` paths
3. Resolves `implies` chains (e.g. `leaderboard` → adds `scoring` automatically)
4. Token-replaces `{{PROJECT_NAME}}`, `{{CAPE_ID}}`, `{{MARKET}}` in all text files
5. Appends module-specific env vars to `env.dist`
6. Patches `middleware.ts` CSP with `manifest.cspPatch` entries
7. Runs `npm install` for any packages declared in manifests
8. Prints a colour-coded post-scaffold checklist for the developer

### Preview the post-scaffold message
```bash
node cli/post-scaffold-message.js
```

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
  "env": [
    { "key": "MODULE_VAR", "description": "What this does" }
  ],
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

- **CSP conflicts**: Check `middleware.ts` if adding external scripts — duplicate directives cause issues
- **Import paths**: Always use relative imports from `_modules/{module-name}/`, not absolute aliases
- **Env vars**: Document required vars in manifest; missing ones cause runtime errors
- **Implies chains**: Test transitive dependencies (if A implies B and B implies C, verify C installs)

## Testing

### Validate the base template
```bash
cd base-template && npm install && npm run ts-compile
```

### Test a scaffolded project locally
```bash
node cli/scaffold.js --name=test-campaign --cape-id=99999 --market=NL --yes
cd ../test-campaign
npm install && npm run dev
# Test CAPE integration, DesignTokenInjector, and any selected modules
```

### Test module inclusion
```bash
node cli/scaffold.js \
  --name=test-with-modules \
  --cape-id=99999 \
  --market=NL \
  --module=leaderboard \
  --module=registration \
  --yes
cd ../test-with-modules
npm install && npm run dev
# Verify leaderboard, registration, and their implied dependencies load
```

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
- Check `middleware.ts` for duplicate `script-src` directives
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
