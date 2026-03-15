import { BaseBehavior } from '../BaseBehavior.js';
import { CELL_WIDTH, CELL_HEIGHT, GRID_COLS, GRID_ROWS } from '../../../constants.js';

export class OrbitBehavior extends BaseBehavior {
  constructor(config) {
    super(config);
    this.centerCol = config.centerCol;
    this.centerRow = config.centerRow;
    this.radius = config.radius || 4;
    this.angularSpeed = config.angularSpeed || 60;
    this.angle = 0;
  }

  enter(enemy, player, scene) {
    // Calculate initial angle based on enemy position relative to center
    const center = this.getCenter();
    this.angle = Math.atan2(enemy.y - center.y, enemy.x - center.x) * (180 / Math.PI);
  }

  getCenter() {
    const cx = this.centerCol !== null && this.centerCol !== undefined
      ? this.centerCol * CELL_WIDTH + CELL_WIDTH / 2
      : (GRID_COLS * CELL_WIDTH) / 2;
    const cy = this.centerRow !== null && this.centerRow !== undefined
      ? this.centerRow * CELL_HEIGHT + CELL_HEIGHT / 2
      : (GRID_ROWS * CELL_HEIGHT) / 2;
    return { x: cx, y: cy };
  }

  update(dt, enemy, player, scene) {
    super.update(dt, enemy, player, scene);
    if (this.done) return;

    const dtSec = dt / 1000;
    this.angle += this.angularSpeed * dtSec;

    const center = this.getCenter();
    const rad = this.angle * (Math.PI / 180);
    const targetX = center.x + Math.cos(rad) * this.radius * CELL_WIDTH;
    const targetY = center.y + Math.sin(rad) * this.radius * CELL_HEIGHT;

    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const speed = Math.sqrt(dx * dx + dy * dy) / (dtSec || 0.016);

    enemy.navAgent.moveDirectly(dx / (dtSec || 0.016), dy / (dtSec || 0.016), dtSec, scene.enemies || []);
  }
}
