/**
 * Block manifest schema + validator.
 *
 * Every block in `components/_blocks/{name}/` ships with a `manifest.json` that
 * follows this shape. The validator is consumed by `block-resolver.js` and the
 * test suite to ensure manifests stay well-formed.
 */

/**
 * Block-system page types. Intentionally distinct from
 * `cape-format-builder.js#KNOWN_PAGE_TYPES`, which uses the legacy CAPE
 * vocabulary (`tutorial`, `intro-video`, `loading-video`, `ad-video`).
 *
 * The block library uses the post-rename vocabulary (`onboarding`, `video`,
 * plus the new `loading` / `end` / `menu` page types). The two will be
 * reconciled in Plan 3 (CAPE schema generator rewrite). Until then, they
 * coexist with different names so neither system shadows the other.
 */
export const BLOCK_PAGE_TYPES = [
  'loading',
  'landing',
  'onboarding',
  'video',
  'game',
  'result',
  'leaderboard',
  'register',
  'voucher',
  'end',
  'menu',
];

/**
 * Validate a block manifest object.
 * @param {object} m
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateManifest(m) {
  const errors = [];

  if (!m || typeof m !== 'object' || Array.isArray(m)) {
    return { ok: false, errors: ['manifest is not a plain object'] };
  }

  for (const field of ['name', 'displayName']) {
    if (typeof m[field] !== 'string' || !m[field].length) {
      errors.push(`missing or empty required field: ${field}`);
    }
  }

  if (!Array.isArray(m.files) || m.files.length === 0) {
    errors.push('missing or empty required field: files');
  } else {
    m.files.forEach((f, i) => {
      if (!f || typeof f !== 'object' || Array.isArray(f)) {
        errors.push(`files[${i}] must be an object`);
        return;
      }
      if (typeof f.src !== 'string') errors.push(`files[${i}]: missing src`);
      if (typeof f.dest !== 'string') errors.push(`files[${i}]: missing dest`);
    });
  }

  if (m.settings !== undefined && (m.settings === null || typeof m.settings !== 'object' || Array.isArray(m.settings))) {
    errors.push('settings must be an object');
  }
  if (m.capeBindings !== undefined && (m.capeBindings === null || typeof m.capeBindings !== 'object' || Array.isArray(m.capeBindings))) {
    errors.push('capeBindings must be an object');
  }

  if (!Array.isArray(m.usableOn) || m.usableOn.length === 0) {
    errors.push('missing or empty required field: usableOn');
  } else {
    for (const p of m.usableOn) {
      if (!BLOCK_PAGE_TYPES.includes(p)) {
        errors.push(`usableOn references unknown page type: ${p}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
