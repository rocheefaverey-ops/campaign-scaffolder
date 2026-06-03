'use client';

import { useCapeData } from '@hooks/useCapeData';

type AnyRecord = Record<string, any>;

export function useCape(pageId: string): AnyRecord {
  const { capeData } = useCapeData();
  return resolvePageCape(capeData, pageId);
}

function resolvePageCape(capeData: unknown, pageId: string): AnyRecord {
  const root = asRecord(capeData);
  const copy = asRecord(asRecord(root.copy)[pageId]);
  const general = asRecord(asRecord(root.general)[pageId]);
  const files = asRecord(asRecord(root.files)[pageId]);
  const pageSettings = asRecord(asRecord(asRecord(root.settings).pages)[pageId]);
  const logo = firstAsset(general.logo)
    || firstAsset(asRecord(asRecord(root.general).header).logo)
    || firstAsset(asRecord(asRecord(root.settings).branding).logo);
  return {
    ...copy,
    ...general,
    ...files,
    ...pageSettings,
    logo,
    brandChip: { image: logo },
    background: backgroundSource(general.background ?? files.background ?? files.backgroundImage ?? files.heroImage),
  };
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
