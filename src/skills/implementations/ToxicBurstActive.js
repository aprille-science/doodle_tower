import { BaseActiveSkill } from '../BaseActiveSkill.js';
import { CELL_WIDTH } from '../../constants.js';

export class ToxicBurstActive extends BaseActiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
  }

  cast() {
    if (!this.isReady()) return;

    const radiusTiles = this.config.radiusTiles || 5;
    const radiusPx = radiusTiles * CELL_WIDTH;
    const damage = this.config.damage || 10;
    const poisonDuration = this.config.poisonDurationMs || 10000;

    // Visual: expanding toxic ring
    this.playToxicEffect(radiusPx);

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
          }
          if (this.scene.statusEffectManager) {
            this.scene.statusEffectManager.applyStatus(enemy, 'poisoned', poisonDuration);
          }
        }
      }
    }

    this.triggerCooldown();
  }

  playToxicEffect(maxRadius) {
    const gfx = this.scene.add.graphics().setDepth(100);
    const cx = this.player.x;
    const cy = this.player.y;

    this.scene.tweens.add({
      targets: { r: 0 },
      r: maxRadius,
      duration: 400,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const r = tween.getValue();
        const a = Phaser.Math.Linear(0.7, 0, tween.progress);
        gfx.clear();
        gfx.fillStyle(0x66ff22, a * 0.3);
        gfx.fillCircle(cx, cy, r);
        gfx.lineStyle(3, 0x44cc11, a);
        gfx.strokeCircle(cx, cy, r);
      },
      onComplete: () => gfx.destroy()
    });
  }
}
