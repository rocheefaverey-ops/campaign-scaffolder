# Next.js CAPE-Only Campaign Template (No Game)

Core Next.js 16 project for campaigns that don't include a game engine. **Contains only mandatory code.** Optional module code lives in `../modules/`.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI:** React 19, TailwindCSS 4
- **Server state:** TanStack Query v5
- **CMS:** CAPE (JSON over CDN, cached server-side)
- **Logging:** Winston + optional GCP Cloud Logging / Error Reporting
- **Animations:** GSAP

## Dev Commands

```bash
pnpm dev             # Turbopack dev server
pnpm build           # Production build
pnpm start           # Production server
pnpm lint            # ESLint
pnpm ts-compile      # TypeScript type check (no emit)
pnpm analyze         # Bundle analysis
```

## Architecture Principles

1. **`lib/` is infrastructure** — no React, no JSX. CAPE fetching, logger, query client.
2. **`components/_core/`** is always present — these directories are empty stubs until the CLI fills them with module files.
3. **Server Actions only.** Client Components never call `fetch()` directly.
4. **No game engine** — this template is for CAPE-only campaigns (forms, landing pages, promotions).
5. **CSP nonce** flows: `proxy.ts` → `x-nonce` header → `layout.tsx` → `FontInjector`.
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

## Module Slots

`components/_modules/` is populated by the CLI. Each module also injects into:
- `app/(campaign)/` — route pages
- `app/actions/` — server actions

## Environment Variables

See `env.dist`. Minimum required before first run:
`NEXT_PUBLIC_CAPE_URL`, `NEXT_PUBLIC_CAPE_CAMPAIGN_ID`, `API_URL`
