import { BaseBehavior } from '../BaseBehavior.js';
import { CELL_HEIGHT, ENEMY_ARENA_MAX_ROW } from '../../../constants.js';

export class TweenYBehavior extends BaseBehavior {
  constructor(config) {
    super(config);
    this.easing = config.easing || 'Sine.easeInOut';
    this.bounceAtEdge = config.bounceAtEdge !== false;
    this.tween = null;
    this.movingDown = true;
  }

  enter(enemy, player, scene) {
    this.startTween(enemy, scene);
  }

  startTween(enemy, scene) {
    if (this.tween) {
      this.tween.destroy();
      this.tween = null;
    }

    const halfH = (enemy.height || CELL_HEIGHT) / 2;
    const maxY = ENEMY_ARENA_MAX_ROW * CELL_HEIGHT - halfH;
    const targetY = this.movingDown ? maxY : halfH;
    const duration = this.config.durationMs || 4000;

    this.tween = scene.tweens.add({
      targets: enemy,
      y: targetY,
      duration: duration,
      ease: this.easing,
      onComplete: () => {
        scene.events.emit('tweenCycleComplete', { enemy });
        if (this.bounceAtEdge) {
          this.movingDown = !this.movingDown;
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
    const dtSec = dt / 1000;
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
