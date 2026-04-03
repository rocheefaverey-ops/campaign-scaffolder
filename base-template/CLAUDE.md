# Golden Template — Campaign Scaffolder

This is the canonical base template for Livewall interactive campaign websites.
The CLI (Step 2) copies this directory and injects/removes modules based on user flags.

## Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **UI:** React 19, TailwindCSS 4
- **Server state:** TanStack Query v5
- **CMS:** CAPE (headless, JSON over CDN)
- **Game engines:** Unity WebGL (`--game=unity`) or React Three Fiber (`--game=r3f`)
- **Game bridge:** `lib/game-bridge/` — typed adapter pattern (engine-agnostic API)
- **Logging:** Winston + GCP Cloud Logging
- **Error reporting:** GCP Error Reporting
- **Animations:** GSAP

## Dev Commands (run from `base-template/`)

```bash
npm run dev          # Turbopack dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run ts-compile   # TypeScript type check
npm run analyze      # Bundle analysis
```

## Architecture Principles

1. **`lib/` is infrastructure** — no React, no JSX. CAPE fetching, game bridge, logger, query client.
2. **`components/_core/`** is always present. **`components/_modules/`** is injected per CLI flag.
3. **`app/actions/`** — server actions only. Never call `fetch()` from Client Components directly.
4. **GameContext** is the single source of truth for campaign state. Persisted to localStorage.
5. **CSP nonce** flows from `middleware.ts` → `x-nonce` header → `layout.tsx` → `FontInjector`.
6. **CAPE data** is fetched once in `layout.tsx` (server) and passed down via props/context. Never re-fetched per component.

## Key Path Aliases

| Alias | Resolves to |
|-------|-------------|
| `@/*` | `./` (root) |
| `@lib/*` | `./lib/` |
| `@components/*` | `./components/` |
| `@hooks/*` | `./hooks/` |
| `@utils/*` | `./utils/` |
| `@contexts/*` | `./contexts/` |

## Module Flags (for CLI Step 2)

| Flag | What it adds |
|------|-------------|
| `--game=unity` | UnityCanvas, Unity CSP in middleware, Unity env vars |
| `--game=r3f` | R3FCanvas, R3F/Drei/Rapier deps |
| `--module=leaderboard` | leaderboard route + action + component |
| `--module=registration` | register route + action + component |
| `--module=scoring` | create-session + end-session actions |
| `--module=voucher` | voucher route + Voucher + QRCode components |
| `--module=audio` | AudioPlayer (Howler.js) |
| `--module=design-tokens` | DesignTokenInjector (CAPE → CSS vars) |
| `--module=cookie-consent` | CookieConsent (Cookiebot) |
| `--module=multi-device` | stand/ + mobile/ route groups |
| `--module=testing` | vitest.config.ts + test stubs |

## Environment Variables

See `.env.example` for the full list with comments.
Required before first run: `NEXT_PUBLIC_CAPE_URL`, `NEXT_PUBLIC_CAPE_CAMPAIGN_ID`, `API_URL`.
