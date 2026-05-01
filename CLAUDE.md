# campaign-scaffolder

Universal Campaign Scaffolder for Livewall interactive campaign websites.

## Repo Structure

```
campaign-scaffolder/
├── base-template/     # Core Next.js project — always copied in full
└── modules/           # Optional module library — CLI copies per selection
    ├── unity/         # Unity WebGL game (adapter + UnityCanvas + gameplay page)
    ├── r3f/           # React Three Fiber game
    ├── leaderboard/   # Score table (tabs, pagination, personal best)
    ├── registration/  # Player registration form (fields + opt-ins)
    ├── scoring/       # create-session / end-session actions
    ├── voucher/       # Reward screen + QR code
    ├── audio/         # Howler.js audio player
    └── cookie-consent/# Cookiebot consent banner

> `DesignTokenInjector` (CAPE branding → CSS custom properties) is built into
> the base template and always on. It is not an optional module.
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

## Development

Validate the base template compiles:
```bash
cd base-template && npm install && npm run ts-compile
```
