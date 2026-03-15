import { BaseActiveSkill } from '../BaseActiveSkill.js';

// Time freeze active skill stub — pauses all enemies and projectiles for N seconds
// Config: { cooldownMs, freezeDurationMs }
export class TimeFreezeActive extends BaseActiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
  }

  cast(pointerWorldX, pointerWorldY) {
    // Set scene.time.timeScale to near-zero for freezeDurationMs,
    // player remains at normal speed (exempt from timeScale)
  }
}
