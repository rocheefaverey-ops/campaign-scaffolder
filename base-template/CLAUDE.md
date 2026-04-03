# Golden Template — base-template

Core Next.js 15 project. **Contains only mandatory code.** Optional module code lives in `../modules/`.

## Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **UI:** React 19, TailwindCSS 4
- **Server state:** TanStack Query v5
- **CMS:** CAPE (JSON over CDN, cached server-side)
- **Game bridge:** `lib/game-bridge/` — typed adapter interface (engine-agnostic)
- **Logging:** Winston + optional GCP Cloud Logging / Error Reporting
- **Animations:** GSAP

## Dev Commands

```bash
npm run dev          # Turbopack dev server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm run ts-compile   # TypeScript type check (no emit)
npm run analyze      # Bundle analysis
```

## Architecture Principles

1. **`lib/` is infrastructure** — no React, no JSX. CAPE fetching, game bridge interface, logger, query client.
2. **`components/_core/`** is always present — these directories are empty stubs until the CLI fills them with module files.
3. **Server Actions only.** Client Components never call `fetch()` directly.
4. **GameContext** is the single source of truth for campaign state, persisted to localStorage.
5. **CSP nonce** flows: `middleware.ts` → `x-nonce` header → `layout.tsx` → `FontInjector`.
6. **CAPE data** is fetched once at root layout (server, 5-min TTL) and flows down via props/context.

## Path Aliases

| Alias | Resolves to |
|-------|-------------|
| `@/*` | `./` |
| `@lib/*` | `./lib/` |
| `@components/*` | `./components/` |
| `@hooks/*` | `./hooks/` |
| `@utils/*` | `./utils/` |
| `@contexts/*` | `./contexts/` |

## Game Bridge

`lib/game-bridge/` contains the adapter interface and shared utilities:

| File | Purpose |
|------|---------|
| `game-bridge.types.ts` | All shared types: `IUnityInput`, `IGameResult`, `IUnityNavigation`, `IUnityTracking`, `IUnityApiRequest`, `IGameBridgeAdapter` |
| `game-bridge.events.ts` | Event name constants (`BRIDGE_EVENTS`) |
| `cape-translations.ts` | Flatten CAPE copy into flat key-value map for `setData()` |
| `GameBridge.ts` | Re-exports `IGameBridgeAdapter` — concrete adapters live in `modules/` |

## Module Slots

`components/_modules/` is populated by the CLI. Each module also injects into:
- `app/(campaign)/` — route pages
- `app/actions/` — server actions
- `lib/game-bridge/` — engine adapters

## Environment Variables

See `.env.example`. Minimum required before first run:
`NEXT_PUBLIC_CAPE_URL`, `NEXT_PUBLIC_CAPE_CAMPAIGN_ID`, `API_URL`
