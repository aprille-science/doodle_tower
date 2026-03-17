import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

const PAPER_BG = 0xf5f0e8;
const GRID_LINE = 0xb8cfe0;
const INK_DARK = 0x222233;
const INK_BLUE = 0x2244aa;
const CARD_BG = 0xeae4d8;

const CHARACTERS = [
  {
    dataId: 'player_default',
    name: 'Wizard Cat',
    description: 'Orbiting fireballs burn enemies on contact. Mega Fireball leaves blazing trails.',
    color: 0xff6600,
    avatarColor: 0xff6600,
    stats: { hp: 100, shield: 40, atk: 8, spd: 500, cost: 25, passive: 'Orbiting Fireballs', active: 'Mega Fireball' }
  },
  {
    dataId: 'player_frost_knight',
    name: 'Soldier Cat',
    description: 'Heavy armor halves incoming damage. Frost Nova freezes and leaves frost terrain.',
    color: 0x44ccff,
    avatarColor: 0x44ccff,
    stats: { hp: 120, shield: 60, atk: 12, spd: 450, cost: 25, passive: 'Ice Armor (50% DR)', active: 'Frost Nova' }
  },
  {
    dataId: 'player_storm_archer',
    name: 'Archer Cat',
    description: 'Auto-fires lightning bolts. Thunder Strike pierces and leaves electric terrain.',
    color: 0xffee00,
    avatarColor: 0xffee00,
    stats: { hp: 80, shield: 30, atk: 5, spd: 550, cost: 25, passive: 'Storm Bolt (2s)', active: 'Thunder Strike' }
  },
  {
    dataId: 'player_science_cat',
    name: 'Science Cat',
    description: 'Poisons enemies on contact. Toxic Burst deals AoE damage and inflicts long poison.',
    color: 0x66ff22,
    avatarColor: 0x66ff22,
    stats: { hp: 100, shield: 50, atk: 5, spd: 715, cost: 25, passive: 'Toxic Touch', active: 'Toxic Burst' }
  },
  {
    dataId: 'player_sumo_cat',
    name: 'Sumo Cat',
    description: 'Deals 5x damage to breakable terrain. Rage Mode boosts ATK 500% and blocks all damage.',
    color: 0xff8844,
    avatarColor: 0xff8844,
    stats: { hp: 250, shield: 100, atk: 15, spd: 413, cost: 35, passive: 'Terrain Crusher', active: 'Rage Mode' }
  },
  {
    dataId: 'player_mecha_cat',
    name: 'Mecha Cat',
    description: 'Orbiting fireballs burn enemies. Deploy Clone fires 4 bouncing clones in cardinal directions.',
    color: 0xcc44ff,
    avatarColor: 0xcc44ff,
    stats: { hp: 150, shield: 50, atk: 10, spd: 550, cost: 50, passive: 'Burn Orbs', active: 'Deploy Clones' }
  }
];

export default class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterSelectScene' });
  }

  init(data) {
    this.selectedIndex = (data && data.selectedIndex) || 0;
  }

  create() {
    this.cameras.main.setBackgroundColor(PAPER_BG);

    // Graph paper grid
    const grid = this.add.graphics().setDepth(0);
    grid.lineStyle(0.5, GRID_LINE, 0.35);
    for (let x = 0; x <= CANVAS_WIDTH; x += 50) grid.lineBetween(x, 0, x, CANVAS_HEIGHT);
    for (let y = 0; y <= CANVAS_HEIGHT; y += 50) grid.lineBetween(0, y, CANVAS_WIDTH, y);
    grid.lineStyle(1.5, 0xd48b8b, 0.35);
    grid.lineBetween(50, 0, 50, CANVAS_HEIGHT);

    // Header
    this.add.text(CANVAS_WIDTH / 2, 36, 'CHARACTER SELECT', {
      fontSize: '32px', color: '#222233', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    const lineGfx = this.add.graphics();
    lineGfx.lineStyle(1.5, INK_DARK, 0.25);
    lineGfx.lineBetween(100, 66, CANVAS_WIDTH - 100, 66);

    // Character cards — 2 rows of 3
    const cardW = 230;
    const cardH = 340;
    const gapX = 20;
    const gapY = 16;
    const cols = 3;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (CANVAS_WIDTH - totalW) / 2 + cardW / 2;

    this.cardContainers = [];
    CHARACTERS.forEach((char, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + gapX);
      const cy = 270 + row * (cardH + gapY);
      this.createCharacterCard(cx, cy, cardW, cardH, char, i);
    });

    // Confirm button
    this.createConfirmButton();

    // Back button
    this.createBackButton();
  }

  createCharacterCard(cx, cy, w, h, char, index) {
    const x = cx - w / 2;
    const y = cy - h / 2;
    const selected = index === this.selectedIndex;

    const container = this.add.container(0, 0);

    // Card background — notebook card
    const bg = this.add.graphics();
    bg.fillStyle(CARD_BG, selected ? 0.85 : 0.5);
    bg.fillRoundedRect(x, y, w, h, 4);
    const borderColor = selected ? char.color : 0x999988;
    bg.lineStyle(selected ? 2.5 : 1, borderColor, selected ? 0.8 : 0.35);
    bg.strokeRoundedRect(x, y, w, h, 4);
    container.add(bg);

    // Character avatar
    const avatarY = y + 20;
    const avatarSize = 80;
    const avatarGfx = this.add.graphics();
    avatarGfx.fillStyle(0xf5f0e8, 1);
    avatarGfx.fillRoundedRect(cx - avatarSize / 2, avatarY, avatarSize, avatarSize, 4);
    avatarGfx.lineStyle(1, INK_DARK, 0.3);
    avatarGfx.strokeRoundedRect(cx - avatarSize / 2, avatarY, avatarSize, avatarSize, 4);

    // Player circle — doodle style
    avatarGfx.fillStyle(0xf5f0e8, 1);
    avatarGfx.fillCircle(cx, avatarY + avatarSize / 2, 12);
    avatarGfx.lineStyle(1.5, INK_DARK, 0.8);
    avatarGfx.strokeCircle(cx, avatarY + avatarSize / 2, 12);
    // Eyes
    avatarGfx.fillStyle(INK_DARK, 0.9);
    avatarGfx.fillCircle(cx - 4, avatarY + avatarSize / 2 - 2, 1.5);
    avatarGfx.fillCircle(cx + 4, avatarY + avatarSize / 2 - 2, 1.5);

    // Character-specific icon elements
    const acx = cx;
    const acy = avatarY + avatarSize / 2;
    if (char.dataId === 'player_default') {
      // Fire: orbiting fireballs
      [0, 120, 240].forEach(deg => {
        const rad = Phaser.Math.DegToRad(deg);
        avatarGfx.fillStyle(char.avatarColor, 0.9);
        avatarGfx.fillCircle(acx + Math.cos(rad) * 28, acy + Math.sin(rad) * 28, 6);
      });
    } else if (char.dataId === 'player_frost_knight') {
      // Ice: shield ring
      avatarGfx.lineStyle(3, char.avatarColor, 0.8);
      avatarGfx.strokeCircle(acx, acy, 22);
    } else if (char.dataId === 'player_storm_archer') {
      // Storm: bolts
      avatarGfx.fillStyle(char.avatarColor, 0.9);
      avatarGfx.fillTriangle(acx - 15, acy - 15, acx - 5, acy, acx - 10, acy - 5);
      avatarGfx.fillTriangle(acx + 15, acy - 15, acx + 5, acy, acx + 10, acy - 5);
    } else if (char.dataId === 'player_science_cat') {
      // Poison: bubbles
      avatarGfx.fillStyle(char.avatarColor, 0.7);
      avatarGfx.fillCircle(acx - 18, acy - 10, 5);
      avatarGfx.fillCircle(acx + 20, acy + 5, 4);
      avatarGfx.fillCircle(acx - 8, acy + 18, 3);
    } else if (char.dataId === 'player_sumo_cat') {
      // Sumo: larger body outline
      avatarGfx.lineStyle(3, char.avatarColor, 0.8);
      avatarGfx.strokeCircle(acx, acy, 20);
      avatarGfx.lineStyle(2, char.avatarColor, 0.5);
      avatarGfx.strokeCircle(acx, acy, 26);
    } else if (char.dataId === 'player_mecha_cat') {
      // Mecha: gear/cross pattern
      avatarGfx.lineStyle(2, char.avatarColor, 0.8);
      avatarGfx.lineBetween(acx, acy - 24, acx, acy + 24);
      avatarGfx.lineBetween(acx - 24, acy, acx + 24, acy);
      avatarGfx.strokeCircle(acx, acy, 20);
    }
    container.add(avatarGfx);

    // Name — pen ink
    const nameColor = selected ? '#222233' : '#888888';
    container.add(this.add.text(cx, y + 118, char.name, {
      fontSize: '15px', color: nameColor, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    // Description — pencil gray
    container.add(this.add.text(cx, y + 145, char.description, {
      fontSize: '10px', color: '#777788', fontFamily: 'monospace',
      wordWrap: { width: w - 24 }, align: 'center', lineSpacing: 4
    }).setOrigin(0.5, 0));

    // Stats separator
    const sepGfx = this.add.graphics();
    sepGfx.lineStyle(1, char.color, selected ? 0.4 : 0.15);
    sepGfx.lineBetween(x + 16, y + 180, x + w - 16, y + 180);
    container.add(sepGfx);

    // Stats
    const statsY = y + 190;
    const statLines = [
      { label: 'HP', value: char.stats.hp },
      { label: 'SHIELD', value: char.stats.shield },
      { label: 'ATK', value: char.stats.atk },
      { label: 'SPD', value: char.stats.spd },
      { label: 'COST', value: char.stats.cost },
      { label: 'PASSIVE', value: char.stats.passive },
      { label: 'ACTIVE', value: char.stats.active }
    ];
    const statsColor = selected ? '#666677' : '#999999';
    const valColor = selected ? '#333344' : '#888888';
    statLines.forEach((stat, si) => {
      const sy = statsY + si * 18;
      container.add(this.add.text(x + 12, sy, stat.label, {
        fontSize: '9px', color: statsColor, fontFamily: 'monospace'
      }));
      container.add(this.add.text(x + w - 12, sy, `${stat.value}`, {
        fontSize: '9px', color: valColor, fontFamily: 'monospace'
      }).setOrigin(1, 0));
    });

    // Selected badge
    if (selected) {
      const badgeY = y + h - 30;
      const badgeBg = this.add.graphics();
      badgeBg.fillStyle(char.color, 0.2);
      badgeBg.fillRoundedRect(cx - 50, badgeY, 100, 24, 4);
      badgeBg.lineStyle(1, char.color, 0.6);
      badgeBg.strokeRoundedRect(cx - 50, badgeY, 100, 24, 4);
      container.add(badgeBg);

      const hexColor = '#' + char.color.toString(16).padStart(6, '0');
      container.add(this.add.text(cx, badgeY + 12, 'SELECTED', {
        fontSize: '11px', color: hexColor, fontFamily: 'monospace', fontStyle: 'bold'
      }).setOrigin(0.5));
    }

    // Hit zone for selection
    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });
    container.add(zone);

    // Hover overlay
    const hoverGfx = this.add.graphics().setVisible(false);
    hoverGfx.fillStyle(char.color, 0.06);
    hoverGfx.fillRoundedRect(x, y, w, h, 4);
    hoverGfx.lineStyle(2, char.color, 0.5);
    hoverGfx.strokeRoundedRect(x, y, w, h, 4);
    container.add(hoverGfx);

    zone.on('pointerover', () => { if (index !== this.selectedIndex) hoverGfx.setVisible(true); });
    zone.on('pointerout', () => hoverGfx.setVisible(false));
    zone.on('pointerup', () => {
      if (index !== this.selectedIndex) {
        this.scene.restart({ selectedIndex: index });
      }
    });

    this.cardContainers.push(container);
  }

  createConfirmButton() {
    const char = CHARACTERS[this.selectedIndex];
    const bx = CANVAS_WIDTH / 2;
    const by = CANVAS_HEIGHT - 50;
    const bw = 200;
    const bh = 44;

    const bg = this.add.graphics();
    bg.fillStyle(char.color, 0.2);
    bg.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 6);
    bg.lineStyle(2, char.color, 0.7);
    bg.strokeRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 6);

    const hexColor = '#' + char.color.toString(16).padStart(6, '0');
    const label = this.add.text(bx, by, 'CONFIRM', {
      fontSize: '18px', color: hexColor, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    const zone = this.add.zone(bx, by, bw, bh).setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => label.setColor('#ffffff'));
    zone.on('pointerout', () => label.setColor(hexColor));
    zone.on('pointerup', () => {
      // Store selection globally so MapSelect can pick it up
      this.registry.set('selectedCharacter', char.dataId);
      this.scene.start('TitleScene');
    });
  }

  createBackButton() {
    const bx = 60;
    const by = CANVAS_HEIGHT - 40;
    const bw = 100;
    const bh = 36;

    const bg = this.add.graphics();
    bg.fillStyle(CARD_BG, 0.7);
    bg.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 4);
    bg.lineStyle(1.5, INK_DARK, 0.35);
    bg.strokeRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 4);

    const label = this.add.text(bx, by, 'BACK', {
      fontSize: '14px', color: '#555555', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    const zone = this.add.zone(bx, by, bw, bh).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => label.setColor('#2244aa'));
    zone.on('pointerout', () => label.setColor('#555555'));
    zone.on('pointerup', () => this.scene.start('TitleScene'));
  }
}
