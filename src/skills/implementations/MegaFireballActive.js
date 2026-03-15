import { BaseActiveSkill } from '../BaseActiveSkill.js';
import Projectile from '../../entities/Projectile.js';

export class MegaFireballActive extends BaseActiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
  }

  cast(pointerWorldX, pointerWorldY) {
    if (!this.isReady()) return;

    const dx = pointerWorldX - this.player.x;
    const dy = pointerWorldY - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    const dirX = dx / dist;
    const dirY = dy / dist;

    const color = typeof this.config.color === 'string' ? parseInt(this.config.color) : (this.config.color || 0xff2200);

    const proj = new Projectile(this.scene, {
      worldX: this.player.x,
      worldY: this.player.y,
      vx: dirX * this.config.speed,
      vy: dirY * this.config.speed,
      speed: this.config.speed,
      damage: this.config.damage,
      enemyDamage: this.config.enemyDamage,
      pierceMode: this.config.pierceMode || 'destroy_all',
      radius: this.config.radius || 18,
      maxHits: -1,
      lifetime: 8000,
      onDestroyEffect: 'explode',
      color: color,
      damageType: 'fire'
    });
    proj.isPlayerProjectile = true;

    // Add to the scene's attack system projectile list
    if (this.scene.attackSystem) {
      this.scene.attackSystem.projectiles.push(proj);
    }

    this.triggerCooldown();
  }
}
