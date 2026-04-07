import { EventEmitter } from 'events';
import type {
  IGameBridgeAdapter,
  IUnityInput,
  GameBridgeEventName,
  GameBridgeEventCallback,
} from './game-bridge.types';

/**
 * PhaserGameBridgeAdapter
 *
 * EventEmitter-based bridge for Phaser 3 games.
 * The Phaser scene emits events via this adapter:
 *
 *   // Inside a Phaser Scene:
 *   (this.game as any).__bridge?.emit('end', { score: 100 });
 *
 * The PhaserCanvas component stores the adapter on the Phaser game instance
 * as `game.__bridge` so scenes can access it without imports.
 */
export class PhaserGameBridgeAdapter implements IGameBridgeAdapter {
  private readonly emitter = new EventEmitter();
  private gameData: IUnityInput | null = null;

  // ── IGameBridgeAdapter ─────────────────────────────────────────────────

  setData(input: IUnityInput): void {
    this.gameData = input;
  }

  /** Returns the last setData() payload — call from inside Phaser scenes. */
  getData(): IUnityInput | null {
    return this.gameData;
  }

  setTargetScene(_sceneKey: string): void {
    // Phaser scene management is handled by Phaser's ScenePlugin.
    // Use this.scene.start('SceneKey') inside your Phaser scenes instead.
  }

  sendMessage(objectName: string, methodName: string, data?: string): void {
    this.emitter.emit(`${objectName}.${methodName}`, data ? JSON.parse(data) : undefined);
  }

  on<T>(event: GameBridgeEventName, cb: GameBridgeEventCallback<T>): void {
    this.emitter.on(event, cb as (...args: unknown[]) => void);
  }

  off<T>(event: GameBridgeEventName, cb: GameBridgeEventCallback<T>): void {
    this.emitter.off(event, cb as (...args: unknown[]) => void);
  }

  /** Emit a bridge event — call this from PhaserCanvas to relay Phaser game.events. */
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
    // Phaser boots itself — nothing async needed here.
    return Promise.resolve();
  }

  startGame(): void {
    this.emitter.emit('start');
  }

  destroy(): void {
    this.emitter.removeAllListeners();
  }
}
