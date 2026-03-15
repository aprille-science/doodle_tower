import { BaseBehavior } from '../BaseBehavior.js';
import { BehaviorStateMachine } from '../BehaviorStateMachine.js';

export class CompositeBehavior extends BaseBehavior {
  constructor(config) {
    super(config);
    this.stateMachine = new BehaviorStateMachine(config);
  }

  enter(enemy, player, scene) {
    this.stateMachine.enter(enemy, player, scene);
  }

  update(dt, enemy, player, scene) {
    this.stateMachine.update(dt, enemy, player, scene);
  }

  exit(enemy, player, scene) {
    this.stateMachine.exit(enemy, player, scene);
  }

  triggerReaction(triggerName) {
    this.stateMachine.triggerReaction(triggerName);
  }
}
