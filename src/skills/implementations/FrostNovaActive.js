import { BaseActiveSkill } from '../BaseActiveSkill.js';
import { CELL_WIDTH, CELL_HEIGHT, GRID_COLS, GRID_ROWS } from '../../constants.js';

export class FrostNovaActive extends BaseActiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
  }

  cast() {
    if (!this.isReady()) return;

    const radiusTiles = this.config.radiusTiles || 5;
    const radiusPx = radiusTiles * CELL_WIDTH;
    const damage = this.config.damage || 30;
    const freezeDuration = this.config.freezeDurationMs || 5000;

    // Visual: expanding frost ring
    this.playFrostEffect(radiusPx);

    // Hit all enemies within radius
    if (this.scene.enemies) {
      for (const enemy of this.scene.enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radiusPx) {
          if (this.scene.damageSystem) {
            this.scene.damageSystem.applyDamageToEnemy(enemy, damage);
          } else {
            enemy.takeDamage(damage);
            this.scene.events.emit('enemyDamaged', enemy, damage);
          }
          if (this.scene.statusEffectManager) {
            this.scene.statusEffectManager.applyStatus(enemy, 'frozen', freezeDuration);
          }
        }
      }
    }

    // Lay frost terrain tiles within radius
    const terrainMgr = this.scene.terrainEffectManager;
    if (terrainMgr) {
      const centerCol = Math.floor(this.player.x / CELL_WIDTH);
      const centerRow = Math.floor(this.player.y / CELL_HEIGHT);
      for (let dc = -radiusTiles; dc <= radiusTiles; dc++) {
        for (let dr = -radiusTiles; dr <= radiusTiles; dr++) {
          const c = centerCol + dc;
          const r = centerRow + dr;
          if (c < 0 || c >= GRID_COLS || r < 0 || r >= GRID_ROWS) continue;
          // Check within circular radius
          const tileX = c * CELL_WIDTH + CELL_WIDTH / 2;
          const tileY = r * CELL_HEIGHT + CELL_HEIGHT / 2;
          const dx = tileX - this.player.x;
          const dy = tileY - this.player.y;
          if (Math.sqrt(dx * dx + dy * dy) <= radiusPx) {
            terrainMgr.addEffect('frost', c, r, 3000, 3000);
          }
        }
      }
    }

    this.triggerCooldown();
  }

  playFrostEffect(maxRadius) {
    const gfx = this.scene.add.graphics().setDepth(100);
    const cx = this.player.x;
    const cy = this.player.y;

    this.scene.tweens.add({
      targets: { r: 0, alpha: 0.7 },
      r: maxRadius,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const r = tween.getValue();
        const a = Phaser.Math.Linear(0.7, 0, tween.progress);
        gfx.clear();
        gfx.fillStyle(0x44ccff, a * 0.3);
        gfx.fillCircle(cx, cy, r);
        gfx.lineStyle(3, 0x88eeff, a);
        gfx.strokeCircle(cx, cy, r);
      },
      onComplete: () => gfx.destroy()
    });
  }
}
