import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

const ACCENT = 0x6633aa;
const ACCENT_LIGHT = 0x9966cc;
const BG_DARK = 0x0d0d1a;
const BG_CARD = 0x16162a;
const FIRE_COLOR = 0xff6600;
const FIRE_ACCENT = 0xff2200;
const LOCKED_GRAY = 0x444455;

export default class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterSelectScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor(BG_DARK);
    this.selectedIndex = 0;

    // Header
    this.add.text(CANVAS_WIDTH / 2, 40, 'CHARACTER SELECT', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const lineGfx = this.add.graphics();
    lineGfx.lineStyle(1, ACCENT, 0.4);
    lineGfx.lineBetween(100, 70, CANVAS_WIDTH - 100, 70);

    // Character cards
    const characters = [
      {
        name: 'Flame Magician',
        description: 'A mage wielding orbiting fireballs and a devastating mega fireball burst.',
        color: FIRE_COLOR,
        accentColor: FIRE_ACCENT,
        locked: false,
        stats: {
          hp: 100,
          shield: 40,
          passive: 'Orbiting Fireballs',
          active: 'Mega Fireball'
        }
      },
      {
        name: 'Frost Knight',
        description: 'An armored warrior who freezes enemies on contact.',
        color: LOCKED_GRAY,
        accentColor: LOCKED_GRAY,
        locked: true,
        stats: { hp: '???', shield: '???', passive: '???', active: '???' }
      },
      {
        name: 'Storm Archer',
        description: 'A nimble archer who calls down lightning between bounces.',
        color: LOCKED_GRAY,
        accentColor: LOCKED_GRAY,
        locked: true,
        stats: { hp: '???', shield: '???', passive: '???', active: '???' }
      }
    ];

    const cardW = 220;
    const cardH = 360;
    const gap = 24;
    const totalW = characters.length * cardW + (characters.length - 1) * gap;
    const startX = (CANVAS_WIDTH - totalW) / 2 + cardW / 2;

    characters.forEach((char, i) => {
      const cx = startX + i * (cardW + gap);
      const cy = 300;
      this.createCharacterCard(cx, cy, cardW, cardH, char, i);
    });

    // Back button
    this.createBackButton();
  }

  createCharacterCard(cx, cy, w, h, char, index) {
    const x = cx - w / 2;
    const y = cy - h / 2;
    const locked = char.locked;
    const selected = index === this.selectedIndex && !locked;

    // Card background
    const bg = this.add.graphics();
    bg.fillStyle(BG_CARD, locked ? 0.3 : 0.8);
    bg.fillRoundedRect(x, y, w, h, 8);

    const borderColor = selected ? char.color : (locked ? 0x333344 : 0x2a2a44);
    const borderAlpha = selected ? 1 : (locked ? 0.3 : 0.5);
    bg.lineStyle(selected ? 2.5 : 1, borderColor, borderAlpha);
    bg.strokeRoundedRect(x, y, w, h, 8);

    // Character avatar area
    const avatarY = y + 20;
    const avatarSize = 80;
    const avatarGfx = this.add.graphics();

    if (!locked) {
      // Draw a fire-themed character icon
      avatarGfx.fillStyle(0x111122, 1);
      avatarGfx.fillRoundedRect(cx - avatarSize / 2, avatarY, avatarSize, avatarSize, 6);

      // Player circle
      avatarGfx.fillStyle(0xffffff, 1);
      avatarGfx.fillCircle(cx, avatarY + avatarSize / 2, 12);

      // Orbiting fireballs
      const orbAngles = [0, 120, 240];
      orbAngles.forEach((deg, i) => {
        const rad = Phaser.Math.DegToRad(deg);
        const ox = cx + Math.cos(rad) * 28;
        const oy = avatarY + avatarSize / 2 + Math.sin(rad) * 28;
        avatarGfx.fillStyle(FIRE_COLOR, 0.9);
        avatarGfx.fillCircle(ox, oy, 6);
      });
    } else {
      avatarGfx.fillStyle(0x111122, 0.3);
      avatarGfx.fillRoundedRect(cx - avatarSize / 2, avatarY, avatarSize, avatarSize, 6);
      // Lock symbol
      this.add.text(cx, avatarY + avatarSize / 2, 'LOCKED', {
        fontSize: '12px', color: '#444455', fontFamily: 'monospace', fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    // Character name
    const nameColor = locked ? '#444455' : '#eeeeee';
    this.add.text(cx, y + 120, char.name, {
      fontSize: '15px',
      color: nameColor,
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Description
    const descColor = locked ? '#333344' : '#777799';
    this.add.text(cx, y + 148, char.description, {
      fontSize: '10px',
      color: descColor,
      fontFamily: 'monospace',
      wordWrap: { width: w - 24 },
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5, 0);

    // Stats
    const statsY = y + 220;
    const statsColor = locked ? '#333344' : '#888899';
    const valColor = locked ? '#333344' : '#ccccdd';
    const statLines = [
      { label: 'HP', value: char.stats.hp },
      { label: 'SHIELD', value: char.stats.shield },
      { label: 'PASSIVE', value: char.stats.passive },
      { label: 'ACTIVE', value: char.stats.active }
    ];
    statLines.forEach((stat, si) => {
      const sy = statsY + si * 22;
      this.add.text(x + 16, sy, stat.label, {
        fontSize: '10px', color: statsColor, fontFamily: 'monospace'
      });
      this.add.text(x + w - 16, sy, `${stat.value}`, {
        fontSize: '10px', color: valColor, fontFamily: 'monospace'
      }).setOrigin(1, 0);
    });

    // Separator above stats
    const sepGfx = this.add.graphics();
    if (!locked) {
      sepGfx.lineStyle(1, char.color, 0.3);
    } else {
      sepGfx.lineStyle(1, LOCKED_GRAY, 0.15);
    }
    sepGfx.lineBetween(x + 16, statsY - 8, x + w - 16, statsY - 8);

    // "SELECTED" badge for current character
    if (selected) {
      const badgeY = y + h - 36;
      const badgeBg = this.add.graphics();
      badgeBg.fillStyle(char.color, 0.2);
      badgeBg.fillRoundedRect(cx - 50, badgeY, 100, 24, 4);
      badgeBg.lineStyle(1, char.color, 0.6);
      badgeBg.strokeRoundedRect(cx - 50, badgeY, 100, 24, 4);

      this.add.text(cx, badgeY + 12, 'SELECTED', {
        fontSize: '11px',
        color: '#ff8844',
        fontFamily: 'monospace',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }
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
