const DEFAULT_OPTS = {
  lifetime: 700,
  riseSpeed: 55,
  fontSize: 16,
  color: '#ffffff',
  critColor: '#ffdd00',
  critThreshold: 10,
  outlineColor: '#000000',
  outlineThickness: 2
};

// Simple pool: reuse Phaser text objects to reduce GC
const pool = [];
const MAX_POOL = 30;

function acquireText(scene, x, y, str, style) {
  if (pool.length > 0) {
    const t = pool.pop();
    t.setPosition(x, y);
    t.setText(str);
    t.setStyle(style);
    t.setOrigin(0.5);
    t.setAlpha(1);
    t.setActive(true).setVisible(true);
    return t;
  }
  const t = scene.add.text(x, y, str, style).setOrigin(0.5);
  t.setDepth(1000); // always on top
  return t;
}

function releaseText(t) {
  if (!t) return;
  t.setActive(false).setVisible(false);
  if (pool.length < MAX_POOL) {
    pool.push(t);
  } else {
    t.destroy();
  }
}

export class FloatingDamageNumber {
  constructor(scene, worldX, worldY, amount, options = {}) {
    const opts = { ...DEFAULT_OPTS, ...options };

    const isCrit = amount >= opts.critThreshold;
    const color = isCrit ? opts.critColor : opts.color;
    const fontSize = isCrit ? Math.round(opts.fontSize * 1.4) : opts.fontSize;

    const style = {
      fontSize: `${fontSize}px`,
      color: color,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: opts.outlineColor,
      strokeThickness: opts.outlineThickness
    };

    this.text = acquireText(scene, worldX, worldY, `${amount}`, style);

    const hDrift = (Math.random() - 0.5) * 16;
    const endY = worldY - opts.riseSpeed * (opts.lifetime / 1000);

    scene.tweens.add({
      targets: this.text,
      y: endY,
      x: worldX + hDrift,
      alpha: 0,
      duration: opts.lifetime,
      ease: 'Quad.easeOut',
      onComplete: () => {
        releaseText(this.text);
        this.text = null;
      }
    });
  }
}
