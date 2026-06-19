import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const templatesDir = join(root, 'base-templates');

/**
 * Guard against the "next-memory shipped a Unity gameplay page" class of bug:
 * a base template must be SELF-CONTAINED — every `@components/_modules/<name>`
 * it imports in its own source must be a directory the template actually ships.
 * (Optional modules are copied in at scaffold time and live in modules/, not in
 * the base template's source, so the base template must never import them.)
 */

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

const IMPORT_RE = /from\s+['"]@\/?components\/_modules\/([^/'"]+)/g;

const templates = existsSync(templatesDir)
  ? readdirSync(templatesDir).filter((t) => statSync(join(templatesDir, t)).isDirectory())
  : [];

describe('base templates are self-contained (no imports of un-shipped _modules)', () => {
  for (const template of templates) {
    it(`${template} only imports _modules it ships`, () => {
      const tplRoot = join(templatesDir, template);
      const modulesRoot = join(tplRoot, 'components', '_modules');
      const files = [...walk(join(tplRoot, 'app')), ...walk(join(tplRoot, 'components'))];
      const violations = [];

      for (const file of files) {
        const src = readFileSync(file, 'utf8');
        let m;
        IMPORT_RE.lastIndex = 0;
        while ((m = IMPORT_RE.exec(src)) !== null) {
          const moduleName = m[1];
          if (!existsSync(join(modulesRoot, moduleName))) {
            violations.push(`${file.slice(tplRoot.length + 1)} imports _modules/${moduleName} (not shipped by ${template})`);
          }
        }
      }

      assert.deepEqual(
        violations,
        [],
        `\n${template} imports modules it does not ship:\n  ${violations.join('\n  ')}\n` +
        `A base template must be self-contained — ship the component, or don't import it.`,
      );
    });
  }
});
