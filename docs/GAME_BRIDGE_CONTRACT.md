# Game Bridge Contract

The Unity ↔ frontend bridge is the one place where the two stacks **function
differently and incompatibly** — and that is by design. Next campaigns and
TanStack campaigns are two separate products that must *look* identical but
*run* on their own framework idioms.

This document is the **shared contract** both stacks must satisfy. The
*mechanism* (how each stack talks to the backend, when Unity boots) is free to
differ; the *contract* (what the game and the player observe) must not.

Guarded by `cli/tests/game-bridge-contract.test.js`.

## Three layers, three policies

| Layer | Policy | Where it lives |
|---|---|---|
| **Look** — what the player sees | **Shared, identical** | `components/_blocks/*` (one set, both stacks render it) + CSS/SCSS + CAPE content |
| **Contract** — events, responses, flow, CAPE fields | **Shared + enforced** | this doc + the contract test |
| **Mechanism** — transport, Unity boot timing | **Per-stack, intentionally incompatible** | `base-templates/next-unity/...` vs `base-templates/tanstack-unity/...` |

## The contract (both stacks MUST honor)

### 1. Unity → JS event vocabulary
The game page registers listeners for these events (names are exact):

- `start` — game started.
- `end` — game over; payload is the JSON game result (score + game-specific
  stats). The frontend stores it and navigates to the result page.
- `navigation` — in-game nav request (internal route / external URL / terms).
- `tracking` — analytics event → dataLayer/GTM.
- `apiRequest` — the game proxies an HTTP call through the frontend (CORS/auth
  proxy). See §3.

Stacks MAY listen for extra events (Next also uses `ready`, `onTutorialPlayed`).
The five above are the shared core.

### 2. Flow
`… → loading-video → game → result` is fixed. `end` → result; "play again" →
the game route. Video interludes advance content-driven (no hard timers).

### 3. JS → Unity response channel
Every game-initiated request is answered with:

```
sendMessage('APIService', 'ProcessResponse', JSON.stringify({ success, uuid, data }))
```

The `uuid` from the incoming `apiRequest` MUST be echoed back so the game can
correlate the response.

### 4. CAPE fields
Both stacks read the same CAPE model paths for shared copy/assets (title,
subtitle, cta, score labels, …). The block's `capeBindings` are the source of
truth; the CAPE format builder emits one field per binding.

## What legitimately differs (mechanism — do NOT try to unify)

| Concern | Next | TanStack |
|---|---|---|
| Backend transport | Server Actions (`unityApiRequest` → `fetchData`) | server fns (`customRequest`) |
| Unity boot timing | boots in `gameplay` (`initializeUnity`/`fullBoot`) | preloads at entry (`index.tsx`), `loading-video` waits on `loadProgress` |
| Result store | `GameContext.gameResult` | `useUnityStore` |
| Data fetch | `useCape` / loaders | route loaders / server fns |
| Routing API | `router.push/replace` | `router.navigate({ to })` |

These diverge because TanStack Start (SSR + server fns + file routes + start-of-page
asset download) and Next (App Router + Server Actions + on-demand boot) are
different runtimes. Forcing shared bridge code would break one of them. Keep
them separate; rely on this contract + the test to guarantee equivalent behavior.
