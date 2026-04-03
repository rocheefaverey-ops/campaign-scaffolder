/**
 * Canonical event name constants — use these everywhere.
 * Unity dispatches these into window.unityEventMap; React subscribes to them.
 */
export const BRIDGE_EVENTS = {
  // ── Lifecycle ────────────────────────────────────────────────────────────
  /** WASM + framework started loading */
  LOADING: 'loading',
  /** Engine initialised — safe to call SetScene */
  SCENE_LOADED: 'sceneLoaded',
  /** Addressable asset bundle downloaded — preload complete */
  ADDRESSABLE_LOADED: 'addressableLoaded',
  /** Scene fully instantiated — safe to call StartGame */
  READY: 'ready',

  // ── Game flow ─────────────────────────────────────────────────────────────
  /** Game loop started */
  START: 'start',
  /** Game loop ended; payload is IGameResult (JSON string) */
  END: 'end',
  /** Tutorial animation finished */
  TUTORIAL_PLAYED: 'tutorialPlayed',

  // ── Cross-boundary requests ───────────────────────────────────────────────
  /** Unity requests a navigation action; payload is IUnityNavigation */
  NAVIGATION: 'navigation',
  /** Unity fires an analytics event; payload is IUnityTracking */
  TRACKING: 'tracking',
  /** Unity proxies an HTTP request through the frontend; payload is IUnityApiRequest */
  API_REQUEST: 'apiRequest',

  // ── Audio ─────────────────────────────────────────────────────────────────
  /** Mute state changed inside Unity; payload is boolean */
  MUTED: 'muted',
} as const;

export type BridgeEventKey = keyof typeof BRIDGE_EVENTS;
export type BridgeEventValue = (typeof BRIDGE_EVENTS)[BridgeEventKey];
