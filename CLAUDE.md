# campaign-scaffolder

Universal Campaign Scaffolder for Livewall interactive campaign websites.

## Structure

```
campaign-scaffolder/
├── base-template/   # The Golden Template — source of truth for all generated campaigns
└── cli/             # Step 2: the CLI script that scaffolds new projects from base-template
```

## Development

The `base-template/` is a fully working Next.js project.
To validate it compiles: `cd base-template && npm install && npm run ts-compile`

## CLI Usage (Step 2 — not yet implemented)

```bash
npx lw-scaffold my-campaign \
  --game=unity \
  --module=leaderboard \
  --module=registration \
  --module=voucher \
  --cape-id=12345 \
  --market=NL
```
