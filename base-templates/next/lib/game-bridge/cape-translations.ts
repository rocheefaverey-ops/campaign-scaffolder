import type { ICapeData, ICapeObject, ICapeValue } from '@lib/cape/cape.types';
import type { IUnityTranslations } from './game-bridge.types';

/**
 * Flatten CAPE copy into a flat key-value map for Unity's SetData payload.
 *
 * CAPE structure:
 *   copy.game.play.title = { EN: { value: "Score!" }, NL: { value: "Scoor!" } }
 *
 * Becomes (for language = 'EN'):
 *   { "gamePlayTitle": "Score!" }
 *
 * Only keys under `copy.game` are included — adjust the `rootKey` param per campaign.
 */
export function buildUnityTranslations(
  capeData: ICapeData | null,
  language: string,
  rootKey = 'game',
): IUnityTranslations {
  if (!capeData?.copy) return {};

  const root = (capeData.copy as ICapeObject)[rootKey];
  if (!root || typeof root !== 'object') return {};

  const result: IUnityTranslations = {};
  flattenNode(root as ICapeObject, rootKey, language, result);
  return result;
}

function flattenNode(
  node: ICapeObject,
  prefix: string,
  language: string,
  result: IUnityTranslations,
): void {
  for (const [key, value] of Object.entries(node)) {
    const camelKey = toCamelCase(`${prefix}_${key}`);

    if (isLeafValue(value, language)) {
      result[camelKey] = resolveLeaf(value, language);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenNode(value as ICapeObject, `${prefix}_${key}`, language, result);
    }
  }
}

/**
 * A node is a leaf if it has a `value` key or a language key directly.
 */
function isLeafValue(value: ICapeValue, language: string): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return 'value' in obj || language in obj || 'EN' in obj;
}

function resolveLeaf(value: ICapeValue, language: string): string {
  const obj = value as Record<string, unknown>;

  // Multilingual: { EN: { value: '...' }, NL: { value: '...' } }
  if (language in obj) {
    const lang = obj[language] as Record<string, unknown>;
    return String(lang?.value ?? lang ?? '');
  }

  // Fallback to EN
  if ('EN' in obj) {
    const en = obj['EN'] as Record<string, unknown>;
    return String(en?.value ?? en ?? '');
  }

  // Single language: { value: '...' }
  if ('value' in obj) {
    return String(obj.value ?? '');
  }

  return '';
}

/**
 * "game_play_title" → "gamePlayTitle"
 */
function toCamelCase(str: string): string {
  return str
    .split('_')
    .map((part, i) =>
      i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join('');
}
