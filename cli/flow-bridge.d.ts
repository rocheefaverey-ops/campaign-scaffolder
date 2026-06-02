// Type declarations for the pure-ESM flow bridge so the TypeScript wizard UI can
// import it directly without duplicating the logic. Runtime lives in flow-bridge.js.

export const CTA_GROUP_PAGE_TYPES: Set<string>;

export interface DerivedFlow {
  flowExits: Record<string, string>;
  flowEnabledExits: Record<string, boolean>;
  flowButtonVariants: Record<string, string>;
  warnings: string[];
  governedPageIds?: string[];
}

export function mergeDerivedFlow<T>(
  stored: Record<string, T> | null | undefined,
  derived: Record<string, T> | null | undefined,
  governedPageIds: string[],
): Record<string, T>;

export interface FlowBridgeCtx {
  ids: string[];
  typeOf: (id: string) => string;
  firstOfType: (type: string) => string | null;
  entryId: string | null;
}

export function mapButtonsToExits(
  pageId: string,
  pageType: string,
  buttons: unknown,
  ctx: FlowBridgeCtx,
): DerivedFlow;

export const MENU_ITEM_IDS: string[];

export function deriveMenuItemsEnabled(
  blocksConfig: Record<string, { blocks?: Array<{ name: string; settings?: Record<string, unknown> }> }> | null | undefined,
): Record<string, boolean> | null;

export function deriveFlowFromBlocks(
  blocksConfig: Record<string, { blocks?: Array<{ name: string; settings?: Record<string, unknown> }> }> | null | undefined,
  pages: Array<string | { id: string }>,
  pageTypes: Record<string, string>,
): DerivedFlow;
