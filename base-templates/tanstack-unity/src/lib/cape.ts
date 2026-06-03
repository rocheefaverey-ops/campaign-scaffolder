// Per-page CAPE bundle for block-driven routes.
// Loaders pass the block manifest bindings they need, and this helper resolves
// those bindings across both block-shaped CAPE data and the older copy/general/files shape.

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { fetchCapeData } from '~/server/cape/CapeMiddleware.ts';
import { CapeProperty } from '~/server/cape/CapeProperty.ts';

type AnyRecord = Record<string, unknown>;
type CapeJson = string | number | boolean | null | Array<CapeJson> | { [key: string]: CapeJson };

export type CapeBinding = {
  key: string;
  path: string;
  type: string;
};

export type PageCape = Record<string, CapeJson>;

const capeBindingSchema = z.object({
  key: z.string(),
  path: z.string(),
  type: z.string(),
});

const pageCapeSchema = z.object({
  pageId: z.string(),
  language: z.string(),
  bindings: z.array(capeBindingSchema).optional(),
});

const CAPE_PATHS: Record<string, Array<string>> = {
  title: ['{pageType}', 'title'],
  subtitle: ['{pageType}', 'subtitle'],
  kicker: ['{pageType}', 'kicker'],
  description: ['{pageType}', 'description'],
  body: ['{pageType}', 'body'],
  subline: ['{pageType}', 'subline'],
  ctaLabel: ['{pageType}', 'ctaLabel'],
  nextLabel: ['{pageType}', 'buttonNext'],
  loadingLabel: ['{pageType}', 'loading'],
  scoreLabel: ['{pageType}', 'scoreLabel'],
  emptyState: ['{pageType}', 'emptyState'],
  pauseTitle: ['{pageType}', 'pauseTitle'],
  sponsorText: ['{pageType}', 'sponsorText'],
  statusLabel: ['{pageType}', 'statusLabel'],
  preGateTitle: ['{pageType}', 'preGateTitle'],
  preGateConfirm: ['{pageType}', 'preGateConfirm'],
  skipLabel: ['{pageType}', 'skipLabel'],
  fallbackLabel: ['{pageType}', 'fallbackLabel'],
  topNLabel: ['{pageType}', 'topNLabel'],
  youLabel: ['{pageType}', 'youLabel'],
  complianceLabel: ['{pageType}', 'complianceLabel'],
};

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
    const bindings = data.bindings?.length
      ? data.bindings
      : Object.entries(CAPE_PATHS).map(([key, path]) => ({
        key,
        path: path.map((seg) => (seg === '{pageType}' ? pageType : seg)).join('.'),
        type: 'i18n-string',
      }));

    for (const binding of bindings) {
      const value = readCapeBinding(context.capeData, data.language, binding, data.pageId, pageType);
      if (value !== undefined) out[binding.key] = value;
    }

    const logo = readCapeBinding(context.capeData, data.language, { key: 'logo', path: 'branding.logo', type: 'image' }, data.pageId, pageType);
    if (logo !== undefined && out.logo === undefined) out.logo = logo;
    if (out.logo !== undefined && out.brandChip === undefined) out.brandChip = { image: out.logo };
    return out;
  });

export async function loadPageCape(pageId: string, language: string, bindings: Array<CapeBinding> = []): Promise<PageCape> {
  return await loadPageCapeServer({ data: { pageId, language, bindings } }) as PageCape;
}

export function selectCape(loaderData: { cape?: PageCape } | undefined, key: string): unknown {
  return loaderData?.cape?.[key];
}

function readCapeBinding(root: unknown, language: string, binding: CapeBinding, pageId: string, pageType: string): CapeJson | undefined {
  const type = binding.type.toLowerCase();
  const candidates = bindingCandidates(binding.path, pageId, pageType);
  const raw = firstDefined(candidates.map((path) => readCapeValue(root, language, path, type)));
  if (raw === undefined) return undefined;
  if (type === 'image' && (binding.key === 'background' || binding.path.endsWith('.background'))) return backgroundSource(raw);
  if (type === 'image' || type === 'asset' || type === 'video') return firstAsset(raw) || new CapeProperty(raw).asString();
  if (type === 'array') return asCapeArray(raw, language);
  if (type === 'number') return new CapeProperty(raw).asNumber();
  if (type === 'boolean') return new CapeProperty(raw).asBoolean();
  return new CapeProperty(raw).asString();
}

function bindingCandidates(path: string, pageId: string, pageType: string): Array<Array<string>> {
  const parts = path.split('.').filter(Boolean);
  const leaf = parts[parts.length - 1] ?? '';
  const pageIdCamel = camelPageId(pageId);
  const pageTypeCamel = camelPageId(pageType);
  const roots = [parts];
  if (leaf === 'background') {
    roots.push(
      ['files', pageId, 'backgroundImage'],
      ['files', pageId, 'heroImage'],
      ['files', pageId, 'heroVideo'],
      ['files', pageIdCamel, 'backgroundImage'],
      ['files', pageIdCamel, 'heroImage'],
      ['files', pageIdCamel, 'heroVideo'],
      ['files', pageType, 'backgroundImage'],
      ['files', pageType, 'heroImage'],
      ['files', pageType, 'heroVideo'],
    );
  }
  roots.push(['copy', ...parts], ['general', ...parts], ['files', ...parts]);
  if (pageId !== pageType && leaf) {
    roots.push(['copy', pageId, leaf], ['general', pageId, leaf], ['files', pageId, leaf]);
  }
  if (pageIdCamel !== pageId && leaf) {
    roots.push(['copy', pageIdCamel, leaf], ['general', pageIdCamel, leaf], ['files', pageIdCamel, leaf]);
  }
  if (pageTypeCamel !== pageType && leaf) {
    roots.push(['copy', pageTypeCamel, leaf], ['general', pageTypeCamel, leaf], ['files', pageTypeCamel, leaf]);
  }
  if (leaf === 'title') {
    roots.push(['copy', pageId, 'headline'], ['copy', pageType, 'headline'], ['copy', pageIdCamel, 'headline'], ['copy', pageTypeCamel, 'headline']);
  }
  if (leaf === 'subtitle') {
    roots.push(['copy', pageId, 'subline'], ['copy', pageType, 'subline'], ['copy', pageIdCamel, 'subline'], ['copy', pageTypeCamel, 'subline']);
  }
  if (leaf === 'fallbackLabel' || leaf === 'loadingLabel') {
    roots.push(['copy', pageId, 'loadingText'], ['copy', pageType, 'loadingText'], ['copy', pageIdCamel, 'loadingText'], ['copy', pageTypeCamel, 'loadingText']);
  }
  if (leaf === 'cta') {
    roots.push(
      ['copy', pageId, 'cta'],
      ['copy', pageId, 'buttonStart'],
      ['copy', pageId, 'buttonSignUp'],
      ['copy', pageId, 'buttonPlayAgain'],
      ['copy', pageId, 'buttonReady'],
      ['copy', pageId, 'buttonNext'],
      ['copy', pageId, 'ctaContinue'],
      ['copy', pageId, 'ctaNext'],
      ['copy', pageId, 'ctaPlayAgain'],
      ['copy', pageId, 'ctaRegister'],
      ['copy', pageIdCamel, 'cta'],
      ['copy', pageType, 'cta'],
    );
  }
  if (leaf === 'background') {
    roots.push(
      ['general', pageId, 'background'],
      ['general', pageIdCamel, 'background'],
      ['general', pageType, 'background'],
      ['desktop', 'background'],
      ['desktop', 'backgroundIllustration'],
      ['files', 'desktop', 'backgroundImage'],
      ['general', 'desktop', 'background'],
    );
  }
  if (leaf === 'logo' || path === 'branding.logo') {
    roots.push(['general', 'header', 'logo'], ['general', 'branding', 'logo'], ['settings', 'branding', 'logo'], ['branding', 'logo']);
  }
  if (leaf === 'video') {
    roots.push(['files', pageId, 'loadingVideo'], ['files', pageId, 'introVideo'], ['general', pageId, 'introVideo'], ['files', pageIdCamel, 'loadingVideo'], ['general', pageIdCamel, 'introVideo'], ['files', 'video', 'loadingVideo']);
  }
  if (leaf) roots.push(['settings', 'pages', pageId, leaf]);
  return roots;
}

function camelPageId(value: string): string {
  return value.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

function readCapeValue(root: unknown, language: string, path: Array<string>, type: string): unknown {
  if (type === 'i18n-string' || type === 'markdown' || type === 'array') {
    const translated = getNestedTranslation(root, language, path);
    if (translated !== undefined) return translated;
  }
  return getNested(root, path);
}

function getNested(root: unknown, path: Array<string>): unknown {
  let current: unknown = root;
  for (const segment of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as AnyRecord)[segment];
  }
  return current;
}

function getNestedTranslation(root: unknown, language: string, path: Array<string>): unknown {
  const current = getNested(root, path);
  if (!current || typeof current !== 'object') return undefined;
  const fallbackLanguage = process.env.CAPE_CAMPAIGN_LANGUAGE || 'EN';
  const obj = current as AnyRecord;
  const pick = (lang: string): unknown => {
    const langObj = obj[lang];
    if (langObj && typeof langObj === 'object' && 'value' in (langObj as object)) {
      const value = (langObj as AnyRecord).value;
      if (value !== undefined && value !== null && value !== '') return value;
    }
    if (typeof langObj === 'string') return langObj;
    return undefined;
  };
  return pick(language) ?? pick(fallbackLanguage);
}

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {};
}

function firstAsset(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return firstAsset(value[0]);
  const record = asRecord(value);
  return typeof record.url === 'string' ? record.url : typeof record.src === 'string' ? record.src : '';
}

function backgroundSource(value: unknown): CapeJson | undefined {
  const url = firstAsset(value);
  if (url) return /\.(mp4|webm|mov)(\?.*)?$/i.test(url) ? { kind: 'video', url } : { kind: 'image', url };
  if (typeof value === 'string' && value.startsWith('#')) return { kind: 'solid', color: value };
  const record = asRecord(value);
  if (typeof record.color === 'string') return { kind: 'solid', color: record.color };
  if (typeof record.gradient === 'string') return { kind: 'gradient', gradient: record.gradient };
  return undefined;
}

function asCapeArray(value: unknown, language: string): Array<CapeJson> {
  if (!Array.isArray(value)) return value === undefined || value === null || value === '' ? [] : [toCapeJson(value)];
  return value.map((item) => {
    if (typeof item === 'string') return item;
    const translated = getNestedTranslation({ item }, language, ['item']);
    if (translated !== undefined) return toCapeJson(translated);
    return toCapeJson(item);
  });
}

function firstDefined(values: Array<unknown>): unknown {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function toCapeJson(value: unknown): CapeJson {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => toCapeJson(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as AnyRecord).map(([key, item]) => [key, toCapeJson(item)]));
  }
  return '';
}
