import AttackZone from '../entities/AttackZone.js';
import Projectile from '../entities/Projectile.js';
import { CELL_WIDTH, CELL_HEIGHT } from '../constants.js';

export default class AttackSystem {
  constructor(scene, enemies, patternCache) {
    this.scene = scene;
    this.enemies = enemies;
    this.patternCache = patternCache;
    this.attackZones = [];
    this.projectiles = [];
    this.attackTimers = [];
    this.paused = false;
    this.pauseTimer = 0;

    this.scheduleAttacks();
  }

  scheduleAttacks() {
    this.clearTimers();

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const phaseData = enemy.getCurrentPhaseData();
      if (!phaseData) continue;

      const interval = phaseData.attackIntervalMs;
      const patterns = phaseData.attackPatterns;
      if (!patterns || patterns.length === 0) continue;

      const timer = this.scene.time.addEvent({
        delay: interval,
        loop: true,
        callback: () => {
          if (this.paused || !enemy.alive) return;
          // Frozen enemies cannot attack
          if (this.scene.statusEffectManager && this.scene.statusEffectManager.isFrozen(enemy)) return;
          const patternId = Phaser.Utils.Array.GetRandom(patterns);
          this.spawnAttack(patternId, enemy);
        }
      });
      this.attackTimers.push(timer);
    }
  }

  getEffectiveDamage(pattern, enemy) {
    const phaseData = enemy.getCurrentPhaseData();
    const phaseMultiplier = phaseData?.attackDamageMultiplier ?? enemy.data.attackDamage ?? 1.0;
    return Math.round(pattern.damage * phaseMultiplier);
  }

  spawnAttack(patternId, enemy) {
    const pattern = this.patternCache[patternId];
    if (!pattern) return;

    const phaseData = enemy.getCurrentPhaseData();
    const speedMult = (phaseData && phaseData.speedMultiplier) || 1.0;
    const effectiveDamage = this.getEffectiveDamage(pattern, enemy);

    if (pattern.type === 'zone') {
      const zone = new AttackZone(this.scene, { ...pattern, damage: effectiveDamage });
      this.attackZones.push(zone);
    } else if (pattern.type === 'zone_around_enemy') {
      this.spawnZoneAroundEnemy(pattern, enemy, effectiveDamage);
    } else if (pattern.type === 'projectile') {
      this.spawnProjectile(pattern, enemy, speedMult, effectiveDamage);
    } else if (pattern.type === 'projectile_spread') {
      this.spawnProjectileSpread(pattern, enemy, speedMult, effectiveDamage);
    }
  }

  spawnZoneAroundEnemy(pattern, enemy, effectiveDamage) {
    const enemyCol = Math.floor(enemy.x / CELL_WIDTH);
    const enemyRow = Math.floor(enemy.y / CELL_HEIGHT);
    const radius = pattern.radiusCells || 1;

    const cells = [];
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        const c = enemyCol + dc;
        const r = enemyRow + dr;
        if (c >= 0 && c < 16 && r >= 0 && r < 16) {
          cells.push({ col: c, row: r });
        }
      }
    }

    const zone = new AttackZone(this.scene, {
      ...pattern,
      damage: effectiveDamage,
      cells: cells,
      activeDurationMs: pattern.activeDurationMs || 800
    });
    this.attackZones.push(zone);
  }

  spawnProjectile(pattern, enemy, speedMult, effectiveDamage) {
    const warningMs = pattern.warningDurationMs || 0;

    this.scene.time.delayedCall(warningMs, () => {
      if (!enemy.alive) return;

      let spawnX, spawnY, dirDeg;

      if (pattern.spawnFromEnemy) {
        spawnX = enemy.x;
        spawnY = enemy.y;
      } else {
        spawnX = pattern.spawnGridCol * CELL_WIDTH + CELL_WIDTH / 2;
        spawnY = pattern.spawnGridRow * CELL_HEIGHT + CELL_HEIGHT / 2;
      }

      if (pattern.aimAtPlayer && this.scene.player) {
        const dx = this.scene.player.x - spawnX;
        const dy = this.scene.player.y - spawnY;
        dirDeg = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
      } else {
        dirDeg = pattern.directionDegrees || 270;
      }

      const proj = new Projectile(this.scene, {
        ...pattern,
        damage: effectiveDamage,
        worldX: spawnX,
        worldY: spawnY,
        directionDegrees: dirDeg,
        speed: pattern.speed * speedMult,
        pierceMode: pattern.pierceMode || 'none'
      });
      this.projectiles.push(proj);
    });
  }

  spawnProjectileSpread(pattern, enemy, speedMult, effectiveDamage) {
    const warningMs = pattern.warningDurationMs || 0;

    this.scene.time.delayedCall(warningMs, () => {
      if (!enemy.alive) return;

      let spawnX, spawnY;
      if (pattern.spawnFromEnemy) {
        spawnX = enemy.x;
        spawnY = enemy.y;
      } else {
        spawnX = pattern.spawnGridCol * CELL_WIDTH + CELL_WIDTH / 2;
        spawnY = pattern.spawnGridRow * CELL_HEIGHT + CELL_HEIGHT / 2;
      }

      const count = pattern.count;
      const spreadAngle = pattern.spreadAngleDegrees;
      const centerDir = pattern.centerDirectionDegrees;

      let startAngle, step;
      if (spreadAngle >= 360) {
        startAngle = centerDir;
        step = 360 / count;
      } else {
        startAngle = centerDir - spreadAngle / 2;
        step = count > 1 ? spreadAngle / (count - 1) : 0;
      }

      for (let i = 0; i < count; i++) {
        const angle = startAngle + step * i;
        const proj = new Projectile(this.scene, {
          ...pattern,
          damage: effectiveDamage,
          worldX: spawnX,
          worldY: spawnY,
          directionDegrees: angle,
          speed: pattern.speed * speedMult,
          pierceMode: pattern.pierceMode || 'none'
        });
        this.projectiles.push(proj);
      }
    });
  }

  spawnShockwaveAtPoint(impactX, impactY, enemy) {
    const shockwavePattern = this.patternCache['pattern_shockwave'];
    if (!shockwavePattern) return;

    const centerCol = Math.floor(impactX / CELL_WIDTH);
    const centerRow = Math.floor(impactY / CELL_HEIGHT);
    const halfW = Math.floor((shockwavePattern.widthCells || 3) / 2);
    const halfH = Math.floor((shockwavePattern.heightCells || 1) / 2);

    const cells = [];
    for (let dc = -halfW; dc <= halfW; dc++) {
      for (let dr = -halfH; dr <= halfH; dr++) {
        const c = centerCol + dc;
        const r = centerRow + dr;
        if (c >= 0 && c < 16 && r >= 0 && r < 16) {
          cells.push({ col: c, row: r });
        }
      }
    }

    let effectiveDamage = shockwavePattern.damage;
    if (enemy) {
      effectiveDamage = this.getEffectiveDamage(shockwavePattern, enemy);
    }

    const zone = new AttackZone(this.scene, {
      ...shockwavePattern,
      damage: effectiveDamage,
      cells: cells,
      warningDurationMs: 0
    });
    this.attackZones.push(zone);
  }

  spawnEventAttack(patternId, enemy) {
    this.spawnAttack(patternId, enemy);
  }

  update(delta) {
    if (this.paused) {
      this.pauseTimer -= delta;
      if (this.pauseTimer <= 0) {
        this.paused = false;
      }
      // Still update player projectiles during pause
      this.updateProjectiles(delta);
      return;
    }

    // Update attack zones
    for (let i = this.attackZones.length - 1; i >= 0; i--) {
      this.attackZones[i].update(delta);
      if (this.attackZones[i].isDone()) {
        this.attackZones[i].destroy();
        this.attackZones.splice(i, 1);
      }
    }

    // Update projectiles
    this.updateProjectiles(delta);
  }

  updateProjectiles(delta) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      // During pause, only update player projectiles
      if (this.paused && !proj.isPlayerProjectile) continue;
      proj.update(delta);
      if (!proj.active) {
        proj.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  pauseForTransition(durationMs) {
    this.paused = true;
    this.pauseTimer = durationMs;
  }

  reschedule() {
    this.scheduleAttacks();
  }

  clearTimers() {
    for (const timer of this.attackTimers) {
      timer.destroy();
    }
    this.attackTimers = [];
  }

  clearEnemyAttacks() {
    this.clearTimers();
    for (const zone of this.attackZones) zone.destroy();
    this.attackZones = [];

    // Only destroy enemy projectiles, preserve player projectiles
    const kept = [];
    for (const proj of this.projectiles) {
      if (proj.isPlayerProjectile) {
        kept.push(proj);
      } else {
        proj.destroy();
      }
    }
    this.projectiles = kept;
  }

  clearAll() {
    this.clearTimers();
    for (const zone of this.attackZones) zone.destroy();
    for (const proj of this.projectiles) proj.destroy();
    this.attackZones = [];
    this.projectiles = [];
  }

  destroy() {
    this.clearAll();
  }
}
