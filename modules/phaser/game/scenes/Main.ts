import * as Phaser from 'phaser';
import Scaling from '../utils/Scaling';
import Constants from '../utils/Constants';
import { remapValue } from '../utils/Helpers';
import eventsController, { GameEvent } from '../controllers/eventsController';
import Controls, { IControlsPath } from '../controllers/controlController';
import Playfield from '../components/playfield/Playfield';
import Ball from '../components/playfield/objects/Ball';
import Goal from '../components/playfield/objects/Goal';
import PlayfieldLine from '../components/playfield/objects/PlayfieldLine';
import Grandstand from '../components/stadium/Grandstand';
import Player from '../components/playerteam/Player';
import EnemyTeam from '../components/enemyteam/EnemyTeam';
import EnemyPlayer from '../components/enemyteam/objects/EnemyPlayer';
import EnemyGoalkeeper from '../components/enemyteam/objects/EnemyGoalkeeper';
import Tournament from '../components/systems/Tournament';

export default class Main extends Phaser.Scene {
  playfield!: Playfield;
  grandstand!: Grandstand;
  grandstandBanner!: Phaser.GameObjects.TileSprite;
  goal!: Goal;
  playFieldLineGoal!: PlayfieldLine;
  playfieldLineBall!: PlayfieldLine;
  ball!: Ball;
  player!: Player;
  enemyTeam!: EnemyTeam;
  controls!: Controls;
  tournament!: Tournament;
  freekickPosition!: number;
  playerTeam!: string;
  startTime!: string;
  endTime!: string;
  isGamePlayable!: boolean;

  constructor() {
    super({ key: 'game' });
  }

  init() {
    this.playerTeam = Constants.PLAYER_TEAM;
    this.freekickPosition = this.cameras.main.height - Scaling.getPixelsByDPR(80 * Scaling.GAME_DIFF_RATIO);
    this.startTime = new Date().toISOString();

    // Apply muted state from CAPE bridge data
    const bridgeData = (this.game as any).__bridge?.getData?.();
    if (bridgeData?.muted) this.sound.mute = true;

    this.scene.launch('hud', { fps: false });
  }

  create() {
    this.sound.add('theme', { volume: 0.5, loop: true }).play();
    this.game.events.emit('start');

    /** Playfield */
    this.playfield = new Playfield(this, 0, 0);

    /** Grandstand */
    const grandstandOffset = Math.max(remapValue(window.innerHeight, 667, 548, 0, 110), 0);
    this.grandstand = new Grandstand(
      this,
      this.cameras.main.centerX,
      -Scaling.getPixelsByDPR(grandstandOffset),
      this.cameras.main.width,
    );
    this.grandstandBanner = this.add
      .tileSprite(
        this.cameras.main.centerX,
        this.grandstand.getBounds().bottom,
        this.cameras.main.width,
        Scaling.getPixelsByDPR(48),
        'grandstand_banner',
      )
      .setOrigin(0.5, 1);

    /** Goal */
    this.goal = new Goal(this, this.cameras.main.centerX, this.grandstand.getBounds().bottom);
    this.playFieldLineGoal = new PlayfieldLine(this, this.cameras.main.centerX, this.goal.getBounds().bottom, 'lines_goal');

    /** Ball */
    this.playfieldLineBall = new PlayfieldLine(this, this.cameras.main.centerX, this.freekickPosition, 'lines_kickoff');
    this.ball = new Ball(this, this.cameras.main.centerX, this.freekickPosition);

    /** Player */
    this.player = new Player(
      this,
      this.ball.getBounds().left - Scaling.getPixelsByDPR(5),
      this.ball.getBounds().bottom - Scaling.getPixelsByDPR(15),
      this.playerTeam,
    );

    /** Enemy team */
    this.enemyTeam = new EnemyTeam(this, {
      goal: this.goal,
      spawnPositions: this.playfield.spawnPositions,
    });

    /** Banner: Lost */
    const bannerLost = this.add
      .sprite(this.cameras.main.centerX, this.cameras.main.centerY, 'game_lost_banner')
      .setOrigin(0.5)
      .setActive(false)
      .setVisible(false);
    this.anims.create({
      key: 'bannerLostFlicker',
      frames: this.anims.generateFrameNumbers('game_lost_banner', { start: 0, end: 1 }),
      frameRate: 5,
      repeat: -1,
    });

    /** Banner: Win */
    const bannerWin = this.add
      .sprite(this.cameras.main.centerX, this.cameras.main.centerY, 'game_win_banner')
      .setOrigin(0.5)
      .setActive(false)
      .setVisible(false);
    this.anims.create({
      key: 'bannerWinFlicker',
      frames: this.anims.generateFrameNumbers('game_win_banner', { start: 0, end: 1 }),
      frameRate: 5,
      repeat: -1,
    });

    /** Tournament */
    this.tournament = new Tournament(this, {
      playerTeam: this.player,
      enemyTeam: this.enemyTeam,
    });

    /** Events */
    eventsController.on(GameEvent.MATCH_WON, () => {
      if (!this.isGamePlayable) return;
      bannerWin.setActive(true).setVisible(true).play('bannerWinFlicker');
      eventsController.emit(GameEvent.GRANDSTAND_CHEER);
      if (this.tournament.bracket[this.tournament.currentStage]) {
        this.tournament.nextMatch();
      } else {
        this.finish();
      }
    });

    eventsController.on(GameEvent.MATCH_LOST, () => {
      if (!this.isGamePlayable) return;
      bannerLost.setActive(true).setVisible(true).play('bannerLostFlicker');
      this.gameover();
    });

    /** Controls */
    this.controls = new Controls(this, {
      onRelease: (points: IControlsPath[]) => this.tournament.match.shootBall(points),
    });

    /** Start tournament */
    this.time.delayedCall(400, () => this.tournament.nextMatch());
    this.registry.set('score', 0);
    this.start();
  }

  update(time: number, delta: number) {
    this.grandstandBanner.tilePositionX -= 1;

    /** Ball vs Goal/Grandstand collisions */
    this.physics.world.collide(
      [this.goal, this.goal.poleLeft, this.goal.poleRight, this.grandstand],
      this.ball,
      (target, ball) => {
        const _target = target as Phaser.Physics.Arcade.Sprite;
        const _ball = ball as Ball;

        if (_target.name === 'goal' && _ball.body.top >= (_target.body as Phaser.Physics.Arcade.Body).bottom) {
          eventsController.emit(GameEvent.MATCH_SCORE, { team: 'player', ballX: _ball.x, ballY: _ball.y });
        } else if (_target.name === 'grandstand') {
          eventsController.emit(GameEvent.GRANDSTAND_HIT);
        } else if (_target.name === 'goal') {
          eventsController.emit(GameEvent.GOAL_MISS);
        }
      },
    );

    /** Ball vs Enemy team collisions */
    this.physics.world.collide(this.ball, this.enemyTeam, (_ball, player) => {
      (player as EnemyPlayer).handleHit();
      eventsController.emit(GameEvent.BALL_STOPPED);
    });

    /** Ball vs Goalkeeper collisions */
    this.physics.world.collide(this.ball, this.enemyTeam.goalkeeper, (_ball, goalkeeper) => {
      (goalkeeper as EnemyGoalkeeper).handleHit();
    });

    this.controls.update(time, delta);
  }

  start() {
    this.setPlayableState(true);
  }

  setPlayableState(state: boolean) {
    this.isGamePlayable = state;
  }

  gameover() {
    this.setPlayableState(false);
    this.updateGameData(false);
  }

  finish() {
    this.setPlayableState(false);
    this.updateGameData(true);
  }

  updateGameData(hasWon: boolean) {
    this.endTime = new Date().toISOString();
    this.time.delayedCall(1500, () => this.shutdown(hasWon));
  }

  shutdown(hasWon: boolean) {
    eventsController.removeAllListeners();
    this.sound.stopAll();
    this.scene.stop('hud');
    this.scene.stop();

    this.game.events.emit('end', {
      score: this.registry.get('score'),
      startTime: this.startTime,
      endTime: this.endTime,
      hasWon,
    });
  }
}
