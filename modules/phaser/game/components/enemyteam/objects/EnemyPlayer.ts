import * as Phaser from 'phaser';
import Scaling from '../../../utils/Scaling';

export default class EnemyPlayer extends Phaser.GameObjects.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, id: number) {
    super(scene, x, y, 'player');
    this.scene.add.existing(this);

    this.setName(`player_${id}`);
    this.setScale(Scaling.GAME_DIFF_RATIO);
    this.setActive(false).setVisible(false);

    this.scene.physics.world.enable(this);
    this.body.setImmovable(true);
  }

  handleHit() {
    this.setFrame(1);
    this.scene.time.delayedCall(500, () => this.setFrame(0));
  }

  setBodySize() {
    this.body.setSize(this.width - Scaling.getPixelsByDPR(10), this.height - Scaling.getPixelsByDPR(10));
  }

  setSprite(team: string, playerAmount: number) {
    this.setTexture(`team_front_${playerAmount === 1 ? 'single' : 'double'}_${team}`);
  }
}
