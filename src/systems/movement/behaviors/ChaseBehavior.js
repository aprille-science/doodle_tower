import { BaseBehavior } from '../BaseBehavior.js';
import { LOOK_AHEAD_SECONDS } from '../../../constants.js';

export class ChaseBehavior extends BaseBehavior {
  constructor(config) {
    super(config);
    this.speed = config.speed || 100;
    this.predictionFactor = config.predictionFactor || 0;
  }

  update(dt, enemy, player, scene) {
    super.update(dt, enemy, player, scene);
    if (this.done) return;

    const dtSec = dt / 1000;
    const targetX = player.x + (player.vx || 0) * this.predictionFactor * LOOK_AHEAD_SECONDS;
    const targetY = player.y + (player.vy || 0) * this.predictionFactor * LOOK_AHEAD_SECONDS;

    enemy.navAgent.moveToward(targetX, targetY, this.speed, dtSec, scene.enemies || []);
  }
}
