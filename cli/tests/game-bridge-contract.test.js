import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The Unity↔frontend bridge functions DIFFERENTLY per stack on purpose (Next =
// Server Actions + on-demand boot; TanStack = server fns + start-of-page
// preload). What must NOT diverge is the CONTRACT both honor — see
// docs/GAME_BRIDGE_CONTRACT.md. This test pins that contract so the
// intentionally-incompatible mechanisms can evolve freely without silently
// breaking what the game and player observe.

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

const nextGameplay = readFileSync(
  join(root, 'base-templates', 'next-unity', 'app', '(campaign)', 'gameplay', 'page.tsx'), 'utf8');
const tsGame = readFileSync(
  join(root, 'base-templates', 'tanstack-unity', 'src', 'routes', 'game.tsx'), 'utf8');

// The five shared-core Unity→JS events both stacks must listen for.
const CORE_EVENTS = ['start', 'end', 'navigation', 'tracking', 'apiRequest'];

function registersEvent(src, name) {
  return new RegExp(`addEventListener\\(\\s*['"]${name}['"]`).test(src);
}

describe('game bridge contract — Unity→JS event vocabulary', () => {
  for (const ev of CORE_EVENTS) {
    it(`Next gameplay listens for '${ev}'`, () => {
      assert.ok(registersEvent(nextGameplay, ev), `Next gameplay must addEventListener('${ev}', …)`);
    });
    it(`TanStack game listens for '${ev}'`, () => {
      assert.ok(registersEvent(tsGame, ev), `TanStack game must addEventListener('${ev}', …)`);
    });
  }
});

describe('game bridge contract — JS→Unity response channel', () => {
  const re = /sendMessage\(\s*['"]APIService['"]\s*,\s*['"]ProcessResponse['"]/;
  it('Next answers apiRequest via APIService.ProcessResponse', () => {
    assert.match(nextGameplay, re);
  });
  it('TanStack answers apiRequest via APIService.ProcessResponse', () => {
    assert.match(tsGame, re);
  });
  it('both echo the request uuid in the response', () => {
    assert.match(nextGameplay, /uuid/);
    assert.match(tsGame, /uuid/);
  });
});

describe('game page — hard-refresh recovery', () => {
  // Refreshing the game page destroys the in-memory Unity instance + preload
  // handshake → frozen canvas. Both stacks must detect the reload and restart
  // the flow from the entry ('/').
  for (const [name, src] of [['Next gameplay', nextGameplay], ['TanStack game', tsGame]]) {
    it(`${name} detects a hard reload (mount marker) and redirects to the entry`, () => {
      // SPA-safe detection: a sessionStorage mount marker cleared on clean
      // unmount; only a hard reload leaves it set. (Document navigation-type is
      // shared across all client routes, so it can't be used here.)
      assert.match(src, /lw-game-page-mounted/);
      assert.match(src, /sessionStorage/);
      assert.match(src, /(navigate\(\s*['"]\/['"]|to:\s*['"]\/['"])/);
      assert.doesNotMatch(src, /getEntriesByType\(['"]navigation['"]\)/);
    });
  }
});

describe('game bridge contract — flow (end → result)', () => {
  // Same contract, stack-specific expression: Next navigates to a literal
  // /result; TanStack navigates via the {{NEXT_AFTER_GAME}} flow token, which the
  // scaffolder resolves to the result route at build time.
  it('Next navigates to the result page on game end', () => {
    assert.match(nextGameplay, /\/result/);
  });
  it('TanStack navigates to the result route on game end (via flow token)', () => {
    assert.match(tsGame, /\{\{NEXT_AFTER_GAME\}\}|\/result/);
  });
});
