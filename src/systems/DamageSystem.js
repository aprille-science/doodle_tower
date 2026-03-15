export default class DamageSystem {
  constructor(scene, player, shieldSystem) {
    this.scene = scene;
    this.player = player;
    this.shieldSystem = shieldSystem;
  }

  update(terrainTiles, attackZones, projectiles, physicsSystem, enemies) {
    if (!this.player.alive) return;

    const playerCol = this.player.getCol();
    const playerRow = this.player.getRow();

    // 1. Terrain tile damage to player
    for (const tile of terrainTiles) {
      if (!tile.active) continue;
      if (tile.col === playerCol && tile.row === playerRow) {
        if (tile.passthrough || !tile.bouncePlayer) {
          this.applyDamageToPlayer(tile.damage);
        }
        if (tile.hp !== -1) {
          tile.takeDamage(1);
        }
      }
    }

    // 2. Attack zone damage to player
    for (const zone of attackZones) {
      if (!zone.isActive()) continue;
      for (const cell of zone.cells) {
        if (cell.col === playerCol && cell.row === playerRow) {
          this.applyDamageToPlayer(zone.damage);
          break;
        }
      }
    }

    // 3. Projectile resolution
    for (const proj of projectiles) {
      if (!proj.active) continue;

      // Check projectile vs player
      if (physicsSystem.checkProjectilePlayerCollision(proj, this.player)) {
        const hit = proj.resolveEnemyHit(this.player);
        if (hit) {
          this.applyDamageToPlayer(proj.getEffectiveDamage(this.player));
        }
      }

      // Check projectile vs terrain (pierce mode handling)
      const projCol = proj.getCol();
      const projRow = proj.getRow();
      for (const tile of terrainTiles) {
        if (!tile.active || !proj.active) continue;
        if (tile.col === projCol && tile.row === projRow) {
          proj.resolveTerrainHit(tile);
        }
      }

      // Check player-fired projectiles vs enemies
      if (proj.isPlayerProjectile && enemies) {
        for (const enemy of enemies) {
          if (!enemy.alive || !proj.active) continue;
          if (physicsSystem.checkProjectileEnemyCollision(proj, enemy)) {
            const hit = proj.resolveEnemyHit(enemy);
            if (hit) {
              enemy.takeDamage(proj.getEffectiveEnemyDamage(enemy));
              // Emit damage event for movement system
              this.scene.events.emit('enemyDamaged', enemy);
            }
          }
        }
      }
    }
  }

  applyDamageToPlayer(amount) {
    if (this.player.invulnTimer > 0) return;

    if (this.shieldSystem.checkParry()) {
      return;
    }

    this.player.takeDamage(amount);
  }
}
