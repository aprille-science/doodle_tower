import { BaseActiveSkill } from '../BaseActiveSkill.js';

export class RageModeActive extends BaseActiveSkill {
  constructor(config, player, scene) {
    super(config, player, scene);
    this.rageActive = false;
    this.rageTimer = 0;
    this.originalAttack = 0;
    this.rageGfx = null;
  }

  cast() {
    if (!this.isReady()) return;

    this.rageActive = true;
    this.rageTimer = this.config.durationMs || 5000;
    this.originalAttack = this.player.attackDamage;

    // Boost attack by multiplier (500% = 5x, so total is 6x original but user said "increases by 500%" meaning 5x total)
    this.player.attackDamage = this.originalAttack * (this.config.attackMultiplier || 5);
    this.player.contactDamage = (this.player.contactDamage || 0) * (this.config.attackMultiplier || 5);

    // Make invulnerable
    if (this.config.invulnerable) {
      this.player._rageInvuln = true;
    }

    this.rageGfx = this.scene.add.graphics().setDepth(50);
    this.triggerCooldown();
  }

  update(dt) {
    super.update(dt);

    if (!this.rageActive) return;

    this.rageTimer -= dt;

    // Visual: pulsing red aura
    if (this.rageGfx && this.player.alive) {
      this.rageGfx.clear();
      const pulse = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
      this.rageGfx.lineStyle(3, 0xff4400, pulse);
      this.rageGfx.strokeCircle(this.player.x, this.player.y, this.player.radius + 12);
      this.rageGfx.lineStyle(1.5, 0xff8800, pulse * 0.6);
      this.rageGfx.strokeCircle(this.player.x, this.player.y, this.player.radius + 18);
    }

    if (this.rageTimer <= 0) {
      this.endRage();
    }
  }

  endRage() {
    if (!this.rageActive) return;
    this.rageActive = false;
    this.player.attackDamage = this.originalAttack;
    // Restore contact damage proportionally
    if (this.config.attackMultiplier) {
      this.player.contactDamage = Math.round(this.player.contactDamage / this.config.attackMultiplier);
    }
    this.player._rageInvuln = false;
    if (this.rageGfx) {
      this.rageGfx.destroy();
      this.rageGfx = null;
    }
  }

  deactivate() {
    this.endRage();
  }
}
