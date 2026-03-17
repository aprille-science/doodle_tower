import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

const PAPER_BG = 0xf5f0e8;
const GRID_LINE = 0xb8cfe0;
const INK_DARK = 0x222233;
const INK_BLUE = 0x2244aa;
const INK_RED = 0xcc3333;
const CARD_BG = 0xeae4d8;

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    // Graph paper background
    const bg = this.add.graphics();
    bg.fillStyle(PAPER_BG, 1);
    bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid lines
    const grid = this.add.graphics().setDepth(0);
    grid.lineStyle(0.5, GRID_LINE, 0.4);
    for (let x = 0; x <= CANVAS_WIDTH; x += 50) {
      grid.lineBetween(x, 0, x, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 50) {
      grid.lineBetween(0, y, CANVAS_WIDTH, y);
    }
    // Major lines every 200px
    grid.lineStyle(1, 0x8aaecc, 0.5);
    for (let x = 0; x <= CANVAS_WIDTH; x += 200) {
      grid.lineBetween(x, 0, x, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 200) {
      grid.lineBetween(0, y, CANVAS_WIDTH, y);
    }
    // Red margin line
    grid.lineStyle(1.5, 0xd48b8b, 0.4);
    grid.lineBetween(50, 0, 50, CANVAS_HEIGHT);

    // Paper texture speckles
    for (let i = 0; i < 80; i++) {
      bg.fillStyle(0xd8d0c4, 0.15 + Math.random() * 0.1);
      bg.fillCircle(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT, Math.random() * 1.5);
    }

    // Animated doodle particles (floating ink dots)
    this.particles = [];
    for (let i = 0; i < 25; i++) {
      this.particles.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        speed: 5 + Math.random() * 15,
        alpha: 0.05 + Math.random() * 0.1,
        radius: 0.5 + Math.random() * 1.5
      });
    }
    this.particleGfx = this.add.graphics().setDepth(0);

    // Title — hand-drawn look with pen strokes
    this.add.text(CANVAS_WIDTH / 2, 155, 'DOODLE', {
      fontSize: '72px',
      color: '#222233',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#b8cfe0',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(1);

    this.add.text(CANVAS_WIDTH / 2, 235, 'TOWER', {
      fontSize: '72px',
      color: '#2244aa',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#ddd8cc',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(1);

    // Subtitle
    this.add.text(CANVAS_WIDTH / 2, 300, 'Brick Breaker RPG', {
      fontSize: '16px',
      color: '#888899',
      fontFamily: 'monospace',
      letterSpacing: 6
    }).setOrigin(0.5).setDepth(1);

    // Decorative line — sketchy pen
    const lineGfx = this.add.graphics().setDepth(1);
    lineGfx.lineStyle(1.5, INK_DARK, 0.3);
    lineGfx.lineBetween(200, 330, 600, 330);
    lineGfx.lineStyle(0.5, INK_DARK, 0.15);
    lineGfx.lineBetween(202, 332, 598, 332);

    // Doodle decorations — small sketched shapes around title
    const deco = this.add.graphics().setDepth(1);
    // Stars doodled in corners
    this.drawDoodleStar(deco, 140, 180, 12);
    this.drawDoodleStar(deco, 660, 180, 10);
    this.drawDoodleStar(deco, 100, 250, 8);
    this.drawDoodleStar(deco, 700, 250, 8);

    // Menu buttons
    const buttonDefs = [
      { label: 'MAP SELECT', key: 'map', locked: false },
      { label: 'TEAM BUILDER', key: 'team', locked: false },
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

    // Version
    this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30, 'v0.1 POC', {
      fontSize: '11px',
      color: '#aaaaaa',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(1);
  }

  drawDoodleStar(gfx, cx, cy, size) {
    gfx.lineStyle(1, INK_DARK, 0.25);
    const points = 5;
    for (let i = 0; i < points; i++) {
      const angle1 = (i / points) * Math.PI * 2 - Math.PI / 2;
      const angle2 = ((i + 2) / points) * Math.PI * 2 - Math.PI / 2;
      gfx.lineBetween(
        cx + Math.cos(angle1) * size, cy + Math.sin(angle1) * size,
        cx + Math.cos(angle2) * size, cy + Math.sin(angle2) * size
      );
    }
  }

  createMenuButton(cx, cy, w, h, def) {
    const x = cx - w / 2;
    const y = cy - h / 2;
    const locked = def.locked;

    const container = this.add.container(0, 0).setDepth(2);

    // Button background — notebook paper card
    const bg = this.add.graphics();
    if (locked) {
      bg.fillStyle(0xddd8cc, 0.3);
      bg.fillRoundedRect(x, y, w, h, 4);
      bg.lineStyle(1, 0xaaaaaa, 0.3);
      bg.strokeRoundedRect(x, y, w, h, 4);
    } else {
      bg.fillStyle(CARD_BG, 0.6);
      bg.fillRoundedRect(x, y, w, h, 4);
      bg.lineStyle(1.5, INK_DARK, 0.4);
      bg.strokeRoundedRect(x, y, w, h, 4);
    }
    container.add(bg);

    // Label — pen ink
    const labelColor = locked ? '#aaaaaa' : '#222233';
    const label = this.add.text(cx, cy, def.label, {
      fontSize: '20px',
      color: labelColor,
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(label);

    if (locked) {
      const lockText = this.add.text(cx + w / 2 - 30, cy, 'LOCKED', {
        fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace'
      }).setOrigin(0.5);
      container.add(lockText);
      return;
    }

    const hitZone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });
    container.add(hitZone);

    // Hover state — blue ink highlight
    const hoverBg = this.add.graphics().setVisible(false);
    hoverBg.fillStyle(INK_BLUE, 0.08);
    hoverBg.fillRoundedRect(x, y, w, h, 4);
    hoverBg.lineStyle(2, INK_BLUE, 0.6);
    hoverBg.strokeRoundedRect(x, y, w, h, 4);
    container.add(hoverBg);

    hitZone.on('pointerover', () => {
      hoverBg.setVisible(true);
      label.setColor('#2244aa');
    });
    hitZone.on('pointerout', () => {
      hoverBg.setVisible(false);
      label.setColor('#222233');
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
      case 'team':
        this.scene.start('TeamBuilderScene');
        break;
    }
  }

  update(_time, delta) {
    this.particleGfx.clear();
    for (const p of this.particles) {
      p.y -= p.speed * (delta / 1000);
      if (p.y < -10) {
        p.y = CANVAS_HEIGHT + 10;
        p.x = Math.random() * CANVAS_WIDTH;
      }
      this.particleGfx.fillStyle(INK_DARK, p.alpha);
      this.particleGfx.fillCircle(p.x, p.y, p.radius);
    }
  }
}
