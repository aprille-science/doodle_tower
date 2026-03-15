export default class HPBar {
  constructor(scene, x, y, width, height, color, label) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;

    this.bgGraphics = scene.add.graphics();
    this.fgGraphics = scene.add.graphics();
    this.label = scene.add.text(x, y - 16, label, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace'
    });

    this.valueText = scene.add.text(x + width + 8, y + 2, '', {
      fontSize: '11px',
      color: '#ffffff',
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

    // Background
    this.bgGraphics.fillStyle(0x333333, 1);
    this.bgGraphics.fillRect(this.x, this.y, this.width, this.height);

    // Foreground
    this.fgGraphics.fillStyle(this.color, 1);
    this.fgGraphics.fillRect(this.x, this.y, this.width * ratio, this.height);

    // Border
    this.bgGraphics.lineStyle(1, 0x666666, 1);
    this.bgGraphics.strokeRect(this.x, this.y, this.width, this.height);
  }

  destroy() {
    this.bgGraphics.destroy();
    this.fgGraphics.destroy();
    this.label.destroy();
    this.valueText.destroy();
  }
}
