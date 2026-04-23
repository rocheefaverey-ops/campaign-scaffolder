import * as Phaser from 'phaser';
import Scaling from '../utils/Scaling';
import teamsJSON from '../data/teams.json';

interface ITeam {
  id: string;
  isPlayer?: boolean;
}

export default class Load extends Phaser.Scene {
  progressBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'load' });
  }

  preload() {
    this.addVisuals();
    this.addLoadingProgression();
    this.loadAssets();
  }

  loadAssets() {
    /** HUD */
    this.load.image('hud_topbar_volume_off_default', Scaling.getImagePath('hud/volume-off-default', 'png'));
    this.load.image('hud_topbar_volume_off_alternative', Scaling.getImagePath('hud/volume-off-alternative', 'png'));
    this.load.image('hud_topbar_volume_on_default', Scaling.getImagePath('hud/volume-on-default', 'png'));
    this.load.image('hud_topbar_volume_on_alternative', Scaling.getImagePath('hud/volume-on-alternative', 'png'));
    this.load.image('hud_topbar_pause_default', Scaling.getImagePath('hud/pause-default', 'png'));
    this.load.image('hud_topbar_pause_alternative', Scaling.getImagePath('hud/pause-alternative', 'png'));
    this.load.image('hud_topbar_back_default', Scaling.getImagePath('hud/back-default', 'png'));
    this.load.image('hud_topbar_back_alternative', Scaling.getImagePath('hud/back-alternative', 'png'));
    this.load.image('hud_topbar_logo', Scaling.getImagePath('hud/logo', 'png'));

    /** Stadium */
    this.load.image('grandstand_banner', Scaling.getImagePath('game/boarding-repeat-x', 'png'));
    this.load.spritesheet('grandstand', Scaling.getImagePath('game/scene_grandstand', 'png'), {
      frameWidth: Scaling.getPixelsByDPR(375),
      frameHeight: Scaling.getPixelsByDPR(216),
    });
    this.load.image('emitter_score', Scaling.getImagePath('game/particles_goal', 'png'));

    /** Playfield */
    this.load.image('goal', Scaling.getImagePath('game/field_target', 'png'));
    this.load.image('ball', Scaling.getImagePath('game/shot', 'png'));
    this.load.image('lines_goal', Scaling.getImagePath('game/field_target_markers', 'png'));
    this.load.image('lines_kickoff', Scaling.getImagePath('game/field_meters', 'png'));
    this.load.spritesheet('field_light', Scaling.getImagePath('game/background_field_light', 'png'), {
      frameWidth: Scaling.getPixelsByDPR(56),
      frameHeight: Scaling.getPixelsByDPR(56),
    });
    this.load.spritesheet('field_dark', Scaling.getImagePath('game/background_field_dark', 'png'), {
      frameWidth: Scaling.getPixelsByDPR(56),
      frameHeight: Scaling.getPixelsByDPR(56),
    });
    this.load.image('goals_required_empty', Scaling.getImagePath('game/shots-empty', 'png'));
    this.load.image('goals_required_filled', Scaling.getImagePath('game/shots-filled', 'png'));
    this.load.spritesheet('game_lost_banner', Scaling.getImagePath('game/sprite-sign-gameover', 'png'), {
      frameWidth: Scaling.getPixelsByDPR(280),
      frameHeight: Scaling.getPixelsByDPR(160),
    });
    this.load.spritesheet('game_win_banner', Scaling.getImagePath('game/sprite-sign-youwin', 'png'), {
      frameWidth: Scaling.getPixelsByDPR(280),
      frameHeight: Scaling.getPixelsByDPR(160),
    });

    /** Player */
    this.load.spritesheet('player', Scaling.getImagePath('game/player_jet', 'png'), {
      frameWidth: Scaling.getPixelsByDPR(30),
      frameHeight: Scaling.getPixelsByDPR(56),
    });

    /** Goalkeeper */
    this.load.spritesheet('goalkeeper', Scaling.getImagePath('game/keeper', 'png'), {
      frameWidth: Scaling.getPixelsByDPR(40),
      frameHeight: Scaling.getPixelsByDPR(56),
    });

    /** Enemy teams */
    for (const team of (teamsJSON as { teams: ITeam[] }).teams) {
      if (!team.isPlayer) {
        this.load.spritesheet(`team_front_single_${team.id}`, Scaling.getImagePath(`game/enemy_single_${team.id}`, 'png'), {
          frameWidth: Scaling.getPixelsByDPR(30),
          frameHeight: Scaling.getPixelsByDPR(56),
        });
        this.load.spritesheet(`team_front_double_${team.id}`, Scaling.getImagePath(`game/enemy_double_${team.id}`, 'png'), {
          frameWidth: Scaling.getPixelsByDPR(60),
          frameHeight: Scaling.getPixelsByDPR(56),
        });
      }
    }

    /** Audio */
    this.load.audio('theme', 'sounds/background.mp3');
    this.load.audio('hit_goal', 'sounds/goal.mp3');
    this.load.audio('hit_stand', 'sounds/hit_stand.mp3');
    this.load.audio('hit_player', 'sounds/hit_player.mp3');
    this.load.audio('hit_pole', 'sounds/hit_pole.mp3');
    this.load.audio('shoot', 'sounds/shoot.mp3');
    this.load.audio('cheer', 'sounds/cheer.mp3');
  }

  addVisuals() {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    const logo = this.textures.exists('loading_scene_logo')
      ? this.add.image(cx, 0, 'loading_scene_logo').setOrigin(0.5, 0)
      : null;

    this.progressBar = this.add.graphics();
    this.progressBar.setPosition(cx, cy);
  }

  addLoadingProgression() {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const radius = Scaling.getPixelsByDPR(40);

    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.lineStyle(Scaling.getPixelsByDPR(6), 0xff8000, 1);
      this.progressBar.beginPath();
      this.progressBar.arc(0, 0, radius, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * value), false);
      this.progressBar.strokePath();

      this.progressBar.lineStyle(Scaling.getPixelsByDPR(6), 0xaebfc2, 0.4);
      this.progressBar.beginPath();
      this.progressBar.arc(0, 0, radius, Phaser.Math.DegToRad(-90 + 360 * value), Phaser.Math.DegToRad(270), false);
      this.progressBar.strokePath();
    });

    this.load.on('complete', () => {
      this.progressBar.setAlpha(0);
      this.game.events.emit('loaded');
      this.time.delayedCall(500, () => {
        this.game.events.emit('start');
        this.scene.launch('game');
        this.scene.stop();
      });
    });
  }
}
