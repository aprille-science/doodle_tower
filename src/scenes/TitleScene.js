import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

const ACCENT = 0x6633aa;
const ACCENT_LIGHT = 0x9966cc;
const BG_DARK = 0x0d0d1a;
const BG_CARD = 0x16162a;
const LOCKED_GRAY = 0x444455;

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    // Full-screen dark background
    this.add.graphics()
      .fillStyle(BG_DARK, 1)
      .fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle animated particles in background
    this.particles = [];
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        speed: 8 + Math.random() * 20,
        alpha: 0.05 + Math.random() * 0.15,
        radius: 1 + Math.random() * 2
      });
    }
    this.particleGfx = this.add.graphics().setDepth(0);

    // Title
    this.add.text(CANVAS_WIDTH / 2, 160, 'DOODLE', {
      fontSize: '72px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#6633aa',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(1);

    this.add.text(CANVAS_WIDTH / 2, 240, 'TOWER', {
      fontSize: '72px',
      color: '#9966cc',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#331166',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(1);

    // Subtitle
    this.add.text(CANVAS_WIDTH / 2, 300, 'Brick Breaker RPG', {
      fontSize: '16px',
      color: '#666688',
      fontFamily: 'monospace',
      letterSpacing: 6
    }).setOrigin(0.5).setDepth(1);

    // Decorative line
    const lineGfx = this.add.graphics().setDepth(1);
    lineGfx.lineStyle(1, ACCENT, 0.4);
    lineGfx.lineBetween(200, 330, 600, 330);

    // Menu buttons
    const buttonDefs = [
      { label: 'MAP SELECT', key: 'map', locked: false },
      { label: 'CHARACTER', key: 'character', locked: false },
      { label: 'SHOP', key: 'shop', locked: true },
      { label: 'TOWER', key: 'tower', locked: true }
    ];

    const startY = 420;
    const btnW = 320;
    const btnH = 56;
    const gap = 20;

    buttonDefs.forEach((def, i) => {
      const y = startY + i * (btnH + gap);
      this.createMenuButton(CANVAS_WIDTH / 2, y, btnW, btnH, def);
    });

    // Version / footer
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30, 'v0.1 POC', {
      fontSize: '11px',
      color: '#333355',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(1);
  }

  createMenuButton(cx, cy, w, h, def) {
    const x = cx - w / 2;
    const y = cy - h / 2;
    const locked = def.locked;

    const container = this.add.container(0, 0).setDepth(2);

    // Button background
    const bg = this.add.graphics();
    const fillColor = locked ? LOCKED_GRAY : BG_CARD;
    const borderColor = locked ? 0x555566 : ACCENT;
    bg.fillStyle(fillColor, locked ? 0.3 : 0.6);
    bg.fillRoundedRect(x, y, w, h, 8);
    bg.lineStyle(1.5, borderColor, locked ? 0.3 : 0.7);
    bg.strokeRoundedRect(x, y, w, h, 8);
    container.add(bg);

    // Label
    const labelColor = locked ? '#555566' : '#ccccee';
    const label = this.add.text(cx, cy, def.label, {
      fontSize: '20px',
      color: labelColor,
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(label);

    // Lock icon for locked buttons
    if (locked) {
      const lockText = this.add.text(cx + w / 2 - 30, cy, 'LOCKED', {
        fontSize: '10px',
        color: '#555566',
        fontFamily: 'monospace'
      }).setOrigin(0.5);
      container.add(lockText);
      return;
    }

    // Hover zone (interactive)
    const hitZone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });
    container.add(hitZone);

    // Hover state
    const hoverBg = this.add.graphics().setVisible(false);
    hoverBg.fillStyle(ACCENT, 0.15);
    hoverBg.fillRoundedRect(x, y, w, h, 8);
    hoverBg.lineStyle(2, ACCENT_LIGHT, 1);
    hoverBg.strokeRoundedRect(x, y, w, h, 8);
    container.add(hoverBg);

    hitZone.on('pointerover', () => {
      hoverBg.setVisible(true);
      label.setColor('#ffffff');
    });
    hitZone.on('pointerout', () => {
      hoverBg.setVisible(false);
      label.setColor('#ccccee');
    });
    hitZone.on('pointerdown', () => {
      this.onMenuSelect(def.key);
    });
  }

  onMenuSelect(key) {
    switch (key) {
      case 'map':
        this.scene.start('MapSelectScene');
        break;
      case 'character':
        this.scene.start('CharacterSelectScene');
        break;
    }
  }

  update(_time, delta) {
    // Animate floating particles
    this.particleGfx.clear();
    for (const p of this.particles) {
      p.y -= p.speed * (delta / 1000);
      if (p.y < -10) {
        p.y = CANVAS_HEIGHT + 10;
        p.x = Math.random() * CANVAS_WIDTH;
      }
      this.particleGfx.fillStyle(ACCENT, p.alpha);
      this.particleGfx.fillCircle(p.x, p.y, p.radius);
    }
  }
}
