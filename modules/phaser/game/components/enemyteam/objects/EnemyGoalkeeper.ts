import * as Phaser from 'phaser';
import Scaling from '../../../utils/Scaling';

export default class EnemyGoalkeeper extends Phaser.GameObjects.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  goal: Phaser.GameObjects.Sprite;
  speed: { current: number; min: number; max: number };
  patrolPath: { min: number; max: number };

  constructor(scene: Phaser.Scene, settings: { goal: Phaser.GameObjects.Sprite }) {
    super(scene, 0, 0, 'goalkeeper');
    this.scene.add.existing(this);

    this.goal = settings.goal;
    this.speed = {
      current: 0,
      min: Scaling.getPixelsByDPR(50 * Scaling.GAME_DIFF_RATIO),
      max: Scaling.getPixelsByDPR(100 * Scaling.GAME_DIFF_RATIO),
    };
    this.patrolPath = {
      min: this.goal.getBounds().left + Scaling.getPixelsByDPR(12),
      max: this.goal.getBounds().right - Scaling.getPixelsByDPR(12),
    };

    this.setActive(false).setVisible(false);
    this.setScale(Scaling.GAME_DIFF_RATIO);
    this.setY(this.goal.getBounds().bottom - Scaling.getPixelsByDPR(18));

    this.scene.physics.world.enable(this);
    this.body.setImmovable(true);
    this.body.setBounce(1, 1);
    this.body.setSize(this.width - Scaling.getPixelsByDPR(10), this.height - Scaling.getPixelsByDPR(10));

    this.anims.create({
      key: 'walk',
      frames: this.anims.generateFrameNumbers('goalkeeper', { frames: [0, 1, 2] }),
      frameRate: 6,
      repeat: -1,
    });
  }

  place() {
    this.setX(this.goal.getBounds().centerX).setActive(true).setVisible(true);
    this.speed.current = Phaser.Math.RND.between(this.speed.min, this.speed.max);
    this.anims.timeScale = this.speed.current / 200;
    this.body.velocity.x = this.speed.current;
    this.play('walk');
  }

  handleHit() {
    // goalkeeper hit — could add visual feedback here
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (this.active) {
      if (this.x <= this.patrolPath.min) {
        this.body.velocity.x = this.speed.current;
      } else if (this.x >= this.patrolPath.max) {
        this.body.velocity.x = -this.speed.current;
      }
    }
  }
}
