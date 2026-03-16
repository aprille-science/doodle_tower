import { FloatingDamageNumber } from '../ui/FloatingDamageNumber.js';

export const STATUS_TYPES = {
  BURNED: 'burned',
  FROZEN: 'frozen',
  PARALYZED: 'paralyzed',
  POISONED: 'poisoned'
};

export const STATUS_COLORS = {
  [STATUS_TYPES.BURNED]: { fill: 0xff4400, text: '#ff4400', label: 'BRN' },
  [STATUS_TYPES.FROZEN]: { fill: 0x44ccff, text: '#44ccff', label: 'FRZ' },
  [STATUS_TYPES.PARALYZED]: { fill: 0xffee00, text: '#ffee00', label: 'PAR' },
  [STATUS_TYPES.POISONED]: { fill: 0x66ff22, text: '#66ff22', label: 'PSN' }
};

class StatusInstance {
  constructor(type, durationMs) {
    this.type = type;
    this.remaining = durationMs;
    this.duration = durationMs;
  }
}

export class StatusEffectManager {
  constructor(scene) {
    this.scene = scene;
    // Map<enemy, StatusInstance[]>
    this.enemyStatuses = new Map();
    this.burnTickInterval = 200; // tick every 200ms for 5 dps => 1 damage per tick
    this.burnTickAccumulators = new Map();
  }

  applyStatus(enemy, type, durationMs) {
    if (!enemy || !enemy.alive) return;

    // Check immunity
    const immunities = enemy.data.statusImmunities || [];
    if (immunities.includes(type)) return;

    let statuses = this.enemyStatuses.get(enemy);
    if (!statuses) {
      statuses = [];
      this.enemyStatuses.set(enemy, statuses);
    }

    // Refresh if already has this status type, otherwise add
    const existing = statuses.find(s => s.type === type);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, durationMs);
      existing.duration = Math.max(existing.duration, durationMs);
    } else {
      statuses.push(new StatusInstance(type, durationMs));
    }
  }

  hasStatus(enemy, type) {
    const statuses = this.enemyStatuses.get(enemy);
    if (!statuses) return false;
    return statuses.some(s => s.type === type);
  }

  getStatuses(enemy) {
    return this.enemyStatuses.get(enemy) || [];
  }

  isFrozen(enemy) {
    return this.hasStatus(enemy, STATUS_TYPES.FROZEN);
  }

  getSpeedMultiplier(enemy) {
    if (this.hasStatus(enemy, STATUS_TYPES.FROZEN)) return 0;
    if (this.hasStatus(enemy, STATUS_TYPES.PARALYZED)) return 0.5;
    return 1;
  }

  getDamageTakenMultiplier(enemy) {
    if (this.hasStatus(enemy, STATUS_TYPES.POISONED)) return 1.5;
    return 1;
  }

  getDamageDealtMultiplier(enemy) {
    if (this.hasStatus(enemy, STATUS_TYPES.POISONED)) return 0.5;
    return 1;
  }

  update(delta) {
    for (const [enemy, statuses] of this.enemyStatuses) {
      if (!enemy.alive) {
        this.enemyStatuses.delete(enemy);
        this.burnTickAccumulators.delete(enemy);
        continue;
      }

      // Process burn damage
      if (statuses.some(s => s.type === STATUS_TYPES.BURNED)) {
        let acc = this.burnTickAccumulators.get(enemy) || 0;
        acc += delta;
        while (acc >= this.burnTickInterval) {
          acc -= this.burnTickInterval;
          // 5 dps = 1 damage per 200ms tick
          enemy.takeDamage(1);
          new FloatingDamageNumber(this.scene, enemy.x + (Math.random() - 0.5) * 20, enemy.y - 30, 1, { color: '#ff4400' });
          if (!enemy.alive) {
            this.scene.events.emit('enemyDamaged', enemy, 1);
            break;
          }
        }
        this.burnTickAccumulators.set(enemy, acc);
      } else {
        this.burnTickAccumulators.delete(enemy);
      }

      // Tick down timers and remove expired
      for (let i = statuses.length - 1; i >= 0; i--) {
        statuses[i].remaining -= delta;
        if (statuses[i].remaining <= 0) {
          statuses.splice(i, 1);
        }
      }

      if (statuses.length === 0) {
        this.enemyStatuses.delete(enemy);
      }
    }
  }

  clearEnemy(enemy) {
    this.enemyStatuses.delete(enemy);
    this.burnTickAccumulators.delete(enemy);
  }

  destroy() {
    this.enemyStatuses.clear();
    this.burnTickAccumulators.clear();
  }
}
