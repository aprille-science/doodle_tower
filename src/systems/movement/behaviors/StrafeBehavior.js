import { BaseBehavior } from '../BaseBehavior.js';
import { CELL_WIDTH } from '../../../constants.js';

export class StrafeBehavior extends BaseBehavior {
  constructor(config) {
    super(config);
    this.preferredDistance = config.preferredDistance || 5;
    this.speed = config.speed || 100;
    this.direction = 1; // 1 or -1 for strafe direction
  }

  enter(enemy, player, scene) {
    // Pick initial strafe direction randomly
    this.direction = Math.random() < 0.5 ? 1 : -1;
  }

  update(dt, enemy, player, scene) {
    super.update(dt, enemy, player, scene);
    if (this.done) return;

    const dtSec = dt / 1000;

    // Vector from enemy to player
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.01) return;

    // Perpendicular direction (rotate 90 degrees)
    let perpX = -dy / dist * this.direction;
    let perpY = dx / dist * this.direction;

    // Corrective component if distance deviates
    const preferredDist = this.preferredDistance * CELL_WIDTH;
    const distError = dist - preferredDist;

    let vx = perpX * this.speed;
    let vy = perpY * this.speed;

    if (Math.abs(distError) > 2 * CELL_WIDTH) {
      // Add corrective force toward/away from player
      const correction = distError > 0 ? 0.5 : -0.5;
      vx += (dx / dist) * this.speed * correction;
      vy += (dy / dist) * this.speed * correction;
    }

    enemy.navAgent.moveDirectly(vx, vy, dtSec, scene.enemies || []);
  }
}
