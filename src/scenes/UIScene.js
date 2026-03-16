import Phaser from 'phaser';
import { CANVAS_WIDTH, ARENA_HEIGHT, UI_HEIGHT } from '../constants.js';
import HPBar from '../ui/HPBar.js';
import ShieldBar from '../ui/ShieldBar.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  init(data) {
    this.player = data.player;
    this.enemies = data.enemies;
  }

  create() {
    // ============================================================
    // TOP OVERLAY — Boss HP bar (y=0..40, overlays arena top)
    // ============================================================
    this.bossGroup = this.add.container(0, 0);
    this.bossGroup.setVisible(false);
    this.bossGroup.setDepth(950);

    // Semi-transparent paper backdrop for readability
    this.bossBackdrop = this.add.graphics();
    this.bossBackdrop.fillStyle(0xf5f0e8, 0.85);
    this.bossBackdrop.fillRect(0, 0, CANVAS_WIDTH, 42);
    this.bossBackdrop.lineStyle(1, 0x222233, 0.2);
    this.bossBackdrop.lineBetween(0, 42, CANVAS_WIDTH, 42);
    this.bossGroup.add(this.bossBackdrop);

    // Boss name — pen ink
    this.bossNameText = this.add.text(CANVAS_WIDTH / 2, 6, '', {
      fontSize: '12px', color: '#222233',
      fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    this.bossGroup.add(this.bossNameText);

    // Boss bar graphics
    this.bossBarGraphics = this.add.graphics();
    this.bossGroup.add(this.bossBarGraphics);

    // Damage indicator
    this.bossDmgGraphics = this.add.graphics();
    this.bossGroup.add(this.bossDmgGraphics);

    // Phase text (right side of boss bar) — pencil
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
    // BOTTOM PANEL — Player HP, Shield, Skill cooldown
    // ============================================================
    const panelY = ARENA_HEIGHT;
    const barHeight = 14;
    const leftMargin = 16;
    const barWidth = 300;

    // Background — paper UI panel
    this.panelBg = this.add.graphics();
    this.panelBg.fillStyle(0xeae4d8, 1);
    this.panelBg.fillRect(0, panelY, CANVAS_WIDTH, UI_HEIGHT);
    this.panelBg.lineStyle(2, 0x222233, 0.4);
    this.panelBg.lineBetween(0, panelY, CANVAS_WIDTH, panelY);

    // Row 1: Player HP + Shield (y = panelY + 12)
    this.playerHPBar = new HPBar(
      this, leftMargin, panelY + 22, barWidth, barHeight, 0xcc3333, 'HP'
    );
    this.shieldBar = new ShieldBar(
      this, leftMargin + barWidth + 30, panelY + 22, barWidth, barHeight
    );
    this.lockoutText = this.add.text(
      leftMargin + barWidth * 2 + 70, panelY + 24, '',
      { fontSize: '10px', color: '#cc3333', fontFamily: 'monospace' }
    );

    // Row 2: Skill cooldown (y = panelY + 60)
    this.cooldownGraphics = this.add.graphics();
    this.cooldownCenterX = leftMargin + 24;
    this.cooldownCenterY = panelY + 80;
    this.cooldownRadius = 18;

    // Skill label — set dynamically from player's skill manager
    const skillName = this.player.skillManager
      ? this.player.skillManager.getActiveSkillName()
      : 'SKILL';
    this.skillLabel = this.add.text(
      this.cooldownCenterX + 28, panelY + 66, skillName,
      { fontSize: '11px', color: '#cc5533', fontFamily: 'monospace' }
    );
    this.skillStatusText = this.add.text(
      this.cooldownCenterX + 28, panelY + 80, 'READY',
      { fontSize: '13px', color: '#338833', fontFamily: 'monospace', fontStyle: 'bold' }
    );
    this.fKeyHint = this.add.text(
      this.cooldownCenterX + 28, panelY + 96, '[F]',
      { fontSize: '11px', color: '#999988', fontFamily: 'monospace' }
    );

    // Clean up on shutdown
    this.events.once('shutdown', () => this.cleanup());
  }

  cleanup() {
    if (this.bossDmgTween) {
      this.bossDmgTween.stop();
      this.bossDmgTween = null;
    }
    this.tweens.killAll();
    // Remove only custom listeners (NOT removeAllListeners — that strips Phaser internals)
    this.events.off('bossHPChanged');
    this.player = null;
    this.enemies = null;
  }

  // ----------------------------------------------------------------
  // Boss HP bar
  // ----------------------------------------------------------------
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
    const barX = 80;
    const barY = 22;
    const barW = CANVAS_WIDTH - 160;
    const barH = 14;

    this.bossBarGraphics.clear();
    // Background — paper
    this.bossBarGraphics.fillStyle(0xddd8cc, 1);
    this.bossBarGraphics.fillRect(barX, barY, barW, barH);
    // HP fill — red ink
    this.bossBarGraphics.fillStyle(0xcc3333, 0.7);
    this.bossBarGraphics.fillRect(barX, barY, barW * this.bossHPFraction, barH);
    // Border — pen outline
    this.bossBarGraphics.lineStyle(1.5, 0x222233, 0.5);
    this.bossBarGraphics.strokeRect(barX, barY, barW, barH);
  }

  triggerBossDmgIndicator(dmgFraction) {
    const barX = 80;
    const barY = 22;
    const barW = CANVAS_WIDTH - 160;
    const barH = 14;
    const hpFillWidth = barW * this.bossHPFraction;

    this.bossDmgIndicatorWidth = dmgFraction * barW;

    // Kill previous tween if still running
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
          this.bossDmgGraphics.fillRect(
            barX + hpFillWidth, barY, this.bossDmgIndicatorWidth, barH
          );
        }
      },
      onComplete: () => {
        this.bossDmgGraphics.clear();
        this.bossDmgTween = null;
      }
    });
  }

  // ----------------------------------------------------------------
  // Per-frame updates
  // ----------------------------------------------------------------
  update() {
    if (!this.player) return;

    // Player bars
    this.playerHPBar.update(this.player.hp, this.player.maxHp);
    this.shieldBar.update(this.player.shieldHP, this.player.maxShieldHP);

    // Shield lockout text
    if (this.player.shieldLockoutTimer > 0) {
      this.lockoutText.setText('BROKEN');
    } else if (this.player.shieldHP <= 0) {
      this.lockoutText.setText('DEPLETED');
    } else {
      this.lockoutText.setText('');
    }

    // Boss phase indicator
    let bossEnemy = null;
    for (const enemy of this.enemies) {
      if (enemy.data?.isBoss && enemy.alive) {
        bossEnemy = enemy;
        break;
      }
    }
    if (bossEnemy) {
      this.phaseText.setText(`Phase ${bossEnemy.currentPhase + 1}/${bossEnemy.phases.length}`);
    } else {
      this.phaseText.setText('');
      if (this.bossAlive) {
        this.bossAlive = false;
        this.bossGroup.setVisible(false);
      }
    }

    // Cooldown indicator
    this.drawCooldownIndicator();
  }

  drawCooldownIndicator() {
    this.cooldownGraphics.clear();
    const skillManager = this.player.skillManager;
    if (!skillManager) return;

    const percent = skillManager.getActiveCooldownPercent();
    const ready = skillManager.isActiveReady();
    const cx = this.cooldownCenterX;
    const cy = this.cooldownCenterY;
    const r = this.cooldownRadius;

    // Background circle — paper with pen outline
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

    // Inner icon — ink dot
    this.cooldownGraphics.fillStyle(0x222233, ready ? 0.7 : 0.3);
    this.cooldownGraphics.fillCircle(cx, cy, 5);
  }
}
