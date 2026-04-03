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
    ├── design-tokens/ # CAPE → CSS custom properties injector
    └── cookie-consent/# Cookiebot consent banner
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

## CLI Usage (Step 3 — not yet implemented)

```bash
npx lw-scaffold my-campaign \
  --game=unity \
  --module=leaderboard \
  --module=registration \
  --module=voucher \
  --cape-id=12345 \
  --market=NL
```

The CLI reads each selected module's `manifest.json` and:
1. Copies `base-template/` to the output directory
2. For each module: copies module files to the matching `dest` paths
3. Installs packages listed in `manifest.packages`
4. Appends env vars to `.env.example`
5. Patches `middleware.ts` CSP with `manifest.cspPatch` entries
6. Token-replaces `{{CAPE_ID}}`, `{{MARKET}}`, `{{PROJECT_NAME}}` in all files

## Development

Validate the base template compiles:
```bash
cd base-template && npm install && npm run ts-compile
```
