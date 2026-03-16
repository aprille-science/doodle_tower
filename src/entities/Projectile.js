import { CELL_WIDTH, CELL_HEIGHT, CANVAS_WIDTH, ARENA_HEIGHT, GAME_SPEED_SCALE } from '../constants.js';

const VALID_PIERCE_MODES = ['none', 'pierce_enemies', 'pierce_terrain', 'destroy_terrain', 'destroy_all', 'bounce', 'ghost'];

export default class Projectile {
  constructor(scene, data) {
    this.scene = scene;
    this.damage = data.damage || 1;
    this.enemyDamage = data.enemyDamage !== undefined ? data.enemyDamage : this.damage;
    this.terrainDamage = data.terrainDamage !== undefined ? data.terrainDamage : this.damage;
    this.pierceMode = data.pierceMode || 'none';
    this.maxHits = data.maxHits !== undefined ? data.maxHits : 1;
    this.lifetime = data.lifetime !== undefined ? data.lifetime : 5000;
    this.damageType = data.damageType || 'physical';
    this.onDestroyEffect = data.onDestroyEffect || 'fizzle';
    this.speed = (data.speed || 200) * GAME_SPEED_SCALE;
    this.color = typeof data.color === 'string' ? parseInt(data.color) : (data.color || 0xffffff);
    this.radius = data.radius || 6;
    this.active = true;
    this.hitCount = 0;
    this.elapsedMs = 0;
    this.hitTargets = new Set();

    // Spawn position: from world coords or grid coords
    if (data.worldX !== undefined && data.worldY !== undefined) {
      this.x = data.worldX;
      this.y = data.worldY;
    } else {
      this.x = data.spawnGridCol * CELL_WIDTH + CELL_WIDTH / 2;
      this.y = data.spawnGridRow * CELL_HEIGHT + CELL_HEIGHT / 2;
    }

    // Direction from degrees or direct vx/vy
    if (data.vx !== undefined && data.vy !== undefined) {
      this.vx = data.vx * GAME_SPEED_SCALE;
      this.vy = data.vy * GAME_SPEED_SCALE;
    } else {
      const rad = Phaser.Math.DegToRad(data.directionDegrees || 0);
      this.vx = Math.cos(rad) * this.speed;
      this.vy = Math.sin(rad) * this.speed;
    }

    this.graphics = scene.add.graphics();
    this.glowGraphics = null;

    // Large projectiles get a glow ring
    if (this.radius >= 14) {
      this.glowGraphics = scene.add.graphics();
      this.pulseTimer = 0;
    }

    this.draw();
  }

  update(delta) {
    if (!this.active) return;

    const dt = delta / 1000;
    this.elapsedMs += delta;

    // Lifetime expiry
    if (this.lifetime !== -1 && this.elapsedMs >= this.lifetime) {
      this.destroyWithEffect();
      return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bounce mode: reflect off arena walls
    if (this.pierceMode === 'bounce') {
      if (this.x - this.radius < 0) { this.x = this.radius; this.vx = Math.abs(this.vx); }
      if (this.x + this.radius > CANVAS_WIDTH) { this.x = CANVAS_WIDTH - this.radius; this.vx = -Math.abs(this.vx); }
      if (this.y - this.radius < 0) { this.y = this.radius; this.vy = Math.abs(this.vy); }
      if (this.y + this.radius > ARENA_HEIGHT) { this.y = ARENA_HEIGHT - this.radius; this.vy = -Math.abs(this.vy); }
    } else {
      // Out of bounds check for non-bounce projectiles
      if (this.x < -30 || this.x > CANVAS_WIDTH + 30 || this.y < -30 || this.y > ARENA_HEIGHT + 30) {
        this.active = false;
        this.graphics.clear();
        if (this.glowGraphics) this.glowGraphics.clear();
        return;
      }
    }

    // Pulse animation for large projectiles
    if (this.glowGraphics) {
      this.pulseTimer += delta;
    }

    this.draw();
  }

  // Called by DamageSystem when this projectile hits an enemy
  resolveEnemyHit(enemy) {
    if (this.hitTargets.has(enemy.id || enemy)) return false;

    switch (this.pierceMode) {
      case 'none':
        this.hitTargets.add(enemy.id || enemy);
        this.registerHit();
        return true;
      case 'pierce_enemies':
        this.hitTargets.add(enemy.id || enemy);
        // Passes through, does not consume hit count for enemies
        return true;
      case 'pierce_terrain':
        this.hitTargets.add(enemy.id || enemy);
        this.registerHit();
        return true;
      case 'destroy_terrain':
        this.hitTargets.add(enemy.id || enemy);
        // Continue moving, but count hit
        return true;
      case 'destroy_all':
        this.hitTargets.add(enemy.id || enemy);
        // Never stops, hits all enemies
        return true;
      case 'bounce':
        this.hitTargets.add(enemy.id || enemy);
        this.registerHit();
        return true;
      case 'ghost':
        return this.resolveGhost(enemy);
      default:
        this.registerHit();
        return true;
    }
  }

  // Called by DamageSystem when this projectile hits terrain
  resolveTerrainHit(terrainTile) {
    switch (this.pierceMode) {
      case 'none':
        this.registerHit();
        return true;
      case 'pierce_enemies':
        this.registerHit();
        return true;
      case 'pierce_terrain':
        // Passes through terrain with no interaction
        return false;
      case 'destroy_terrain':
        return this.resolveDestroyTerrain(terrainTile);
      case 'destroy_all':
        if (terrainTile.hp !== -1) {
          terrainTile.takeDamage(this.terrainDamage);
        }
        return false; // Keep going
      case 'bounce':
        return this.resolveBounce(terrainTile);
      case 'ghost':
        // No interaction with terrain
        return false;
      default:
        this.registerHit();
        return true;
    }
  }

  // pierceMode: 'bounce' — reflect velocity on terrain contact
  resolveBounce(terrain) {
    const tileCenterX = terrain.col * CELL_WIDTH + CELL_WIDTH / 2;
    const tileCenterY = terrain.row * CELL_HEIGHT + CELL_HEIGHT / 2;
    const dx = this.x - tileCenterX;
    const dy = this.y - tileCenterY;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.vx = dx > 0 ? Math.abs(this.vx) : -Math.abs(this.vx);
    } else {
      this.vy = dy > 0 ? Math.abs(this.vy) : -Math.abs(this.vy);
    }
    return false; // Don't destroy on bounce
  }

  // pierceMode: 'ghost' — no collision resolution, damage only
  resolveGhost(target) {
    if (this.hitTargets.has(target.id || target)) return false;
    this.hitTargets.add(target.id || target);
    return true; // Damage applied, but never destroyed by collision
  }

  // pierceMode: 'destroy_terrain' — destroy cell, continue moving
  resolveDestroyTerrain(terrainTile) {
    if (terrainTile.hp === -1) {
      // Stopped by indestructible terrain
      this.registerHit();
      return true;
    }
    terrainTile.takeDamage(this.terrainDamage);
    return false; // Continue moving
  }

  // damageType system stub — resistance lookup ready for future use
  // Usage: DamageSystem will call getEffectiveDamage(target) when resistance map is added
  getEffectiveDamage(target) {
    // When target.resistances[this.damageType] is implemented, apply multiplier here
    return this.damage;
  }

  getEffectiveEnemyDamage(target) {
    return this.enemyDamage;
  }

  registerHit() {
    this.hitCount++;
    if (this.maxHits !== -1 && this.hitCount >= this.maxHits) {
      this.destroyWithEffect();
    }
  }

  destroyWithEffect() {
    if (this.onDestroyEffect === 'explode') {
      this.playExplodeEffect();
    } else if (this.onDestroyEffect === 'fizzle') {
      this.playFizzleEffect();
    }
    this.active = false;
    this.graphics.clear();
    if (this.glowGraphics) this.glowGraphics.clear();
  }

  playExplodeEffect() {
    const gfx = this.scene.add.graphics();
    gfx.lineStyle(3, 0xff8800, 1);
    gfx.strokeCircle(this.x, this.y, this.radius);
    this.scene.tweens.add({
      targets: { scale: 1 },
      scale: 3,
      duration: 300,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const s = tween.getValue();
        gfx.clear();
        gfx.lineStyle(3, 0xff8800, 1 - s / 3);
        gfx.strokeCircle(this.x, this.y, this.radius * s);
      },
      onComplete: () => gfx.destroy()
    });
  }

  playFizzleEffect() {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(this.color, 0.5);
    gfx.fillCircle(this.x, this.y, this.radius * 0.7);
    this.scene.tweens.add({
      targets: { alpha: 0.5 },
      alpha: 0,
      duration: 200,
      onUpdate: (tween) => {
        const a = tween.getValue();
        gfx.clear();
        gfx.fillStyle(this.color, a);
        gfx.fillCircle(this.x, this.y, this.radius * 0.7);
      },
      onComplete: () => gfx.destroy()
    });
  }

  draw() {
    this.graphics.clear();
    if (!this.active) return;

    // Doodle-style projectile: ink blob with sketchy outline
    this.graphics.fillStyle(this.color, 0.7);
    this.graphics.fillCircle(this.x, this.y, this.radius);
    // Pen outline
    this.graphics.lineStyle(1.2, 0x222222, 0.6);
    this.graphics.strokeCircle(this.x + 0.3, this.y + 0.3, this.radius);

    if (this.glowGraphics) {
      this.glowGraphics.clear();
      const pulse = 0.8 + Math.sin(this.pulseTimer * 0.005) * 0.2;
      // Sketchy glow ring
      this.glowGraphics.lineStyle(1.5, this.color, 0.35);
      this.glowGraphics.strokeCircle(this.x, this.y, this.radius * 1.5 * pulse);
      this.glowGraphics.lineStyle(0.8, this.color, 0.2);
      this.glowGraphics.strokeCircle(this.x, this.y, this.radius * 1.8 * pulse);
    }
  }

  getCol() {
    return Math.floor(this.x / CELL_WIDTH);
  }

  getRow() {
    return Math.floor(this.y / CELL_HEIGHT);
  }

  destroy() {
    this.active = false;
    if (this.graphics) this.graphics.destroy();
    if (this.glowGraphics) this.glowGraphics.destroy();
  }
}
