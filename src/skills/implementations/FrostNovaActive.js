import { BaseActiveSkill } from '../BaseActiveSkill.js';
import { CELL_WIDTH, CELL_HEIGHT } from '../../constants.js';
import { FloatingDamageNumber } from '../../ui/FloatingDamageNumber.js';
import { flashDamageTint } from '../../utils/DamageFlash.js';

export class FrostNovaActive extends BaseActiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
  }

  cast() {
    if (!this.isReady()) return;

    const radiusPx = (this.config.radiusTiles || 5) * CELL_WIDTH;
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
          // Apply damage
          if (this.scene.damageSystem) {
            this.scene.damageSystem.applyDamageToEnemy(enemy, damage);
          } else {
            enemy.takeDamage(damage);
            this.scene.events.emit('enemyDamaged', enemy, damage);
          }
          // Apply FROZEN status
          if (this.scene.statusEffectManager) {
            this.scene.statusEffectManager.applyStatus(enemy, 'frozen', freezeDuration);
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
