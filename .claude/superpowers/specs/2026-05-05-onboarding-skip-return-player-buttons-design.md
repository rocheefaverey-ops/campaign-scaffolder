# Onboarding Skip & Return Player Buttons

**Date:** 2026-05-05
**Scope:** Next.js base template (`base-templates/next`)

## Problem

1. The onboarding flow replays every time a returning player clicks "Play" — it should only appear the first time.
2. After a player has completed a game, the landing page has no way to offer "Play again" or a leaderboard shortcut — they always see the virgin "Play" experience.

## Feature 1 — Skip Onboarding for Returning Players

### Behaviour

- **First play:** "Play" → onboarding → gameplay (unchanged).
- **Subsequent plays:** "Play" → gameplay directly, onboarding skipped.

### How It Works

`onboardingCompleted: boolean` already exists in `GameContext` and is persisted in `localStorage` under `campaign-state`. It is set to `true` when the player finishes onboarding.

**Change:** The "Play" button's `onClick` in `landing/page.tsx` checks this flag before navigating:

```ts
onboardingCompleted ? navigate('/gameplay') : navigate('{{NEXT_AFTER_LANDING}}')
```

No new tokens, no new state fields required.

### Files Changed

- `base-templates/next/app/(campaign)/landing/page.tsx` — conditional navigation on CTA click

---

## Feature 2 — Return Player Buttons on Landing

### Behaviour

- **First visit (no game played yet):** single CTA — label from `copy.landing.cta`.
- **Returning player (game completed at least once):** 
  - Main CTA label switches to `copy.landing.ctaReturning` (e.g. "Play again"), navigates to `/gameplay`.
  - A second button appears — label from `copy.landing.leaderboardCta` (e.g. "Leaderboard"), navigates to `/leaderboard`.
- **Scaffold-time gate:** if `{{RETURN_PLAYER_BUTTONS}}` is `false`, landing always renders the single CTA regardless of play history — for campaigns that do not want this feature.

### State

Add `hasPlayed: boolean` to `GameState`:

| Field | Type | Default | Persisted | Set when |
|---|---|---|---|---|
| `hasPlayed` | `boolean` | `false` | ✓ | `handleGameEnd` fires in `gameplay/page.tsx` |

Persistence follows the existing pattern — added to the `setStorage` call in `GameContext`'s effect.

### New CAPE Keys

| Key | Example value |
|---|---|
| `copy.landing.ctaReturning` | "Play again" |
| `copy.landing.leaderboardCta` | "Leaderboard" |

These keys are optional at runtime — if absent, the feature degrades gracefully (single CTA shown).

### Scaffold-Time Token

| Token | Values | Web wizard label |
|---|---|---|
| `{{RETURN_PLAYER_BUTTONS}}` | `true` / `false` | "Show return player buttons" |

When `false` the conditional block in the landing template is effectively dead code — the single-CTA path always runs.

### Files Changed

- `base-templates/next/types/game.ts` — add `hasPlayed: boolean`
- `base-templates/next/contexts/GameContext.tsx` — add `hasPlayed` state, setter, persistence
- `base-templates/next/app/(campaign)/gameplay/page.tsx` — call `setHasPlayed(true)` in `handleGameEnd`
- `base-templates/next/app/(campaign)/landing/page.tsx` — conditional button rendering, label swap
- Scaffolder web wizard — expose `{{RETURN_PLAYER_BUTTONS}}` toggle (separate ticket if wizard is out of scope)

---

## Data Flow Summary

```
First play
  landing (Play) → onboardingCompleted=false → /onboarding → setOnboardingCompleted(true) → /gameplay → setHasPlayed(true) → /result

Subsequent play
  landing (Play again) → onboardingCompleted=true → /gameplay → setHasPlayed(true) → /result
```

---

## Out of Scope

- TanStack template — same pattern applies but is a separate change.
- Web wizard UI for `{{RETURN_PLAYER_BUTTONS}}` — token can be manually set in the wizard config until the toggle is added.
- Reset / "forget" mechanism — `hasPlayed` resets only via `GameContext.reset()` (existing behaviour for campaign restarts).
