import * as Phaser from 'phaser';
import Scaling from '../utils/Scaling';
import Constants from '../utils/Constants';
import eventsController, { GameEvent } from '../controllers/eventsController';

interface IHUDSceneSettings {
  fps?: boolean;
}

export default class HUD extends Phaser.Scene {
  FPS!: Phaser.GameObjects.Text;
  timerGraphics!: Phaser.GameObjects.Graphics;
  timerText!: Phaser.GameObjects.Text;
  timerContainer!: Phaser.GameObjects.Container;
  settings!: IHUDSceneSettings;

  private timerProgression = 1;
  private timerTime: string | number = 20;

  constructor() {
    super({ key: 'hud' });
  }

  init(settings: IHUDSceneSettings) {
    this.settings = settings;
  }

  create() {
    if (this.settings.fps) this.setFPS();

    /** Logo */
    this.add.image(this.cameras.main.centerX, 0, 'hud_topbar_logo').setOrigin(0.5, 0);

    /** Timer container */
    const cx = this.cameras.main.width - Scaling.getPixelsByDPR(50);
    const cy = Scaling.getPixelsByDPR(40);
    this.timerContainer = this.add.container(cx, cy);

    this.timerGraphics = this.add.graphics();
    this.timerText = this.add
      .text(0, 0, `20`, {
        fontFamily: Constants.FONT_BOLD,
        fontSize: `${Scaling.getPixelsByDPR(20)}px`,
        color: '#000000',
      })
      .setOrigin(0.5, 0.5);

    this.timerContainer.add([this.timerGraphics, this.timerText]);
    this.drawTimer(1);

    eventsController.on(GameEvent.HUD_UPDATE_TIMER, (data: { time: number | string; progression: number }) => {
      this.timerTime = data.time;
      this.timerProgression = data.progression;
      this.timerText.setText(`${data.time}`);
      this.drawTimer(data.progression);
    });

    /** Goals display */
    const goalsContainer = this.add.container(Scaling.getPixelsByDPR(10), Scaling.getPixelsByDPR(10));
    eventsController.on(GameEvent.HUD_GOALS_UPDATE, (data: { goalsRequired: number; currentGoals: number }) => {
      goalsContainer.removeAll(true);
      for (let i = 0; i < data.goalsRequired; i++) {
        const x = (i % 4) * Scaling.getPixelsByDPR(20);
        const y = Math.floor(i / 4) * Scaling.getPixelsByDPR(20);
        const tex = i < data.currentGoals ? 'goals_required_filled' : 'goals_required_empty';
        goalsContainer.add(this.add.image(x, y, tex).setOrigin(0, 0));
      }
    });
  }

  drawTimer(progression: number) {
    const r = Scaling.getPixelsByDPR(30);
    this.timerGraphics.clear();

    // Track (background)
    this.timerGraphics.lineStyle(Scaling.getPixelsByDPR(4), 0x8baec6, 1);
    this.timerGraphics.beginPath();
    this.timerGraphics.arc(0, 0, r, 0, Math.PI * 2, false);
    this.timerGraphics.strokePath();

    // Progress arc
    if (progression > 0) {
      this.timerGraphics.lineStyle(Scaling.getPixelsByDPR(4), 0x000000, 1);
      this.timerGraphics.beginPath();
      this.timerGraphics.arc(
        0, 0, r,
        Phaser.Math.DegToRad(-90),
        Phaser.Math.DegToRad(-90 + 360 * progression),
        false,
      );
      this.timerGraphics.strokePath();
    }
  }

  setFPS() {
    this.add.rectangle(this.cameras.main.width, 0, Scaling.getPixelsByDPR(80), Scaling.getPixelsByDPR(20), 0xffffff).setOrigin(1, 0);
    this.FPS = this.add
      .text(this.cameras.main.width, Scaling.getPixelsByDPR(2), '', {
        fontSize: `${Scaling.getPixelsByDPR(16)}px`,
        color: '#000000',
      })
      .setOrigin(1, 0);
  }

  update() {
    if (this.settings?.fps) {
      this.FPS.setText(`FPS - ${Math.floor(this.game.loop.actualFps)}`);
    }
  }
}
