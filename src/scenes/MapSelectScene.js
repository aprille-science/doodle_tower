import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

const PAPER_BG = 0xf5f0e8;
const GRID_LINE = 0xb8cfe0;
const INK_DARK = 0x222233;
const INK_BLUE = 0x2244aa;
const CARD_BG = 0xeae4d8;
const CARD_BORDER = 0x999988;

const ENEMY_COLORS = {
  wanderer_01: { main: 0x44aa44, accent: '#44aa44', name: 'Wanderer' },
  dancer_01: { main: 0xaa44aa, accent: '#aa44aa', name: 'Dancer' },
  hunter_01: { main: 0x4488cc, accent: '#4488cc', name: 'Hunter' },
  guardian_01: { main: 0xccaa44, accent: '#ccaa44', name: 'Guardian' },
  berserker_01: { main: 0xcc4444, accent: '#cc4444', name: 'Berserker' },
  sentinel_01: { main: 0x667788, accent: '#667788', name: 'Sentinel' },
  boss_sentinel: { main: 0x8899aa, accent: '#8899aa', name: 'Iron Bastion' },
  boss_01: { main: 0xff4400, accent: '#ff4400', name: 'Stone Sentinel' }
};

const MAP_IDS = [
  'map_wanderer', 'map_dancer', 'map_hunter',
  'map_guardian', 'map_berserker', 'map_sentinel', 'map_01'
];

const CARD_W = 340;
const CARD_H = 130;
const CARD_GAP = 16;
const CARDS_PER_ROW = 2;
const GRID_LEFT = (CANVAS_WIDTH - (CARD_W * CARDS_PER_ROW + CARD_GAP * (CARDS_PER_ROW - 1))) / 2;
const HEADER_H = 100;
const SCROLL_PADDING_BOTTOM = 40;

export default class MapSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapSelectScene' });
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

    // Calculate content height for scrolling
    const rowCount = Math.ceil(MAP_IDS.length / CARDS_PER_ROW);
    this.contentHeight = HEADER_H + rowCount * (CARD_H + CARD_GAP) + SCROLL_PADDING_BOTTOM;
    this.scrollY = 0;
    this.maxScroll = Math.max(0, this.contentHeight - CANVAS_HEIGHT);

    // Scrollable container
    this.scrollContainer = this.add.container(0, 0).setDepth(1);

    // Header area (inside scroll container)
    this.scrollContainer.add(
      this.add.text(CANVAS_WIDTH / 2, 36, 'MAP SELECT', {
        fontSize: '32px',
        color: '#222233',
        fontFamily: 'monospace',
        fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    // Decorative line under header
    const lineGfx = this.add.graphics();
    lineGfx.lineStyle(1.5, INK_DARK, 0.25);
    lineGfx.lineBetween(100, 70, CANVAS_WIDTH - 100, 70);
    this.scrollContainer.add(lineGfx);

    // Create map cards
    this.cards = [];
    MAP_IDS.forEach((mapId, i) => {
      const mapData = this.cache.json.get(mapId);
      if (!mapData) return;

      const col = i % CARDS_PER_ROW;
      const row = Math.floor(i / CARDS_PER_ROW);
      const cx = GRID_LEFT + col * (CARD_W + CARD_GAP) + CARD_W / 2;
      const cy = HEADER_H + row * (CARD_H + CARD_GAP) + CARD_H / 2;

      this.createMapCard(cx, cy, mapData);
    });

    // Fixed back button (not in scroll container)
    this.createBackButton();

    // Scroll indicator
    this.scrollIndicator = this.add.graphics().setDepth(10);
    this.updateScrollIndicator();

    // Input: mouse wheel
    this.input.on('wheel', (_pointer, _gos, _dx, dy) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScroll);
    });

    // Input: touch/mouse drag scrolling
    this.dragStartY = null;
    this.dragScrollStart = 0;
    this.input.on('pointerdown', (pointer) => {
      this.dragStartY = pointer.y;
      this.dragScrollStart = this.scrollY;
    });
    this.input.on('pointermove', (pointer) => {
      if (this.dragStartY !== null && pointer.isDown) {
        const dy = this.dragStartY - pointer.y;
        this.scrollY = Phaser.Math.Clamp(this.dragScrollStart + dy, 0, this.maxScroll);
      }
    });
    this.input.on('pointerup', () => {
      this.dragStartY = null;
    });
  }

  createMapCard(cx, cy, mapData) {
    const x = cx - CARD_W / 2;
    const y = cy - CARD_H / 2;
    const enemyInfo = ENEMY_COLORS[mapData.enemyPreview] || ENEMY_COLORS.wanderer_01;

    // Card background — notebook card
    const bg = this.add.graphics();
    bg.fillStyle(CARD_BG, 0.7);
    bg.fillRoundedRect(x, y, CARD_W, CARD_H, 4);
    bg.lineStyle(1.5, INK_DARK, 0.35);
    bg.strokeRoundedRect(x, y, CARD_W, CARD_H, 4);

    // Colored accent bar on left
    const accentBar = this.add.graphics();
    accentBar.fillStyle(enemyInfo.main, 0.8);
    accentBar.fillRoundedRect(x, y, 5, CARD_H, { tl: 6, bl: 6, tr: 0, br: 0 });

    // Map name — pen ink
    const nameText = this.add.text(x + 18, y + 14, mapData.name, {
      fontSize: '16px',
      color: '#222233',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    });

    // Description — pencil gray
    const descText = this.add.text(x + 18, y + 40, mapData.description, {
      fontSize: '11px',
      color: '#666677',
      fontFamily: 'monospace',
      wordWrap: { width: CARD_W - 36 }
    });

    // Difficulty stars
    const diffY = y + CARD_H - 26;
    const stars = [];
    for (let s = 0; s < 5; s++) {
      const starColor = s < mapData.difficulty ? enemyInfo.accent : '#333344';
      const star = this.add.text(x + 18 + s * 16, diffY, '\u2605', {
        fontSize: '13px',
        color: starColor,
        fontFamily: 'monospace'
      });
      stars.push(star);
    }

    // Enemy count
    const enemyCount = mapData.initialEnemies.length;
    const countText = this.add.text(x + CARD_W - 18, diffY + 2, `${enemyCount} enemies`, {
      fontSize: '10px',
      color: '#888888',
      fontFamily: 'monospace'
    }).setOrigin(1, 0);

    // Enemy type icon (colored square)
    const iconGfx = this.add.graphics();
    iconGfx.fillStyle(enemyInfo.main, 1);
    iconGfx.fillRoundedRect(x + CARD_W - 50, y + 12, 32, 32, 4);
    iconGfx.lineStyle(1, 0xffffff, 0.2);
    iconGfx.strokeRoundedRect(x + CARD_W - 50, y + 12, 32, 32, 4);

    // Add all elements to scroll container
    const elements = [bg, accentBar, nameText, descText, countText, iconGfx, ...stars];
    for (const el of elements) {
      this.scrollContainer.add(el);
    }

    // Hover overlay — blue ink highlight
    const hoverGfx = this.add.graphics().setVisible(false);
    hoverGfx.fillStyle(INK_BLUE, 0.06);
    hoverGfx.fillRoundedRect(x, y, CARD_W, CARD_H, 4);
    hoverGfx.lineStyle(2, INK_BLUE, 0.6);
    hoverGfx.strokeRoundedRect(x, y, CARD_W, CARD_H, 4);
    this.scrollContainer.add(hoverGfx);

    // Interactive zone (we'll update its position each frame for scroll)
    const hitZone = this.add.zone(cx, cy, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    this.scrollContainer.add(hitZone);

    hitZone.on('pointerover', () => hoverGfx.setVisible(true));
    hitZone.on('pointerout', () => hoverGfx.setVisible(false));
    hitZone.on('pointerdown', () => {
      // Store the pointer position, only select if not dragging
      this._cardClickY = this.input.activePointer.y;
    });
    hitZone.on('pointerup', () => {
      if (this._cardClickY !== undefined) {
        const dy = Math.abs(this.input.activePointer.y - this._cardClickY);
        if (dy < 10) {
          this.selectMap(mapData.id);
        }
        this._cardClickY = undefined;
      }
    });

    this.cards.push({ hitZone, hoverGfx });
  }

  createBackButton() {
    const bx = 60;
    const by = CANVAS_HEIGHT - 40;
    const bw = 100;
    const bh = 36;

    const container = this.add.container(0, 0).setDepth(20);

    // Fixed paper bg behind button area
    const footerBg = this.add.graphics();
    footerBg.fillStyle(PAPER_BG, 0.95);
    footerBg.fillRect(0, CANVAS_HEIGHT - 60, CANVAS_WIDTH, 60);
    footerBg.lineStyle(1, INK_DARK, 0.15);
    footerBg.lineBetween(0, CANVAS_HEIGHT - 60, CANVAS_WIDTH, CANVAS_HEIGHT - 60);
    container.add(footerBg);

    const bg = this.add.graphics();
    bg.fillStyle(CARD_BG, 0.7);
    bg.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 4);
    bg.lineStyle(1.5, INK_DARK, 0.35);
    bg.strokeRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 4);
    container.add(bg);

    const label = this.add.text(bx, by, 'BACK', {
      fontSize: '14px', color: '#555555', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(label);

    const zone = this.add.zone(bx, by, bw, bh).setInteractive({ useHandCursor: true });
    container.add(zone);

    zone.on('pointerover', () => label.setColor('#2244aa'));
    zone.on('pointerout', () => label.setColor('#555555'));
    zone.on('pointerup', () => this.scene.start('TitleScene'));
  }

  updateScrollIndicator() {
    this.scrollIndicator.clear();
    if (this.maxScroll <= 0) return;

    const trackX = CANVAS_WIDTH - 8;
    const trackH = CANVAS_HEIGHT - 60;
    const thumbH = Math.max(30, (CANVAS_HEIGHT / this.contentHeight) * trackH);
    const thumbY = (this.scrollY / this.maxScroll) * (trackH - thumbH);

    this.scrollIndicator.fillStyle(0xccccbb, 0.4);
    this.scrollIndicator.fillRoundedRect(trackX, 0, 4, trackH, 2);
    this.scrollIndicator.fillStyle(INK_DARK, 0.35);
    this.scrollIndicator.fillRoundedRect(trackX, thumbY, 4, thumbH, 2);
  }

  selectMap(mapId) {
    const characterId = this.registry.get('selectedCharacter') || 'player_default';
    this.scene.start('GameScene', { mapId, characterId });
  }

  update() {
    this.scrollContainer.y = -this.scrollY;
    this.updateScrollIndicator();
  }
}
