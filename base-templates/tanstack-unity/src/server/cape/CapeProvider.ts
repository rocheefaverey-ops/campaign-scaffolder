import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { ICapeData, ICapeObject } from '~/interfaces/cape/ICapeData.ts';
import { CapeProperty } from '~/server/cape/CapeProperty.ts';
import { fetchCapeData } from '~/server/cape/CapeMiddleware.ts';
import { capitalizeWord } from '~/utils/Helper.ts';

// Types
type CapeType = `${keyof ICapeData}`;
type CapeCopyMap = { [key: string]: string };
type PropertyInput = { type: CapeType; path: Array<string> };

// Zod Schemas
const capeReadSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('raw'), items: z.array(z.object({ type: z.string(), path: z.array(z.string()) })) }),
  z.object({ mode: z.literal('translation'), language: z.string(), items: z.array(z.object({ type: z.string(), path: z.array(z.string()) })) }),
  z.object({ mode: z.literal('copy'), language: z.string(), paths: z.array(z.array(z.string())) }),
  z.object({ mode: z.literal('map'), language: z.string(), baseKeys: z.array(z.string()) }),
]);

// Server logic
const readCapeInternal = createServerFn()
  .inputValidator(capeReadSchema)
  .middleware([fetchCapeData])
  .handler(({ data, context }) => {
    if (data.mode === 'map') {
      return buildCopyMap(context.capeData, data.language, data.baseKeys);
    }
    if (data.mode === 'copy') {
      return data.paths.map((path) => {
        const value = extractTranslation(context.capeData, data.language, ['copy', ...path]);
        return new CapeProperty(value).asString();
      });
    }
    if (data.mode === 'translation') {
      return data.items.map((item) => extractTranslation(context.capeData, data.language, [item.type, ...item.path]));
    }
    // raw
    return data.items.map((item) => getNestedProperty(context.capeData, [item.type, ...item.path]));
  });

/**
 * Get Cape copy map for Unity
 * @param language the cape language code
 * @param baseKeys the base keys to include in the map to include all copy keys starting with those segments)
 */
export async function getCapeCopyMapUnity(language: string, baseKeys: Array<string>): Promise<CapeCopyMap> {
  return await readCapeInternal({ data: { mode: 'map', language, baseKeys } }) as CapeCopyMap;
}

/**
 * Get Cape copy string(s) for a language
 * @param language the cape language code
 * @param input a single path (Array<string>) or array of paths (Array<Array<string>>)
 */
export async function getCapeCopy(language: string, input: Array<string>): Promise<string>;
export async function getCapeCopy(language: string, input: Array<Array<string>>): Promise<Array<string>>;
export async function getCapeCopy(language: string, input: Array<string> | Array<Array<string>>): Promise<string | Array<string>> {
  const isBatch = Array.isArray(input[0]);
  const paths: Array<Array<string>> = isBatch ? input as Array<Array<string>> : [input as Array<string>];
  const results = await readCapeInternal({ data: { mode: 'copy', language, paths } }) as Array<string>;
  return isBatch ? results : results[0];
}

/**
 * Get Cape property/properties translated to the given language
 * Returns CapeProperty wrapper(s) that help with type conversions
 * @param language the cape language code
 * @param input a single PropertyInput or array of PropertyInput
 */
export async function getCapeTranslatedProperty(language: string, input: PropertyInput): Promise<CapeProperty>;
export async function getCapeTranslatedProperty(language: string, input: Array<PropertyInput>): Promise<Array<CapeProperty>>;
export async function getCapeTranslatedProperty(language: string, input: PropertyInput | Array<PropertyInput>): Promise<CapeProperty | Array<CapeProperty>> {
  const isBatch = Array.isArray(input);
  const items: Array<PropertyInput> = isBatch ? input : [input];
  const results = await readCapeInternal({ data: { mode: 'translation', language, items } }) as Array<unknown>;
  const properties = results.map((r) => new CapeProperty(r));
  return isBatch ? properties : properties[0];
}

/**
 * Get raw Cape property/properties (no translation)
 * Returns CapeProperty wrapper(s) that help with type conversions
 * @param input a single PropertyInput or array of PropertyInput
 */
export async function getCapeProperty(input: PropertyInput): Promise<CapeProperty>;
export async function getCapeProperty(input: Array<PropertyInput>): Promise<Array<CapeProperty>>;
export async function getCapeProperty(input: PropertyInput | Array<PropertyInput>): Promise<CapeProperty | Array<CapeProperty>> {
  const isBatch = Array.isArray(input);
  const items: Array<PropertyInput> = isBatch ? input : [input];
  const results = await readCapeInternal({ data: { mode: 'raw', items } }) as Array<unknown>;
  const properties = results.map((r) => new CapeProperty(r));
  return isBatch ? properties : properties[0];
}

// Utilities
function buildCopyMap(capeData: ICapeData, language: string, baseKeys: Array<string>): CapeCopyMap {
  const copyBase = capeData.copy || {};
  const copyKeys = Object.keys(copyBase).filter((key) => baseKeys.some((baseKey) => key.startsWith(baseKey)));
  const keyPaths: Array<Array<string>> = [];

  const walkCopyNode = (obj: ICapeObject, key: string, currentPath: Array<string>) => {
    const nextPath = [...currentPath, key];
    const nextObj = obj[key];

    if (!nextObj || typeof nextObj !== 'object') {
      return;
    }

    if (nextObj.multilanguage) {
      keyPaths.push(nextPath);
    } else {
      for (const subKey of Object.keys(nextObj)) {
        walkCopyNode(nextObj, subKey, nextPath);
      }
    }
  };
  copyKeys.forEach((key) => walkCopyNode(copyBase, key, []));

  const output: CapeCopyMap = {};
  for (const path of keyPaths) {
    const key = convertPathToKey(path);
    const value = extractTranslation(copyBase, language, path);
    const property = new CapeProperty(value);
    output[key] = property.asString();
  }
  return output;
}

function getNestedProperty(root: ICapeObject | undefined, path: Array<string>) {
  if (!root) {
    return undefined;
  }

  let current = root;
  for (const segment of path) {
    if (current[segment] === undefined) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function extractTranslation(root: ICapeObject, language: string, currentPath: Array<string>) {
  const obj = getNestedProperty(root, currentPath);
  if (!obj) {
    return undefined;
  }

  // Extract the language
  const fallbackLanguage = process.env.CAPE_CAMPAIGN_LANGUAGE || 'EN';
  let translationPath: Array<string> = [];

  if (hasValidTranslation(obj, language)) {
    translationPath = [language, 'value'];
  } else if (hasValidTranslation(obj, fallbackLanguage)) {
    translationPath = [fallbackLanguage, 'value'];
  }
  return getNestedProperty(obj, translationPath);
}

function hasValidTranslation(obj: ICapeObject, lang: string): boolean {
  const langObj = obj[lang];
  return langObj && typeof langObj === 'object' && 'value' in langObj && langObj['value'];
}

function convertPathToKey(path: Array<string>): string {
  let output = path[0];
  for (let i = 1; i < path.length; i++) {
    output += capitalizeWord(path[i]);
  }
  return output;
}
