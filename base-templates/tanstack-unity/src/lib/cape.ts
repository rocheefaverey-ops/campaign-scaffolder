// Per-page CAPE bundle for block-driven routes.
// A route's loader calls `loadPageCape(pageId, language)`, hands the result
// down via Route.useLoaderData(), and any block component reads it via `useCape(pageId)`.
//
// Keys are derived from the block's capeBindings map (see components/_blocks/*/manifest.json).
// Unknown keys return `undefined` — block components must tolerate that.

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { fetchCapeData } from '~/server/cape/CapeMiddleware.ts';
import { CapeProperty } from '~/server/cape/CapeProperty.ts';

export type PageCape = Record<string, unknown>;

const pageCapeSchema = z.object({
  pageId: z.string(),
  language: z.string(),
});

// Cape keys most block components consume. Extend this map as new blocks need
// keys — missing entries resolve to undefined at runtime, which block components
// must tolerate. Keep page-type-rooted entries in `{pageType}.X` form so the
// handler can substitute the resolved page type.
const CAPE_PATHS: Record<string, Array<string>> = {
  title:       ['{pageType}', 'title'],
  subtitle:    ['{pageType}', 'subtitle'],
  kicker:      ['{pageType}', 'kicker'],
  description: ['{pageType}', 'description'],
  body:        ['{pageType}', 'body'],
  subline:     ['{pageType}', 'subline'],
  ctaLabel:    ['{pageType}', 'ctaLabel'],
  nextLabel:   ['{pageType}', 'buttonNext'],
  loadingLabel:['{pageType}', 'loading'],
  scoreLabel:  ['{pageType}', 'scoreLabel'],
  emptyState:  ['{pageType}', 'emptyState'],
  pauseTitle:  ['{pageType}', 'pauseTitle'],
  sponsorText: ['{pageType}', 'sponsorText'],
  statusLabel: ['{pageType}', 'statusLabel'],
  preGateTitle:   ['{pageType}', 'preGateTitle'],
  preGateConfirm: ['{pageType}', 'preGateConfirm'],
  skipLabel:   ['{pageType}', 'skipLabel'],
  fallbackLabel: ['{pageType}', 'fallbackLabel'],
  topNLabel:   ['{pageType}', 'topNLabel'],
  youLabel:    ['{pageType}', 'youLabel'],
  complianceLabel: ['{pageType}', 'complianceLabel'],
};

// Page id → page type (renaming layer for instances like 'intro-video' → 'video').
// Mirrors the same logic in cli/page-builder.js:normaliseBlockType.
function pageTypeOf(pageId: string): string {
  if (pageId === 'intro-video' || pageId === 'loading-video' || pageId === 'ad-video') return 'video';
  if (pageId === 'tutorial') return 'onboarding';
  if (pageId === 'gameplay') return 'game';
  return pageId;
}

const loadPageCapeServer = createServerFn()
  .inputValidator(pageCapeSchema)
  .middleware([fetchCapeData])
  .handler(({ data, context }) => {
    const pageType = pageTypeOf(data.pageId);
    const out: PageCape = {};
    for (const [key, path] of Object.entries(CAPE_PATHS)) {
      const resolvedPath = path.map((seg) => (seg === '{pageType}' ? pageType : seg));
      const value = getNestedTranslation(context.capeData, data.language, ['copy', ...resolvedPath]);
      out[key] = new CapeProperty(value).asString();
    }
    return out;
  });

export async function loadPageCape(pageId: string, language: string): Promise<PageCape> {
  return await loadPageCapeServer({ data: { pageId, language } });
}

// Tiny client-side helper. Wraps loaderData so blocks can pull values by key.
export function selectCape(loaderData: { cape?: PageCape } | undefined, key: string): unknown {
  return loaderData?.cape?.[key];
}

// Internal: copy of extractTranslation in src/server/cape/CapeProvider.ts. Inlined
// to avoid widening that file's public surface. If you touch translation logic,
// update both.
function getNestedTranslation(root: unknown, language: string, path: Array<string>): unknown {
  let current: unknown = root;
  for (const segment of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  if (!current || typeof current !== 'object') return undefined;
  const fallbackLanguage = process.env.CAPE_CAMPAIGN_LANGUAGE || 'EN';
  const obj = current as Record<string, unknown>;
  const pick = (lang: string): unknown => {
    const langObj = obj[lang];
    if (langObj && typeof langObj === 'object' && 'value' in (langObj as object)) {
      const value = (langObj as Record<string, unknown>).value;
      if (value) return value;
    }
    return undefined;
  };
  return pick(language) ?? pick(fallbackLanguage);
}
