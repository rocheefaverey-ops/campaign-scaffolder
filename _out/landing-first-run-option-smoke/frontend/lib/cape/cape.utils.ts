import type { ICapeData, ICapeFile, ICapeObject, ICapeValue } from './cape.types';

/**
 * Resolve a dot-notation path within an ICapeData object.
 * e.g. getCapeValue(data, 'copy.onboarding.title')
 */
function getCapeValue(data: ICapeData, path: string): ICapeValue | undefined {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as object)) {
      return (acc as ICapeObject)[key];
    }
    return undefined;
  }, data) as ICapeValue | undefined;
}

/**
 * Return a localised string from CAPE copy.
 * Falls back to defaultValue if the path is missing or not a string.
 *
 * CAPE multilingual structure:
 *   { "title": { "value": "Hello" } }          — single language
 *   { "title": { "NL": "Hallo", "EN": "Hello" } } — multilingual
 */
export function getCapeText(
  data: ICapeData | null,
  path: string,
  defaultValue = '',
  language?: string,
): string {
  if (!data) return defaultValue;
  const raw = getCapeValue(data, path);

  if (!raw || typeof raw !== 'object') return defaultValue;

  const lang = language ?? process.env.NEXT_PUBLIC_CAPE_LANGUAGE ?? 'EN';

  // Multilingual: { EN: '...', NL: '...' }
  if (lang in (raw as object)) {
    return String((raw as Record<string, unknown>)[lang] ?? defaultValue);
  }

  // Single-language: { value: '...' }
  if ('value' in (raw as object)) {
    return String((raw as { value: unknown }).value ?? defaultValue);
  }

  return defaultValue;
}

/**
 * Return the first file URL at the given CAPE path.
 */
export function getCapeImage(
  data: ICapeData | null,
  path: string,
  defaultValue = '',
): string {
  if (!data) return defaultValue;
  const raw = getCapeValue(data, path);
  if (Array.isArray(raw) && raw.length > 0) {
    return (raw[0] as ICapeFile).url ?? defaultValue;
  }
  if (raw && typeof raw === 'object' && 'url' in (raw as object)) {
    return (raw as ICapeFile).url ?? defaultValue;
  }
  return defaultValue;
}

export function getCapeBoolean(
  data: ICapeData | null,
  path: string,
  defaultValue = false,
): boolean {
  if (!data) return defaultValue;
  const raw = getCapeValue(data, path);
  if (typeof raw === 'boolean') return raw;
  if (raw && typeof raw === 'object' && 'value' in (raw as object)) {
    return Boolean((raw as { value: unknown }).value);
  }
  return defaultValue;
}

export function getCapeNumber(
  data: ICapeData | null,
  path: string,
  defaultValue = 0,
): number {
  if (!data) return defaultValue;
  const raw = getCapeValue(data, path);
  const n = Number(
    typeof raw === 'object' && raw && 'value' in (raw as object)
      ? (raw as { value: unknown }).value
      : raw,
  );
  return isNaN(n) ? defaultValue : n;
}

/**
 * Return all font file URLs from settings.branding.fontBrand (or other font keys).
 */
export function getCapeFont(
  data: ICapeData | null,
  key: keyof NonNullable<ICapeData['settings']>['branding'] = 'fontBrand',
): ICapeFile[] {
  const branding = data?.settings?.branding as Record<string, unknown> | undefined;
  const files = branding?.[key as string];
  if (Array.isArray(files)) return files as ICapeFile[];
  return [];
}
