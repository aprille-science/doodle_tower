import Phaser from 'phaser';
import { CANVAS_WIDTH, ARENA_HEIGHT, UI_HEIGHT } from '../constants.js';
import HPBar from '../ui/HPBar.js';
import ShieldBar from '../ui/ShieldBar.js';

const SLOT_KEYS = ['H', 'J', 'K', 'L'];
const PORTRAIT_SIZE = 36;
const SWAP_COOLDOWN_MS = 5000;

function parseColor(c) {
  if (typeof c === 'string') return parseInt(c);
  return c || 0xaaaaaa;
}

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  init(data) {
    this.player = data.player;
    this.enemies = data.enemies;
    this.teamState = data.teamState || null;
  }

  create() {
    const panelY = ARENA_HEIGHT;

    // ============================================================
    // TOP OVERLAY — Boss HP bar
    // ============================================================
    this.bossGroup = this.add.container(0, 0).setVisible(false).setDepth(950);
    this.bossBackdrop = this.add.graphics();
    this.bossBackdrop.fillStyle(0xf5f0e8, 0.85);
    this.bossBackdrop.fillRect(0, 0, CANVAS_WIDTH, 42);
    this.bossBackdrop.lineStyle(1, 0x222233, 0.2);
    this.bossBackdrop.lineBetween(0, 42, CANVAS_WIDTH, 42);
    this.bossGroup.add(this.bossBackdrop);

    this.bossNameText = this.add.text(CANVAS_WIDTH / 2, 6, '', {
      fontSize: '12px', color: '#222233', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    this.bossGroup.add(this.bossNameText);
    this.bossBarGraphics = this.add.graphics();
    this.bossGroup.add(this.bossBarGraphics);
    this.bossDmgGraphics = this.add.graphics();
    this.bossGroup.add(this.bossDmgGraphics);
    this.phaseText = this.add.text(CANVAS_WIDTH - 10, 6, '', {
      fontSize: '11px', color: '#555566', fontFamily: 'monospace'
    }).setOrigin(1, 0);
    this.bossGroup.add(this.phaseText);

    this.bossHPFraction = 1;
    this.bossDmgIndicatorWidth = 0;
    this.bossDmgTween = null;
    this.bossAlive = false;

    this.events.on('bossHPChanged', this.onBossHPChanged, this);

    // ============================================================
    // BOTTOM PANEL
    // ============================================================
    this.panelBg = this.add.graphics();
    this.panelBg.fillStyle(0xeae4d8, 1);
    this.panelBg.fillRect(0, panelY, CANVAS_WIDTH, UI_HEIGHT);
    this.panelBg.lineStyle(2, 0x222233, 0.4);
    this.panelBg.lineBetween(0, panelY, CANVAS_WIDTH, panelY);

    // ---- LEFT: Team Portrait Bar (320px) ----
    this.portraitSlots = [];
    this.portraitGraphics = this.add.graphics();
    this.swapCooldownGraphics = this.add.graphics().setDepth(2);

    const portraitAreaX = 8;
    const slotW = 74;
    const slotH = UI_HEIGHT - 16;

    for (let i = 0; i < 4; i++) {
      const sx = portraitAreaX + i * (slotW + 4);
      const sy = panelY + 8;

      // Key label
      const keyLabel = this.add.text(sx + slotW / 2, sy + 2, `[${SLOT_KEYS[i]}]`, {
        fontSize: '9px', color: '#aaaaaa', fontFamily: 'monospace'
      }).setOrigin(0.5);

      // Name text
      const nameText = this.add.text(sx + slotW / 2, sy + PORTRAIT_SIZE + 24, '', {
        fontSize: '8px', color: '#555566', fontFamily: 'monospace'
      }).setOrigin(0.5);

      // HP bar (mini)
      const hpBarGfx = this.add.graphics();

      // Faint overlay
      const faintGfx = this.add.graphics().setVisible(false);

      // Click zone
      const zone = this.add.zone(sx + slotW / 2, sy + slotH / 2, slotW, slotH)
        .setInteractive({ useHandCursor: true });

      zone.on('pointerup', () => {
        // Emit swap request to GameScene
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
          gameScene.events.emit('requestSwap', i);
        }
      });

      this.portraitSlots.push({
        x: sx, y: sy, w: slotW, h: slotH,
        keyLabel, nameText, hpBarGfx, faintGfx, zone
      });
    }

    // ---- RIGHT: Active character bars + skill cooldown ----
    const rightX = 324;
    const barWidth = 260;
    const barHeight = 14;

    this.activeNameLabel = this.add.text(rightX, panelY + 6, '', {
      fontSize: '11px', color: '#222233', fontFamily: 'monospace', fontStyle: 'bold'
    });

    this.playerHPBar = new HPBar(
      this, rightX, panelY + 22, barWidth, barHeight, 0xcc3333, 'HP'
    );
    this.shieldBar = new ShieldBar(
      this, rightX, panelY + 44, barWidth, barHeight
    );
    this.lockoutText = this.add.text(
      rightX + barWidth + 10, panelY + 44, '',
      { fontSize: '10px', color: '#cc3333', fontFamily: 'monospace' }
    );

    // Skill cooldown
    this.cooldownGraphics = this.add.graphics();
    this.cooldownCenterX = rightX + 20;
    this.cooldownCenterY = panelY + 90;
    this.cooldownRadius = 16;

    const skillName = this.player && this.player.skillManager
      ? this.player.skillManager.getActiveSkillName()
      : 'SKILL';
    this.skillLabel = this.add.text(
      this.cooldownCenterX + 24, panelY + 76, skillName,
      { fontSize: '10px', color: '#cc5533', fontFamily: 'monospace' }
    );
    this.skillStatusText = this.add.text(
      this.cooldownCenterX + 24, panelY + 90, 'READY',
      { fontSize: '12px', color: '#338833', fontFamily: 'monospace', fontStyle: 'bold' }
    );
    this.fKeyHint = this.add.text(
      this.cooldownCenterX + 24, panelY + 106, '[F]',
      { fontSize: '10px', color: '#999988', fontFamily: 'monospace' }
    );

    // Swap cooldown arc state
    this.swapCooldownActive = false;

    // Listen for team events
    this.events.on('teamSwap', this.onTeamSwap, this);
    this.events.on('teamUpdate', this.onTeamUpdate, this);
    this.events.on('characterFainted', this.onCharacterFainted, this);

    // Clean up on shutdown
    this.events.once('shutdown', () => this.cleanup());

    // Initial portrait draw
    this.drawPortraits();
    this.updateActiveInfo();
  }

  cleanup() {
    if (this.bossDmgTween) { this.bossDmgTween.stop(); this.bossDmgTween = null; }
    this.tweens.killAll();
    this.events.off('bossHPChanged');
    this.events.off('teamSwap');
    this.events.off('teamUpdate');
    this.events.off('characterFainted');
    this.player = null;
    this.enemies = null;
    this.teamState = null;
  }

  // ============================================================
  // Team Events
  // ============================================================
  onTeamSwap(data) {
    this.player = data.player;
    this.teamState = data.teamState;
    this.updateActiveInfo();
    this.drawPortraits();
  }

  onTeamUpdate(data) {
    this.teamState = data.teamState;
    this.player = data.player;
  }

  onCharacterFainted(data) {
    this.drawPortraits();
  }

  updateActiveInfo() {
    if (!this.player) return;

    // Update active name
    const activeState = this.teamState ? this.teamState.getActiveState() : null;
    const name = activeState ? activeState.data.name : 'Player';
    this.activeNameLabel.setText(name);

    // Update skill label
    const skillName = this.player.skillManager
      ? this.player.skillManager.getActiveSkillName()
      : 'SKILL';
    this.skillLabel.setText(skillName);
  }

  // ============================================================
  // Portrait Drawing
  // ============================================================
  drawPortraits() {
    this.portraitGraphics.clear();

    if (!this.teamState) return;

    for (let i = 0; i < 4; i++) {
      const slot = this.portraitSlots[i];
      const charState = this.teamState.slots[i];
      const isActive = this.teamState.activeSlotIndex === i;

      if (!charState) {
        // Empty slot — dark panel
        this.portraitGraphics.fillStyle(0xbbb8aa, 0.2);
        this.portraitGraphics.fillRoundedRect(slot.x, slot.y, slot.w, slot.h, 3);
        slot.nameText.setText('');
        slot.hpBarGfx.clear();
        slot.faintGfx.setVisible(false);
        continue;
      }

      const color = parseColor(charState.data.color);

      // Slot background
      if (isActive) {
        this.portraitGraphics.fillStyle(0xf5f0e8, 0.9);
        this.portraitGraphics.fillRoundedRect(slot.x - 2, slot.y - 2, slot.w + 4, slot.h + 4, 4);
        this.portraitGraphics.lineStyle(2.5, color, 0.9);
        this.portraitGraphics.strokeRoundedRect(slot.x - 2, slot.y - 2, slot.w + 4, slot.h + 4, 4);
      } else {
        this.portraitGraphics.fillStyle(0xeae4d8, 0.6);
        this.portraitGraphics.fillRoundedRect(slot.x, slot.y, slot.w, slot.h, 3);
        this.portraitGraphics.lineStyle(1, 0x999988, 0.4);
        this.portraitGraphics.strokeRoundedRect(slot.x, slot.y, slot.w, slot.h, 3);
      }

      // Portrait circle
      const px = slot.x + slot.w / 2;
      const py = slot.y + 28;
      const pr = isActive ? 16 : 14;

      if (charState.fainted) {
        // Greyscale
        this.portraitGraphics.fillStyle(0x888888, 0.5);
        this.portraitGraphics.fillCircle(px, py, pr);
        this.portraitGraphics.lineStyle(1.5, 0x666666, 0.4);
        this.portraitGraphics.strokeCircle(px, py, pr);
        // X overlay
        this.portraitGraphics.lineStyle(2, 0xcc3333, 0.7);
        this.portraitGraphics.lineBetween(px - 8, py - 8, px + 8, py + 8);
        this.portraitGraphics.lineBetween(px - 8, py + 8, px + 8, py - 8);
      } else {
        this.portraitGraphics.fillStyle(color, 0.8);
        this.portraitGraphics.fillCircle(px, py, pr);
        this.portraitGraphics.lineStyle(1.5, 0x222233, 0.6);
        this.portraitGraphics.strokeCircle(px, py, pr);
        // Eyes
        this.portraitGraphics.fillStyle(0x222233, 0.9);
        this.portraitGraphics.fillCircle(px - 4, py - 2, 1.5);
        this.portraitGraphics.fillCircle(px + 4, py - 2, 1.5);
      }

      // Name
      slot.nameText.setText(charState.data.name);
      slot.nameText.setY(slot.y + 48);
      slot.nameText.setX(slot.x + slot.w / 2);

      // HP bar
      slot.hpBarGfx.clear();
      const hpBarX = slot.x + 6;
      const hpBarY = slot.y + 58;
      const hpBarW = slot.w - 12;
      const hpBarH = 6;
      const hpFrac = charState.fainted ? 0 : Math.max(0, charState.hp / charState.maxHp);

      slot.hpBarGfx.fillStyle(0xddd8cc, 1);
      slot.hpBarGfx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
      if (hpFrac > 0) {
        slot.hpBarGfx.fillStyle(0xcc3333, 0.7);
        slot.hpBarGfx.fillRect(hpBarX, hpBarY, hpBarW * hpFrac, hpBarH);
      }
      slot.hpBarGfx.lineStyle(1, 0x222233, 0.3);
      slot.hpBarGfx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

      // HP text
      slot.hpBarGfx.fillStyle(0x222233, 0.8);
    }
  }

  // ============================================================
  // Boss HP bar
  // ============================================================
  onBossHPChanged(data) {
    this.bossAlive = data.hp > 0;
    this.bossGroup.setVisible(this.bossAlive);
    if (!this.bossAlive) return;
    this.bossNameText.setText(data.name);
    this.bossHPFraction = data.hp / data.maxHp;
    this.drawBossHPBar();
    if (data.damageTaken > 0) {
      this.triggerBossDmgIndicator(data.damageTaken / data.maxHp);
    }
  }

  drawBossHPBar() {
    const barX = 80, barY = 22, barW = CANVAS_WIDTH - 160, barH = 14;
    this.bossBarGraphics.clear();
    this.bossBarGraphics.fillStyle(0xddd8cc, 1);
    this.bossBarGraphics.fillRect(barX, barY, barW, barH);
    this.bossBarGraphics.fillStyle(0xcc3333, 0.7);
    this.bossBarGraphics.fillRect(barX, barY, barW * this.bossHPFraction, barH);
    this.bossBarGraphics.lineStyle(1.5, 0x222233, 0.5);
    this.bossBarGraphics.strokeRect(barX, barY, barW, barH);
  }

  triggerBossDmgIndicator(dmgFraction) {
    const barX = 80, barY = 22, barW = CANVAS_WIDTH - 160, barH = 14;
    const hpFillWidth = barW * this.bossHPFraction;
    this.bossDmgIndicatorWidth = dmgFraction * barW;
    if (this.bossDmgTween) this.bossDmgTween.stop();
    this.bossDmgTween = this.tweens.add({
      targets: this,
      bossDmgIndicatorWidth: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        this.bossDmgGraphics.clear();
        if (this.bossDmgIndicatorWidth > 0.5) {
          this.bossDmgGraphics.fillStyle(0xffffff, 1);
          this.bossDmgGraphics.fillRect(barX + hpFillWidth, barY, this.bossDmgIndicatorWidth, barH);
        }
      },
      onComplete: () => { this.bossDmgGraphics.clear(); this.bossDmgTween = null; }
    });
  }

  // ============================================================
  // Per-frame updates
  // ============================================================
  update() {
    if (!this.player) return;

    // Player bars
    if (this.player.alive) {
      this.playerHPBar.update(this.player.hp, this.player.maxHp);
      this.shieldBar.update(this.player.shieldHP, this.player.maxShieldHP);
    }

    // Shield lockout text
    if (this.player.shieldLockoutTimer > 0) {
      this.lockoutText.setText('BROKEN');
    } else if (this.player.shieldHP <= 0) {
      this.lockoutText.setText('DEPLETED');
    } else {
      this.lockoutText.setText('');
    }

    // Boss phase
    let bossEnemy = null;
    if (this.enemies) {
      for (const enemy of this.enemies) {
        if (enemy.data?.isBoss && enemy.alive) { bossEnemy = enemy; break; }
      }
    }
    if (bossEnemy) {
      this.phaseText.setText(`Phase ${bossEnemy.currentPhase + 1}/${bossEnemy.phases.length}`);
    } else {
      this.phaseText.setText('');
      if (this.bossAlive) { this.bossAlive = false; this.bossGroup.setVisible(false); }
    }

    // Cooldown indicator
    this.drawCooldownIndicator();

    // Portrait bar update (redraw HP bars for all characters)
    this.drawPortraits();

    // Swap cooldown overlay
    this.drawSwapCooldown();
  }

  drawCooldownIndicator() {
    this.cooldownGraphics.clear();
    const skillManager = this.player ? this.player.skillManager : null;
    if (!skillManager) return;

    const percent = skillManager.getActiveCooldownPercent();
    const ready = skillManager.isActiveReady();
    const cx = this.cooldownCenterX;
    const cy = this.cooldownCenterY;
    const r = this.cooldownRadius;

    this.cooldownGraphics.fillStyle(0xf5f0e8, 1);
    this.cooldownGraphics.fillCircle(cx, cy, r);
    this.cooldownGraphics.lineStyle(1.5, 0x222233, 0.4);
    this.cooldownGraphics.strokeCircle(cx, cy, r);

    if (ready) {
      this.cooldownGraphics.lineStyle(2, 0x338833, 0.5 + Math.sin(Date.now() * 0.005) * 0.3);
      this.cooldownGraphics.strokeCircle(cx, cy, r + 3);
      this.cooldownGraphics.fillStyle(0x338833, 0.15);
      this.cooldownGraphics.fillCircle(cx, cy, r);
      this.skillStatusText.setText('READY');
      this.skillStatusText.setColor('#338833');
    } else {
      const remaining = skillManager.getActiveCooldownRemaining();
      this.skillStatusText.setText(`${(remaining / 1000).toFixed(1)}s`);
      this.skillStatusText.setColor('#cc5533');
      const fillAngle = (1 - percent) * Math.PI * 2;
      this.cooldownGraphics.fillStyle(0xcc5533, 0.3);
      this.cooldownGraphics.slice(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + fillAngle, true);
      this.cooldownGraphics.fillPath();
      this.cooldownGraphics.lineStyle(1.5, 0xcc5533, 0.5);
      this.cooldownGraphics.strokeCircle(cx, cy, r);
    }

    this.cooldownGraphics.fillStyle(0x222233, ready ? 0.7 : 0.3);
    this.cooldownGraphics.fillCircle(cx, cy, 4);
  }

  drawSwapCooldown() {
    this.swapCooldownGraphics.clear();
    if (!this.teamState || !this.teamState.isSwapOnCooldown()) return;

    const pct = this.teamState.getSwapCooldownPercent(); // 1 = full, 0 = done

    for (let i = 0; i < 4; i++) {
      if (i === this.teamState.activeSlotIndex) continue;
      const charState = this.teamState.slots[i];
      if (!charState) continue;

      const slot = this.portraitSlots[i];
      const cx = slot.x + slot.w / 2;
      const cy = slot.y + 28;

      // Dim overlay
      this.swapCooldownGraphics.fillStyle(0xf5f0e8, 0.4 * pct);
      this.swapCooldownGraphics.fillRoundedRect(slot.x, slot.y, slot.w, slot.h, 3);

      // Arc timer
      const arcR = 12;
      const endAngle = -Math.PI / 2 + (1 - pct) * Math.PI * 2;
      this.swapCooldownGraphics.lineStyle(2.5, 0xcc5533, 0.6);
      this.swapCooldownGraphics.beginPath();
      this.swapCooldownGraphics.arc(cx, cy, arcR, -Math.PI / 2, endAngle, false);
      this.swapCooldownGraphics.strokePath();
    }
  }
}
