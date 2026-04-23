import * as Phaser from 'phaser';
import Scaling from '../../utils/Scaling';
import eventsController, { GameEvent } from '../../controllers/eventsController';

export default class Grandstand extends Phaser.GameObjects.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  audioCheer: Phaser.Sound.BaseSound;
  audioHitStand: Phaser.Sound.BaseSound;

  constructor(scene: Phaser.Scene, x: number, y: number, targetWidth: number) {
    super(scene, x, y, 'grandstand');
    this.scene.add.existing(this);

    this.setName('grandstand');
    this.setOrigin(0.5, 0);

    const widthRatio = targetWidth / this.width;
    this.setScale(Math.max(1, widthRatio));

    this.scene.physics.world.enable(this);
    this.body.setSize(this.width, this.height - Scaling.getPixelsByDPR(15));
    this.body.setImmovable(true);

    this.anims.create({
      key: 'cheer',
      frames: this.anims.generateFrameNumbers('grandstand', { frames: [0, 1] }),
      frameRate: 8,
      repeat: 2,
      yoyo: true,
    });

    this.audioCheer = this.scene.sound.add('cheer', { volume: 0.5 });
    this.audioHitStand = this.scene.sound.add('hit_stand', { volume: 0.5 });

    eventsController.on(GameEvent.GRANDSTAND_CHEER, () => this.cheer());
    eventsController.on(GameEvent.GRANDSTAND_HIT, () => this.audioHitStand.play());
  }

  cheer() {
    this.play('cheer');
    this.scene.tweens.add({
      targets: this.audioCheer,
      volume: { from: 0, to: 0.5 },
      duration: 1000,
      yoyo: true,
    });
    this.audioCheer.play();
  }
}
