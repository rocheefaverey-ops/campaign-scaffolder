import * as Phaser from 'phaser';
import eventsController, { GameEvent } from '../../controllers/eventsController';
import Player from '../playerteam/Player';
import EnemyTeam, { ITeam } from '../enemyteam/EnemyTeam';
import Match from './Match';
import teamsJSON from '../../data/teams.json';

interface ITeams {
  teams: ITeam[];
}

interface ITournamentSettings {
  playerTeam: Player;
  enemyTeam: EnemyTeam;
}

export default class Tournament {
  scene: Phaser.Scene;
  teams: ITeam[];
  bracket: ITeam[];
  matches: number;
  playerTeam: Player;
  enemyTeam: EnemyTeam;
  match!: Match;
  hasInfiniteStage: boolean;
  matchDurationDisplayed: number;
  matchDurationRealtime: number;
  currentStage = 0;

  constructor(scene: Phaser.Scene, settings: ITournamentSettings) {
    this.scene = scene;
    this.matches = 1;
    this.playerTeam = settings.playerTeam;
    this.enemyTeam = settings.enemyTeam;
    this.hasInfiniteStage = false;
    this.matchDurationDisplayed = 30;
    this.matchDurationRealtime = 30;

    this.teams = (teamsJSON as ITeams).teams;
    this.bracket = this.createBracket();
  }

  createBracket(): ITeam[] {
    const available = this.teams.filter((t) => !t.isPlayer);
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, this.matches);

    if (this.hasInfiniteStage) {
      const infiniteTeam = Phaser.Math.RND.pick(available);
      picked.push({ ...infiniteTeam, settings: { goalsRequired: 9999 }, isInfinite: true });
    }

    picked.sort((a, b) => ((a.settings?.goalsRequired ?? 0) > (b.settings?.goalsRequired ?? 0) ? 1 : -1));
    return picked;
  }

  nextMatch() {
    eventsController.emit(GameEvent.SCOREBOARD_UPDATE_SCORE, { playerTeam: 0, enemyTeam: 0 });

    const stage = this.bracket[this.currentStage];
    this.enemyTeam.setTeam(stage);
    eventsController.emit(GameEvent.SCOREBOARD_SET_TEAM, { team: stage.id });

    this.match = new Match(this.scene, {
      playerTeam: this.playerTeam,
      enemyTeam: this.enemyTeam,
      durationRealtime: this.matchDurationRealtime,
      durationDisplayed: this.matchDurationDisplayed,
      goalsRequired: stage.settings?.goalsRequired ?? 1,
      isInfinite: !!stage.isInfinite,
    });

    this.match.start();
    this.currentStage++;
  }
}
