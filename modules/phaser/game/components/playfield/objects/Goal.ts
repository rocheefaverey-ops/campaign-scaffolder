import * as Phaser from 'phaser';
import Scaling from '../../../utils/Scaling';
import eventsController, { GameEvent } from '../../../controllers/eventsController';

export default class Goal extends Phaser.GameObjects.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  audioHitGoal: Phaser.Sound.BaseSound;
  audioHitPole: Phaser.Sound.BaseSound;
  poleLeft: Phaser.GameObjects.Zone;
  poleRight: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'goal');
    this.scene.add.existing(this);

    this.setName('goal');
    this.setOrigin(0.5, 0);
    this.setScale(Scaling.GAME_DIFF_RATIO);

    this.poleLeft = this.scene.add.zone(
      this.getBounds().left + Scaling.getPixelsByDPR(1),
      this.getBounds().centerY,
      Scaling.getPixelsByDPR(3),
      this.height,
    );
    this.poleRight = this.scene.add
      .zone(
        this.getBounds().right + Scaling.getPixelsByDPR(2),
        this.getBounds().centerY,
        Scaling.getPixelsByDPR(3),
        this.height,
      )
      .setOrigin(1, 0.5);

    this.scene.physics.world.enable([this]);
    this.body.setSize(this.width, this.height - Scaling.getPixelsByDPR(35));
    this.body.setOffset(0);
    this.body.setImmovable(true);

    this.scene.physics.world.enable([this.poleLeft, this.poleRight]);
    (this.poleLeft.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (this.poleRight.body as Phaser.Physics.Arcade.Body).setImmovable(true);

    this.audioHitGoal = this.scene.sound.add('hit_goal', { volume: 0.5 });
    this.audioHitPole = this.scene.sound.add('hit_pole', { volume: 0.5 });

    eventsController.on(GameEvent.GOAL_SCORE, () => this.audioHitGoal.play());
    eventsController.on(GameEvent.GOAL_MISS, () => this.audioHitPole.play());
  }
}
