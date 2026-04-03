/**
 * Canonical event names shared between the game engine and React.
 * Use these constants everywhere — never hardcode string literals.
 */
export const BRIDGE_EVENTS = {
  /** WASM / engine started loading */
  LOADING: 'loading',
  /** Engine is initialised and ready to receive SetData */
  READY: 'ready',
  /** Addressables / asset bundle download complete */
  ADDRESSABLE_LOADED: 'addressableLoaded',
  /** A named scene has finished loading */
  SCENE_LOADED: 'sceneLoaded',
  /** Game loop has started */
  GAME_STARTED: 'gameStarted',
  /** Game loop has ended; payload contains IGameResult */
  GAME_ENDED: 'gameEnded',
  /** Tutorial sequence completed */
  TUTORIAL_PLAYED: 'tutorialPlayed',
  /** Audio mute state changed; payload is boolean */
  MUTED: 'muted',
} as const;

export type BridgeEventKey = keyof typeof BRIDGE_EVENTS;
export type BridgeEventValue = (typeof BRIDGE_EVENTS)[BridgeEventKey];
