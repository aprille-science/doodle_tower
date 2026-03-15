import { CELL_WIDTH, CELL_HEIGHT, CELL_HIGHLIGHT_ALPHA } from '../constants.js';

export default class TerrainTile {
  constructor(scene, cellData) {
    this.scene = scene;
    this.col = cellData.col;
    this.row = cellData.row;
    this.type = cellData.type;
    this.hp = cellData.hp;         // -1 = indestructible
    this.maxHp = cellData.hp;
    this.damage = cellData.damage;
    this.bouncePlayer = cellData.bouncePlayer;
    this.passthrough = cellData.passthrough;
    this.color = parseInt(cellData.color);
    this.active = true;

    this.x = this.col * CELL_WIDTH;
    this.y = this.row * CELL_HEIGHT;

    this.graphics = scene.add.graphics();
    this.draw();
  }

  draw() {
    this.graphics.clear();
    if (!this.active) return;
    this.graphics.fillStyle(this.color, CELL_HIGHLIGHT_ALPHA);
    this.graphics.fillRect(this.x, this.y, CELL_WIDTH, CELL_HEIGHT);
  }

  takeDamage(amount) {
    if (this.hp === -1) return; // indestructible
    this.hp -= amount;
    if (this.hp <= 0) {
      this.active = false;
      this.graphics.clear();
    }
  }

  destroy() {
    this.graphics.destroy();
  }
}
