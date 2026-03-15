export class BaseActiveSkill {
  constructor(config, player, scene) {
    this.config = config;
    this.player = player;
    this.scene = scene;
    this.cooldownRemaining = 0;
  }

  cast(pointerWorldX, pointerWorldY) {}

  update(dt) {
    if (this.cooldownRemaining > 0) this.cooldownRemaining -= dt;
  }

  isReady() {
    return this.cooldownRemaining <= 0;
  }

  getCooldownPercent() {
    return Math.max(0, this.cooldownRemaining / this.config.cooldownMs);
  }

  triggerCooldown() {
    this.cooldownRemaining = this.config.cooldownMs;
  }
}
