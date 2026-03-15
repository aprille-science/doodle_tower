import { BasePassiveSkill } from '../BasePassiveSkill.js';

// Aura damage passive skill stub — constant damage aura around player at a fixed radius
// Config: { radius, damage, tickIntervalMs, color }
export class AuraDamagePassive extends BasePassiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
  }

  activate() {
    // Create a semi-transparent circle graphic at player position
    // Start damage tick timer
  }

  update(dt) {
    // Reposition aura at player position
    // On each tick interval, check all enemies within radius and deal damage
  }

  deactivate() {
    // Destroy aura graphic, stop timer
  }
}
