import Scaling from '../utils/Scaling';
import * as Phaser from 'phaser';

export interface IControlsPath {
  x: number;
  y: number;
  delta: number;
  t: number;
}

interface IControlsSettings {
  onRelease: (points: IControlsPath[]) => void;
  debug?: boolean;
}

export default class Controls {
  scene: Phaser.Scene;
  points: IControlsPath[];
  path?: Phaser.Curves.Path;
  debug?: boolean;
  debugGraphic: Phaser.GameObjects.Graphics;
  inGame = true;
  onRelease: (points: IControlsPath[]) => void;

  constructor(scene: Phaser.Scene, settings: IControlsSettings) {
    this.scene = scene;
    this.onRelease = settings.onRelease;
    this.debug = settings.debug;
    this.points = [];
    this.debugGraphic = this.scene.add.graphics();

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.onPointerUp(pointer));
    this.scene.input.on('gameout', () => (this.inGame = false));
    this.scene.input.on('gameover', () => (this.inGame = true));
  }

  onPointerDown(pointer: Phaser.Input.Pointer) {
    if (this.inGame) {
      this.points = [];
      this.path = new Phaser.Curves.Path(pointer.x, pointer.y);
    }
  }

  onPointerUp(_pointer: Phaser.Input.Pointer) {
    if (this.inGame && this.path) {
      if (this.debug) this.debugGraphic.clear();
      this.path.destroy();
      this.path = undefined;
      this.onRelease(this.points);
    }
  }

  update(time: number, delta: number) {
    if (this.path && this.inGame && this.scene.input.activePointer.isDown) {
      this.points.push({
        x: this.scene.input.activePointer.x,
        y: this.scene.input.activePointer.y,
        t: time,
        delta,
      });
      this.path.lineTo(this.scene.input.activePointer.x, this.scene.input.activePointer.y);
    }
  }
}
