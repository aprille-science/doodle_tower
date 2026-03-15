export class BaseBehavior {
  constructor(config) {
    this.config = config;
    this.done = false;
    this._elapsed = 0;
  }

  enter(enemy, player, scene) {}

  update(dt, enemy, player, scene) {
    this._elapsed += dt;
    if (this.config.durationMs && this.config.durationMs > 0 && this._elapsed >= this.config.durationMs) {
      this.done = true;
    }
  }

  exit(enemy, player, scene) {}
}
