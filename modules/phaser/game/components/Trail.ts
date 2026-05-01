import * as Phaser from 'phaser';
import { linearInterpolation } from '../utils/Helpers';

interface ITrailSettings {
  trailColor: number;
  lifeSpan?: number;
  trailMaxSize: number;
}

interface TrailPoint {
  x: number;
  y: number;
  lifetime: number;
}

export default class Trail extends Phaser.GameObjects.Graphics {
  startingPoint: Phaser.Math.Vector2;
  endingPoint: Phaser.Math.Vector2;
  points: TrailPoint[];
  settings: ITrailSettings;

  constructor(scene: Phaser.Scene, settings: ITrailSettings) {
    super(scene);
    this.scene.add.existing(this);
    this.settings = settings;
    this.startingPoint = new Phaser.Math.Vector2(0, 0);
    this.endingPoint = new Phaser.Math.Vector2(0, 0);
    this.points = [];
  }

  updateStartingPoint(x: number, y: number) {
    this.startingPoint.x = x;
    this.startingPoint.y = y;
  }

  addPoint(x: number, y: number) {
    const last = this.points[this.points.length - 1];
    if (last?.x === x && last?.y === y) return;
    this.points.push({ lifetime: this.settings.lifeSpan ?? 5, x, y });
  }

  clearPoints() {
    this.points = [];
    this.clear();
  }

  update(..._args: any[]): void {
    this.clear();
    if (this.points.length <= 4) return;

    this.beginPath();
    this.moveTo(this.points[0].x, this.points[0].y);

    for (let i = 1; i < this.points.length - 4; i++) {
      const point = this.points[i];
      const width = linearInterpolation(i / (this.points.length - 4), 0, this.settings.trailMaxSize);
      this.lineStyle(width, this.settings.trailColor, 0.5);
      this.lineTo(point.x, point.y);
    }

    let count = 0;
    for (let i = this.points.length - 4; i < this.points.length; i++) {
      const point = this.points[i];
      this.lineStyle(linearInterpolation(count++ / 4, 20, 0), this.settings.trailColor, 1.0);
      this.lineTo(point.x, point.y);
    }

    this.strokePath();
    this.closePath();

    for (let i = 0; i < this.points.length; i++) {
      this.points[i].lifetime -= 0.25;
      if (this.points[i].lifetime <= 0) {
        this.points.splice(i, 1);
        i--;
      }
    }

    this.startingPoint = this.endingPoint;
  }
}
