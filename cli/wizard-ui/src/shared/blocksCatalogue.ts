import { blockLibraryPageType, type BlockSetting } from './config.ts';

export interface BlockSettingDef {
  kind?: string;
  default?: BlockSetting;
  min?: number;
  max?: number;
  unit?: string;
  /** Allowed values for `enum` / `array-of-enum` settings (manifest shape). */
  of?: string[];
  options?: Array<{ value: string; label?: string }>;
  /** Per-field schema for `array-of-objects` settings (e.g. cta-group buttons). */
  item?: Record<string, BlockSettingDef>;
}

/** Resolve a setting def's choices from either `options` or the manifest `of`. */
export function settingOptions(def?: BlockSettingDef): Array<{ value: string; label: string }> {
  if (def?.options?.length) return def.options.map((o) => ({ value: o.value, label: o.label ?? prettyOption(o.value) }));
  if (def?.of?.length) return def.of.map((v) => ({ value: v, label: prettyOption(v) }));
  return [];
}

/** Human-friendly label for a raw enum value ("decorative-icon" → "Decorative icon"). */
export function prettyOption(value: string): string {
  // Keep short codes/symbols as-is: "sm", "md", "all", "18+", "nix18".
  if (value.length <= 3 || /\d/.test(value)) return value;
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

export interface BlockCatalogItem {
  name: string;
  displayName: string;
  description: string;
  usableOn: string[];
  settings: Record<string, BlockSettingDef>;
  capeBindings: Record<string, string>;
}

export function blocksForPage(catalogue: BlockCatalogItem[], pageType: string): BlockCatalogItem[] {
  const type = blockLibraryPageType(pageType);
  return catalogue
    .filter((block) => block.usableOn.includes(type))
    .sort((a, b) => blockLabel(a).localeCompare(blockLabel(b)));
}

export function blockLabel(block?: Pick<BlockCatalogItem, 'name' | 'displayName'>): string {
  return block?.displayName || titleCase(block?.name ?? '');
}

export function settingLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function settingDefault(def: BlockSettingDef | undefined): BlockSetting | undefined {
  return def && Object.prototype.hasOwnProperty.call(def, 'default') ? def.default : undefined;
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}
