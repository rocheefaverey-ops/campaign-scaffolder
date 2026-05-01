/**
 * Utility functions for reading values from CAPE campaign data.
 * All functions accept a dot-notation path (e.g. 'general.meta.siteTitle').
 */

// ─── Image ────────────────────────────────────────────────────────────────────

/**
 * Returns the URL of the first item in a CAPE image array field.
 * Returns '' if not found.
 */
export function getCapeImage(
  capeData: Record<string, unknown> | null,
  path: string,
): string {
  const value = resolvePath(capeData, path);
  if (Array.isArray(value) && value.length > 0) {
    const url = (value[0] as Record<string, unknown>)?.url;
    if (typeof url === 'string') return url;
  }
  if (typeof value === 'string') return value;
  return '';
}

// ─── Text ─────────────────────────────────────────────────────────────────────

/**
 * Returns a text value from CAPE data.
 * Handles plain strings, { value: string } wrappers,
 * and textMultiLanguage objects like { EN: "…", NL: "…" }.
 */
export function getCapeText(
  capeData: Record<string, unknown> | null,
  path: string,
  defaultValue = '',
): string {
  const value = resolvePath(capeData, path);
  return resolveText(value) || defaultValue;
}

// ─── Boolean ─────────────────────────────────────────────────────────────────

export function getCapeBoolean(
  capeData: Record<string, unknown> | null,
  path: string,
  defaultValue = true,
): boolean {
  const value = resolvePath(capeData, path);
  if (typeof value === 'boolean') return value;
  if (value === 'true'  || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return defaultValue;
}

// ─── Number ──────────────────────────────────────────────────────────────────

export function getCapeNumber(
  capeData: Record<string, unknown> | null,
  path: string,
  defaultValue = 0,
): number {
  const value = resolvePath(capeData, path);
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// ─── Header config ────────────────────────────────────────────────────────────

export type HeaderVariant = 'default' | 'transparent';

export interface HeaderConfig {
  enabled: boolean;
  variant: HeaderVariant;
  showLogo: boolean;
  showMenuButton: boolean;
}

/** Returns per-page header config from CAPE, falling back to global defaults. */
export function getHeaderConfig(
  capeData: Record<string, unknown> | null,
  pageName?: string,
): HeaderConfig {
  if (!capeData) return { enabled: false, variant: 'transparent', showLogo: true, showMenuButton: true };

  const globalHeader =
    (capeData.header as Record<string, unknown> | undefined) ??
    ((capeData.settings as Record<string, unknown>)?.header as Record<string, unknown> | undefined) ??
    ((capeData.pageSetup as Record<string, unknown>)?.header as Record<string, unknown> | undefined);

  const globalEnabled    = globalHeader ? globalHeader.enabled  !== false : true;
  const globalVariant    = (globalHeader?.variant as HeaderVariant) ?? 'transparent';
  const globalShowLogo   = globalHeader ? globalHeader.showLogo !== false : true;
  const globalShowMenu   = globalHeader ? globalHeader.showMenuButton !== false : true;

  if (pageName) {
    const pageHeader = ((capeData.pageSetup as Record<string, unknown>)?.[pageName] as Record<string, unknown>)?.header as Record<string, unknown> | undefined;
    if (pageHeader && Object.keys(pageHeader).length > 0) {
      return {
        enabled:        'enabled'        in pageHeader ? pageHeader.enabled        !== false : globalEnabled,
        variant:        (pageHeader.variant as HeaderVariant) ?? globalVariant,
        showLogo:       'showLogo'       in pageHeader ? pageHeader.showLogo       !== false : globalShowLogo,
        showMenuButton: 'showMenuButton' in pageHeader ? pageHeader.showMenuButton !== false : globalShowMenu,
      };
    }
  }

  return { enabled: globalEnabled, variant: globalVariant, showLogo: globalShowLogo, showMenuButton: globalShowMenu };
}

// ─── Internals ────────────────────────────────────────────────────────────────

function resolvePath(obj: Record<string, unknown> | null, path: string): unknown {
  if (!obj) return undefined;
  let current: unknown = obj;
  for (const part of path.split('.')) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else return undefined;
  }
  return current;
}

function resolveText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;

    // textMultiLanguage object — try active language, then EN
    const lang = getActiveLang();
    for (const key of [lang, 'EN']) {
      const v = obj[key];
      if (typeof v === 'string' && v) return v;
      if (typeof v === 'object' && v !== null && 'value' in (v as Record<string, unknown>)) {
        const inner = (v as Record<string, unknown>).value;
        if (typeof inner === 'string' && inner) return inner;
      }
    }

    // { value: "text" } wrapper
    if ('value' in obj && typeof obj.value === 'string') return obj.value;
  }
  return '';
}

function getActiveLang(): string {
  if (typeof window === 'undefined') return (process.env.NEXT_PUBLIC_CAPE_LANGUAGE ?? 'NL').toUpperCase();
  try {
    const raw = localStorage.getItem('lw-language');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { currentLanguage?: string } };
      if (parsed.state?.currentLanguage) return parsed.state.currentLanguage.toUpperCase();
    }
  } catch { /* ignore */ }
  return (process.env.NEXT_PUBLIC_CAPE_LANGUAGE ?? 'NL').toUpperCase();
}
