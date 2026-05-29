import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { validateManifest } from './block-manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOCK_LIBRARY_DIR = resolve(__dirname, '..', 'components', '_blocks');

/**
 * Discover every block in components/_blocks/ and return their manifest +
 * source path. Throws on any invalid manifest — we want failures loud at
 * scaffold time, not silent skips.
 *
 * @returns {{ manifest: object, sourceDir: string }[]}
 */
export function listBlocks() {
  const blocks = [];
  for (const entry of readdirSync(BLOCK_LIBRARY_DIR)) {
    const sourceDir = join(BLOCK_LIBRARY_DIR, entry);
    if (!statSync(sourceDir).isDirectory()) continue;

    const manifestPath = join(sourceDir, 'manifest.json');
    const raw = readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);

    const r = validateManifest(manifest);
    if (!r.ok) {
      throw new Error(
        `Invalid block manifest at ${manifestPath}:\n  ${r.errors.join('\n  ')}`,
      );
    }
    blocks.push({ manifest, sourceDir });
  }
  return blocks;
}
