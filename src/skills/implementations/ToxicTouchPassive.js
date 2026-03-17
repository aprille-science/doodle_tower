import { BasePassiveSkill } from '../BasePassiveSkill.js';

export class ToxicTouchPassive extends BasePassiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
    this.poisonDurationMs = config.poisonDurationMs || 2000;
  }

  activate() {}

  update(dt) {
    if (!this.player.alive) return;
    if (!this.scene.enemies || !this.scene.statusEffectManager) return;
    if (!this.scene.physicsSystem) return;

    // Check if player is touching any enemy and apply poison
    for (const enemy of this.scene.enemies) {
      if (!enemy.alive) continue;
      const bounds = enemy.getBounds();
      if (this.scene.physicsSystem.circleRectOverlap(
        this.player.x, this.player.y, this.player.radius,
        bounds.x, bounds.y, bounds.width, bounds.height
      )) {
        this.scene.statusEffectManager.applyStatus(enemy, 'poisoned', this.poisonDurationMs);
      }
    }
  }

  deactivate() {}
}
