import {
  GAME_ENGINES,
  RESERVED_NAMES,
  VALID_MARKETS,
  basePageType,
} from './page-config.js';
import { moduleSelectionPolicy } from './module-registry.js';

export function validateArgs(args) {
  if (args.name) {
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(args.name)) {
      throw new Error(`Invalid project name "${args.name}". Use lowercase letters, numbers, and hyphens only (e.g. hema-handdoek-2025).`);
    }
    if (RESERVED_NAMES.has(args.name)) {
      throw new Error(`"${args.name}" is a reserved name. Choose a project-specific slug (e.g. hema-handdoek-2025).`);
    }
  }
  if (args.capeId && !/^\d+$/.test(args.capeId)) {
    throw new Error(`Invalid CAPE ID "${args.capeId}". CAPE IDs are numeric strings (e.g. 54031).`);
  }
  if (args.market && !VALID_MARKETS.has(args.market.toUpperCase())) {
    throw new Error(`Unknown market "${args.market}". Valid markets: ${[...VALID_MARKETS].join(', ')}.`);
  }
}

export function validateConfig({ game = 'none', pages = [], pageTypes = {}, modules = [] }) {
  const errors = [];
  const warnings = [];
  const engine = game || 'none';
  const pageIds = (pages ?? []).map((p) => typeof p === 'string' ? p : p?.id).filter(Boolean);
  const typeOf = (id) => pageTypes[id] ?? basePageType(id);

  let hasGamePage = false;
  for (const pageId of pageIds) {
    let pageType;
    try {
      pageType = typeOf(pageId);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      continue;
    }
    if (pageType === 'game') hasGamePage = true;
  }

  if (engine === 'none' && hasGamePage) {
    errors.push('`game` page requires an engine. Add --engine=unity|r3f|phaser or remove the `game` page.');
  }
  if (engine !== 'none' && !hasGamePage) {
    warnings.push(`Engine "${engine}" selected but no \`game\` page is in the flow. The runtime won't render.`);
  }

  const policy = moduleSelectionPolicy(pageIds, engine);
  const allowedExtras = new Set([...policy.required, ...policy.selectable]);
  for (const moduleId of modules ?? []) {
    if (GAME_ENGINES.includes(moduleId)) continue;
    if (allowedExtras.has(moduleId)) continue;
    warnings.push(`Ignoring module "${moduleId}" because no selected page supports it.`);
  }

  return { errors, warnings };
}
