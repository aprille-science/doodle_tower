import { STATUS_COLORS } from '../systems/StatusEffectManager.js';

export class SpriteHPBar {
  constructor(scene, entity, barColor) {
    this.scene = scene;
    this.entity = entity;
    this.barColor = barColor;
    this.barWidth = 40;
    this.barHeight = 5;
    this.displayFill = 1;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(900);

    // Status effect icons — created lazily
    this.statusTexts = {};
  }

  update() {
    const entity = this.entity;
    if (!entity || !entity.alive) {
      this.graphics.clear();
      this.clearStatusTexts();
      return;
    }

    const hpFraction = Math.max(0, entity.hp / entity.maxHp);
    this.displayFill += (hpFraction - this.displayFill) * 0.15;

    const halfW = this.barWidth / 2;
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

    // Border
    this.graphics.lineStyle(1, 0x555555, 0.6);
    this.graphics.strokeRect(barX, barY, this.barWidth, this.barHeight);

    // Status effect indicators above HP bar
    this.drawStatusEffects(entity, barX, barY);
  }

  drawStatusEffects(entity, barX, barY) {
    const statusMgr = this.scene.statusEffectManager;
    if (!statusMgr) {
      this.clearStatusTexts();
      return;
    }

    const statuses = statusMgr.getStatuses(entity);
    const activeTypes = new Set();

    let offsetX = 0;
    const iconY = barY - 12;

    for (const status of statuses) {
      activeTypes.add(status.type);
      const info = STATUS_COLORS[status.type];
      if (!info) continue;

      const secs = Math.ceil(status.remaining / 1000);
      const label = `${info.label}${secs}`;

      // Draw background pill
      const pillX = barX + offsetX;
      const pillW = label.length * 6 + 4;
      this.graphics.fillStyle(info.fill, 0.3);
      this.graphics.fillRoundedRect(pillX, iconY, pillW, 10, 2);

      // Create or update text
      if (!this.statusTexts[status.type]) {
        this.statusTexts[status.type] = this.scene.add.text(0, 0, '', {
          fontSize: '8px', color: info.text, fontFamily: 'monospace', fontStyle: 'bold'
        }).setDepth(901);
      }
      const txt = this.statusTexts[status.type];
      txt.setText(label);
      txt.setPosition(pillX + 2, iconY + 1);
      txt.setVisible(true);

      offsetX += pillW + 2;
    }

    // Hide texts for statuses no longer active
    for (const [type, txt] of Object.entries(this.statusTexts)) {
      if (!activeTypes.has(type)) {
        txt.setVisible(false);
      }
    }
  }

  clearStatusTexts() {
    for (const txt of Object.values(this.statusTexts)) {
      txt.setVisible(false);
    }
  }

  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    for (const txt of Object.values(this.statusTexts)) {
      txt.destroy();
    }
    this.statusTexts = {};
  }
}
