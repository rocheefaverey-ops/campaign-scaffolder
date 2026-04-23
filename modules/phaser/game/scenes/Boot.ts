import * as Phaser from 'phaser';
import Scaling from '../utils/Scaling';

export default class Boot extends Phaser.Scene {
  constructor() {
    super({ key: 'boot' });
  }

  preload() {
    this.load.image('loading_scene_logo', Scaling.getImagePath('hud/logo', 'png'));
    this.load.image('loading_scene_logo_game', Scaling.getImagePath('hud/logo-game', 'png'));

    this.load.on('complete', () => this.booted());
  }

  booted() {
    this.scene.launch('load');
    this.scene.stop();
  }
}
