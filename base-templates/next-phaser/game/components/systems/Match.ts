import * as Phaser from 'phaser';
import eventsController, { GameEvent } from '../../controllers/eventsController';
import Constants from '../../utils/Constants';
import Player from '../playerteam/Player';
import EnemyTeam from '../enemyteam/EnemyTeam';
import { IControlsPath } from '../../controllers/controlController';

interface IMatchSettings {
  playerTeam: Player;
  enemyTeam: EnemyTeam;
  durationRealtime: number;
  durationDisplayed: number;
  goalsRequired: number;
  isInfinite: boolean;
}

export default class Match {
  scene: Phaser.Scene;
  isInfinite: boolean;
  playerTeam: Player;
  enemyTeam: EnemyTeam;
  durationTimer?: Phaser.Time.TimerEvent;
  goalsRequired: number;
  scores = { player: 0, enemy: 0 };
  hasScored = false;
  hasStarted = false;
  canShoot = true;
  ballResetTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, settings: IMatchSettings) {
    this.scene = scene;
    this.isInfinite = settings.isInfinite;
    this.playerTeam = settings.playerTeam;
    this.enemyTeam = settings.enemyTeam;
    this.goalsRequired = settings.goalsRequired;

    if (!this.isInfinite) {
      this.durationTimer = this.createMatchDurationTimer(settings.durationDisplayed, settings.durationRealtime);
      eventsController.emit(GameEvent.HUD_UPDATE_TIMER, { time: settings.durationDisplayed, progression: 1 });
    } else {
      eventsController.emit(GameEvent.HUD_UPDATE_TIMER, { time: '∞', progression: 1 });
    }

    this.enemyTeam.placeGoalkeeper();
    this.setFormation();

    eventsController.off(GameEvent.MATCH_SCORE);
    eventsController.on(GameEvent.MATCH_SCORE, (data: { ballX: number; ballY: number }) =>
      this.scoreGoal(data.ballX, data.ballY),
    );
    eventsController.emit(GameEvent.HUD_GOALS_UPDATE, { goalsRequired: this.goalsRequired, currentGoals: 0 });
  }

  createMatchDurationTimer(displayTime: number, actualTime: number) {
    return this.scene.time.addEvent({
      delay: 1000,
      timeScale: displayTime / actualTime,
      repeat: displayTime,
      paused: true,
      callback: () => {
        if (!this.durationTimer) return;
        const time = this.durationTimer.getRepeatCount();
        eventsController.emit(GameEvent.HUD_UPDATE_TIMER, { time, progression: time / displayTime });
        if (time === 0) this.stop();
      },
    });
  }

  start() {
    this.hasStarted = true;
    if (this.durationTimer) this.durationTimer.paused = false;
  }

  stop() {
    this.canShoot = false;
    this.stopTimer();
    eventsController.emit(GameEvent.MATCH_LOST);
  }

  stopTimer() {
    if (this.durationTimer) this.scene.time.removeEvent(this.durationTimer);
  }

  scoreGoal(ballX?: number, ballY?: number) {
    const mainScene = this.scene.scene.get('game') as any;
    if (!mainScene?.isGamePlayable) return;
    if (this.hasScored) return;

    this.hasScored = true;
    this.scores.player++;
    this.scene.registry.set('score', this.scores.player);

    if (this.ballResetTimer) this.scene.time.removeEvent(this.ballResetTimer);

    eventsController.emit(GameEvent.HUD_GOALS_UPDATE, { goalsRequired: this.goalsRequired, currentGoals: this.scores.player });
    eventsController.emit(GameEvent.GOAL_SCORE);
    eventsController.emit(GameEvent.GRANDSTAND_CHEER);
    eventsController.emit(GameEvent.BALL_EXPLODE, { x: ballX, y: ballY });

    if (this.scores.player >= this.goalsRequired) {
      eventsController.emit(GameEvent.MATCH_WON);
      this.stopTimer();
    } else {
      this.scene.time.delayedCall(800, () => this.setFormation());
    }
  }

  shootBall(points: IControlsPath[]) {
    if (!points.length) return;
    const dx = Math.abs(points[0].x - points[points.length - 1].x);
    const dy = Math.abs(points[0].y - points[points.length - 1].y);
    if (dx < 5 && dy < 5) return;

    if (this.hasStarted && this.canShoot) {
      this.canShoot = false;
      this.ballResetTimer = this.scene.time.delayedCall(Constants.MATCH_BALL_RESET_DURATION, () => {
        if (!this.isInfinite) {
          this.canShoot = true;
          eventsController.emit(GameEvent.BALL_RESET);
        } else {
          this.stop();
        }
      });
      eventsController.emit(GameEvent.BALL_SHOOT, { path: points });
    }
  }

  setFormation() {
    this.hasScored = false;
    this.canShoot = true;
    eventsController.emit(GameEvent.BALL_RESET);
    this.enemyTeam.switchFormation();
  }
}
