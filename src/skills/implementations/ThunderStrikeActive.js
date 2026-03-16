import { BaseActiveSkill } from '../BaseActiveSkill.js';
import Projectile from '../../entities/Projectile.js';
import { CELL_WIDTH, CELL_HEIGHT, GRID_COLS, GRID_ROWS, GAME_SPEED_SCALE } from '../../constants.js';

export class ThunderStrikeActive extends BaseActiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
    this.trackedProjectile = null;
    this.aoeApplied = false;
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
    this.aoeApplied = false;
    this.triggerCooldown();
  }

  update(dt) {
    super.update(dt);

    if (!this.trackedProjectile) return;
    const terrainMgr = this.scene.terrainEffectManager;
    if (!terrainMgr) return;

    if (!this.trackedProjectile.active) {
      // Projectile expired/hit — apply 5x5 AoE at last position
      if (!this.aoeApplied) {
        this.applyAoE(this.trackedProjectile.x, this.trackedProjectile.y);
        this.aoeApplied = true;
      }
      this.trackedProjectile = null;
      return;
    }

    // Lay electric terrain trail as projectile travels
    const col = Math.floor(this.trackedProjectile.x / CELL_WIDTH);
    const row = Math.floor(this.trackedProjectile.y / CELL_HEIGHT);
    terrainMgr.addEffect('electric', col, row, 5000, 5000);
  }

  applyAoE(centerX, centerY) {
    const r = this.config.aoeRadiusTiles || 2; // 2 = 5x5 area (-2..+2)
    const centerCol = Math.floor(centerX / CELL_WIDTH);
    const centerRow = Math.floor(centerY / CELL_HEIGHT);
    const terrainMgr = this.scene.terrainEffectManager;
    const statusMgr = this.scene.statusEffectManager;
    const damage = this.config.damage || 100;
    const paralyzeDur = this.config.paralyzeDurationMs || 5000;

    // Visual: expanding electric ring
    this.playThunderAoE(centerX, centerY, r * CELL_WIDTH);

    // Lay electric terrain in the area
    for (let dc = -r; dc <= r; dc++) {
      for (let dr = -r; dr <= r; dr++) {
        const c = centerCol + dc;
        const rr = centerRow + dr;
        if (c < 0 || c >= GRID_COLS || rr < 0 || rr >= GRID_ROWS) continue;
        if (terrainMgr) {
          terrainMgr.addEffect('electric', c, rr, 5000, 5000);
        }
      }
    }

    // Damage + paralyze enemies in the AoE
    const radiusPx = (r + 0.5) * CELL_WIDTH;
    if (this.scene.enemies) {
      for (const enemy of this.scene.enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.x - centerX;
        const dy = enemy.y - centerY;
        if (Math.sqrt(dx * dx + dy * dy) <= radiusPx) {
          if (this.scene.damageSystem) {
            this.scene.damageSystem.applyDamageToEnemy(enemy, damage * 0.5);
          }
          if (statusMgr) {
            statusMgr.applyStatus(enemy, 'paralyzed', paralyzeDur);
          }
        }
      }
    }
  }

  playThunderAoE(cx, cy, maxRadius) {
    const gfx = this.scene.add.graphics().setDepth(100);
    this.scene.tweens.add({
      targets: { r: 0 },
      r: maxRadius,
      duration: 350,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const rv = tween.getValue();
        const a = Phaser.Math.Linear(0.8, 0, tween.progress);
        gfx.clear();
        gfx.fillStyle(0xffee00, a * 0.25);
        gfx.fillCircle(cx, cy, rv);
        gfx.lineStyle(3, 0xffee00, a);
        gfx.strokeCircle(cx, cy, rv);
      },
      onComplete: () => gfx.destroy()
    });
  }
}
