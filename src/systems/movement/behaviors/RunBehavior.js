import { BaseBehavior } from '../BaseBehavior.js';

export class RunBehavior extends BaseBehavior {
  constructor(config) {
    super(config);
    this.speed = config.speed || 200;
  }

  update(dt, enemy, player, scene) {
    super.update(dt, enemy, player, scene);
    if (this.done) return;

    const dtSec = dt / 1000;
    enemy.navAgent.moveAwayFrom(player.x, player.y, this.speed, dtSec, scene.enemies || []);
  }
}
