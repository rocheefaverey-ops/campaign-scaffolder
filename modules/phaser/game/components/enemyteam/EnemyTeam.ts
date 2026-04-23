import * as Phaser from 'phaser';
import Scaling from '../../utils/Scaling';
import EnemyGoalkeeper from './objects/EnemyGoalkeeper';
import EnemyPlayer from './objects/EnemyPlayer';
import Goal from '../playfield/objects/Goal';

interface IFormation {
  id: number;
  difficulty: number;
  playfield: number[][];
}

export interface ITeam {
  id: string;
  difficulty: number;
  isPlayer?: boolean;
  settings?: { goalsRequired: number };
  isInfinite?: boolean;
}

interface IEnemyTeamSettings {
  goal: Goal;
  spawnPositions: { x: number; y: number }[][];
}

const FORMATIONS: IFormation[] = [
  { id: 1, difficulty: 1, playfield: [[0,0,0,0,0],[0,0,0,0,0],[2,2,0,0,0],[0,0,0,0,0]] },
  { id: 2, difficulty: 1, playfield: [[0,0,0,0,0],[0,0,0,0,1],[0,0,2,0,0],[0,0,0,0,0]] },
  { id: 3, difficulty: 1, playfield: [[0,0,0,0,2],[0,0,0,0,0],[2,0,0,0,0],[0,0,0,0,0]] },
  { id: 4, difficulty: 1, playfield: [[0,0,0,0,0],[1,1,0,0,0],[0,0,0,0,0],[0,0,0,2,0]] },
  { id: 5, difficulty: 1, playfield: [[0,0,0,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,1,0,0,0]] },
  { id: 6, difficulty: 1, playfield: [[0,0,0,0,0],[2,2,0,0,0],[0,0,0,0,0],[0,0,0,0,0]] },
  { id: 7, difficulty: 1, playfield: [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,1,1],[0,0,0,2,0]] },
  { id: 8, difficulty: 2, playfield: [[0,0,0,0,0],[0,2,2,0,0],[0,0,0,0,0],[0,0,0,0,0]] },
  { id: 9, difficulty: 2, playfield: [[0,0,0,0,0],[2,2,0,0,0],[0,0,0,0,0],[1,1,0,0,0]] },
  { id: 10, difficulty: 2, playfield: [[1,1,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,2,2]] },
  { id: 11, difficulty: 2, playfield: [[0,0,0,0,0],[0,1,0,2,2],[0,0,0,0,0],[0,0,0,0,0]] },
  { id: 12, difficulty: 2, playfield: [[0,0,0,0,1],[0,0,0,0,0],[0,2,1,0,0],[0,0,0,0,0]] },
  { id: 13, difficulty: 2, playfield: [[2,2,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,1,0,1,0]] },
  { id: 14, difficulty: 3, playfield: [[0,0,0,0,0],[0,0,0,1,2],[2,2,0,0,0],[0,0,0,0,0]] },
  { id: 15, difficulty: 3, playfield: [[0,0,0,0,0],[2,2,0,0,0],[0,0,0,0,0],[0,0,0,2,2]] },
  { id: 16, difficulty: 3, playfield: [[0,0,0,0,0],[2,2,0,0,0],[0,0,0,0,0],[0,0,0,2,2]] },
  { id: 17, difficulty: 3, playfield: [[2,2,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,1,0,1,0]] },
  { id: 18, difficulty: 3, playfield: [[0,0,0,0,0],[0,0,0,2,2],[0,0,0,0,0],[0,0,0,0,0]] },
  { id: 19, difficulty: 3, playfield: [[0,0,0,0,0],[0,0,0,0,0],[2,2,0,0,0],[0,0,0,0,0]] },
  { id: 20, difficulty: 3, playfield: [[2,2,0,0,0],[0,0,0,0,0],[0,1,0,0,0],[0,1,0,0,0]] },
];

export default class EnemyTeam extends Phaser.GameObjects.Group {
  goal: Goal;
  goalkeeper: EnemyGoalkeeper;
  spawnPositions: { x: number; y: number }[][];
  team = '';
  difficulty = 1;
  settings: { goalsRequired: number } = { goalsRequired: 1 };
  previousFormation = 1;
  amount = 11;
  goalNoSpawnOffset: number = Scaling.getPixelsByDPR(20);

  constructor(scene: Phaser.Scene, settings: IEnemyTeamSettings) {
    super(scene);

    this.goal = settings.goal;
    this.spawnPositions = settings.spawnPositions;

    this.goalkeeper = new EnemyGoalkeeper(this.scene, { goal: settings.goal });

    for (let i = 0; i < this.amount - 1; i++) {
      const player = new EnemyPlayer(this.scene, 0, 0, i + 1);
      this.add(player);
    }
  }

  placeGoalkeeper() {
    this.goalkeeper.place();
  }

  setTeam(team: ITeam) {
    this.team = team.id;
    this.difficulty = team.difficulty;
    this.settings = team.settings ?? { goalsRequired: 1 };
  }

  switchFormation() {
    const available = FORMATIONS.filter((f) => f.id !== this.previousFormation);
    const formation = Phaser.Math.RND.pick(available);
    this.previousFormation = formation.id;

    const active = this.getMatching('active', true) as EnemyPlayer[];
    active.forEach((p) => p.setActive(false).setVisible(false).setPosition(0, 0));

    const validRows = this.spawnPositions.filter(
      (row) => row[0].y > this.goal.getBounds().bottom + this.goalNoSpawnOffset,
    );
    const colDiff = (this.spawnPositions[0]?.length ?? 0) - (formation.playfield[0]?.length ?? 0);
    const centeredRows = validRows.map((row) =>
      row.filter((_c, i) => i >= colDiff / 2 && i < row.length - colDiff / 2),
    );

    formation.playfield.forEach((row, rowIdx) => {
      row.forEach((count, colIdx) => {
        if (!count) return;
        const pos = centeredRows[rowIdx]?.[colIdx];
        const player = this.getFirstDead() as EnemyPlayer | null;
        if (player && pos) {
          player.setSprite(this.team, count);
          player.setBodySize();
          player.setPosition(pos.x, pos.y);
          player.setActive(true).setVisible(true);
        }
      });
    });
  }
}
