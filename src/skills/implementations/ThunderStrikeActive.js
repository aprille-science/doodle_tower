import { BaseActiveSkill } from '../BaseActiveSkill.js';
import Projectile from '../../entities/Projectile.js';
import { CELL_WIDTH, CELL_HEIGHT, GAME_SPEED_SCALE } from '../../constants.js';

export class ThunderStrikeActive extends BaseActiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
    this.trackedProjectile = null;
  }

  cast() {
    if (!this.isReady()) return;

    // Find closest enemy
    let closest = null;
    let closestDist = Infinity;
    if (this.scene.enemies) {
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
    }

    // Default direction: upward if no enemies
    let angle = -90;
    if (closest) {
      const dx = closest.x - this.player.x;
      const dy = closest.y - this.player.y;
      angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
    }

    const proj = new Projectile(this.scene, {
      worldX: this.player.x,
      worldY: this.player.y,
      directionDegrees: angle,
      speed: (this.config.speed || 400) / GAME_SPEED_SCALE,
      damage: this.config.damage || 100,
      enemyDamage: this.config.damage || 100,
      terrainDamage: this.config.terrainDamage || 50,
      pierceMode: 'pierce_enemies',
      radius: this.config.radius || 36,
      maxHits: -1,
      lifetime: 5000,
      onDestroyEffect: 'explode',
      color: this.config.color ? parseInt(this.config.color) : 0xffee00,
      damageType: 'lightning'
    });
    proj.isPlayerProjectile = true;
    proj.inflictStatus = { type: 'paralyzed', durationMs: this.config.paralyzeDurationMs || 5000 };

    if (this.scene.attackSystem) {
      this.scene.attackSystem.projectiles.push(proj);
    }

    this.trackedProjectile = proj;
    this.triggerCooldown();
  }

  update(dt) {
    super.update(dt);

    // Track projectile and lay electric terrain
    if (!this.trackedProjectile) return;
    const terrainMgr = this.scene.terrainEffectManager;
    if (!terrainMgr) return;

    if (!this.trackedProjectile.active) {
      this.trackedProjectile = null;
      return;
    }

    const col = Math.floor(this.trackedProjectile.x / CELL_WIDTH);
    const row = Math.floor(this.trackedProjectile.y / CELL_HEIGHT);
    terrainMgr.addEffect('electric', col, row, 5000, 5000);
  }
}
