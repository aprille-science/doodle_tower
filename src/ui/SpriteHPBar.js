export class SpriteHPBar {
  constructor(scene, entity, barColor) {
    this.scene = scene;
    this.entity = entity;
    this.barColor = barColor;
    this.barWidth = 40;
    this.barHeight = 5;
    this.displayFill = 1;
    this.revealed = false;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(900); // Above all entities
    this.graphics.setAlpha(0);
  }

  update() {
    const entity = this.entity;
    if (!entity || !entity.alive) {
      this.graphics.clear();
      return;
    }

    const hpFraction = Math.max(0, entity.hp / entity.maxHp);

    // Reveal permanently on first damage
    if (hpFraction < 1 && !this.revealed) {
      this.revealed = true;
      this.graphics.setAlpha(1);
    }

    if (!this.revealed) return;

    // Lerp display fill toward true HP fraction
    this.displayFill += (hpFraction - this.displayFill) * 0.15;

    const halfW = this.barWidth / 2;
    // Use the entity's half-height to position above its top edge
    const halfH = entity.radius || Math.max(entity.width || 0, entity.height || 0) / 2 || 25;
    const barX = entity.x - halfW;
    const barY = entity.y - halfH - 10;

    this.graphics.clear();

    // Background
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRect(barX, barY, this.barWidth, this.barHeight);

    // Fill
    const fillWidth = Math.max(0, this.displayFill * this.barWidth);
    this.graphics.fillStyle(this.barColor, 1);
    this.graphics.fillRect(barX, barY, fillWidth, this.barHeight);
  }

  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}
