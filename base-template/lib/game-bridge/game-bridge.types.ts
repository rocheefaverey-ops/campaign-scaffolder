/** Data pushed from React → Game engine on boot and on state changes */
export interface IGameBridgeInput {
  environment: 'local' | 'acceptance' | 'production';
  muted: boolean;
  translations?: Record<string, string>;
  playTutorial?: boolean;
  [key: string]: unknown;
}

/** Data received from the Game engine → React on game end */
export interface IGameResult {
  score?: number;
  playTime?: number;
  collectedTokens?: number;
  distance?: number;
  /** Arbitrary JSON payload from the game (stringified) */
  payload?: string;
}

export type GameBridgeEventName =
  | 'loading'
  | 'ready'
  | 'sceneLoaded'
  | 'addressableLoaded'
  | 'gameStarted'
  | 'gameEnded'
  | 'tutorialPlayed'
  | 'muted'
  | string; // allow custom events per campaign

export type GameBridgeEventCallback<T = unknown> = (data: T) => void;

export interface IGameBridgeAdapter {
  /** Push data to the game engine */
  setData(input: IGameBridgeInput): void;
  /** Raw message dispatch (Unity: SendMessage; R3F: custom event) */
  sendMessage(objectName: string, methodName: string, data?: string): void;
  /** Subscribe to an event emitted by the game engine */
  on<T = unknown>(event: GameBridgeEventName, cb: GameBridgeEventCallback<T>): void;
  /** Unsubscribe */
  off<T = unknown>(event: GameBridgeEventName, cb: GameBridgeEventCallback<T>): void;
  /** Wait for a specific event, resolving when it fires */
  waitFor<T = unknown>(event: GameBridgeEventName, timeoutMs?: number): Promise<T>;
  /** Tear down all listeners */
  destroy(): void;
}
