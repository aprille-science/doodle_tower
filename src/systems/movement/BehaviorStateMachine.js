import { BehaviorFactory } from './BehaviorFactory.js';
import { PHASE_TRANSITION_PAUSE_MS } from '../../constants.js';

export class BehaviorStateMachine {
  constructor(config) {
    this.phases = (config.phases || []).sort((a, b) => b.hpThreshold - a.hpThreshold);
    this.reactions = config.reactions || [];
    this.currentPhaseIndex = 0;
    this.currentStepIndex = 0;
    this.currentBehavior = null;
    this.reactionBehavior = null;
    this.inReaction = false;
    this.reactionCooldowns = new Map();
    this.transitioning = false;
    this.transitionTimer = 0;
  }

  enter(enemy, player, scene) {
    this.determinePhase(enemy);
    this.startStep(enemy, player, scene);
  }

  determinePhase(enemy) {
    const hpRatio = enemy.hp / enemy.maxHp;
    for (let i = 0; i < this.phases.length; i++) {
      if (hpRatio <= this.phases[i].hpThreshold) {
        this.currentPhaseIndex = i;
      }
    }
  }

  startStep(enemy, player, scene) {
    const phase = this.phases[this.currentPhaseIndex];
    if (!phase || !phase.steps || phase.steps.length === 0) return;

    if (this.currentStepIndex >= phase.steps.length) {
      if (phase.loop) {
        this.currentStepIndex = 0;
      } else {
        return;
      }
    }

    const stepConfig = phase.steps[this.currentStepIndex];
    this.currentBehavior = BehaviorFactory.create(stepConfig);
    this.currentBehavior.enter(enemy, player, scene);
  }

  update(dt, enemy, player, scene) {
    if (this.transitioning) {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        this.transitioning = false;
        this.currentStepIndex = 0;
        this.startStep(enemy, player, scene);
      }
      return;
    }

    // Handle reaction
    if (this.inReaction && this.reactionBehavior) {
      this.reactionBehavior.update(dt, enemy, player, scene);
      if (this.reactionBehavior.done) {
        this.reactionBehavior.exit(enemy, player, scene);
        this.reactionBehavior = null;
        this.inReaction = false;
        // Resume current step (re-enter it)
        if (this.currentBehavior) {
          this.currentBehavior.enter(enemy, player, scene);
        }
      }
      return;
    }

    // Check pending reactions
    if (this.pendingReaction) {
      this.startReaction(this.pendingReaction, enemy, player, scene);
      this.pendingReaction = null;
      return;
    }

    // Update current step
    if (this.currentBehavior) {
      this.currentBehavior.update(dt, enemy, player, scene);
      if (this.currentBehavior.done) {
        this.currentBehavior.exit(enemy, player, scene);
        this.currentStepIndex++;
        this.startStep(enemy, player, scene);
      }
    }
  }

  exit(enemy, player, scene) {
    if (this.currentBehavior) {
      this.currentBehavior.exit(enemy, player, scene);
    }
    if (this.reactionBehavior) {
      this.reactionBehavior.exit(enemy, player, scene);
    }
  }

  checkPhaseTransition(enemy, player, scene) {
    const hpRatio = enemy.hp / enemy.maxHp;
    let newPhaseIndex = 0;
    for (let i = 0; i < this.phases.length; i++) {
      if (hpRatio <= this.phases[i].hpThreshold) {
        newPhaseIndex = i;
      }
    }

    if (newPhaseIndex !== this.currentPhaseIndex) {
      // Transition
      if (this.currentBehavior) {
        this.currentBehavior.exit(enemy, player, scene);
        this.currentBehavior = null;
      }
      this.currentPhaseIndex = newPhaseIndex;
      this.transitioning = true;
      this.transitionTimer = PHASE_TRANSITION_PAUSE_MS;
      scene.events.emit('phaseTransition', { enemy, phase: newPhaseIndex });
    }
  }

  triggerReaction(triggerName) {
    const now = Date.now();
    for (const reaction of this.reactions) {
      if (reaction.trigger === triggerName) {
        const cooldownKey = triggerName;
        const lastTriggered = this.reactionCooldowns.get(cooldownKey) || 0;
        const cooldownMs = reaction.cooldownMs || 0;

        if (now - lastTriggered >= cooldownMs) {
          this.reactionCooldowns.set(cooldownKey, now);
          this.pendingReaction = reaction;
          return;
        }
      }
    }
  }

  setSpeedScale(scale) {
    if (this.inReaction && this.reactionBehavior) {
      this.reactionBehavior.setSpeedScale(scale);
    } else if (this.currentBehavior) {
      this.currentBehavior.setSpeedScale(scale);
    }
  }

  startReaction(reaction, enemy, player, scene) {
    if (this.currentBehavior) {
      this.currentBehavior.exit(enemy, player, scene);
    }
    this.inReaction = true;
    this.reactionBehavior = BehaviorFactory.create(reaction.behavior);
    this.reactionBehavior.enter(enemy, player, scene);
  }
}
