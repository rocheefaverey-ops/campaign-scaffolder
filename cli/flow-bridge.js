// Build-time bridge between the cta-group block (the single source of truth for
// page CTA buttons) and the legacy flow maps that the preview, the TanStack token
// machinery, and the CAPE show-flags still consume.
//
// The wizard no longer edits flowExits / flowEnabledExits / flowButtonVariants for
// CTA-bearing pages — those are DERIVED from each page's cta-group buttons here.
// Non-CTA pages (loading / video / game / tutorial / menu) keep using the stored
// legacy maps untouched, and CLI builds without any blocks get empty maps back so
// the pure-legacy path is preserved.
//
// A button's `exit` is a page id (e.g. 'game', 'leaderboard'); it is resolved to a
// route downstream by routeForExit() in page-builder.js.

export const CTA_GROUP_PAGE_TYPES = new Set([
  'landing', 'result', 'leaderboard', 'voucher', 'register', 'end',
]);

// Optional semantic exits per page type, matched in order. The first button is
// always the page's primary `next` exit; each remaining button is matched to one
// of these optional slots by its target page. Keys mirror ALL_PAGES exit keys in
// config.ts and the CAPE show-flags / TanStack template slots.
const OPTIONAL_EXITS = {
  landing: [
    { key: 'tutorial',    matchType: 'tutorial' },
    { key: 'leaderboard', matchType: 'leaderboard' },
  ],
  result: [
    { key: 'playAgain',   matchPlayAgain: true },
    { key: 'leaderboard', matchType: 'leaderboard' },
  ],
};

function buildCtx(pages, pageTypes) {
  const ids = (pages ?? [])
    .map((p) => (typeof p === 'string' ? p : p?.id))
    .filter(Boolean);
  const typeOf = (id) => (pageTypes && pageTypes[id]) || id;
  const firstOfType = (type) => ids.find((id) => typeOf(id) === type) ?? null;
  return { ids, typeOf, firstOfType, entryId: ids[0] ?? null };
}

/**
 * Map a single page's positional cta-group buttons onto the page's semantic
 * exits. Returns the legacy-map fragments for just this page.
 */
export function mapButtonsToExits(pageId, pageType, buttons, ctx) {
  const flowExits = {};
  const flowEnabledExits = {};
  const flowButtonVariants = {};
  const warnings = [];

  const list = Array.isArray(buttons) ? buttons.slice(0, 4) : [];
  if (list.length === 0) return { flowExits, flowEnabledExits, flowButtonVariants, warnings };

  const apply = (key, btn) => {
    const choiceKey = `${pageId}.${key}`;
    if (btn.exit) flowExits[choiceKey] = btn.exit;
    if (btn.variant) flowButtonVariants[choiceKey] = btn.variant;
    return choiceKey;
  };

  // 1. Primary button → the page's `next` exit (always present).
  apply('next', list[0]);

  // 2. Remaining buttons → optional semantic exits, inferred from their target.
  const rules = OPTIONAL_EXITS[pageType] ?? [];
  const usedKeys = new Set();
  for (let i = 1; i < list.length; i++) {
    const btn = list[i];
    const targetType = ctx.typeOf(btn.exit);
    const rule = rules.find((r) => {
      if (usedKeys.has(r.key)) return false;
      if (r.matchType) return targetType === r.matchType;
      if (r.matchPlayAgain) return btn.exit === ctx.firstOfType('game') || btn.exit === ctx.entryId;
      return false;
    });
    if (!rule) {
      warnings.push(
        `${pageId}: CTA button #${i + 1} (→ ${btn.exit || '?'}) has no semantic exit slot on the ` +
        `"${pageType}" page — its target route is wired but no CAPE show-flag controls its visibility.`,
      );
      continue;
    }
    usedKeys.add(rule.key);
    const choiceKey = apply(rule.key, btn);
    flowEnabledExits[choiceKey] = true; // presence = shown
  }

  return { flowExits, flowEnabledExits, flowButtonVariants, warnings };
}

/**
 * Derive the legacy flow maps from every CTA-bearing page's cta-group block.
 *
 * @param {Record<string, {blocks: Array<{name: string, settings: object}>}>} blocksConfig
 *        The block payload (pageBlocksToBlocksConfig shape), keyed by page id.
 * @param {Array<string|{id:string}>} pages  Ordered page ids in the flow.
 * @param {Record<string,string>} pageTypes  Map of page id → page type (for renamed instances).
 * @returns {{flowExits: object, flowEnabledExits: object, flowButtonVariants: object, warnings: string[]}}
 */
export function deriveFlowFromBlocks(blocksConfig, pages, pageTypes) {
  const flowExits = {};
  const flowEnabledExits = {};
  const flowButtonVariants = {};
  const warnings = [];
  // Page ids whose CTA exits are now owned by a cta-group block. Callers strip
  // any stale legacy keys for these pages before applying the derived maps, so
  // a removed button can't linger as an enabled exit.
  const governedPageIds = [];

  if (!blocksConfig || typeof blocksConfig !== 'object') {
    return { flowExits, flowEnabledExits, flowButtonVariants, warnings, governedPageIds };
  }

  const ctx = buildCtx(pages, pageTypes);

  for (const [pageId, pageConfig] of Object.entries(blocksConfig)) {
    const blocks = Array.isArray(pageConfig?.blocks) ? pageConfig.blocks : [];
    const cta = blocks.find((b) => b && b.name === 'cta-group');
    if (!cta) continue;
    const pageType = ctx.typeOf(pageId);
    if (!CTA_GROUP_PAGE_TYPES.has(pageType)) continue;

    governedPageIds.push(pageId);
    const out = mapButtonsToExits(pageId, pageType, cta.settings?.buttons, ctx);
    Object.assign(flowExits, out.flowExits);
    Object.assign(flowEnabledExits, out.flowEnabledExits);
    Object.assign(flowButtonVariants, out.flowButtonVariants);
    warnings.push(...out.warnings);
  }

  return { flowExits, flowEnabledExits, flowButtonVariants, warnings, governedPageIds };
}

// Canonical menu item ids — mirrors MENU_ITEMS in cli/wizard-ui/src/shared/config.ts
// and the ALL_ITEMS list in cli/cape-format-builder.js. The menu-item-list block's
// `items` enum uses these same ids.
export const MENU_ITEM_IDS = ['home', 'resume', 'howToPlay', 'leaderboard', 'voucher', 'terms', 'privacy', 'faq', 'leave'];

/**
 * Derive the menu visibility map (menuItemsEnabled) from the menu page's
 * `menu-item-list` block — the single source of truth for which menu items show.
 * A known item is enabled iff it's in the block's `items` array. Returns null when
 * there's no menu-item-list block (caller keeps the stored map / defaults), so the
 * route-gating in scaffold.js still applies on top.
 */
export function deriveMenuItemsEnabled(blocksConfig) {
  if (!blocksConfig || typeof blocksConfig !== 'object') return null;
  for (const pageConfig of Object.values(blocksConfig)) {
    const blocks = Array.isArray(pageConfig?.blocks) ? pageConfig.blocks : [];
    const menu = blocks.find((b) => b && b.name === 'menu-item-list');
    if (!menu) continue;
    const items = Array.isArray(menu.settings?.items) ? menu.settings.items : null;
    if (!items) return null;
    const out = {};
    for (const id of MENU_ITEM_IDS) out[id] = items.includes(id);
    return out;
  }
  return null;
}

/**
 * Merge derived CTA flow maps over a stored legacy map, making the block
 * authoritative for governed pages: every `{governedPageId}.*` key is dropped
 * from `stored` first, then `derived` is layered on. Non-governed keys (video /
 * loading / game / tutorial flow wiring) pass through untouched.
 */
export function mergeDerivedFlow(stored, derived, governedPageIds) {
  const governed = new Set(governedPageIds ?? []);
  const out = {};
  for (const [key, value] of Object.entries(stored ?? {})) {
    const pageId = key.slice(0, key.indexOf('.'));
    if (!governed.has(pageId)) out[key] = value;
  }
  return { ...out, ...(derived ?? {}) };
}
