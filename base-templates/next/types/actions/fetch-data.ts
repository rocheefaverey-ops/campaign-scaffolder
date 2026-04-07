/**
 * Base return type for every server action.
 * All actions return this shape — never throw, never return raw data directly.
 */
export type FetchDataResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };
