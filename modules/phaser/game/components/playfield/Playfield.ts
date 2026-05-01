import * as Phaser from 'phaser';
import Scaling from '../../utils/Scaling';

export default class Playfield extends Phaser.GameObjects.Container {
  grid: { width: number; height: number; columns: number; rows: number };
  terrain: Phaser.GameObjects.Sprite[];
  spawnPositions: { x: number; y: number }[][];
  terrainTextures: string[] = ['field_light', 'field_dark'];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.scene.add.existing(this);

    this.grid = this.createGrid();
    this.terrain = this.addTerrainTexture();

    const terrainOffset = (this.scene.cameras.main.width - this.getBounds().width) / 2;
    this.setX(terrainOffset);

    this.spawnPositions = this.getSpawnPositions();
  }

  createGrid() {
    const tex = this.scene.textures.get(this.terrainTextures[0]).get(0);
    const w = tex.width * Scaling.GAME_DIFF_RATIO;
    const h = tex.height * Scaling.GAME_DIFF_RATIO;
    const columns = Math.ceil(this.scene.cameras.main.width / w);
    const rows = Math.ceil(this.scene.cameras.main.height / h);
    return { width: w, height: h, columns, rows };
  }

  addTerrainTexture() {
    const terrain: Phaser.GameObjects.Sprite[] = [];
    for (let row = 0; row < this.grid.rows; row++) {
      for (let col = 0; col < this.grid.columns; col++) {
        const texKey = this.terrainTextures[row % 2];
        const frameCount = this.scene.textures.get(texKey).frameTotal - 1;
        const sprite = this.scene.add.sprite(0, 0, texKey, Phaser.Math.Between(0, frameCount - 1));
        sprite.x = col * this.grid.width;
        sprite.y = row * this.grid.height;
        sprite.setScale(Scaling.GAME_DIFF_RATIO);
        sprite.setOrigin(0, 0);
        terrain.push(sprite);
      }
    }
    this.add(terrain);
    return terrain;
  }

  getSpawnPositions() {
    let currentRow = 0;
    const positions: { x: number; y: number }[][] = [[]];

    this.terrain.forEach((el) => {
      const bounds = el.getBounds();
      const coords = { x: bounds.x + el.displayWidth / 2, y: bounds.y + el.displayHeight / 2 };
      const last = positions[currentRow].at(-1);
      if (last && coords.x < last.x) {
        positions.push([coords]);
        currentRow++;
      } else {
        positions[currentRow].push(coords);
      }
    });

    return positions;
  }
}
