# Game–Stack Hard Lock

**Date:** 2026-05-11
**Status:** Approved

## Problem

All registered Unity games are visible in both the Next.js and TanStack wizard flows. HaasF1 is designed for Next.js; NHL Crush is designed for TanStack. Picking the wrong game for a stack produces broken env vars and incorrect Unity boot wiring. Other games in the registry (`la-roche-posay`, `old-captain-rum-toss`, `simple-test-game`) are not yet verified against either stack and should be invisible until explicitly assigned.

## Goal

Hard-lock each game to a specific stack. A game that has no `stack` declaration is hidden from all flows until it is explicitly assigned.

---

## Design

### 1. Data layer — `game.json`

Add a top-level `"stack"` field to each game manifest.

| Game | `stack` value |
|---|---|
| `haas-f1` | `"next"` |
| `nhl-crush` | `"tanstack"` |
| `la-roche-posay` | _(absent — hidden)_ |
| `old-captain-rum-toss` | _(absent — hidden)_ |
| `simple-test-game` | _(absent — hidden)_ |

**Rule:** absent field = not assigned = hidden from all stacks.  
When a new game is ready, adding `"stack": "next"` or `"stack": "tanstack"` to its `game.json` is the only step needed to unlock it.

---

### 2. Registry layer — `cli/game-registry.js`

Add one new exported function:

```js
getGamesByStack(engine, stack)
// Returns games where game.engine === engine AND game.stack === stack
// Games missing the stack field are excluded
```

`getGamesByEngine()` is left unchanged so nothing outside the game-picker flows breaks.

---

### 3. Consumers — 3 call sites

#### 3a. CLI interactive game picker (`scaffold.js`)

Replace the current `getGamesByEngine('unity')` call in the Unity game picker with `getGamesByStack('unity', stack)`.

If the filtered list contains exactly one game, auto-select it and skip the picker prompt — no point asking a question with one answer.

#### 3b. Non-interactive CLI default (`scaffold.js` ~line 3668)

Currently hardcoded to `getGame('haas-f1')`. Replace with:

```js
getGamesByStack('unity', stack)[0] ?? null
```

This picks the correct game for the chosen stack without any hardcoding.

#### 3c. Wizard UI game list

- `server.js` `/api/games` endpoint: accept a `stack` query param and filter with `getGamesByStack`.
- `StepGames.tsx`: pass `config.stack` as the `stack` query param when fetching the game list.

---

## Out of scope

- Non-Unity engines (r3f, phaser, memory) — unaffected; no stack filtering needed yet.
- Game content or boot wiring changes — this is purely a visibility filter.
- Multi-stack games — YAGNI; the `stack` field is a single string for now.

---

## Adding a new game later

1. Create `games/{id}/game.json` with the correct `"stack"` value.
2. Done — it appears in the right flow automatically.
