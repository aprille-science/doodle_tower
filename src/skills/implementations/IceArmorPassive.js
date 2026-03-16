import { BasePassiveSkill } from '../BasePassiveSkill.js';

export class IceArmorPassive extends BasePassiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
  }

  activate() {
    // Apply 50% damage reduction to player
    this.player.damageReduction = this.config.damageReduction || 0.5;
  }

  update(dt) {
    // No per-frame logic needed — reduction is a flat multiplier on player
  }

  deactivate() {
    this.player.damageReduction = 1;
  }
}
