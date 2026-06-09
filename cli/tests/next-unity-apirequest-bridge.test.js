import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The Unity `apiRequest` bridge lets the game proxy HTTP calls through the
// frontend (game emits `apiRequest` → JS calls the backend → echoes the result
// on APIService.ProcessResponse, keyed by uuid). TanStack's game.tsx has always
// had this; the Next base gameplay page must keep it too so both stacks expose
// the same game-initiated backend bridge. This guards against silent removal.

const __dirname = dirname(fileURLToPath(import.meta.url));
const nextBase = join(__dirname, '..', '..', 'base-templates', 'next-unity');

describe('Next Unity apiRequest bridge (base template)', () => {
  const gameplayPath = join(nextBase, 'app', '(campaign)', 'gameplay', 'page.tsx');
  const actionPath = join(nextBase, 'app', 'actions', 'unity-api-request', 'action.ts');
  const gameplay = existsSync(gameplayPath) ? readFileSync(gameplayPath, 'utf8') : '';
  const action = existsSync(actionPath) ? readFileSync(actionPath, 'utf8') : '';

  it('ships the generic unity-api-request server action', () => {
    assert.ok(existsSync(actionPath), 'app/actions/unity-api-request/action.ts is missing');
    assert.match(action, /'use server'/);
    assert.match(action, /export async function unityApiRequest/);
    assert.match(action, /fetchData/);
    // A 'use server' module may ONLY export async functions. A `export default`
    // (even aliasing the function) breaks Next's server-action transform —
    // the named export silently disappears and gameplay fails to build.
    assert.doesNotMatch(action, /export default/);
  });

  it('gameplay registers and tears down the apiRequest listener', () => {
    assert.match(gameplay, /addEventListener\('apiRequest'/);
    assert.match(gameplay, /removeEventListener\('apiRequest'/);
  });

  it('gameplay echoes the result back on APIService.ProcessResponse with the uuid', () => {
    assert.match(gameplay, /unityApiRequest\(/);
    assert.match(gameplay, /sendMessage\('APIService', 'ProcessResponse'/);
    assert.match(gameplay, /uuid/);
  });
});
