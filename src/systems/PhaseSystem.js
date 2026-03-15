import { PHASE_TRANSITION_PAUSE_MS } from '../constants.js';

export default class PhaseSystem {
  constructor(scene, enemies, attackSystem) {
    this.scene = scene;
    this.enemies = enemies;
    this.attackSystem = attackSystem;
  }

  update() {
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.phaseTransitioning) continue;

      const hpRatio = enemy.hp / enemy.maxHp;
      const phases = enemy.phases;

      // Find the highest phase index whose threshold we've crossed
      let targetPhase = 0;
      for (let i = phases.length - 1; i >= 0; i--) {
        if (hpRatio <= phases[i].hpThreshold) {
          targetPhase = i;
          break;
        }
      }

      if (targetPhase > enemy.currentPhase) {
        this.triggerPhaseTransition(enemy, targetPhase);
      }
    }
  }

  triggerPhaseTransition(enemy, newPhase) {
    enemy.startPhaseTransition(newPhase);

    // Pause attack system during transition
    this.attackSystem.pauseForTransition(PHASE_TRANSITION_PAUSE_MS);

    // Clear current attacks
    this.attackSystem.clearAll();

    // After transition, reschedule attacks
    this.scene.time.delayedCall(PHASE_TRANSITION_PAUSE_MS, () => {
      this.attackSystem.reschedule();
    });
  }
}
