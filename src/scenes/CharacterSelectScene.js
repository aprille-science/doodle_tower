import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

const ACCENT = 0x6633aa;
const ACCENT_LIGHT = 0x9966cc;
const BG_DARK = 0x0d0d1a;
const BG_CARD = 0x16162a;

const CHARACTERS = [
  {
    dataId: 'player_default',
    name: 'Flame Magician',
    description: 'Orbiting fireballs burn enemies on contact. Mega Fireball leaves blazing trails.',
    color: 0xff6600,
    avatarColor: 0xff6600,
    stats: { hp: 100, shield: 40, passive: 'Orbiting Fireballs', active: 'Mega Fireball' }
  },
  {
    dataId: 'player_frost_knight',
    name: 'Frost Knight',
    description: 'Heavy armor halves incoming damage. Frost Nova freezes all nearby enemies.',
    color: 0x44ccff,
    avatarColor: 0x44ccff,
    stats: { hp: 120, shield: 60, passive: 'Ice Armor (50% DR)', active: 'Frost Nova' }
  },
  {
    dataId: 'player_storm_archer',
    name: 'Storm Archer',
    description: 'Auto-fires lightning bolts that paralyze. Thunder Strike pierces all enemies.',
    color: 0xffee00,
    avatarColor: 0xffee00,
    stats: { hp: 80, shield: 30, passive: 'Storm Bolt (3s)', active: 'Thunder Strike' }
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
    this.cameras.main.setBackgroundColor(BG_DARK);

    // Header
    this.add.text(CANVAS_WIDTH / 2, 36, 'CHARACTER SELECT', {
      fontSize: '32px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    const lineGfx = this.add.graphics();
    lineGfx.lineStyle(1, ACCENT, 0.4);
    lineGfx.lineBetween(100, 66, CANVAS_WIDTH - 100, 66);

    // Character cards
    const cardW = 220;
    const cardH = 380;
    const gap = 24;
    const totalW = CHARACTERS.length * cardW + (CHARACTERS.length - 1) * gap;
    const startX = (CANVAS_WIDTH - totalW) / 2 + cardW / 2;

    this.cardContainers = [];
    CHARACTERS.forEach((char, i) => {
      const cx = startX + i * (cardW + gap);
      const cy = 310;
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

    // Card background
    const bg = this.add.graphics();
    bg.fillStyle(BG_CARD, 0.8);
    bg.fillRoundedRect(x, y, w, h, 8);
    const borderColor = selected ? char.color : 0x2a2a44;
    bg.lineStyle(selected ? 2.5 : 1, borderColor, selected ? 1 : 0.5);
    bg.strokeRoundedRect(x, y, w, h, 8);
    container.add(bg);

    // Character avatar
    const avatarY = y + 20;
    const avatarSize = 80;
    const avatarGfx = this.add.graphics();
    avatarGfx.fillStyle(0x111122, 1);
    avatarGfx.fillRoundedRect(cx - avatarSize / 2, avatarY, avatarSize, avatarSize, 6);

    // Player circle
    avatarGfx.fillStyle(0xffffff, 1);
    avatarGfx.fillCircle(cx, avatarY + avatarSize / 2, 12);

    // Character-specific icon elements
    if (index === 0) {
      // Fire: orbiting fireballs
      [0, 120, 240].forEach(deg => {
        const rad = Phaser.Math.DegToRad(deg);
        avatarGfx.fillStyle(char.avatarColor, 0.9);
        avatarGfx.fillCircle(cx + Math.cos(rad) * 28, avatarY + avatarSize / 2 + Math.sin(rad) * 28, 6);
      });
    } else if (index === 1) {
      // Ice: shield ring
      avatarGfx.lineStyle(3, char.avatarColor, 0.8);
      avatarGfx.strokeCircle(cx, avatarY + avatarSize / 2, 22);
    } else {
      // Storm: bolts
      avatarGfx.fillStyle(char.avatarColor, 0.9);
      avatarGfx.fillTriangle(cx - 15, avatarY + 25, cx - 5, avatarY + 40, cx - 10, avatarY + 35);
      avatarGfx.fillTriangle(cx + 15, avatarY + 25, cx + 5, avatarY + 40, cx + 10, avatarY + 35);
    }
    container.add(avatarGfx);

    // Name
    const nameColor = selected ? '#ffffff' : '#aaaacc';
    container.add(this.add.text(cx, y + 118, char.name, {
      fontSize: '15px', color: nameColor, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    // Description
    container.add(this.add.text(cx, y + 145, char.description, {
      fontSize: '10px', color: '#777799', fontFamily: 'monospace',
      wordWrap: { width: w - 24 }, align: 'center', lineSpacing: 4
    }).setOrigin(0.5, 0));

    // Stats separator
    const sepGfx = this.add.graphics();
    sepGfx.lineStyle(1, char.color, selected ? 0.4 : 0.15);
    sepGfx.lineBetween(x + 16, y + 210, x + w - 16, y + 210);
    container.add(sepGfx);

    // Stats
    const statsY = y + 222;
    const statLines = [
      { label: 'HP', value: char.stats.hp },
      { label: 'SHIELD', value: char.stats.shield },
      { label: 'PASSIVE', value: char.stats.passive },
      { label: 'ACTIVE', value: char.stats.active }
    ];
    const statsColor = selected ? '#888899' : '#555566';
    const valColor = selected ? '#ccccdd' : '#777788';
    statLines.forEach((stat, si) => {
      const sy = statsY + si * 22;
      container.add(this.add.text(x + 16, sy, stat.label, {
        fontSize: '10px', color: statsColor, fontFamily: 'monospace'
      }));
      container.add(this.add.text(x + w - 16, sy, `${stat.value}`, {
        fontSize: '10px', color: valColor, fontFamily: 'monospace'
      }).setOrigin(1, 0));
    });

    // Selected badge
    if (selected) {
      const badgeY = y + h - 38;
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
    hoverGfx.fillStyle(char.color, 0.08);
    hoverGfx.fillRoundedRect(x, y, w, h, 8);
    hoverGfx.lineStyle(2, char.color, 0.6);
    hoverGfx.strokeRoundedRect(x, y, w, h, 8);
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
    const by = CANVAS_HEIGHT - 100;
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
    bg.fillStyle(BG_CARD, 0.7);
    bg.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 6);
    bg.lineStyle(1, ACCENT, 0.5);
    bg.strokeRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 6);

    const label = this.add.text(bx, by, 'BACK', {
      fontSize: '14px', color: '#aaaacc', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    const zone = this.add.zone(bx, by, bw, bh).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => label.setColor('#ffffff'));
    zone.on('pointerout', () => label.setColor('#aaaacc'));
    zone.on('pointerup', () => this.scene.start('TitleScene'));
  }
}
