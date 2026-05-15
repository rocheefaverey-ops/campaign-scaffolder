import * as Phaser from 'phaser';
import Scaling from '../../../utils/Scaling';

export default class PlayfieldLine extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    this.scene.add.existing(this);
    this.setScale(Scaling.GAME_DIFF_RATIO);
    this.setOrigin(0.5, 0);
  }
}
