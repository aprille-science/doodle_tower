import { BasePassiveSkill } from '../BasePassiveSkill.js';

export class TerrainCrusherPassive extends BasePassiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
    this.multiplier = config.terrainDamageMultiplier || 5;
  }

  activate() {
    // Store multiplier on player so PhysicsSystem/DamageSystem can use it
    this.player.terrainDamageMultiplier = this.multiplier;
  }

  update(dt) {}

  deactivate() {
    this.player.terrainDamageMultiplier = 1;
  }
}
