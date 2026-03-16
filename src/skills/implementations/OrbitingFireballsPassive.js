import { BasePassiveSkill } from '../BasePassiveSkill.js';
import { ORBIT_SPIN_MULTIPLIER } from '../../constants.js';

export class OrbitingFireballsPassive extends BasePassiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
    this.fireballs = [];
    this.angle = 0;
    this.damageHitMap = new Map(); // enemyId -> lastHitTime
  }

  activate() {
    const count = this.config.count || 3;
    const color = typeof this.config.color === 'string' ? parseInt(this.config.color) : (this.config.color || 0xff6600);
    const radius = this.config.radius || 8;

    for (let i = 0; i < count; i++) {
      const gfx = this.scene.add.graphics();
      const glowGfx = this.scene.add.graphics();
      this.fireballs.push({ gfx, glowGfx, index: i });
    }
  }

  update(dt) {
    if (!this.player.alive) return;

    const dtSec = dt / 1000;
    this.angle += (this.config.angularSpeed || 180) * ORBIT_SPIN_MULTIPLIER * dtSec;

    const count = this.fireballs.length;
    const orbitRadius = this.config.orbitRadius || 55;
    const fbRadius = this.config.radius || 8;
    const color = typeof this.config.color === 'string' ? parseInt(this.config.color) : (this.config.color || 0xff6600);

    for (let i = 0; i < count; i++) {
      const fb = this.fireballs[i];
      const angleRad = (this.angle + i * (360 / count)) * (Math.PI / 180);
      const fx = this.player.x + Math.cos(angleRad) * orbitRadius;
      const fy = this.player.y + Math.sin(angleRad) * orbitRadius;

      fb.gfx.clear();
      fb.gfx.fillStyle(color, 1);
      fb.gfx.fillCircle(fx, fy, fbRadius);

      fb.glowGfx.clear();
      fb.glowGfx.fillStyle(color, 0.2);
      fb.glowGfx.fillCircle(fx, fy, fbRadius * 1.8);

      fb.x = fx;
      fb.y = fy;
    }

    // Check collisions with enemies
    if (this.scene.enemies) {
      const now = Date.now();
      const cooldown = this.config.damageTickCooldownMs || 500;

      for (const enemy of this.scene.enemies) {
        if (!enemy.alive) continue;

        for (const fb of this.fireballs) {
          const bounds = enemy.getBounds();
          const dx = fb.x - (bounds.x + bounds.width / 2);
          const dy = fb.y - (bounds.y + bounds.height / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const hitDist = fbRadius + Math.max(bounds.width, bounds.height) / 2;

          if (dist < hitDist) {
            const key = `${enemy.id || enemy}_${fb.index}`;
            const lastHit = this.damageHitMap.get(key) || 0;
            if (now - lastHit >= cooldown) {
              const dmg = Math.round(this.config.damage || 1);
              if (this.scene.damageSystem) {
                this.scene.damageSystem.applyDamageToEnemy(enemy, dmg);
              } else {
                enemy.takeDamage(dmg);
                this.scene.events.emit('enemyDamaged', enemy, dmg);
              }
              // Inflict BURNED status
              if (this.scene.statusEffectManager) {
                this.scene.statusEffectManager.applyStatus(enemy, 'burned', 2000);
              }
              this.damageHitMap.set(key, now);
            }
            break; // One fireball hit per enemy per check
          }
        }
      }
    }
  }

  deactivate() {
    for (const fb of this.fireballs) {
      fb.gfx.destroy();
      fb.glowGfx.destroy();
    }
    this.fireballs = [];
    this.damageHitMap.clear();
  }
}
