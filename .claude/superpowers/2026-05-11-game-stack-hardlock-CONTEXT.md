# Game–Stack Hard Lock — Comprehensive Handoff

**Last verified:** 2026-05-12
**Status:** ✅ Shipped (all 6 plan tasks landed, tests green)
**Branch:** `master` (26 commits ahead of `origin/master` — unpushed)

This is the single context document for the Game–Stack Hard Lock feature. Any
agent picking this up cold should be able to read just this file and continue
working — extending it, unlocking new games, or debugging regressions —
without re-discovering the spec, plan, or current code state.

Companion files (kept for the audit trail, but everything actionable is duplicated here):
- Spec: [docs/superpowers/specs/2026-05-11-game-stack-hardlock-design.md](specs/2026-05-11-game-stack-hardlock-design.md)
- Plan: [docs/superpowers/plans/2026-05-11-game-stack-hardlock.md](plans/2026-05-11-game-stack-hardlock.md)

---

## 1. What problem this solves

Before this work, every game in `games/*/game.json` was visible in **both** the
Next.js and TanStack wizard flows. That was wrong:

- `haas-f1` only boots correctly under the Next.js base template.
- `nhl-crush` only boots correctly under the TanStack base template.
- `la-roche-posay`, `old-captain-rum-toss`, `simple-test-game` are unverified
  against either stack and should not appear in any flow until someone
  explicitly assigns them.

Picking the wrong game for a stack produced broken env vars and incorrect Unity
boot wiring. This feature **hard-locks each game to one stack** via a single
declarative field in `game.json` and enforces the filter at every consumer.

---

## 2. The design in one paragraph

`game.json` carries a top-level `"stack"` field whose value is `"next"`,
`"tanstack"`, or absent. A new registry helper `getGamesByStack(engine, stack)`
returns only games matching both. Every CLI/UI call site that shows a game
picker now calls `getGamesByStack` instead of `getGamesByEngine`, so an
unassigned game (no `stack` field) is invisible everywhere until its manifest
is updated. **Adding a game later is a one-line edit** to that game's
`game.json`.

YAGNI exclusions: multi-stack games (the field is a single string), non-Unity
engines (no stack filtering applied to r3f/phaser/memory), and any game-content
changes.

---

## 3. Current state of `games/*/game.json`

Verified 2026-05-12 against working tree:

| Game directory          | `engine` | `stack`     | Visible in wizard?      |
|-------------------------|----------|-------------|-------------------------|
| `haas-f1`               | unity    | `next`      | ✅ Next.js only         |
| `nhl-crush`             | unity    | `tanstack`  | ✅ TanStack only        |
| `la-roche-posay`        | unity    | _(absent)_  | ❌ Hidden everywhere    |
| `old-captain-rum-toss`  | unity    | _(absent)_  | ❌ Hidden everywhere    |
| `simple-test-game`      | unity    | _(absent)_  | ❌ Hidden everywhere    |
| `_template`             | unity    | _(absent)_  | ❌ Skipped by registry (`_` prefix) |

This is intentional. Do not "fix" the absent fields without confirming the
game actually boots on the target stack first.

---

## 4. File map — exactly what changed

All paths relative to [campaign-scaffolder/](../../).

| File                                       | Change                                                                                  | Commit     |
|--------------------------------------------|-----------------------------------------------------------------------------------------|------------|
| [games/haas-f1/game.json](../../games/haas-f1/game.json)         | Added `"stack": "next"` after `"engine": "unity"`                                       | `8f16d9d`  |
| [games/nhl-crush/game.json](../../games/nhl-crush/game.json)       | Added `"stack": "tanstack"` after `"engine": "unity"`                                   | `8f16d9d`  |
| [cli/game-registry.js](../../cli/game-registry.js)                | Added `getGamesByStack(engine, stack)` exported function (lines 63–72)                  | `2f63055`  |
| [cli/tests/game-registry.test.js](../../cli/tests/game-registry.test.js)     | New test file — 3 cases covering next, tanstack, and absent-stack exclusion             | `2f63055`  |
| [cli/scaffold.js](../../cli/scaffold.js)                     | Replaced 4 `getGamesByEngine('unity')` call sites with `getGamesByStack('unity', stack)`; non-interactive default now `getGamesByStack('unity', stack)[0] ?? null` instead of hardcoded `getGame('haas-f1')` | `3715afa`  |
| [cli/wizard-server/server.js](../../cli/wizard-server/server.js)         | `/api/games` now reads `?stack=` query param and filters with it; no param ⇒ returns only games that have *some* stack assignment (still hides unassigned) | `7d572d1`  |
| [cli/wizard-ui/src/bridge.ts](../../cli/wizard-ui/src/bridge.ts)         | `listGames(stack?: string)` appends the stack as a query param when present              | `506c338`  |
| [cli/wizard-ui/src/steps/StepGames.tsx](../../cli/wizard-ui/src/steps/StepGames.tsx) | Removed hardcoded `AVAILABLE_GAMES` fallback; initial `games` state is `[]`; passes `config.stack` to `listGames`; `config.stack` added to the `useEffect` dependency array | `506c338`  |
| [package.json](../../package.json)                          | `npm test` now runs the registry tests (`node --test cli/tests/*.test.js`)               | `68e2da4`  |

Commit range to read for the full diff: `8f16d9d^..68e2da4`.

---

## 5. The contract — what each layer guarantees

**`games/*/game.json`** — `stack` is the single source of truth. Absent ⇒ hidden.

**`cli/game-registry.js`**:
```js
export function getGamesByStack(engine, stack) {
  return loadGameRegistry().filter(g => g.engine === engine && g.stack === stack);
}
```
- Pure, no side effects. Reads the in-memory cache populated by `loadGameRegistry`.
- `getGamesByEngine()` is intentionally unchanged so callers outside the
  game-picker flows (env-var injection, manifest validation, etc.) keep working.

**`cli/scaffold.js`** — every interactive prompt and the non-interactive
default funnel through `getGamesByStack('unity', stack)`. The single-result
auto-skip behaviour is implicit (current pickers still ask, but with only one
real option; consider hardening this if a UX complaint comes in).

**`cli/wizard-server/server.js` `/api/games`** —
- `?stack=next` ⇒ games where `g.stack === 'next'`
- `?stack=tanstack` ⇒ games where `g.stack === 'tanstack'`
- no `?stack=` ⇒ games where `g.stack` is truthy (still excludes unassigned)

**`cli/wizard-ui` `StepGames.tsx`** — always passes `config.stack` to the API.
Re-fetches when stack changes (the dependency array includes `config.stack`).
There is no client-side fallback list — if the API returns `[]`, the user
sees only the "No specific game" option.

---

## 6. How to verify it still works

From `campaign-scaffolder/`:

```bash
# 1. Registry tests (3 cases)
npm test

# 2. Non-interactive CLI — Next.js stack picks haas-f1
node cli/scaffold.js --name=test-next --cape-id=99999 --stack=next --yes 2>&1 | grep -iE "game|unity|haas" | head

# 3. Non-interactive CLI — TanStack picks nhl-crush
node cli/scaffold.js --name=test-ts   --cape-id=99999 --stack=tanstack --yes 2>&1 | grep -iE "game|unity|nhl" | head

# 4. Wizard API — run server in one terminal:
node cli/wizard-server/server.js

# …and from another terminal:
curl -s "http://localhost:3000/api/games?stack=next"     | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).games.map(g=>g.id)))"
# expect: [ 'haas-f1' ]

curl -s "http://localhost:3000/api/games?stack=tanstack" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).games.map(g=>g.id)))"
# expect: [ 'nhl-crush' ]
```

Wizard UI smoke (manual): `cd cli/wizard-ui && npm run dev`, open browser,
pick **Next.js + Unity** → Games step shows only Haas F1; go back, pick
**TanStack + Unity** → Games step shows only NHL Crush.

---

## 7. Unlocking a new game (the only routine maintenance task)

When a game has been verified against a stack and is ready to be used:

1. Edit `games/{game-id}/game.json` and add the appropriate field after `engine`:
   ```json
   "engine": "unity",
   "stack": "next",
   ```
   (or `"tanstack"`).
2. Restart the wizard server (`cli/wizard-server/server.js`) if it's running —
   the registry is cached on first load.
3. That's it. The game now appears in the wizard for the matching stack.

**Do not** add a `stack` field to a game that hasn't been smoke-tested against
the corresponding base template — silent boot failures are exactly what this
feature exists to prevent.

To remove a game from circulation without deleting it: delete the `stack`
field. It goes back to "unassigned / hidden".

---

## 8. Known open questions / possible extensions

None of these are committed work — they are noted for the next person
reaching for this feature.

- **Multi-stack games.** Spec says YAGNI. If/when a game does work on both
  stacks, the cheapest change is to make `stack` accept `string | string[]`
  and update `getGamesByStack` to `g.stack === stack || (Array.isArray(g.stack) && g.stack.includes(stack))`. Tests would need a third case.
- **Auto-select when only one game matches.** The CLI picker still prompts
  with a single option. Trivial improvement, low priority.
- **Schema validation.** No JSON-schema check on `game.json` rejects an
  unknown `stack` value (e.g. `"stak": "next"`). A typo silently hides the
  game. Worth adding to the existing manifest validator if drift becomes
  a recurring problem.
- **Non-Unity engines.** r3f / phaser / memory games are not stack-locked.
  If a stack-specific r3f game is ever added, the same pattern applies —
  no new mechanism needed, just call `getGamesByStack('r3f', stack)`.

---

## 9. If something looks wrong

| Symptom                                                | First place to look                                                                                                              |
|--------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| Wizard shows a game on the wrong stack                 | `games/{id}/game.json` — wrong `stack` value, or `getGamesByStack` no longer called from the relevant picker.                    |
| Wizard shows no games at all on a stack                | API call missing `?stack=` param, or `config.stack` is undefined in `StepGames.tsx`. Check Network tab.                          |
| New game added but doesn't appear                      | Wizard server is caching the registry. Restart it. Confirm `stack` field is spelled correctly and value is `next` or `tanstack`. |
| `getGamesByStack is not a function`                    | An import was missed when editing `cli/scaffold.js`. The import line is at the top of the file, near line 34.                    |
| `npm test` fails on a registry test                    | Someone changed a `game.json` `stack` value. Either revert, or update the test expectations in `cli/tests/game-registry.test.js`. |

---

## 10. Why the design landed where it did

For future maintainers asking "why not X?":

- **Why a `stack` field on `game.json` instead of a separate registry file?**
  One source of truth, lives next to the game's other config, and "add a game"
  remains a single-directory operation.
- **Why hide unassigned games instead of warning?**
  Warnings are ignored. Invisible games can't be picked by mistake.
- **Why keep `getGamesByEngine` around?**
  It's still used by env-var injection and manifest validation — those layers
  must see every registered game regardless of stack. Removing it would break
  those flows for no benefit.
- **Why filter in the API instead of the UI?**
  Defence in depth — a misbehaving UI can't accidentally surface an unassigned
  game, and the CLI gets the same protection without duplicating logic.
