import {
  DEFAULT_CONFIG, defaultPageSettings, defaultEnabledExits, defaultFlowButtonVariants,
  defaultMenuItemsEnabled, defaultMenuButtonVariants, defaultRouteForType,
  defaultPagesForStack, defaultFlowRulesForPages, defaultPageBlocksForPages,
  type ScaffoldConfig, type PageInstance, type Stack, type Engine, type Market, type RegMode, type PageSettings,
  type ButtonVariant, type PageBlocksMap,
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

  // ── Strings & primitives — fall back to DEFAULT_CONFIG when missing.
  const stack             = pickString(raw, 'stack')             as Stack   ?? DEFAULT_CONFIG.stack;
  const game              = pickString(raw, 'game')              as Engine  ?? DEFAULT_CONFIG.game;

  // ── Pages: legacy shape was string[]; current is string[] of ids + a
  // separate pageTypes map. Reconstruct PageInstance[].
  const pageIds: string[] = Array.isArray(raw.pages)
    ? (raw.pages as unknown[]).filter((p): p is string => typeof p === 'string')
    : [];
  const pageTypes: Record<string, string> = (raw.pageTypes && typeof raw.pageTypes === 'object')
    ? raw.pageTypes as Record<string, string>
    : {};
  const pages: PageInstance[] = pageIds.length > 0
    ? pageIds.map((id) => {
        const type = pageTypes[id] ?? id;
        const stackDefault = defaultPagesForStack(stack).find((page) => page.id === id || page.type === type);
        return { id, type, route: stackDefault?.route ?? defaultRouteForType(type) };
      })
    : defaultPagesForStack(stack);

  const selectedGame = (raw.selectedGame && typeof raw.selectedGame === 'object')
    ? raw.selectedGame as Record<string, unknown>
    : {};
  const gameId            = pickString(wizard, 'gameId') ?? pickString(selectedGame, 'id');
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
  const rawPageSettings = wizard.pageSettings ?? raw.pageSettings;
  const pageSettings: PageSettings = (rawPageSettings && typeof rawPageSettings === 'object')
    ? rawPageSettings as PageSettings
    : defaultPageSettings();
  const rawPageBlocks = wizard.pageBlocks ?? raw.pageBlocks;
  const pageBlocks: PageBlocksMap = normalizeCtaGroupBlocks(
    (rawPageBlocks && typeof rawPageBlocks === 'object')
      ? { ...defaultPageBlocksForPages(pages), ...rawPageBlocks as PageBlocksMap }
      : defaultPageBlocksForPages(pages),
  );
  const flowEnabledExits: Record<string, boolean> = (wizard.flowEnabledExits && typeof wizard.flowEnabledExits === 'object')
    ? wizard.flowEnabledExits as Record<string, boolean>
    : defaultEnabledExits();
  const flowButtonVariants: Record<string, ButtonVariant> = (wizard.flowButtonVariants && typeof wizard.flowButtonVariants === 'object')
    ? { ...defaultFlowButtonVariants(), ...wizard.flowButtonVariants as Record<string, ButtonVariant> }
    : defaultFlowButtonVariants();
  const rawFlowRules = (wizard.flowRules && typeof wizard.flowRules === 'object')
    ? wizard.flowRules
    : (raw.flowRules && typeof raw.flowRules === 'object' ? raw.flowRules : undefined);
  const flowRules = rawFlowRules
    ? { ...defaultFlowRulesForPages(pages), ...rawFlowRules as ScaffoldConfig['flowRules'] }
    : defaultFlowRulesForPages(pages);
  const menuItemsEnabled: Record<string, boolean> = (wizard.menuItemsEnabled && typeof wizard.menuItemsEnabled === 'object')
    ? wizard.menuItemsEnabled as Record<string, boolean>
    : defaultMenuItemsEnabled();
  const menuButtonVariants: Record<string, ButtonVariant> = (wizard.menuButtonVariants && typeof wizard.menuButtonVariants === 'object')
    ? { ...defaultMenuButtonVariants(), ...wizard.menuButtonVariants as Record<string, ButtonVariant> }
    : defaultMenuButtonVariants();

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
    gameId,
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
    pageBlocks,
    flowExits,
    flowEntry,
    flowEnabledExits,
    flowButtonVariants,
    flowRules,
    menuItemsEnabled,
    menuButtonVariants,
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

/**
 * Migrate cta-group block settings loaded from an older project: the `count`
 * field is gone (length is derived from `buttons`), and a stored config might
 * predate `buttons` entirely. Strip stray `count` and ensure a 1-item default.
 */
function normalizeCtaGroupBlocks(pageBlocks: PageBlocksMap): PageBlocksMap {
  for (const pageConfig of Object.values(pageBlocks)) {
    const cta = pageConfig?.blocks?.['cta-group'];
    if (!cta) continue;
    const settings = { ...(cta.settings ?? {}) } as Record<string, unknown>;
    delete settings.count;
    if (!Array.isArray(settings.buttons) || settings.buttons.length === 0) {
      settings.buttons = [{ variant: 'primary', exit: '' }];
    }
    cta.settings = settings as typeof cta.settings;
  }
  return pageBlocks;
}
