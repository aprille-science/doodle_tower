import { BasePassiveSkill } from '../BasePassiveSkill.js';
import Projectile from '../../entities/Projectile.js';
import { GAME_SPEED_SCALE } from '../../constants.js';

export class StormBoltPassive extends BasePassiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
    this.timer = 0;
    this.intervalMs = config.intervalMs || 3000;
  }

  activate() {
    this.timer = 0;
  }

  update(dt) {
    if (!this.player.alive) return;
    this.timer += dt;

    if (this.timer >= this.intervalMs) {
      this.timer -= this.intervalMs;
      this.fireAtClosestEnemy();
    }
  }

  fireAtClosestEnemy() {
    if (!this.scene.enemies) return;

    let closest = null;
    let closestDist = Infinity;
    for (const enemy of this.scene.enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = dx * dx + dy * dy;
      if (dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    }
    if (!closest) return;

    const dx = closest.x - this.player.x;
    const dy = closest.y - this.player.y;
    const angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));

    const pierce = this.config.pierceMode || 'none';
    const proj = new Projectile(this.scene, {
      worldX: this.player.x,
      worldY: this.player.y,
      directionDegrees: angle,
      speed: (this.config.speed || 600) / GAME_SPEED_SCALE, // compensate since Projectile applies scale
      damage: this.config.damage || 15,
      enemyDamage: this.config.damage || 15,
      pierceMode: pierce,
      radius: this.config.radius || 5,
      maxHits: pierce === 'pierce_enemies' ? -1 : 1,
      lifetime: 3000,
      onDestroyEffect: 'fizzle',
      color: this.config.color ? parseInt(this.config.color) : 0xffee00,
      damageType: 'lightning'
    });
    proj.isPlayerProjectile = true;
    proj.inflictStatus = { type: 'paralyzed', durationMs: this.config.paralyzeDurationMs || 1000 };

    if (this.scene.attackSystem) {
      this.scene.attackSystem.projectiles.push(proj);
    }
  }

  deactivate() {
    this.timer = 0;
  }
}
