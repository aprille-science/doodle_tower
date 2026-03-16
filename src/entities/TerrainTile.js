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
    this.alpha = cellData.alpha !== undefined ? cellData.alpha : CELL_HIGHLIGHT_ALPHA;
    this.active = true;

    this.x = this.col * CELL_WIDTH;
    this.y = this.row * CELL_HEIGHT;

    this.graphics = scene.add.graphics();
    this.draw();
  }

  draw() {
    this.graphics.clear();
    if (!this.active) return;

    // Doodle-style terrain: cross-hatched fill with pen outline
    this.graphics.fillStyle(this.color, this.alpha * 0.6);
    this.graphics.fillRect(this.x, this.y, CELL_WIDTH, CELL_HEIGHT);

    // Cross-hatch pattern
    this.graphics.lineStyle(0.5, this.color, this.alpha * 0.5);
    for (let d = -CELL_HEIGHT; d < CELL_WIDTH; d += 6) {
      const x1 = Math.max(this.x, this.x + d);
      const y1 = Math.max(this.y, this.y - d);
      const x2 = Math.min(this.x + CELL_WIDTH, this.x + d + CELL_HEIGHT);
      const y2 = Math.min(this.y + CELL_HEIGHT, this.y - d + CELL_WIDTH);
      this.graphics.lineBetween(x1, y1, x2, y2);
    }

    // Pen outline
    const outlineAlpha = this.alpha > CELL_HIGHLIGHT_ALPHA ? 0.7 : 0.35;
    this.graphics.lineStyle(1.5, 0x333333, outlineAlpha);
    this.graphics.strokeRect(this.x + 0.5, this.y + 0.5, CELL_WIDTH - 1, CELL_HEIGHT - 1);
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
