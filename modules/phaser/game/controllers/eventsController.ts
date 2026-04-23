import * as Phaser from 'phaser';

export enum GameEvent {
  GAME_ZOOM = 'game-zoom',
  GAME_PAUSE = 'game-pause',
  GAME_FINISH = 'game-finish',
  GAME_SHUTDOWN = 'game-shutdown',
  SOUND_PLAY = 'sound-play',

  HUD_BUTTON_PAUSE_HIDE = 'hud-button-pause-hide',
  HUD_BUTTON_PAUSE_SHOW = 'hud-button-pause-show',
  HUD_BUTTON_BACK_HIDE = 'hud-button-back-hide',
  HUD_BUTTON_BACK_SHOW = 'hud-button-back-show',
  HUD_BUTTON_BACK = 'hud-button-back',
  HUD_GOALS_UPDATE = 'hud-goals-update',

  BALL_SHOOT = 'ball-shoot',
  BALL_EXPLODE = 'ball-explode',
  BALL_RESET = 'ball-reset',
  BALL_STOPPED = 'ball-stopped',

  GOAL_SCORE = 'goal-score',
  GOAL_MISS = 'goal-miss',

  GRANDSTAND_CHEER = 'grandstand-cheer',
  GRANDSTAND_HIT = 'grandstand-hit',

  SCOREBOARD_SET_TEAM = 'scoreboard-set-team',
  SCOREBOARD_UPDATE_SCORE = 'scoreboard-update-score',
  MATCH_SCORE = 'match-score',

  MATCH_WON = 'match-won',
  MATCH_TIE = 'match-tie',
  MATCH_LOST = 'match-lost',

  HUD_UPDATE_TIMER = 'hud-update-timer',
}

const eventsController = new Phaser.Events.EventEmitter();
export default eventsController;
