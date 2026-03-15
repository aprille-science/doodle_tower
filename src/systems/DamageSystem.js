import { CELL_WIDTH, CELL_HEIGHT } from '../constants.js';

export default class DamageSystem {
  constructor(scene, player, shieldSystem) {
    this.scene = scene;
    this.player = player;
    this.shieldSystem = shieldSystem;
  }

  update(terrainTiles, attackZones, projectiles, physicsSystem) {
    if (!this.player.alive) return;

    const playerCol = this.player.getCol();
    const playerRow = this.player.getRow();

    // 1. Terrain tile damage
    for (const tile of terrainTiles) {
      if (!tile.active) continue;
      if (tile.col === playerCol && tile.row === playerRow) {
        if (tile.passthrough || !tile.bouncePlayer) {
          this.applyDamage(tile.damage);
        }
        // Breakable tiles take damage from player pass
        if (tile.hp !== -1) {
          tile.takeDamage(1);
        }
      }
    }

    // 2. Attack zone damage
    for (const zone of attackZones) {
      if (!zone.isActive()) continue;
      for (const cell of zone.cells) {
        if (cell.col === playerCol && cell.row === playerRow) {
          this.applyDamage(zone.damage);
          break; // Only one damage per zone per tick
        }
      }
    }

    // 3. Projectile damage
    for (const proj of projectiles) {
      if (!proj.active) continue;
      if (physicsSystem.checkProjectilePlayerCollision(proj, this.player)) {
        this.applyDamage(proj.damage);
        if (!proj.piercing) {
          proj.destroy();
        }
      }
    }
  }

  applyDamage(amount) {
    if (this.player.invulnTimer > 0) return;

    // Check for parry
    if (this.shieldSystem.checkParry()) {
      return; // Parry negates the hit
    }

    this.player.takeDamage(amount);
  }
}
