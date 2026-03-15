import { BaseActiveSkill } from '../BaseActiveSkill.js';

// Dash active skill stub — player dashes in pointer direction with brief invincibility frames
// Config: { cooldownMs, dashSpeed, dashDurationMs, invincibilityMs }
export class DashActive extends BaseActiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
  }

  cast(pointerWorldX, pointerWorldY) {
    // Compute direction from player to pointer, apply dash velocity for dashDurationMs,
    // grant invincibility frames for invincibilityMs
  }
}
