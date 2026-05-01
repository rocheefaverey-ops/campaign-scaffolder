import { EventEmitter } from 'events';
import type {
  IGameBridgeAdapter,
  IUnityInput,
  GameBridgeEventName,
  GameBridgeEventCallback,
} from './game-bridge.types';

/**
 * R3FGameBridgeAdapter
 *
 * EventEmitter-based bridge for React Three Fiber games.
 * Attach to the R3FCanvas via props so Scene.tsx can emit events:
 *
 *   // Inside Scene.tsx (via props or context):
 *   bridge.emit('end', { score: 100, playTime: 30000 });
 */
export class R3FGameBridgeAdapter implements IGameBridgeAdapter {
  private readonly emitter = new EventEmitter();
  private gameData: IUnityInput | null = null;

  setData(input: IUnityInput): void {
    this.gameData = input;
  }

  getData(): IUnityInput | null {
    return this.gameData;
  }

  setTargetScene(_sceneKey: string): void {}

  sendMessage(_objectName: string, _methodName: string, _data?: string): void {}

  on<T>(event: GameBridgeEventName, cb: GameBridgeEventCallback<T>): void {
    this.emitter.on(event, cb as (...args: unknown[]) => void);
  }

  off<T>(event: GameBridgeEventName, cb: GameBridgeEventCallback<T>): void {
    this.emitter.off(event, cb as (...args: unknown[]) => void);
  }

  emit<T>(event: GameBridgeEventName, data?: T): void {
    this.emitter.emit(event, data);
  }

  waitFor<T>(event: GameBridgeEventName, timeoutMs = 30_000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`waitFor('${event}') timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
      this.emitter.once(event, (data: T) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  fullBoot(): Promise<void> {
    return Promise.resolve();
  }

  startGame(): void {
    this.emitter.emit('start');
  }

  destroy(): void {
    this.emitter.removeAllListeners();
  }
}
