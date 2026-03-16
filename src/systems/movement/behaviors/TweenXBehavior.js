import { BaseBehavior } from '../BaseBehavior.js';
import { ARENA_WIDTH, CELL_WIDTH } from '../../../constants.js';

export class TweenXBehavior extends BaseBehavior {
  constructor(config) {
    super(config);
    this.easing = config.easing || 'Sine.easeInOut';
    this.bounceAtEdge = config.bounceAtEdge !== false;
    this.tween = null;
    this.movingRight = true;
  }

  enter(enemy, player, scene) {
    this.startTween(enemy, scene);
  }

  startTween(enemy, scene) {
    if (this.tween) {
      this.tween.destroy();
      this.tween = null;
    }

    const halfW = (enemy.width || CELL_WIDTH) / 2;
    const targetX = this.movingRight ? ARENA_WIDTH - halfW : halfW;
    const duration = this.config.durationMs || 4000;

    this.tween = scene.tweens.add({
      targets: enemy,
      x: targetX,
      duration: duration,
      ease: this.easing,
      onComplete: () => {
        scene.events.emit('tweenCycleComplete', { enemy });
        if (this.bounceAtEdge) {
          this.movingRight = !this.movingRight;
          if (!this.done) {
            this.startTween(enemy, scene);
          }
        } else {
          this.done = true;
        }
      }
    });
  }

  update(dt, enemy, player, scene) {
    // Don't call super.update duration check — tween handles completion via cycles
    const dtSec = dt / 1000;
    // Keep separation active during tween
    enemy.navAgent.moveDirectly(0, 0, dtSec, scene.enemies || []);
  }

  setSpeedScale(scale) {
    if (this.tween) {
      this.tween.timeScale = scale;
    }
  }

  exit(enemy, player, scene) {
    if (this.tween) {
      this.tween.destroy();
      this.tween = null;
    }
  }
}
