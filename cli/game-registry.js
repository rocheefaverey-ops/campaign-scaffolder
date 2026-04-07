/**
 * cli/game-registry.js
 *
 * Reads all game manifests from games/{id}/game.json and provides
 * helpers for the scaffold wizard and env-var injection.
 *
 * To register a new game:
 *   1. Copy games/_template/game.json → games/{your-id}/game.json
 *   2. Fill in all fields
 *   3. Done — the wizard picks it up automatically
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const GAMES_DIR  = join(__dirname, '..', 'games');

// ─── Load registry ────────────────────────────────────────────────────────────

let _cache = null;

export function loadGameRegistry() {
  if (_cache) return _cache;

  if (!existsSync(GAMES_DIR)) return (_cache = []);

  const games = [];

  for (const dir of readdirSync(GAMES_DIR)) {
    if (dir.startsWith('_')) continue; // skip _template
    const manifestPath = join(GAMES_DIR, dir, 'game.json');
    if (!existsSync(manifestPath)) continue;

    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (manifest.id && manifest.engine) games.push(manifest);
    } catch (e) {
      console.warn(`  [game-registry] Could not parse ${manifestPath}: ${e.message}`);
    }
  }

  // Sort: unity first, then alphabetical
  games.sort((a, b) => {
    if (a.engine === b.engine) return a.name.localeCompare(b.name);
    if (a.engine === 'unity') return -1;
    if (b.engine === 'unity') return 1;
    return 0;
  });

  return (_cache = games);
}

/**
 * Get all games for a specific engine type.
 * engine: 'unity' | 'phaser' | 'r3f'
 */
export function getGamesByEngine(engine) {
  return loadGameRegistry().filter(g => g.engine === engine);
}

/**
 * Get a single game by id.
 */
export function getGame(id) {
  return loadGameRegistry().find(g => g.id === id) ?? null;
}

/**
 * Returns env var lines to append to .env from a game manifest.
 * e.g. { "NEXT_PUBLIC_UNITY_BASE_URL": "https://..." } → "NEXT_PUBLIC_UNITY_BASE_URL=https://..."
 */
export function gameEnvLines(game) {
  if (!game?.env) return [];
  return Object.entries(game.env).map(([k, v]) => `${k}=${v}`);
}

/**
 * Returns a short summary string for display in the CLI.
 */
export function gameLabel(game) {
  const engine = game.engine === 'unity' ? 'Unity' :
                 game.engine === 'phaser' ? 'Phaser' :
                 game.engine === 'r3f'    ? 'R3F' : game.engine;
  return `${game.name}  (${engine} — ${game.id})`;
}
