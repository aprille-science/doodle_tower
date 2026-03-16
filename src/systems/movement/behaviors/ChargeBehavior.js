import { BaseBehavior } from '../BaseBehavior.js';
import { ARENA_WIDTH, CELL_HEIGHT, ENEMY_ARENA_MAX_ROW } from '../../../constants.js';

export class ChargeBehavior extends BaseBehavior {
  constructor(config) {
    super(config);
    this.telegraphMs = config.telegraphMs || 700;
    this.speed = config.speed || 400;
    this.phase = 'telegraph'; // 'telegraph' | 'charging'
    this.dirX = 0;
    this.dirY = 0;
    this.telegraphTimer = 0;
    this.originalTint = null;
  }

  enter(enemy, player, scene) {
    this.phase = 'telegraph';
    this.telegraphTimer = this.telegraphMs;
    // Apply red tint
    this.originalTint = 0x6633aa;
    enemy._chargeTint = true;
    enemy.draw();
  }

  update(dt, enemy, player, scene) {
    if (this.done) return;

    if (this.phase === 'telegraph') {
      this.telegraphTimer -= dt;
      if (this.telegraphTimer <= 0) {
        // Compute direction toward player at this moment
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.01) {
          this.dirX = dx / dist;
          this.dirY = dy / dist;
        } else {
          this.dirX = 0;
          this.dirY = 1;
        }
        this.phase = 'charging';
        this._elapsed = 0;
        enemy._chargeTint = false;
        enemy.isCharging = true;
      }
      return;
    }

    // Charging phase
    super.update(dt, enemy, player, scene);
    const dtSec = dt / 1000;

    const vx = this.dirX * this.speed;
    const vy = this.dirY * this.speed;

    const prevX = enemy.x;
    const prevY = enemy.y;
    enemy.navAgent.moveDirectly(vx, vy, dtSec, scene.enemies || []);

    // Check wall/bounds collision
    const halfW = (enemy.width || 50) / 2;
    const halfH = (enemy.height || 50) / 2;
    const hitWall =
      enemy.x <= halfW ||
      enemy.x + halfW >= ARENA_WIDTH ||
      enemy.y <= halfH ||
      enemy.y + halfH >= ENEMY_ARENA_MAX_ROW * CELL_HEIGHT;

    if (hitWall) {
      scene.events.emit('chargeHitWall', { enemy, impactX: enemy.x, impactY: enemy.y });
      this.done = true;
    }
  }

  exit(enemy, player, scene) {
    enemy._chargeTint = false;
    enemy.isCharging = false;
  }
}
