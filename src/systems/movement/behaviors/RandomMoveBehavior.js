import { BaseBehavior } from '../BaseBehavior.js';
import { CELL_WIDTH, CELL_HEIGHT, ENEMY_ARENA_MAX_ROW, GRID_COLS } from '../../../constants.js';

export class RandomMoveBehavior extends BaseBehavior {
  constructor(config) {
    super(config);
    this.speed = config.speed || 60;
    this.idleDurationMs = config.idleDurationMs || 800;
    this.biasTowardPlayer = config.biasTowardPlayer || 0;
    this.targetX = 0;
    this.targetY = 0;
    this.hasTarget = false;
    this.idleTimer = 0;
    this.isIdle = false;
  }

  enter(enemy, player, scene) {
    this.pickTarget(enemy, player);
  }

  pickTarget(enemy, player) {
    const useBias = Math.random() < this.biasTowardPlayer;
    let col, row;

    if (useBias && player) {
      const playerCol = Math.floor(player.x / CELL_WIDTH);
      const playerRow = Math.floor(player.y / CELL_HEIGHT);
      // Target player's quadrant
      const halfCol = GRID_COLS / 2;
      const halfRow = ENEMY_ARENA_MAX_ROW / 2;
      const minCol = playerCol < halfCol ? 0 : Math.floor(halfCol);
      const maxCol = playerCol < halfCol ? Math.floor(halfCol) : GRID_COLS - 1;
      const minRow = playerRow < halfRow ? 0 : Math.floor(halfRow);
      const maxRow = Math.min(playerRow < halfRow ? Math.floor(halfRow) : ENEMY_ARENA_MAX_ROW - 1, ENEMY_ARENA_MAX_ROW - 1);
      col = minCol + Math.floor(Math.random() * (maxCol - minCol + 1));
      row = minRow + Math.floor(Math.random() * (maxRow - minRow + 1));
    } else {
      col = Math.floor(Math.random() * GRID_COLS);
      row = Math.floor(Math.random() * ENEMY_ARENA_MAX_ROW);
    }

    this.targetX = col * CELL_WIDTH + CELL_WIDTH / 2;
    this.targetY = row * CELL_HEIGHT + CELL_HEIGHT / 2;
    this.hasTarget = true;
    this.isIdle = false;
  }

  update(dt, enemy, player, scene) {
    super.update(dt, enemy, player, scene);
    if (this.done) return;

    const dtSec = dt / 1000;

    if (this.isIdle) {
      this.idleTimer -= dt;
      if (this.idleTimer <= 0) {
        this.pickTarget(enemy, player);
      }
      return;
    }

    if (!this.hasTarget) {
      this.pickTarget(enemy, player);
    }

    const dx = this.targetX - enemy.x;
    const dy = this.targetY - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 15) {
      // Arrived — idle
      this.isIdle = true;
      this.idleTimer = this.idleDurationMs;
      this.hasTarget = false;
      return;
    }

    enemy.navAgent.moveToward(this.targetX, this.targetY, this.speed, dtSec, scene.enemies || []);
  }
}
