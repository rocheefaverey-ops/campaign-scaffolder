# Game–Stack Hard Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hard-lock each registered game to a specific stack so the wrong game never appears in a flow, and unassigned games are hidden until explicitly assigned.

**Architecture:** A `stack` field is added to `game.json` as the single source of truth. A new `getGamesByStack(engine, stack)` registry function enforces the filter. Every consumer (CLI interactive picker, CLI non-interactive default, wizard server, wizard UI) calls this function — no consumer hard-codes game IDs.

**Tech Stack:** Node.js ESM (`node:test`, `node:assert`), React + TypeScript (wizard UI), Fastify (wizard server).

---

### Task 1: Write the failing registry test

**Files:**
- Create: `cli/tests/game-registry.test.js`

- [ ] **Step 1: Create the test file**

```js
// cli/tests/game-registry.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getGamesByStack } from '../game-registry.js';

test('getGamesByStack returns only next-stack games for next', () => {
  const games = getGamesByStack('unity', 'next');
  assert.ok(games.length > 0, 'expected at least one next game');
  assert.ok(games.every(g => g.stack === 'next'), 'all returned games must have stack:next');
  assert.ok(games.some(g => g.id === 'haas-f1'), 'haas-f1 must be in next games');
  assert.ok(!games.some(g => g.id === 'nhl-crush'), 'nhl-crush must not be in next games');
});

test('getGamesByStack returns only tanstack games for tanstack', () => {
  const games = getGamesByStack('unity', 'tanstack');
  assert.ok(games.length > 0, 'expected at least one tanstack game');
  assert.ok(games.every(g => g.stack === 'tanstack'), 'all returned games must have stack:tanstack');
  assert.ok(games.some(g => g.id === 'nhl-crush'), 'nhl-crush must be in tanstack games');
  assert.ok(!games.some(g => g.id === 'haas-f1'), 'haas-f1 must not be in tanstack games');
});

test('getGamesByStack excludes games with no stack field', () => {
  const nextGames    = getGamesByStack('unity', 'next');
  const tsGames      = getGamesByStack('unity', 'tanstack');
  const allReturned  = [...nextGames, ...tsGames];
  assert.ok(!allReturned.some(g => g.id === 'la-roche-posay'), 'la-roche-posay must be hidden');
  assert.ok(!allReturned.some(g => g.id === 'old-captain-rum-toss'), 'old-captain-rum-toss must be hidden');
  assert.ok(!allReturned.some(g => g.id === 'simple-test-game'), 'simple-test-game must be hidden');
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
node --test cli/tests/game-registry.test.js
```

Expected output: `TypeError: getGamesByStack is not a function` (or similar — the export doesn't exist yet).

---

### Task 2: Add `stack` field to `game.json` manifests

**Files:**
- Modify: `games/haas-f1/game.json`
- Modify: `games/nhl-crush/game.json`

- [ ] **Step 1: Add `"stack": "next"` to haas-f1**

In `games/haas-f1/game.json`, add after `"engine": "unity",`:

```json
  "engine": "unity",
  "stack": "next",
```

- [ ] **Step 2: Add `"stack": "tanstack"` to nhl-crush**

In `games/nhl-crush/game.json`, add after `"engine": "unity",`:

```json
  "engine": "unity",
  "stack": "tanstack",
```

- [ ] **Step 3: Commit**

```bash
git add games/haas-f1/game.json games/nhl-crush/game.json
git commit -m "feat(games): add stack field to haas-f1 (next) and nhl-crush (tanstack)"
```

---

### Task 3: Implement `getGamesByStack` and pass the tests

**Files:**
- Modify: `cli/game-registry.js`

- [ ] **Step 1: Add the function after `getGamesByEngine`**

In `cli/game-registry.js`, add after the `getGamesByEngine` export (around line 62):

```js
/**
 * Get all games for a specific engine AND stack.
 * Games that have no `stack` field are excluded (not yet assigned).
 *
 * engine: 'unity' | 'phaser' | 'r3f'
 * stack:  'next'  | 'tanstack'
 */
export function getGamesByStack(engine, stack) {
  return loadGameRegistry().filter(g => g.engine === engine && g.stack === stack);
}
```

- [ ] **Step 2: Run the tests — confirm they all pass**

```bash
node --test cli/tests/game-registry.test.js
```

Expected output: `✔ getGamesByStack returns only next-stack games for next`, `✔ …tanstack…`, `✔ …excludes games with no stack field`. All three `pass`.

- [ ] **Step 3: Commit**

```bash
git add cli/game-registry.js cli/tests/game-registry.test.js
git commit -m "feat(registry): add getGamesByStack — hard-lock games to their declared stack"
```

---

### Task 4: Update all scaffold.js game picker call sites

**Files:**
- Modify: `cli/scaffold.js`

There are four places to update.

- [ ] **Step 1: Update the import (line 34)**

Change:

```js
import { getGamesByEngine, getGame, gameEnvLines, gameLabel } from './game-registry.js';
```

To:

```js
import { getGamesByEngine, getGamesByStack, getGame, gameEnvLines, gameLabel } from './game-registry.js';
```

- [ ] **Step 2: Update `promptGame()` (line 625)**

Change the function signature and first line from:

```js
async function promptGame(state, ask = promptOnce) {
  const unityGames = getGamesByEngine('unity');
```

To:

```js
async function promptGame(state, ask = promptOnce, stack = 'next') {
  const unityGames = getGamesByStack('unity', stack);
```

- [ ] **Step 3: Update the main interactive game picker (around line 1122)**

Change:

```js
    const unityGames = getGamesByEngine('unity');
    console.log('');
    console.log(`  ${c.bold('Unity game:')}`);
    unityGames.forEach((g, i) => {
      console.log(`    ${c.dim(`${i + 1})`)} ${c.cyan(g.name)}  ${c.dim(`— ${g.description}`)}`);
    });
    const customIdx = unityGames.length + 1;
    const newIdx    = unityGames.length + 2;
    console.log(`    ${c.dim(`${customIdx})`)} Existing/custom game  ${c.dim('← paste CDN URL, game name & scene key')}`);
    console.log(`    ${c.dim(`${newIdx})`)}   New game              ${c.dim('← leave vars empty — fill in later')}`);
    const gv = (await ask(`  ${c.cyan('Select')} ${c.dim('[1-' + newIdx + ', default: 1]')}: `)).trim();
    const gn = parseInt(gv, 10) || 1;
    if (gn >= 1 && gn <= unityGames.length) {
      selectedGame = unityGames[gn - 1];
```

To:

```js
    const unityGames = getGamesByStack('unity', 'next');
    console.log('');
    console.log(`  ${c.bold('Unity game:')}`);
    unityGames.forEach((g, i) => {
      console.log(`    ${c.dim(`${i + 1})`)} ${c.cyan(g.name)}  ${c.dim(`— ${g.description}`)}`);
    });
    const customIdx = unityGames.length + 1;
    const newIdx    = unityGames.length + 2;
    console.log(`    ${c.dim(`${customIdx})`)} Existing/custom game  ${c.dim('← paste CDN URL, game name & scene key')}`);
    console.log(`    ${c.dim(`${newIdx})`)}   New game              ${c.dim('← leave vars empty — fill in later')}`);
    const gv = (await ask(`  ${c.cyan('Select')} ${c.dim('[1-' + newIdx + ', default: 1]')}: `)).trim();
    const gn = parseInt(gv, 10) || 1;
    if (gn >= 1 && gn <= unityGames.length) {
      selectedGame = unityGames[gn - 1];
```

- [ ] **Step 4: Update the interactive editor (around line 1531)**

Change:

```js
        } else if (field === '5') {
          const unityGames = getGamesByEngine('unity');
          unityGames.forEach((g, i) => console.log(`    ${c.dim(`${i + 1})`)} ${g.name}`));
          const v = parseInt((await promptOnce(`  ${c.cyan('Game')} ${c.dim('[number, blank = none]')}: `)).trim(), 10);
          selectedGame = Number.isFinite(v) && v >= 1 && v <= unityGames.length ? unityGames[v - 1] : null;
```

To:

```js
        } else if (field === '5') {
          const unityGames = getGamesByStack('unity', 'next');
          unityGames.forEach((g, i) => console.log(`    ${c.dim(`${i + 1})`)} ${g.name}`));
          const v = parseInt((await promptOnce(`  ${c.cyan('Game')} ${c.dim('[number, blank = none]')}: `)).trim(), 10);
          selectedGame = Number.isFinite(v) && v >= 1 && v <= unityGames.length ? unityGames[v - 1] : null;
```

- [ ] **Step 5: Update the non-interactive default (line 3668)**

Change:

```js
    const selectedGame = (args.game || 'unity') === 'unity' ? getGame('haas-f1') : null;
```

To:

```js
    const selectedGame = (args.game || 'unity') === 'unity' ? (getGamesByStack('unity', stack)[0] ?? null) : null;
```

(`stack` is already defined on line 3659 as `const stack = args.stack || 'next'`.)

- [ ] **Step 6: Verify manually**

Run non-interactive for each stack and confirm correct game is selected:

```bash
# Next.js — should pick haas-f1
node cli/scaffold.js --name=test-next --cape-id=99999 --stack=next --yes 2>&1 | grep -i "game\|unity\|haas"

# TanStack — should pick nhl-crush
node cli/scaffold.js --name=test-ts --cape-id=99999 --stack=tanstack --yes 2>&1 | grep -i "game\|unity\|nhl"
```

Expected: Next run references `haas-f1` env vars; TanStack run references `nhl-crush` env vars. (These will fail at scaffold time due to no real CAPE ID — that's fine; look for the env var lines in the output before the error.)

- [ ] **Step 7: Commit**

```bash
git add cli/scaffold.js
git commit -m "feat(scaffold): filter game pickers by stack — hard lock enforced at all CLI call sites"
```

---

### Task 5: Update wizard server `/api/games`

**Files:**
- Modify: `cli/wizard-server/server.js`

- [ ] **Step 1: Update the `/api/games` route (line 173)**

Change:

```js
app.get('/api/games', async () => ({
  games: loadGameRegistry().map((game) => ({
    id:          game.id,
    name:        game.name,
    description: game.description ?? '',
    engine:      game.engine,
    cdn:         game.cdn,
    dpr:         game.dpr,
    boot:        game.boot,
    env:         game.env,
  })),
}));
```

To:

```js
app.get('/api/games', async (req) => {
  const stack = req.query?.stack?.toString() ?? '';
  const games = stack
    ? loadGameRegistry().filter(g => g.stack === stack)
    : loadGameRegistry().filter(g => !!g.stack);  // no stack param → return all assigned games
  return {
    games: games.map((game) => ({
      id:          game.id,
      name:        game.name,
      description: game.description ?? '',
      engine:      game.engine,
      cdn:         game.cdn,
      dpr:         game.dpr,
      boot:        game.boot,
      env:         game.env,
    })),
  };
});
```

- [ ] **Step 3: Verify manually**

Start the wizard server (`node cli/wizard-server/server.js`) in one terminal, then in another:

```bash
curl "http://localhost:3000/api/games?stack=next"     | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).games.map(g=>g.id)))"
curl "http://localhost:3000/api/games?stack=tanstack"  | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).games.map(g=>g.id)))"
```

Expected:
- `?stack=next` → `[ 'haas-f1' ]`
- `?stack=tanstack` → `[ 'nhl-crush' ]`

- [ ] **Step 4: Commit**

```bash
git add cli/wizard-server/server.js
git commit -m "feat(wizard-server): filter /api/games by stack query param"
```

---

### Task 6: Update wizard UI — bridge and StepGames

**Files:**
- Modify: `cli/wizard-ui/src/bridge.ts`
- Modify: `cli/wizard-ui/src/steps/StepGames.tsx`

- [ ] **Step 1: Update `listGames` in bridge.ts to accept a stack param (line 121)**

Change:

```ts
export async function listGames(): Promise<GameInfo[]> {
  try {
    const res = await fetch('/api/games');
```

To:

```ts
export async function listGames(stack?: string): Promise<GameInfo[]> {
  try {
    const url = stack ? `/api/games?stack=${encodeURIComponent(stack)}` : '/api/games';
    const res = await fetch(url);
```

- [ ] **Step 2: Update `StepGames.tsx`**

Replace the entire file content with:

```tsx
import { useEffect, useState } from 'react';
import { type StepProps } from '../shared/config.ts';
import { listGames, type GameInfo } from '../bridge.ts';

export default function StepGames({ config, setConfig }: StepProps) {
  const [openInfoIdx, setOpenInfoIdx] = useState<number | null>(null);
  const [games, setGames] = useState<GameInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    listGames(config.stack).then((loaded) => {
      if (!cancelled) setGames(loaded);
    });
    return () => { cancelled = true; };
  }, [config.stack]);

  const selectedGameId = config.gameId;
  const engineGames = games.filter((game) => game.engine === config.game);
  const visibleGames = engineGames.length > 0 ? engineGames : games;

  return (
    <>
      <div>
        <h2 className="step__title">Game</h2>
        <p className="step__hint">
          Select a pre-built game definition from <code>games/*/game.json</code>.
          Leave empty to use the selected engine without game-specific defaults.
        </p>
      </div>

      <div className="card-grid">
        {/* "No game" option */}
        <div key="none" className="stack-cell">
          <button
            className={`card${selectedGameId === undefined ? ' is-selected' : ''}`}
            onClick={() => setConfig({ ...config, gameId: undefined })}
          >
            <div className="card__label">No specific game</div>
            <div className="card__hint">Use {config.game || 'default'} engine settings only</div>
          </button>
        </div>

        {visibleGames.map((game, i) => {
          const selected = selectedGameId === game.id;
          const showInfo = openInfoIdx === i;
          return (
            <div key={game.id} className="stack-cell">
              <button
                className={`card${selected ? ' is-selected' : ''}`}
                onClick={() => setConfig({ ...config, gameId: game.id, game: game.engine as any })}
              >
                <div className="card__label">{game.name}</div>
                <div className="card__hint">{game.description}</div>
                <span className="card__badge">{game.engine}</span>
              </button>

              {showInfo && (
                <div className="stack-info-panel">
                  <header className="stack-info-panel__head">
                    <strong>{game.name}</strong>
                    <button className="stack-info-panel__close" aria-label="Close" onClick={() => setOpenInfoIdx(null)}>×</button>
                  </header>
                  <p className="step__hint">{game.description}</p>
                  <div className="stack-info-panel__section">
                    <h5>Engine</h5>
                    <p>{game.engine}</p>
                  </div>
                  {game.cdn && (
                    <div className="stack-info-panel__section">
                      <h5>CDN</h5>
                      <p className="step__hint">
                        <code>{game.cdn.baseUrl || 'not set'}</code>
                        {game.cdn.gameName && <> · build <code>{game.cdn.gameName}</code></>}
                        {game.cdn.compression && <> · {game.cdn.compression}</>}
                      </p>
                    </div>
                  )}
                  {game.dpr && (
                    <div className="stack-info-panel__section">
                      <h5>DPR</h5>
                      <p>{game.dpr.min ?? 'default'} - {game.dpr.max ?? 'default'}</p>
                    </div>
                  )}
                  {game.boot && (
                    <div className="stack-info-panel__section">
                      <h5>Boot</h5>
                      <p className="step__hint">
                        scene <code>{game.boot.defaultScene ?? 'Game'}</code>
                        {game.boot.startMethod && <> · start <code>{game.boot.startMethod}</code></>}
                      </p>
                    </div>
                  )}
                  {game.env && Object.keys(game.env).length > 0 && (
                    <div className="stack-info-panel__section">
                      <h5>Env vars</h5>
                      <p className="step__hint">{Object.keys(game.env).join(' · ')}</p>
                    </div>
                  )}
                  <div className="stack-info-panel__section">
                    <h5>Game ID</h5>
                    <code>{game.id}</code>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedGameId && (
        <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8 }}>
          <h4 style={{ margin: '0 0 8px' }}>Selected: {games.find(g => g.id === selectedGameId)?.name ?? selectedGameId}</h4>
          <p className="step__hint" style={{ margin: 0 }}>
            Game settings will be loaded from <code>games/{selectedGameId}/game.json</code> during scaffold.
            This includes CDN configuration, DPR bounds, boot methods, and environment variables.
          </p>
        </div>
      )}
    </>
  );
}
```

Key changes from the original:
- Removed hardcoded `AVAILABLE_GAMES` fallback (unassigned games would have leaked through)
- Initial state is `[]` — shows nothing while loading instead of wrong games
- `listGames(config.stack)` passes the current stack to the server
- `config.stack` added to the `useEffect` dependency array so list refreshes when stack changes

- [ ] **Step 3: Verify manually**

Build the wizard UI (`cd cli/wizard-ui && npm run build` or `npm run dev`) and open it in a browser. Navigate to the stack selection step, choose **Next.js + Unity**, advance to the Games step. Confirm only **Haas F1** appears. Go back, choose **TanStack + Unity**, advance to Games. Confirm only **NHL Crush** appears.

- [ ] **Step 4: Commit**

```bash
git add cli/wizard-ui/src/bridge.ts cli/wizard-ui/src/steps/StepGames.tsx
git commit -m "feat(wizard-ui): filter game list by stack — removes hardcoded fallback, passes stack to API"
```
