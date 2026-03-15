import { BaseBehavior } from '../BaseBehavior.js';
import { CELL_WIDTH, CELL_HEIGHT } from '../../../constants.js';

export class MoveToBehavior extends BaseBehavior {
  constructor(config) {
    super(config);
    this.waypoints = config.waypoints || [];
    this.loop = config.loop || false;
    this.currentIndex = 0;
    this.waiting = false;
    this.waitTimer = 0;
  }

  update(dt, enemy, player, scene) {
    if (this.done || this.waypoints.length === 0) {
      this.done = true;
      return;
    }

    const dtSec = dt / 1000;

    if (this.waiting) {
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) {
        this.waiting = false;
        this.currentIndex++;
        if (this.currentIndex >= this.waypoints.length) {
          if (this.loop) {
            this.currentIndex = 0;
          } else {
            this.done = true;
            return;
          }
        }
      }
      return;
    }

    const wp = this.waypoints[this.currentIndex];
    const targetX = wp.col * CELL_WIDTH + CELL_WIDTH / 2;
    const targetY = wp.row * CELL_HEIGHT + CELL_HEIGHT / 2;
    const speed = wp.speed || 100;

    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      this.waiting = true;
      this.waitTimer = wp.waitMs || 0;
      return;
    }

    enemy.navAgent.moveToward(targetX, targetY, speed, dtSec, scene.enemies || []);
  }
}
