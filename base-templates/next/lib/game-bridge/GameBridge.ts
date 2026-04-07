/**
 * GameBridge.ts — Base interface and no-op stub only.
 *
 * The concrete adapter implementations live in the module directory:
 *   modules/unity/lib/unity-adapter.ts   → UnityGameBridgeAdapter
 *   modules/r3f/lib/r3f-adapter.ts       → R3FGameBridgeAdapter
 *
 * When the CLI injects a game module it copies the adapter into
 * lib/game-bridge/ and wires it into the canvas component.
 */

export type { IGameBridgeAdapter } from './game-bridge.types';
