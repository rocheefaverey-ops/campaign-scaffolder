/**
 * Shared module resolution — the wizard's mirror of cli/scaffold.js's
 * `autoModulesForPages` + `resolveModules`. Centralized here so the Modules
 * step and the Build summary can't drift.
 *
 * Engines (unity/r3f/phaser) are NOT treated as modules — they're baked into
 * the base-templates and shown in the Stack row of the build plan. `memory`
 * is a real module and stays in the catalog.
 */

import { ALL_PAGES } from './config.ts';
import type { ModuleInfo } from '../bridge.ts';

/**
 * Modules the scaffolder will auto-add for the given page selection,
 * regardless of user toggles. Returned as `Map<moduleId, sourcePageOrModule>`
 * so callers can show *why* a module was selected.
 *
 * Includes:
 *   - Page-required modules (ALL_PAGES[].requires)
 *   - Scoring smart-default (matches scaffold.js autoModulesForPages)
 *   - Implies chains (walked via catalog; attribution = the parent id)
 */
export function autoModulesForPages(pageTypes: string[], catalog: ModuleInfo[]): Map<string, string> {
  const auto = new Map<string, string>();

  for (const pt of pageTypes) {
    const meta = ALL_PAGES.find((p) => p.id === pt);
    if (meta?.requires) auto.set(meta.requires, pt);
  }

  // Smart default — any of game/result/register/leaderboard implies scoring.
  // Mirrors cli/scaffold.js autoModulesForPages. If scoring is already set by
  // a `requires`, the prior attribution wins.
  const scoringTrigger = pageTypes.find(
    (pt) => pt === 'game' || pt === 'result' || pt === 'register' || pt === 'leaderboard',
  );
  if (scoringTrigger && !auto.has('scoring')) auto.set('scoring', scoringTrigger);

  // Walk implies until fixed point. Attribution = the id that brought it in.
  let changed = true;
  while (changed) {
    changed = false;
    for (const module of catalog) {
      if (!auto.has(module.id)) continue;
      for (const implied of module.implies) {
        if (!auto.has(implied)) {
          auto.set(implied, module.id);
          changed = true;
        }
      }
    }
  }
  return auto;
}

/**
 * Full "what will be applied" set — auto-required + user extras, then implies.
 * Filtered to ids that exist in the catalog so the summary only lists real
 * modules.
 */
export function resolveAppliedModules(opts: {
  pageTypes: string[];
  extras:    string[];
  catalog:   ModuleInfo[];
}): string[] {
  const seed = new Set<string>([
    ...autoModulesForPages(opts.pageTypes, opts.catalog).keys(),
    ...opts.extras,
  ]);

  // Walk implies on the union (extras may bring in new chains).
  const byId = new Map(opts.catalog.map((m) => [m.id, m]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of seed) {
      const m = byId.get(id);
      if (!m) continue;
      for (const dep of m.implies) {
        if (!seed.has(dep)) { seed.add(dep); changed = true; }
      }
    }
  }

  return [...seed].filter((id) => byId.has(id)).sort();
}
