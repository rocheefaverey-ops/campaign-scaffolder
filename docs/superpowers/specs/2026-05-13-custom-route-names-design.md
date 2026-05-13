# Custom Route Names per Page Instance

**Date:** 2026-05-13  
**Status:** Approved

## Problem

All page routes are currently derived from a hardcoded `PAGE_ROUTES` map (e.g. `gameplay → /gameplay`). Developers cannot customise URL slugs per instance at scaffold time, so campaigns are stuck with generic paths that may not match brand or content requirements.

## Goal

At scaffold time, for each page instance, the developer can specify a custom URL slug (e.g. `/home`, `/play`). The scaffold uses that slug as both the generated folder name and the CAPE settings key (via `useInstanceId` reading the URL segment).

## Data Model

`PageInstance` in `cli/wizard-ui/src/shared/config.ts` gains one field:

```ts
interface PageInstance {
  id:    string  // wizard/config key — unchanged
  type:  string  // determines which files to copy — unchanged
  route: string  // new — URL slug, e.g. "/home", "/play"
}
```

Default value at construction: `PAGE_ROUTES[type] ?? `/${id}``.

`ScaffoldConfig` is unchanged — route data lives on each instance.

Token names (`{{NEXT_AFTER_LANDING}}`, `{{FLOW_ENTRY}}`, etc.) are keyed by instance `id` and do not change. Only the *values* they resolve to change — they now use `instance.route`.

## Wizard Flow

After each page instance is confirmed, an inline prompt appears immediately:

```
? Route for "landing" page: /landing
```

Pre-filled with the default. Developer presses Enter to accept or types a custom slug.

**Validation:**
- Auto-prepend `/` if omitted (`play` → `/play`)
- Pattern: `/[a-z0-9-]+/` (lowercase alphanumeric + hyphens only)
- No duplicates across instances in the same session — rejected with an error message

**Module-injected pages** (leaderboard, registration, voucher, etc.) are also page instances and receive the same inline route prompt after the module is selected, using the same default and validation rules.

## Scaffold Logic

**`routeFor()`** signature changes from `routeFor(pageId: string)` to `routeFor(instanceId: string, pages: PageInstance[])`. It resolves via `pages.find(p => p.id === instanceId)?.route`. `PAGE_ROUTES` is no longer consulted at resolution time — it is only used as the default source when constructing new instances. All existing call sites in `scaffold.js` must be updated to pass the resolved `pages` array.

**Folder creation** uses `routeFor(id, pages)` — no structural change, resolved value may differ.

**Token values** (`{{NEXT_AFTER_<ID>}}`, `{{FLOW_ENTRY}}`, `{{AVAILABLE_CAMPAIGN_ROUTES}}`) all call `routeFor()` and pick up custom routes automatically.

Template files are not changed.

## Non-Interactive CLI

New repeatable `--route` flag:

```bash
node cli/scaffold.js \
  --name=hema-handdoek-2025 \
  --cape-id=54031 \
  --market=NL \
  --game=unity \
  --module=leaderboard \
  --route=landing:/home \
  --route=gameplay:/play \
  --yes
```

Format: `--route=<instanceId>:<slug>`. Missing entries fall back to the default. Same validation rules as the wizard.

## Out of Scope

- Runtime / CAPE-driven route overrides (post-scaffold)
- Renaming instance ids (id and route remain independent fields)
- Module manifest dest path overrides (manifests still use type-based paths)
