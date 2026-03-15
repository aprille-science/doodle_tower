export default class ShieldBar {
  constructor(scene, x, y, width, height) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.bgGraphics = scene.add.graphics();
    this.fgGraphics = scene.add.graphics();
    this.label = scene.add.text(x, y - 16, 'SHIELD', {
      fontSize: '12px',
      color: '#4488ff',
      fontFamily: 'monospace'
    });

    this.valueText = scene.add.text(x + width + 8, y + 2, '', {
      fontSize: '11px',
      color: '#4488ff',
      fontFamily: 'monospace'
    });

    this.draw(1);
  }

  update(current, max) {
    const ratio = Math.max(0, current / max);
    this.draw(ratio);
    this.valueText.setText(`${current}/${max}`);
  }

  draw(ratio) {
    this.bgGraphics.clear();
    this.fgGraphics.clear();

    this.bgGraphics.fillStyle(0x222244, 1);
    this.bgGraphics.fillRect(this.x, this.y, this.width, this.height);

    this.fgGraphics.fillStyle(0x4488ff, 1);
    this.fgGraphics.fillRect(this.x, this.y, this.width * ratio, this.height);

    this.bgGraphics.lineStyle(1, 0x4466aa, 1);
    this.bgGraphics.strokeRect(this.x, this.y, this.width, this.height);
  }

  destroy() {
    this.bgGraphics.destroy();
    this.fgGraphics.destroy();
    this.label.destroy();
    this.valueText.destroy();
  }
}
