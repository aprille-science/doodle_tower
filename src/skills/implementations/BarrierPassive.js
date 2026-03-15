import { BasePassiveSkill } from '../BasePassiveSkill.js';

// Barrier passive skill stub — periodic auto-shield that absorbs one hit every N seconds
// Config: { intervalMs, absorbAmount }
export class BarrierPassive extends BasePassiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
  }

  activate() {
    // Start a repeating timer that grants a one-hit barrier to the player
  }

  update(dt) {
    // Check if barrier is available, render visual indicator around player
  }

  deactivate() {
    // Remove barrier timer and visuals
  }
}
