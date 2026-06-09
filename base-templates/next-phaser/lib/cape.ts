'use client';

import { useCapeData } from '@hooks/useCapeData';

type AnyRecord = Record<string, any>;

export function useCape(pageId: string): AnyRecord {
  const { capeData } = useCapeData();
  return resolvePageCape(capeData, pageId);
}

function resolvePageCape(capeData: unknown, pageId: string): AnyRecord {
  const root = asRecord(capeData);
  const copy = resolveCapeCopy(asRecord(asRecord(root.copy)[pageId]));
  const general = asRecord(asRecord(root.general)[pageId]);
  const files = asRecord(asRecord(root.files)[pageId]);
  const pageSettings = asRecord(asRecord(asRecord(root.settings).pages)[pageId]);
  const logo = firstAsset(general.logo)
    || firstAsset(asRecord(asRecord(root.general).header).logo)
    || firstAsset(asRecord(asRecord(root.settings).branding).logo);
  return applyFieldAliases({
    ...copy,
    ...general,
    ...files,
    ...pageSettings,
    logo,
    brandChip: { image: logo },
    background: backgroundSource(general.background ?? files.background ?? files.backgroundImage ?? files.heroImage),
  });
}

/**
 * Map CAPE field names onto the semantic names the generated page components
 * read. CAPE copy is authored as `headline` / `subline` / `cta`, but the block
 * components read `title` / `subtitle` / `ctaLabel`. The TanStack loader does
 * the same aliasing via its binding candidates — this keeps the Next data layer
 * in parity so `cape.title` is populated identically on both stacks.
 */
function applyFieldAliases(record: AnyRecord): AnyRecord {
  const aliases: Array<[string, string[]]> = [
    ['title', ['headline', 'title']],
    ['subtitle', ['subline', 'subtitle', 'description']],
    ['ctaLabel', ['cta', 'ctaLabel', 'buttonStart', 'buttonNext', 'ctaContinue', 'ctaNext']],
  ];
  for (const [target, sources] of aliases) {
    if (record[target] !== undefined && record[target] !== '') continue;
    for (const src of sources) {
      const v = record[src];
      if (typeof v === 'string' && v !== '') { record[target] = v; break; }
    }
  }
  return record;
}

function resolveCapeCopy(value: unknown): AnyRecord {
  const copy = asRecord(value);
  return Object.fromEntries(
    Object.entries(copy).map(([key, entry]) => [key, resolveCapeValue(entry)]),
  );
}

function resolveCapeValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(resolveCapeValue);

  const record = asRecord(value);
  if (!Object.keys(record).length) return value;

  const lang = process.env.NEXT_PUBLIC_CAPE_LANGUAGE ?? 'EN';
  if (lang in record) return resolveCapeValue(record[lang]);
  if ('value' in record) return resolveCapeValue(record.value);

  const firstLanguageKey = Object.keys(record).find((key) => key.length === 2 && key.toUpperCase() === key);
  if (firstLanguageKey && firstLanguageKey in record) return resolveCapeValue(record[firstLanguageKey]);

  if ('multilanguage' in record) {
    const fallback = Object.keys(record).find((key) => key !== 'multilanguage');
    if (fallback) return resolveCapeValue(record[fallback]);
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => [key, resolveCapeValue(entry)]),
  );
}

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {};
}

function firstAsset(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return firstAsset(value[0]);
  const record = asRecord(value);
  return record.url ?? record.src ?? '';
}

function backgroundSource(value: unknown): unknown {
  const url = firstAsset(value);
  if (url) return { kind: 'image', url };
  if (typeof value === 'string' && value.startsWith('#')) return { kind: 'solid', color: value };
  return undefined;
}
