import { BaseActiveSkill } from '../BaseActiveSkill.js';
import { CANVAS_WIDTH, ARENA_HEIGHT, CELL_WIDTH, GAME_SPEED_SCALE, PLAYER_SPEED_SCALE } from '../../constants.js';
import { flashDamageTint } from '../../utils/DamageFlash.js';
import { FloatingDamageNumber } from '../../ui/FloatingDamageNumber.js';

const DIRECTIONS = [
  { vx: 1, vy: 0 },   // right
  { vx: -1, vy: 0 },  // left
  { vx: 0, vy: -1 },  // up
  { vx: 0, vy: 1 }    // down
];

class Clone {
  constructor(scene, x, y, vx, vy, config) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = config.cloneRadius || 18;
    this.damage = config.cloneDamage || 10;
    this.burnDurationMs = config.burnDurationMs || 2000;
    this.alive = true;
    this.lifetime = config.durationMs || 5000;
    this.elapsed = 0;
    this.hitCooldowns = new Map(); // enemy -> lastHitTime
    this.graphics = scene.add.graphics().setDepth(80);
    this.glowGraphics = scene.add.graphics().setDepth(79);
  }

  update(dt) {
    if (!this.alive) return;

    const dtSec = dt / 1000;
    this.elapsed += dt;

    if (this.elapsed >= this.lifetime) {
      this.destroy();
      return;
    }

    // Move
    this.x += this.vx * dtSec;
    this.y += this.vy * dtSec;

    // Bounce off walls
    if (this.x - this.radius < 0) { this.x = this.radius; this.vx = Math.abs(this.vx); }
    if (this.x + this.radius > CANVAS_WIDTH) { this.x = CANVAS_WIDTH - this.radius; this.vx = -Math.abs(this.vx); }
    if (this.y - this.radius < 0) { this.y = this.radius; this.vy = Math.abs(this.vy); }
    if (this.y + this.radius > ARENA_HEIGHT) { this.y = ARENA_HEIGHT - this.radius; this.vy = -Math.abs(this.vy); }

    // Check enemy collisions
    const now = Date.now();
    if (this.scene.enemies) {
      for (const enemy of this.scene.enemies) {
        if (!enemy.alive) continue;
        const lastHit = this.hitCooldowns.get(enemy) || 0;
        if (now - lastHit < 500) continue; // 500ms cooldown per enemy

        const bounds = enemy.getBounds();
        if (this.scene.physicsSystem && this.scene.physicsSystem.circleRectOverlap(
          this.x, this.y, this.radius,
          bounds.x, bounds.y, bounds.width, bounds.height
        )) {
          // Deal damage
          if (this.scene.damageSystem) {
            this.scene.damageSystem.applyDamageToEnemy(enemy, this.damage);
          }
          // Inflict burn
          if (this.scene.statusEffectManager) {
            this.scene.statusEffectManager.applyStatus(enemy, 'burned', this.burnDurationMs);
          }
          this.hitCooldowns.set(enemy, now);

          // Bounce away
          const ex = bounds.x + bounds.width / 2;
          const ey = bounds.y + bounds.height / 2;
          const dx = this.x - ex;
          const dy = this.y - ey;
          if (Math.abs(dx) > Math.abs(dy)) {
            this.vx = dx > 0 ? Math.abs(this.vx) : -Math.abs(this.vx);
          } else {
            this.vy = dy > 0 ? Math.abs(this.vy) : -Math.abs(this.vy);
          }
        }
      }
    }

    // Bounce off terrain
    if (this.scene.terrainTiles) {
      for (const tile of this.scene.terrainTiles) {
        if (!tile.active || !tile.bouncePlayer) continue;
        const tileX = tile._shieldOwner ? tile.x : tile.col * CELL_WIDTH;
        const tileY = tile._shieldOwner ? tile.y : tile.row * CELL_WIDTH;
        if (this.scene.physicsSystem && this.scene.physicsSystem.circleRectOverlap(
          this.x, this.y, this.radius, tileX, tileY, CELL_WIDTH, CELL_WIDTH
        )) {
          const tcx = tileX + CELL_WIDTH / 2;
          const tcy = tileY + CELL_WIDTH / 2;
          const dx = this.x - tcx;
          const dy = this.y - tcy;
          if (Math.abs(dx) > Math.abs(dy)) {
            this.vx = dx > 0 ? Math.abs(this.vx) : -Math.abs(this.vx);
          } else {
            this.vy = dy > 0 ? Math.abs(this.vy) : -Math.abs(this.vy);
          }
        }
      }
    }

    this.draw();
  }

  draw() {
    this.graphics.clear();
    this.glowGraphics.clear();
    if (!this.alive) return;

    const fadeAlpha = this.elapsed > this.lifetime - 1000
      ? (this.lifetime - this.elapsed) / 1000
      : 1;

    // Clone body — purple fireball
    this.graphics.fillStyle(0xcc44ff, 0.7 * fadeAlpha);
    this.graphics.fillCircle(this.x, this.y, this.radius);
    this.graphics.lineStyle(1.5, 0x222222, 0.6 * fadeAlpha);
    this.graphics.strokeCircle(this.x, this.y, this.radius);

    // Eyes
    this.graphics.fillStyle(0x222222, 0.8 * fadeAlpha);
    this.graphics.fillCircle(this.x - 4, this.y - 3, 2);
    this.graphics.fillCircle(this.x + 4, this.y - 3, 2);

    // Glow
    this.glowGraphics.fillStyle(0xcc44ff, 0.15 * fadeAlpha);
    this.glowGraphics.fillCircle(this.x, this.y, this.radius * 1.5);
  }

  destroy() {
    this.alive = false;
    if (this.graphics) { this.graphics.destroy(); this.graphics = null; }
    if (this.glowGraphics) { this.glowGraphics.destroy(); this.glowGraphics = null; }
  }
}

export class DeployClonesActive extends BaseActiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
    this.clones = [];
  }

  cast() {
    if (!this.isReady()) return;

    const speed = (this.config.cloneSpeed || 400) * GAME_SPEED_SCALE * PLAYER_SPEED_SCALE;

    // Spawn 4 clones in cardinal directions
    for (const dir of DIRECTIONS) {
      const clone = new Clone(
        this.scene,
        this.player.x,
        this.player.y,
        dir.vx * speed,
        dir.vy * speed,
        this.config
      );
      this.clones.push(clone);
    }

    // Spawn visual effect
    this.playDeployEffect();
    this.triggerCooldown();
  }

  update(dt) {
    super.update(dt);

    for (let i = this.clones.length - 1; i >= 0; i--) {
      const clone = this.clones[i];
      clone.update(dt);
      if (!clone.alive) {
        this.clones.splice(i, 1);
      }
    }
  }

  deactivate() {
    for (const clone of this.clones) {
      clone.destroy();
    }
    this.clones = [];
  }

  playDeployEffect() {
    const gfx = this.scene.add.graphics().setDepth(100);
    const cx = this.player.x;
    const cy = this.player.y;

    this.scene.tweens.add({
      targets: { r: 0 },
      r: 80,
      duration: 300,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const r = tween.getValue();
        const a = Phaser.Math.Linear(0.6, 0, tween.progress);
        gfx.clear();
        gfx.fillStyle(0xcc44ff, a * 0.3);
        gfx.fillCircle(cx, cy, r);
        gfx.lineStyle(2, 0xcc44ff, a);
        gfx.strokeCircle(cx, cy, r);
      },
      onComplete: () => gfx.destroy()
    });
  }
}
