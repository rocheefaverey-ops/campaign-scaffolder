import { blockLibraryPageType, type BlockSetting } from './config.ts';

export interface BlockSettingDef {
  kind?: string;
  default?: BlockSetting;
  min?: number;
  max?: number;
  unit?: string;
  options?: Array<{ value: string; label?: string }>;
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
