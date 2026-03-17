import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

const PAPER_BG = 0xf5f0e8;
const GRID_LINE = 0xb8cfe0;
const INK_DARK = 0x222233;
const INK_BLUE = 0x2244aa;
const CARD_BG = 0xeae4d8;

const SLOT_KEYS = ['H', 'J', 'K', 'L'];
const MAX_SLOTS = 4;

function parseColor(c) {
  if (typeof c === 'string') return parseInt(c);
  return c || 0xaaaaaa;
}

export default class TeamBuilderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TeamBuilderScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor(PAPER_BG);

    // Load roster
    const roster = this.cache.json.get('roster');
    this.costCeiling = roster.costCeiling || 100;
    this.characterIds = roster.characters || [];

    // Load all character data
    this.allCharacters = [];
    for (const id of this.characterIds) {
      const data = this.cache.json.get(id);
      if (data) this.allCharacters.push(data);
    }

    // Team slots: [null, null, null, null]
    this.teamSlots = [null, null, null, null];
    this.selectedCardIndex = -1; // index into allCharacters
    this.dragSlot = -1;
    this.dragRosterIndex = -1;
    this.dragGhost = null;

    // Draw background grid
    this.drawBackground();

    // Layout constants
    this.rosterTop = 80;
    this.rosterHeight = CANVAS_HEIGHT * 0.5;
    this.teamAreaTop = this.rosterTop + this.rosterHeight + 10;

    // Header
    this.add.text(CANVAS_WIDTH / 2, 36, 'TEAM BUILDER', {
      fontSize: '28px', color: '#222233', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1);
    const lineGfx = this.add.graphics().setDepth(1);
    lineGfx.lineStyle(1.5, INK_DARK, 0.25);
    lineGfx.lineBetween(100, 62, CANVAS_WIDTH - 100, 62);

    // Create scrollable roster
    this.createRoster();

    // Create buttons before team area (team area calls refreshAll which needs startBtn)
    this.createButtons();

    // Create team area
    this.createTeamArea();

    // Scroll input
    this.input.on('wheel', (_p, _g, _dx, dy) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScroll);
    });
  }

  drawBackground() {
    const grid = this.add.graphics().setDepth(0);
    grid.lineStyle(0.5, GRID_LINE, 0.35);
    for (let x = 0; x <= CANVAS_WIDTH; x += 50) grid.lineBetween(x, 0, x, CANVAS_HEIGHT);
    for (let y = 0; y <= CANVAS_HEIGHT; y += 50) grid.lineBetween(0, y, CANVAS_WIDTH, y);
    grid.lineStyle(1.5, 0xd48b8b, 0.35);
    grid.lineBetween(50, 0, 50, CANVAS_HEIGHT);
  }

  // ============================================================
  // ROSTER GRID
  // ============================================================
  createRoster() {
    const cardW = 170;
    const cardH = 110;
    const gap = 12;
    const cols = 4;
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = (CANVAS_WIDTH - totalW) / 2;

    const rows = Math.ceil(this.allCharacters.length / cols);
    const contentH = rows * (cardH + gap);
    this.maxScroll = Math.max(0, contentH - this.rosterHeight);
    this.scrollY = 0;

    this.rosterContainer = this.add.container(0, 0).setDepth(2);

    // Clipping mask graphics
    this.rosterMask = this.add.graphics();
    this.rosterMask.fillStyle(0xffffff);
    this.rosterMask.fillRect(0, this.rosterTop, CANVAS_WIDTH, this.rosterHeight);
    const mask = this.rosterMask.createGeometryMask();
    this.rosterContainer.setMask(mask);

    this.rosterCards = [];

    this.allCharacters.forEach((charData, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = this.rosterTop + row * (cardH + gap);

      const card = this.createRosterCard(x, y, cardW, cardH, charData, i);
      this.rosterCards.push(card);
    });
  }

  createRosterCard(x, y, w, h, charData, index) {
    const color = parseColor(charData.color);
    const container = this.add.container(0, 0);
    this.rosterContainer.add(container);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(CARD_BG, 0.7);
    bg.fillRoundedRect(x, y, w, h, 4);
    bg.lineStyle(1.5, INK_DARK, 0.35);
    bg.strokeRoundedRect(x, y, w, h, 4);
    container.add(bg);

    // Portrait circle
    const portraitGfx = this.add.graphics();
    portraitGfx.fillStyle(color, 0.8);
    portraitGfx.fillCircle(x + 28, y + 30, 16);
    portraitGfx.lineStyle(1.5, INK_DARK, 0.6);
    portraitGfx.strokeCircle(x + 28, y + 30, 16);
    // Eyes
    portraitGfx.fillStyle(INK_DARK, 0.9);
    portraitGfx.fillCircle(x + 25, y + 28, 1.5);
    portraitGfx.fillCircle(x + 31, y + 28, 1.5);
    container.add(portraitGfx);

    // Name
    container.add(this.add.text(x + 52, y + 12, charData.name, {
      fontSize: '11px', color: '#222233', fontFamily: 'monospace', fontStyle: 'bold'
    }));

    // Cost badge
    const costBadge = this.add.graphics();
    costBadge.fillStyle(INK_DARK, 0.1);
    costBadge.fillRoundedRect(x + w - 36, y + 6, 30, 18, 3);
    container.add(costBadge);
    container.add(this.add.text(x + w - 21, y + 15, `${charData.cost}`, {
      fontSize: '10px', color: '#555566', fontFamily: 'monospace'
    }).setOrigin(0.5));

    // Stats line
    container.add(this.add.text(x + 52, y + 30, `HP:${charData.hp}  ATK:${charData.attackDamage}`, {
      fontSize: '9px', color: '#666677', fontFamily: 'monospace'
    }));

    // Skill labels
    const passiveType = charData.passive ? charData.passive.type.replace(/_/g, ' ') : '—';
    const activeType = charData.active ? charData.active.type.replace(/_/g, ' ') : '—';
    container.add(this.add.text(x + 8, y + 58, `P: ${passiveType}`, {
      fontSize: '8px', color: '#888899', fontFamily: 'monospace'
    }));
    container.add(this.add.text(x + 8, y + 72, `A: ${activeType}`, {
      fontSize: '8px', color: '#888899', fontFamily: 'monospace'
    }));

    // Cooldown info
    if (charData.active) {
      container.add(this.add.text(x + 8, y + 86, `CD: ${charData.active.cooldownMs / 1000}s`, {
        fontSize: '8px', color: '#aaaaaa', fontFamily: 'monospace'
      }));
    }

    // Selection/unavailable overlays
    const selectOverlay = this.add.graphics().setVisible(false);
    selectOverlay.fillStyle(INK_BLUE, 0.1);
    selectOverlay.fillRoundedRect(x, y, w, h, 4);
    selectOverlay.lineStyle(2.5, INK_BLUE, 0.8);
    selectOverlay.strokeRoundedRect(x, y, w, h, 4);
    container.add(selectOverlay);

    const unavailOverlay = this.add.graphics().setVisible(false);
    unavailOverlay.fillStyle(0x999999, 0.4);
    unavailOverlay.fillRoundedRect(x, y, w, h, 4);
    container.add(unavailOverlay);

    const hoverOverlay = this.add.graphics().setVisible(false);
    hoverOverlay.fillStyle(color, 0.08);
    hoverOverlay.fillRoundedRect(x, y, w, h, 4);
    hoverOverlay.lineStyle(1.5, color, 0.5);
    hoverOverlay.strokeRoundedRect(x, y, w, h, 4);
    container.add(hoverOverlay);

    // Hit zone
    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    container.add(zone);

    zone.on('pointerover', () => { if (!this.isCharOnTeam(index)) hoverOverlay.setVisible(true); });
    zone.on('pointerout', () => hoverOverlay.setVisible(false));
    zone.on('pointerup', () => {
      // Don't handle click if we just finished a drag
      if (this._justDraggedRoster) {
        this._justDraggedRoster = false;
        return;
      }
      if (this.isCharOnTeam(index)) return;
      if (this.isCharUnavailable(index)) return;
      if (this.selectedCardIndex === index) {
        this.selectedCardIndex = -1;
      } else {
        this.selectedCardIndex = index;
      }
      this.refreshAll();
    });

    // Drag support for roster cards
    zone.on('dragstart', (pointer) => {
      if (this.isCharOnTeam(index)) return;
      if (this.isCharUnavailable(index)) return;
      this.dragRosterIndex = index;
      this.createDragGhost(charData, pointer.x, pointer.y);
    });

    zone.on('drag', (pointer) => {
      if (this.dragGhost) {
        this.dragGhost.x = pointer.x;
        this.dragGhost.y = pointer.y;
      }
    });

    zone.on('dragend', () => {
      if (this.dragRosterIndex >= 0) {
        this._justDraggedRoster = true;
      }
      this.destroyDragGhost();
      this.dragRosterIndex = -1;
    });

    this.input.setDraggable(zone);

    return { container, selectOverlay, unavailOverlay, hoverOverlay, zone, x, y, w, h, index };
  }

  isCharOnTeam(charIndex) {
    const id = this.allCharacters[charIndex].id;
    return this.teamSlots.some(s => s && s.id === id);
  }

  isCharUnavailable(charIndex) {
    if (this.isCharOnTeam(charIndex)) return true;
    const cost = this.allCharacters[charIndex].cost || 0;
    const currentCost = this.getTeamCost();
    return currentCost + cost > this.costCeiling;
  }

  getTeamCost() {
    let total = 0;
    for (const s of this.teamSlots) {
      if (s) total += (s.cost || 0);
    }
    return total;
  }

  // ============================================================
  // TEAM AREA
  // ============================================================
  createTeamArea() {
    this.teamAreaContainer = this.add.container(0, 0).setDepth(5);

    // Background panel
    const panelGfx = this.add.graphics();
    panelGfx.fillStyle(PAPER_BG, 0.95);
    panelGfx.fillRect(0, this.teamAreaTop - 10, CANVAS_WIDTH, CANVAS_HEIGHT - this.teamAreaTop + 10);
    panelGfx.lineStyle(1.5, INK_DARK, 0.2);
    panelGfx.lineBetween(0, this.teamAreaTop - 10, CANVAS_WIDTH, this.teamAreaTop - 10);
    this.teamAreaContainer.add(panelGfx);

    // Title
    this.teamAreaContainer.add(this.add.text(CANVAS_WIDTH / 2, this.teamAreaTop + 4, 'TEAM SLOTS', {
      fontSize: '14px', color: '#555566', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    // Slot dimensions
    const slotW = 160;
    const slotH = 170;
    const slotGap = 16;
    const totalSlotsW = MAX_SLOTS * slotW + (MAX_SLOTS - 1) * slotGap;
    const slotsStartX = (CANVAS_WIDTH - totalSlotsW) / 2;
    const slotsY = this.teamAreaTop + 24;

    this.slotElements = [];
    for (let i = 0; i < MAX_SLOTS; i++) {
      const sx = slotsStartX + i * (slotW + slotGap);
      this.createSlotUI(sx, slotsY, slotW, slotH, i);
    }

    // Cost display
    this.costText = this.add.text(CANVAS_WIDTH / 2, slotsY + slotH + 14, '', {
      fontSize: '14px', color: '#555566', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.teamAreaContainer.add(this.costText);

    // Summary panel
    this.summaryText = this.add.text(CANVAS_WIDTH / 2, slotsY + slotH + 36, '', {
      fontSize: '10px', color: '#777788', fontFamily: 'monospace', align: 'center'
    }).setOrigin(0.5, 0);
    this.teamAreaContainer.add(this.summaryText);

    this.refreshAll();
  }

  createSlotUI(x, y, w, h, slotIndex) {
    const container = this.add.container(0, 0);
    this.teamAreaContainer.add(container);

    // Background
    const bg = this.add.graphics();
    container.add(bg);

    // Key label
    const keyLabel = this.add.text(x + w / 2, y + 6, `[${SLOT_KEYS[slotIndex]}]`, {
      fontSize: '11px', color: '#aaaaaa', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(keyLabel);

    // Leader badge on slot 0
    let leaderBadge = null;
    if (slotIndex === 0) {
      leaderBadge = this.add.text(x + w / 2, y - 10, 'LEADER', {
        fontSize: '9px', color: '#cc5533', fontFamily: 'monospace', fontStyle: 'bold',
        backgroundColor: '#f5f0e8', padding: { x: 4, y: 1 }
      }).setOrigin(0.5);
      this.teamAreaContainer.add(leaderBadge);
    }

    // Content elements (filled dynamically)
    const contentContainer = this.add.container(0, 0);
    container.add(contentContainer);

    // Hit zone for slot interaction
    const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true, dropZone: true });
    container.add(zone);

    zone.on('pointerup', () => {
      this.onSlotClick(slotIndex);
    });

    // Drag support - make filled slots draggable
    zone.on('dragstart', (pointer) => {
      if (!this.teamSlots[slotIndex]) return;
      this.dragSlot = slotIndex;
      this.createDragGhost(this.teamSlots[slotIndex], pointer.x, pointer.y);
    });

    zone.on('drag', (pointer) => {
      if (this.dragGhost) {
        this.dragGhost.x = pointer.x;
        this.dragGhost.y = pointer.y;
      }
    });

    zone.on('dragend', () => {
      this.destroyDragGhost();
      this.dragSlot = -1;
    });

    zone.on('drop', (pointer, target) => {
      if (this.dragSlot >= 0 && this.dragSlot !== slotIndex) {
        // Swap slots
        const temp = this.teamSlots[this.dragSlot];
        this.teamSlots[this.dragSlot] = this.teamSlots[slotIndex];
        this.teamSlots[slotIndex] = temp;
        this.refreshAll();
      } else if (this.dragRosterIndex >= 0) {
        // Roster card dropped onto slot
        const charData = this.allCharacters[this.dragRosterIndex];
        if (!this.isCharOnTeam(this.dragRosterIndex) && !this.isCharUnavailable(this.dragRosterIndex)) {
          this.teamSlots[slotIndex] = charData;
          this.selectedCardIndex = -1;
          this.refreshAll();
        }
      }
    });

    this.input.setDraggable(zone);

    this.slotElements.push({ container, bg, keyLabel, contentContainer, zone, x, y, w, h });
  }

  onSlotClick(slotIndex) {
    if (this.selectedCardIndex >= 0) {
      // Assign selected character to this slot
      const charData = this.allCharacters[this.selectedCardIndex];
      // If already on team somewhere else, remove from old slot
      for (let i = 0; i < MAX_SLOTS; i++) {
        if (this.teamSlots[i] && this.teamSlots[i].id === charData.id) {
          this.teamSlots[i] = null;
        }
      }
      // If slot has a character, return it
      this.teamSlots[slotIndex] = charData;
      this.selectedCardIndex = -1;
      this.refreshAll();
    } else if (this.teamSlots[slotIndex]) {
      // Remove character from slot
      this.teamSlots[slotIndex] = null;
      this.refreshAll();
    }
  }

  createDragGhost(charData, x, y) {
    this.destroyDragGhost();
    const color = parseColor(charData.color);
    this.dragGhost = this.add.container(x, y).setDepth(100);
    const gfx = this.add.graphics();
    gfx.fillStyle(color, 0.6);
    gfx.fillCircle(0, 0, 20);
    gfx.lineStyle(2, INK_DARK, 0.5);
    gfx.strokeCircle(0, 0, 20);
    this.dragGhost.add(gfx);
    this.dragGhost.add(this.add.text(0, 28, charData.name, {
      fontSize: '9px', color: '#222233', fontFamily: 'monospace'
    }).setOrigin(0.5));
  }

  destroyDragGhost() {
    if (this.dragGhost) {
      this.dragGhost.destroy();
      this.dragGhost = null;
    }
  }

  // ============================================================
  // REFRESH
  // ============================================================
  refreshAll() {
    this.refreshRosterCards();
    this.refreshSlots();
    this.refreshCost();
    this.refreshSummary();
    this.refreshStartButton();
  }

  refreshRosterCards() {
    for (const card of this.rosterCards) {
      const onTeam = this.isCharOnTeam(card.index);
      const unavail = this.isCharUnavailable(card.index);
      const selected = card.index === this.selectedCardIndex;

      card.selectOverlay.setVisible(selected);
      card.unavailOverlay.setVisible(onTeam || (unavail && !selected));
    }
  }

  refreshSlots() {
    for (let i = 0; i < MAX_SLOTS; i++) {
      const el = this.slotElements[i];
      const charData = this.teamSlots[i];

      // Clear old content
      el.contentContainer.removeAll(true);
      el.bg.clear();

      if (charData) {
        const color = parseColor(charData.color);
        // Filled slot
        el.bg.fillStyle(CARD_BG, 0.8);
        el.bg.fillRoundedRect(el.x, el.y, el.w, el.h, 4);
        el.bg.lineStyle(2, color, 0.7);
        el.bg.strokeRoundedRect(el.x, el.y, el.w, el.h, 4);

        // Portrait
        const portrait = this.add.graphics();
        portrait.fillStyle(color, 0.8);
        portrait.fillCircle(el.x + el.w / 2, el.y + 38, 18);
        portrait.lineStyle(1.5, INK_DARK, 0.6);
        portrait.strokeCircle(el.x + el.w / 2, el.y + 38, 18);
        portrait.fillStyle(INK_DARK, 0.9);
        portrait.fillCircle(el.x + el.w / 2 - 5, el.y + 36, 1.5);
        portrait.fillCircle(el.x + el.w / 2 + 5, el.y + 36, 1.5);
        el.contentContainer.add(portrait);

        // Name
        el.contentContainer.add(this.add.text(el.x + el.w / 2, el.y + 64, charData.name, {
          fontSize: '10px', color: '#222233', fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5));

        // Stats
        el.contentContainer.add(this.add.text(el.x + el.w / 2, el.y + 82, `HP: ${charData.hp}`, {
          fontSize: '9px', color: '#666677', fontFamily: 'monospace'
        }).setOrigin(0.5));

        const activeType = charData.active ? charData.active.type.replace(/_/g, ' ') : '—';
        el.contentContainer.add(this.add.text(el.x + el.w / 2, el.y + 96, activeType, {
          fontSize: '8px', color: '#888899', fontFamily: 'monospace'
        }).setOrigin(0.5));

        if (charData.active) {
          el.contentContainer.add(this.add.text(el.x + el.w / 2, el.y + 110, `CD: ${charData.active.cooldownMs / 1000}s`, {
            fontSize: '8px', color: '#aaaaaa', fontFamily: 'monospace'
          }).setOrigin(0.5));
        }

        // Cost
        el.contentContainer.add(this.add.text(el.x + el.w - 8, el.y + 16, `${charData.cost}`, {
          fontSize: '10px', color: '#555566', fontFamily: 'monospace'
        }).setOrigin(1, 0));
      } else {
        // Empty slot — dashed border
        el.bg.fillStyle(0xddd8cc, 0.3);
        el.bg.fillRoundedRect(el.x, el.y, el.w, el.h, 4);
        el.bg.lineStyle(1, 0xaaaaaa, 0.4);
        el.bg.strokeRoundedRect(el.x, el.y, el.w, el.h, 4);

        el.contentContainer.add(this.add.text(el.x + el.w / 2, el.y + el.h / 2, '+', {
          fontSize: '32px', color: '#ccccbb', fontFamily: 'monospace'
        }).setOrigin(0.5));
      }
    }
  }

  refreshCost() {
    const current = this.getTeamCost();
    const color = current === this.costCeiling ? '#cc5533' : '#555566';
    this.costText.setText(`Cost: ${current} / ${this.costCeiling}`);
    this.costText.setColor(color);
  }

  refreshSummary() {
    const filled = this.teamSlots.filter(s => s);
    if (filled.length === 0) {
      this.summaryText.setText('Select characters to build your team');
      return;
    }
    const totalHP = filled.reduce((sum, c) => sum + c.hp, 0);
    const skills = filled.map(c => {
      const name = c.active ? c.active.type.replace(/_/g, ' ') : '—';
      const cd = c.active ? `${c.active.cooldownMs / 1000}s` : '';
      return `${c.name}: ${name} (${cd})`;
    }).join('  |  ');
    this.summaryText.setText(`Total HP: ${totalHP}  |  ${skills}`);
  }

  refreshStartButton() {
    if (!this.startBtn) return;
    const hasMember = this.teamSlots.some(s => s);
    if (this.startBtn.zone.input) {
      this.startBtn.zone.input.enabled = hasMember;
    }
    this.startBtn.label.setAlpha(hasMember ? 1 : 0.3);
  }

  // ============================================================
  // BUTTONS
  // ============================================================
  createButtons() {
    const bottomY = CANVAS_HEIGHT - 30;

    // Start button
    const startX = CANVAS_WIDTH / 2 + 80;
    const startW = 160;
    const startH = 40;
    const startBg = this.add.graphics().setDepth(10);
    startBg.fillStyle(0x338833, 0.2);
    startBg.fillRoundedRect(startX - startW / 2, bottomY - startH / 2, startW, startH, 6);
    startBg.lineStyle(2, 0x338833, 0.7);
    startBg.strokeRoundedRect(startX - startW / 2, bottomY - startH / 2, startW, startH, 6);

    const startLabel = this.add.text(startX, bottomY, 'SAVE TEAM', {
      fontSize: '16px', color: '#338833', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10);

    const startZone = this.add.zone(startX, bottomY, startW, startH).setInteractive({ useHandCursor: true }).setDepth(10);
    startZone.on('pointerover', () => startLabel.setColor('#44cc44'));
    startZone.on('pointerout', () => startLabel.setColor('#338833'));
    startZone.on('pointerup', () => {
      const team = this.teamSlots.filter(s => s);
      if (team.length === 0) return;
      // Store team and go to map select
      this.registry.set('teamData', team);
      this.scene.start('TitleScene');
    });

    this.startBtn = { zone: startZone, label: startLabel };

    // Clear button
    const clearX = CANVAS_WIDTH / 2 - 80;
    const clearW = 100;
    const clearBg = this.add.graphics().setDepth(10);
    clearBg.fillStyle(CARD_BG, 0.7);
    clearBg.fillRoundedRect(clearX - clearW / 2, bottomY - 20, clearW, 40, 4);
    clearBg.lineStyle(1.5, INK_DARK, 0.35);
    clearBg.strokeRoundedRect(clearX - clearW / 2, bottomY - 20, clearW, 40, 4);

    const clearLabel = this.add.text(clearX, bottomY, 'CLEAR', {
      fontSize: '14px', color: '#cc3333', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10);

    const clearZone = this.add.zone(clearX, bottomY, clearW, 40).setInteractive({ useHandCursor: true }).setDepth(10);
    clearZone.on('pointerup', () => {
      this.teamSlots = [null, null, null, null];
      this.selectedCardIndex = -1;
      this.refreshAll();
    });

    // Back button
    const backX = 60;
    const backW = 100;
    const backBg = this.add.graphics().setDepth(10);
    backBg.fillStyle(CARD_BG, 0.7);
    backBg.fillRoundedRect(backX - backW / 2, bottomY - 20, backW, 40, 4);
    backBg.lineStyle(1.5, INK_DARK, 0.35);
    backBg.strokeRoundedRect(backX - backW / 2, bottomY - 20, backW, 40, 4);

    const backLabel = this.add.text(backX, bottomY, 'BACK', {
      fontSize: '14px', color: '#555555', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10);

    const backZone = this.add.zone(backX, bottomY, backW, 40).setInteractive({ useHandCursor: true }).setDepth(10);
    backZone.on('pointerover', () => backLabel.setColor('#2244aa'));
    backZone.on('pointerout', () => backLabel.setColor('#555555'));
    backZone.on('pointerup', () => this.scene.start('TitleScene'));
  }

  update() {
    // Scroll the roster
    if (this.rosterContainer) {
      this.rosterContainer.y = -this.scrollY;
    }
  }
}
