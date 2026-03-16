import { flashDamageTint } from '../utils/DamageFlash.js';
import { FloatingDamageNumber } from '../ui/FloatingDamageNumber.js';

export default class DamageSystem {
  constructor(scene, player, shieldSystem) {
    this.scene = scene;
    this.player = player;
    this.shieldSystem = shieldSystem;
  }

  update(terrainTiles, attackZones, projectiles, physicsSystem, enemies) {
    if (!this.player.alive) return;

    const statusMgr = this.scene.statusEffectManager;
    const playerCol = this.player.getCol();
    const playerRow = this.player.getRow();
    const now = Date.now();

    // 1. Terrain tile damage to player
    for (const tile of terrainTiles) {
      if (!tile.active) continue;
      if (tile.col === playerCol && tile.row === playerRow) {
        if (tile.passthrough || !tile.bouncePlayer) {
          this.applyDamageToPlayer(tile.damage, this.player.x, this.player.y);
        }
        if (tile.hp !== -1) {
          tile.takeDamage(1);
        }
      }
    }

    // 2. Attack zone damage to player (with per-zone tick cooldown)
    for (const zone of attackZones) {
      if (!zone.isActive()) continue;
      if (now - zone.lastDamageTick < zone.damageCooldownMs) continue;

      for (const cell of zone.cells) {
        if (cell.col === playerCol && cell.row === playerRow) {
          let dmg = zone.damage;
          // Apply POISONED damage-dealt reduction from the zone's source enemy
          if (zone.sourceEnemy && statusMgr) {
            dmg *= statusMgr.getDamageDealtMultiplier(zone.sourceEnemy);
          }
          this.applyDamageToPlayer(dmg, this.player.x, this.player.y);
          zone.lastDamageTick = now;
          break;
        }
      }
    }

    // 3. Projectile resolution
    for (const proj of projectiles) {
      if (!proj.active) continue;

      // Enemy projectile vs player
      if (!proj.isPlayerProjectile && physicsSystem.checkProjectilePlayerCollision(proj, this.player)) {
        if (proj.resolveEnemyHit(this.player)) {
          let dmg = proj.getEffectiveDamage(this.player);
          // Apply POISONED damage-dealt reduction from source enemy
          if (proj.sourceEnemy && statusMgr) {
            dmg *= statusMgr.getDamageDealtMultiplier(proj.sourceEnemy);
          }
          this.applyDamageToPlayer(dmg, proj.x, proj.y);
        }
      }

      // Projectile vs terrain
      const projCol = proj.getCol();
      const projRow = proj.getRow();
      for (const tile of terrainTiles) {
        if (!tile.active || !proj.active) continue;
        if (tile.col === projCol && tile.row === projRow) {
          proj.resolveTerrainHit(tile);
        }
      }

      // Player projectile vs enemies
      if (proj.isPlayerProjectile && enemies) {
        for (const enemy of enemies) {
          if (!enemy.alive || !proj.active) continue;
          if (physicsSystem.checkProjectileEnemyCollision(proj, enemy)) {
            if (proj.resolveEnemyHit(enemy)) {
              let dmg = proj.getEffectiveEnemyDamage(enemy);
              // Apply POISONED damage-taken multiplier
              if (statusMgr) {
                dmg *= statusMgr.getDamageTakenMultiplier(enemy);
              }
              this.applyDamageToEnemy(enemy, dmg);

              // Apply status effect from projectile
              if (proj.inflictStatus && statusMgr) {
                statusMgr.applyStatus(enemy, proj.inflictStatus.type, proj.inflictStatus.durationMs);
              }
            }
          }
        }
      }
    }

    // Terrain effect tiles (blaze/frost/electric) are handled by TerrainEffectManager
  }

  applyDamageToPlayer(amount, worldX, worldY) {
    if (this.player.invulnTimer > 0) return;
    if (this.shieldSystem.checkParry()) return;

    // Apply player damage reduction
    let dmg = Math.round(amount * (this.player.damageReduction || 1));
    const nx = worldX || this.player.x;
    const ny = (worldY || this.player.y) - 20;

    const shieldWillAbsorb = this.player.shieldActive && this.player.shieldHP > 0;
    this.player.takeDamage(dmg);

    if (shieldWillAbsorb) {
      new FloatingDamageNumber(this.scene, nx, ny, dmg, { color: '#44aaff' });
    } else {
      flashDamageTint(this.player, this.scene);
      new FloatingDamageNumber(this.scene, nx, ny, dmg, { color: '#ff4444' });
    }
  }

  applyDamageToEnemy(enemy, amount) {
    const dmg = Math.round(amount);
    enemy.takeDamage(dmg);
    flashDamageTint(enemy, this.scene);
    new FloatingDamageNumber(this.scene, enemy.x, enemy.y - 20, dmg);
    this.scene.events.emit('enemyDamaged', enemy, dmg);
  }
}
