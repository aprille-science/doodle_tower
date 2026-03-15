import AttackZone from '../entities/AttackZone.js';
import Projectile from '../entities/Projectile.js';

export default class AttackSystem {
  constructor(scene, enemies, patternCache) {
    this.scene = scene;
    this.enemies = enemies;
    this.patternCache = patternCache; // Map of pattern id -> pattern data
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

      const timer = this.scene.time.addEvent({
        delay: interval,
        loop: true,
        callback: () => {
          if (this.paused || !enemy.alive) return;
          const patternId = Phaser.Utils.Array.GetRandom(patterns);
          this.spawnAttack(patternId, enemy);
        }
      });
      this.attackTimers.push(timer);
    }
  }

  spawnAttack(patternId, enemy) {
    const pattern = this.patternCache[patternId];
    if (!pattern) return;

    const phaseData = enemy.getCurrentPhaseData();
    const speedMult = phaseData.speedMultiplier || 1.0;

    if (pattern.type === 'zone') {
      const zone = new AttackZone(this.scene, pattern);
      this.attackZones.push(zone);
    } else if (pattern.type === 'projectile') {
      // Spawn single projectile after warning delay
      this.scene.time.delayedCall(pattern.warningDurationMs, () => {
        if (!enemy.alive) return;
        const proj = new Projectile(this.scene, {
          ...pattern,
          speed: pattern.speed * speedMult
        });
        this.projectiles.push(proj);
      });
    } else if (pattern.type === 'projectile_spread') {
      this.scene.time.delayedCall(pattern.warningDurationMs, () => {
        if (!enemy.alive) return;
        const count = pattern.count;
        const spreadAngle = pattern.spreadAngleDegrees;
        const centerDir = pattern.centerDirectionDegrees;
        const startAngle = centerDir - spreadAngle / 2;
        const step = count > 1 ? spreadAngle / (count - 1) : 0;

        for (let i = 0; i < count; i++) {
          const angle = startAngle + step * i;
          const proj = new Projectile(this.scene, {
            ...pattern,
            directionDegrees: angle,
            speed: pattern.speed * speedMult
          });
          this.projectiles.push(proj);
        }
      });
    }
  }

  update(delta) {
    if (this.paused) {
      this.pauseTimer -= delta;
      if (this.pauseTimer <= 0) {
        this.paused = false;
      }
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
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.projectiles[i].update(delta);
      if (!this.projectiles[i].active) {
        this.projectiles[i].destroy();
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
