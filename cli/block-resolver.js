import { readFileSync, readdirSync, statSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
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

/**
 * Copy each block's declared files into the target project, applying token
 * replacement to text files.
 *
 * @param {{ manifest: object, sourceDir: string }[]} blocks
 * @param {string} targetDir absolute path of the scaffolded project root
 * @param {Record<string, string>} tokens token map for {{TOKEN}} replacement
 */
export function copyBlockFiles(blocks, targetDir, tokens = {}) {
  const seen = new Set();
  for (const { manifest, sourceDir } of blocks) {
    if (seen.has(manifest.name)) continue;
    seen.add(manifest.name);

    for (const file of manifest.files) {
      const src = join(sourceDir, file.src);
      const dest = join(targetDir, file.dest);
      mkdirSync(dirname(dest), { recursive: true });

      if (isTextFile(file.src)) {
        let content = readFileSync(src, 'utf8');
        for (const [key, value] of Object.entries(tokens)) {
          content = content.replaceAll(`{{${key}}}`, value);
        }
        writeFileSync(dest, content);
      } else {
        copyFileSync(src, dest);
      }
    }
  }
}

function isTextFile(filename) {
  return /\.(tsx?|jsx?|scss|css|json|md|env)$/.test(filename);
}
