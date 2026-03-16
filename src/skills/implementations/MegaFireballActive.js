import { BaseActiveSkill } from '../BaseActiveSkill.js';
import Projectile from '../../entities/Projectile.js';
import { CELL_WIDTH, CELL_HEIGHT } from '../../constants.js';

const OCTAGONAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export class MegaFireballActive extends BaseActiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
    this.trackedProjectiles = [];
  }

  cast() {
    if (!this.isReady()) return;

    const color = typeof this.config.color === 'string'
      ? parseInt(this.config.color)
      : (this.config.color || 0xff2200);

    for (const angleDeg of OCTAGONAL_ANGLES) {
      const proj = new Projectile(this.scene, {
        worldX: this.player.x,
        worldY: this.player.y,
        directionDegrees: angleDeg,
        speed: this.config.speed,
        damage: this.config.damage,
        enemyDamage: this.config.damage,
        terrainDamage: this.config.terrainDamage || this.config.damage,
        pierceMode: this.config.pierceMode || 'destroy_all',
        radius: this.config.radius || 18,
        maxHits: -1,
        lifetime: 8000,
        onDestroyEffect: 'explode',
        color: color,
        damageType: 'fire'
      });
      proj.isPlayerProjectile = true;
      proj.inflictStatus = { type: 'burned', durationMs: 5000 };

      if (this.scene.attackSystem) {
        this.scene.attackSystem.projectiles.push(proj);
      }

      this.trackedProjectiles.push(proj);
    }

    this.triggerCooldown();
  }

  update(dt) {
    super.update(dt);

    // Track projectile positions and lay blaze tiles
    const terrainMgr = this.scene.terrainEffectManager;
    if (!terrainMgr) return;

    for (let i = this.trackedProjectiles.length - 1; i >= 0; i--) {
      const proj = this.trackedProjectiles[i];
      if (!proj.active) {
        this.trackedProjectiles.splice(i, 1);
        continue;
      }
      const col = Math.floor(proj.x / CELL_WIDTH);
      const row = Math.floor(proj.y / CELL_HEIGHT);
      terrainMgr.addEffect('blaze', col, row, 5000, 5000);
    }
  }
}
