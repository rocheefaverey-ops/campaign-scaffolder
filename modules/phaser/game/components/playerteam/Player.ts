import * as Phaser from 'phaser';
import Scaling from '../../utils/Scaling';
import eventsController, { GameEvent } from '../../controllers/eventsController';

export default class Player extends Phaser.GameObjects.Sprite {
  team: string;
  shots: number;

  constructor(scene: Phaser.Scene, x: number, y: number, team: string) {
    super(scene, x, y, 'player');
    this.scene.add.existing(this);

    this.team = team;
    this.shots = 0;
    this.setScale(Scaling.GAME_DIFF_RATIO);

    eventsController.on(GameEvent.BALL_SHOOT, () => this.shoot());
  }

  shoot() {
    this.shots++;
    this.setFrame(1);
    this.scene.time.delayedCall(400, () => this.setFrame(0));
  }
}
