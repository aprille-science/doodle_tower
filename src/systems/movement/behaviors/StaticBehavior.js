import { BaseBehavior } from '../BaseBehavior.js';

export class StaticBehavior extends BaseBehavior {
  constructor(config) {
    super(config);
  }

  update(dt, enemy, player, scene) {
    super.update(dt, enemy, player, scene);
    // Does nothing, enemy stays in place
  }
}
