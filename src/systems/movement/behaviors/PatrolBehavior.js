import { BaseBehavior } from '../BaseBehavior.js';
import { CELL_WIDTH, CELL_HEIGHT } from '../../../constants.js';

export class PatrolBehavior extends BaseBehavior {
  constructor(config) {
    super(config);
    this.waypoints = config.waypoints || [];
    this.speed = config.speed || 70;
    this.waitMs = config.waitMs || 400;
    this.randomOrder = config.randomOrder || false;
    this.currentIndex = 0;
    this.waiting = false;
    this.waitTimer = 0;
    this.orderedWaypoints = [...this.waypoints];
  }

  enter(enemy, player, scene) {
    if (this.randomOrder) {
      this.shuffleWaypoints();
    }
  }

  shuffleWaypoints() {
    this.orderedWaypoints = [...this.waypoints];
    for (let i = this.orderedWaypoints.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.orderedWaypoints[i], this.orderedWaypoints[j]] = [this.orderedWaypoints[j], this.orderedWaypoints[i]];
    }
  }

  update(dt, enemy, player, scene) {
    // Patrol always loops, never calls super.update duration check
    if (this.orderedWaypoints.length === 0) return;

    const dtSec = dt / 1000;

    if (this.waiting) {
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) {
        this.waiting = false;
        this.currentIndex++;
        if (this.currentIndex >= this.orderedWaypoints.length) {
          this.currentIndex = 0;
          if (this.randomOrder) this.shuffleWaypoints();
        }
      }
      return;
    }

    const wp = this.orderedWaypoints[this.currentIndex];
    const targetX = wp.col * CELL_WIDTH + CELL_WIDTH / 2;
    const targetY = wp.row * CELL_HEIGHT + CELL_HEIGHT / 2;

    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      this.waiting = true;
      this.waitTimer = this.waitMs;
      return;
    }

    enemy.navAgent.moveToward(targetX, targetY, this.speed, dtSec, scene.enemies || []);
  }
}
