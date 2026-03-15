import { StaticBehavior } from './behaviors/StaticBehavior.js';
import { ChaseBehavior } from './behaviors/ChaseBehavior.js';
import { RandomMoveBehavior } from './behaviors/RandomMoveBehavior.js';
import { TweenXBehavior } from './behaviors/TweenXBehavior.js';
import { TweenYBehavior } from './behaviors/TweenYBehavior.js';
import { RunBehavior } from './behaviors/RunBehavior.js';
import { MoveToBehavior } from './behaviors/MoveToBehavior.js';
import { OrbitBehavior } from './behaviors/OrbitBehavior.js';
import { StrafeBehavior } from './behaviors/StrafeBehavior.js';
import { ChargeBehavior } from './behaviors/ChargeBehavior.js';
import { TeleportBehavior } from './behaviors/TeleportBehavior.js';
import { PatrolBehavior } from './behaviors/PatrolBehavior.js';
import { CompositeBehavior } from './behaviors/CompositeBehavior.js';

const BEHAVIOR_MAP = {
  static: StaticBehavior,
  chase: ChaseBehavior,
  random_move: RandomMoveBehavior,
  tweenX: TweenXBehavior,
  tweenY: TweenYBehavior,
  run: RunBehavior,
  moveTo: MoveToBehavior,
  orbit: OrbitBehavior,
  strafe: StrafeBehavior,
  charge: ChargeBehavior,
  teleport: TeleportBehavior,
  patrol: PatrolBehavior,
  composite: CompositeBehavior
};

export class BehaviorFactory {
  static create(config) {
    const type = config.type;
    const BehaviorClass = BEHAVIOR_MAP[type];
    if (!BehaviorClass) {
      throw new Error(`Unknown behavior type: "${type}". Valid types: ${Object.keys(BEHAVIOR_MAP).join(', ')}`);
    }
    return new BehaviorClass(config);
  }
}
