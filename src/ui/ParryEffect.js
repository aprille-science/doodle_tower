export default class ParryEffect {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.active = false;
    this.elapsed = 0;
    this.duration = 400;
    this.x = 0;
    this.y = 0;
  }

  trigger(x, y) {
    this.x = x;
    this.y = y;
    this.active = true;
    this.elapsed = 0;
  }

  update(delta) {
    if (!this.active) return;

    this.elapsed += delta;
    const progress = this.elapsed / this.duration;

    if (progress >= 1) {
      this.active = false;
      this.graphics.clear();
      return;
    }

    this.graphics.clear();

    const radius = 15 + progress * 40;
    const alpha = 1 - progress;

    // White/cyan expanding ring
    this.graphics.lineStyle(4, 0x88ffff, alpha);
    this.graphics.strokeCircle(this.x, this.y, radius);

    // Inner bright ring
    this.graphics.lineStyle(2, 0xffffff, alpha * 0.8);
    this.graphics.strokeCircle(this.x, this.y, radius * 0.6);
  }

  destroy() {
    this.graphics.destroy();
  }
}
