import { BehaviorFactory } from './BehaviorFactory.js';
import { NavigationAgent } from '../navigation/NavigationAgent.js';
import { CELL_WIDTH, CELL_HEIGHT } from '../../constants.js';

export class MovementSystem {
  constructor(obstacleMap, pathfinder, steeringSystem) {
    this.obstacleMap = obstacleMap;
    this.pathfinder = pathfinder;
    this.steeringSystem = steeringSystem;
    this.registeredEnemies = [];
  }

  register(enemy, player, scene) {
    const navAgent = new NavigationAgent(enemy, this.obstacleMap, this.pathfinder, this.steeringSystem);
    enemy.navAgent = navAgent;

    const movementData = enemy.data ? enemy.data.movementBehavior : (enemy.movementBehavior || null);
    if (movementData) {
      const behavior = BehaviorFactory.create(movementData);
      enemy._movementBehavior = behavior;
      behavior.enter(enemy, player, scene);
    }

    this.registeredEnemies.push(enemy);
  }

  update(dt, allEnemies, player, scene) {
    // Update soft obstacle map
    this.obstacleMap.clearEnemyPresence();
    for (const enemy of allEnemies) {
      if (!enemy.alive) continue;
      const col = Math.floor(enemy.x / CELL_WIDTH);
      const row = Math.floor(enemy.y / CELL_HEIGHT);
      this.obstacleMap.setEnemyPresence(col, row, true);
    }

    // Update each enemy's behavior
    for (const enemy of this.registeredEnemies) {
      if (!enemy.alive) continue;

      // Check status effects for movement modification
      const statusMgr = scene.statusEffectManager;
      if (statusMgr && statusMgr.isFrozen(enemy)) {
        // Frozen: skip movement entirely and pause tweens
        if (enemy._movementBehavior) {
          enemy._movementBehavior.setSpeedScale(0);
        }
        enemy.draw();
        continue;
      }

      const speedMult = statusMgr ? statusMgr.getSpeedMultiplier(enemy) : 1;
      if (enemy._movementBehavior) {
        // Apply speed scale to tween-based behaviors
        enemy._movementBehavior.setSpeedScale(speedMult);
        // Pass speed multiplier through delta scaling
        const effectiveDt = dt * speedMult;
        enemy._movementBehavior.update(effectiveDt, enemy, player, scene);
      }
      enemy.draw();
    }
  }

  onEnemyHit(enemy) {
    if (enemy._movementBehavior && enemy._movementBehavior.triggerReaction) {
      enemy._movementBehavior.triggerReaction('on_hit');
    }
    if (enemy._movementBehavior && enemy._movementBehavior.stateMachine) {
      enemy._movementBehavior.stateMachine.checkPhaseTransition(
        enemy,
        null, // player will be passed by scene
        enemy.scene
      );
    }
  }

  onPhaseEnter(enemy) {
    if (enemy._movementBehavior && enemy._movementBehavior.triggerReaction) {
      enemy._movementBehavior.triggerReaction('on_phase_enter');
    }
  }

  invalidateAllPaths() {
    for (const enemy of this.registeredEnemies) {
      if (enemy.navAgent) {
        enemy.navAgent.invalidatePath();
      }
    }
  }
}
