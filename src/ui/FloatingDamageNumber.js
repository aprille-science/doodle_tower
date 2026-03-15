export class FloatingDamageNumber {
  constructor(scene, worldX, worldY, amount, options = {}) {
    const defaults = {
      lifetime: 700,
      riseSpeed: 55,
      fontSize: 16,
      color: '#ffffff',
      critColor: '#ffdd00',
      critThreshold: 10,
      outlineColor: '#000000',
      outlineThickness: 2
    };
    const opts = { ...defaults, ...options };

    const isCrit = amount >= opts.critThreshold;
    const color = isCrit ? opts.critColor : opts.color;
    const fontSize = isCrit ? Math.round(opts.fontSize * 1.4) : opts.fontSize;

    this.text = scene.add.text(worldX, worldY, `${amount}`, {
      fontSize: `${fontSize}px`,
      color: color,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: opts.outlineColor,
      strokeThickness: opts.outlineThickness
    }).setOrigin(0.5);

    const hDrift = (Math.random() - 0.5) * 16; // -8 to +8

    scene.tweens.add({
      targets: this.text,
      y: worldY - opts.riseSpeed * (opts.lifetime / 1000),
      x: worldX + hDrift,
      alpha: 0,
      duration: opts.lifetime,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (this.text) {
          this.text.destroy();
          this.text = null;
        }
      }
    });
  }
}
