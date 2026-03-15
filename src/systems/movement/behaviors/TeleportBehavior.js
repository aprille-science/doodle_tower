import { BaseBehavior } from '../BaseBehavior.js';
import { CELL_WIDTH, CELL_HEIGHT, GRID_COLS, ENEMY_ARENA_MAX_ROW } from '../../../constants.js';

export class TeleportBehavior extends BaseBehavior {
  constructor(config) {
    super(config);
    this.targetCol = config.targetCol;
    this.targetRow = config.targetRow;
    this.delayMs = config.delayMs || 400;
    this.timer = 0;
    this.teleported = false;
  }

  enter(enemy, player, scene) {
    enemy._visible = false;
    this.timer = this.delayMs;
    this.teleported = false;

    // Pick random target if null
    if (this.targetCol === null || this.targetCol === undefined) {
      this.targetCol = Math.floor(Math.random() * GRID_COLS);
    }
    if (this.targetRow === null || this.targetRow === undefined) {
      this.targetRow = Math.floor(Math.random() * ENEMY_ARENA_MAX_ROW);
    }
  }

  update(dt, enemy, player, scene) {
    if (this.done) return;

    this.timer -= dt;
    if (this.timer <= 0 && !this.teleported) {
      // Move enemy to target
      enemy.x = this.targetCol * CELL_WIDTH + CELL_WIDTH / 2;
      enemy.y = this.targetRow * CELL_HEIGHT + CELL_HEIGHT / 2;
      enemy._visible = true;
      enemy.navAgent.invalidatePath();

      // Flash effect
      this.playTeleportEffect(enemy, scene);
      this.teleported = true;
      this.done = true;
    }
  }

  playTeleportEffect(enemy, scene) {
    const gfx = scene.add.graphics();
    let radius = 5;
    const expandDuration = 300;
    let elapsed = 0;

    const timer = scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        elapsed += 16;
        const progress = elapsed / expandDuration;
        gfx.clear();
        if (progress >= 1) {
          gfx.destroy();
          timer.destroy();
          return;
        }
        gfx.lineStyle(2, 0xaaffff, 1 - progress);
        gfx.strokeCircle(enemy.x, enemy.y, 10 + progress * 40);
      }
    });
  }

  exit(enemy, player, scene) {
    enemy._visible = true;
  }
}
