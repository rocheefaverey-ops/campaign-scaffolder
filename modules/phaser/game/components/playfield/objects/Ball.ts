import * as Phaser from 'phaser';
import Scaling from '../../../utils/Scaling';
import eventsController, { GameEvent } from '../../../controllers/eventsController';
import Trail from '../../Trail';
import { parseHexColor } from '../../../utils/Helpers';
import { IControlsPath } from '../../../controllers/controlController';

export default class Ball extends Phaser.GameObjects.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  trail: Trail;
  points: IControlsPath[];
  head: { x: number; y: number };
  particleEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  shootSoundeffect: Phaser.Sound.BaseSound;

  isStopped = false;
  speed: number = Scaling.getPixelsByDPR(550) * Scaling.GAME_DIFF_RATIO;
  physicsMoveTimers: Phaser.Time.TimerEvent[] = [];
  startPosition: Phaser.Math.Vector2;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'ball');
    this.scene.add.existing(this);

    this.trail = new Trail(this.scene, {
      trailColor: parseHexColor('#ffffff').color,
      lifeSpan: 5,
      trailMaxSize: Scaling.getPixelsByDPR(10),
    });
    this.points = [];
    this.head = { x: 0, y: 0 };
    this.trail.updateStartingPoint(this.x, this.y);
    this.shootSoundeffect = scene.sound.add('shoot', { volume: 0.8 });
    this.startPosition = new Phaser.Math.Vector2(this.x, this.y);

    this.setScale(Scaling.GAME_DIFF_RATIO);

    this.scene.physics.world.enable(this);
    this.body.setCircle(this.width / 2);
    this.body.setCollideWorldBounds(true);
    this.body.useDamping = true;
    this.body.setDrag(0.4, 0.4);
    this.body.setBounce(1, 1);
    this.body.setAngularDrag(100);

    // Phaser 4: particles are created directly as an emitter
    this.particleEmitter = this.scene.add.particles(0, 0, 'emitter_score', {
      speed: { min: -300, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      lifespan: 600,
      quantity: 30,
      emitting: false,
    });

    eventsController.on(GameEvent.BALL_EXPLODE, (data: { x: number; y: number }) => this.explode(data.x, data.y));
    eventsController.on(GameEvent.BALL_SHOOT, (data: { path: IControlsPath[] }) => this.shoot(data.path));
    eventsController.on(GameEvent.BALL_RESET, () => this.reset());
    eventsController.on(GameEvent.BALL_STOPPED, () => this.handleHit());
  }

  shoot(points: IControlsPath[]) {
    this.isStopped = false;
    this.shootSoundeffect.play();

    let deltaSum = 0;
    const diff = {
      x: this.x - points[0].x,
      y: this.y - points[0].y,
    };

    if (points.length > 40) {
      const vectorPartition = Math.floor(points.length / 20);
      points = points.filter((_p, i) => (i + 1) % vectorPartition === 0);
    }

    points.forEach((point) => {
      deltaSum += point.delta;
      const timer = this.scene.time.delayedCall(deltaSum * 1.1, () => {
        if (!this.isStopped) {
          const forceX = diff.x < 0 ? point.x - Math.abs(diff.x) : point.x + Math.abs(diff.x);
          const forceY = diff.y < 0 ? point.y - Math.abs(diff.y) : point.y + Math.abs(diff.y);
          this.scene.physics.moveTo(this, forceX, forceY, this.speed);
        }
      });
      this.physicsMoveTimers.push(timer);
    });

    this.body.setAngularVelocity(500);
  }

  explode(x: number, y: number) {
    this.particleEmitter.explode(30, x, y);
    this.hide();
  }

  hide() {
    this.setAlpha(0);
    this.trail.setAlpha(0);
    this.resetBody();
  }

  reset() {
    this.trail.clearPoints();
    this.physicsMoveTimers.forEach((t) => this.scene.time.removeEvent(t));
    this.physicsMoveTimers = [];
    this.resetBody();
    this.setAlpha(1);
    this.trail.setAlpha(1);
  }

  resetBody() {
    this.setPosition(this.startPosition.x, this.startPosition.y);
    this.setAngle(0);
    this.body.setAngularVelocity(0);
    this.body.setVelocity(0, 0);
  }

  handleHit() {
    this.isStopped = true;
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (this.active) {
      if (this.x !== this.head.x || this.y !== this.head.y) {
        this.head.x = this.x;
        this.head.y = this.y;
        this.trail.addPoint(this.x, this.y);
      }
      this.trail.update();
    }
  }
}
