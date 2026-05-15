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
  assert.ok(!allReturned.some(g => g.id === 'simple-test-game'), 'simple-test-game must be hidden');
});
