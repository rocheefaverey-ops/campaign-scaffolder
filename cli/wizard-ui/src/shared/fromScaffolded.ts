import {
  DEFAULT_CONFIG, defaultPageSettings, defaultEnabledExits, defaultMenuItemsEnabled,
  type ScaffoldConfig, type PageInstance, type Stack, type Engine, type Market, type RegMode, type PageSettings,
} from './config.ts';

/**
 * Translate a `.scaffolded` JSON blob (as produced by cli/scaffold.js) into a
 * ScaffoldConfig the wizard can render. Old marker files won't have all the
 * wizard-only fields — every missing field falls back to DEFAULT_CONFIG so
 * the UI never crashes on a stale or partial marker.
 */
export function fromScaffolded(raw: Record<string, unknown>): ScaffoldConfig {
  const wizard = (raw.wizard && typeof raw.wizard === 'object')
    ? raw.wizard as Record<string, unknown>
    : {};

  // ── Pages: legacy shape was string[]; current is string[] of ids + a
  // separate pageTypes map. Reconstruct PageInstance[].
  const pageIds: string[] = Array.isArray(raw.pages)
    ? (raw.pages as unknown[]).filter((p): p is string => typeof p === 'string')
    : [];
  const pageTypes: Record<string, string> = (raw.pageTypes && typeof raw.pageTypes === 'object')
    ? raw.pageTypes as Record<string, string>
    : {};
  const pages: PageInstance[] = pageIds.length > 0
    ? pageIds.map((id) => ({ id, type: pageTypes[id] ?? id }))
    : DEFAULT_CONFIG.pages;

  // ── Strings & primitives — fall back to DEFAULT_CONFIG when missing.
  const stack             = pickString(raw, 'stack')             as Stack   ?? DEFAULT_CONFIG.stack;
  const game              = pickString(raw, 'game')              as Engine  ?? DEFAULT_CONFIG.game;
  const name              = pickString(raw, 'name')                          ?? DEFAULT_CONFIG.name;
  const market            = pickString(raw, 'market')            as Market  ?? DEFAULT_CONFIG.market;
  const capeId            = pickString(raw, 'capeId')                        ?? DEFAULT_CONFIG.capeId;
  const regMode           = pickString(raw, 'regMode')           as RegMode ?? DEFAULT_CONFIG.regMode;
  const gtmId             = pickString(raw, 'gtmId')                         ?? DEFAULT_CONFIG.gtmId;
  const iframe            = Boolean(raw.iframe ?? DEFAULT_CONFIG.iframe);
  const flowEntry         = pickString(raw, 'flowEntry') || undefined;

  const flowExits: Record<string, string> = (raw.flowExits && typeof raw.flowExits === 'object')
    ? raw.flowExits as Record<string, string>
    : {};

  // ── Wizard-only metadata block (newer .scaffolded files include this).
  const pageSettings: PageSettings = (wizard.pageSettings && typeof wizard.pageSettings === 'object')
    ? wizard.pageSettings as PageSettings
    : defaultPageSettings();
  const flowEnabledExits: Record<string, boolean> = (wizard.flowEnabledExits && typeof wizard.flowEnabledExits === 'object')
    ? wizard.flowEnabledExits as Record<string, boolean>
    : defaultEnabledExits();
  const menuItemsEnabled: Record<string, boolean> = (wizard.menuItemsEnabled && typeof wizard.menuItemsEnabled === 'object')
    ? wizard.menuItemsEnabled as Record<string, boolean>
    : defaultMenuItemsEnabled();

  const defaultLanguage    = pickString(wizard, 'defaultLanguage') ?? DEFAULT_CONFIG.defaultLanguage;
  const supportedLanguages = Array.isArray(wizard.supportedLanguages)
    ? (wizard.supportedLanguages as unknown[]).filter((s): s is string => typeof s === 'string')
    : DEFAULT_CONFIG.supportedLanguages;
  const timezone           = pickString(wizard, 'timezone')   ?? DEFAULT_CONFIG.timezone;
  const brand              = pickString(wizard, 'brand')      ?? DEFAULT_CONFIG.brand;
  const department         = pickString(wizard, 'department') ?? DEFAULT_CONFIG.department;
  const capeTitle          = pickString(wizard, 'capeTitle')  ?? '';
  const createCape         = Boolean(wizard.createCape ?? false); // default OFF on load — we already have a capeId

  const modules: string[] = Array.isArray(raw.modules)
    ? (raw.modules as unknown[]).filter((m): m is string => typeof m === 'string')
    : DEFAULT_CONFIG.modules;

  return {
    stack,
    game,
    name,
    createCape,
    capeTitle,
    capeId,
    market,
    defaultLanguage,
    supportedLanguages,
    timezone,
    brand,
    department,
    pages,
    regMode,
    modules,
    gtmId,
    iframe,
    pageSettings,
    flowExits,
    flowEntry,
    flowEnabledExits,
    menuItemsEnabled,
    // fromScaffolded() is only called from the "Open existing" flow.
    // Default the picker to in-place update; the user can switch to
    // recreate/fresh on the Build step.
    buildMode: 'update',
  };
}

function pickString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === 'string' ? v : undefined;
}
