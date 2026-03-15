import { flashDamageTint } from '../utils/DamageFlash.js';
import { FloatingDamageNumber } from '../ui/FloatingDamageNumber.js';

export default class DamageSystem {
  constructor(scene, player, shieldSystem) {
    this.scene = scene;
    this.player = player;
    this.shieldSystem = shieldSystem;

    // Listen for enemy contact damage from PhysicsSystem
    this.scene.events.on('enemyContactDamage', (data) => {
      this.applyDamageToPlayer(data.damage, data.enemy.x, data.enemy.y);
    });
  }

  update(terrainTiles, attackZones, projectiles, physicsSystem, enemies) {
    if (!this.player.alive) return;

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

      // Enforce 500ms cooldown between damage ticks per zone
      if (now - zone.lastDamageTick < zone.damageCooldownMs) continue;

      for (const cell of zone.cells) {
        if (cell.col === playerCol && cell.row === playerRow) {
          const dmg = Math.round(zone.damage);
          this.applyDamageToPlayer(dmg, this.player.x, this.player.y);
          zone.lastDamageTick = now;
          break;
        }
      }
    }

    // 3. Projectile resolution
    for (const proj of projectiles) {
      if (!proj.active) continue;

      // Check projectile vs player (enemy projectiles)
      if (physicsSystem.checkProjectilePlayerCollision(proj, this.player)) {
        const hit = proj.resolveEnemyHit(this.player);
        if (hit) {
          const dmg = Math.round(proj.getEffectiveDamage(this.player));
          this.applyDamageToPlayer(dmg, proj.x, proj.y);
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
              const dmg = Math.round(proj.getEffectiveEnemyDamage(enemy));
              this.applyDamageToEnemy(enemy, dmg);
            }
          }
        }
      }
    }
  }

  applyDamageToPlayer(amount, worldX, worldY) {
    if (this.player.invulnTimer > 0) return;

    if (this.shieldSystem.checkParry()) {
      return;
    }

    const dmg = Math.round(amount);
    const nx = worldX || this.player.x;
    const ny = (worldY || this.player.y) - 20;

    // Detect if shield will absorb before calling takeDamage
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
