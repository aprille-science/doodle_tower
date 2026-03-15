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
    const panelY = ARENA_HEIGHT; // 800
    const barHeight = 14;
    const leftMargin = 16;
    const barWidth = 340;

    // Background panel
    this.panelBg = this.add.graphics();
    this.panelBg.fillStyle(0x0a0a1a, 1);
    this.panelBg.fillRect(0, panelY, CANVAS_WIDTH, UI_HEIGHT);
    this.panelBg.lineStyle(2, 0x333366, 1);
    this.panelBg.lineBetween(0, panelY, CANVAS_WIDTH, panelY);

    // === TOP ROW: Boss HP Bar (hidden until boss appears) ===
    this.bossGroup = this.add.container(0, 0);
    this.bossGroup.setVisible(false);

    // Boss name text
    this.bossNameText = this.add.text(400, panelY + 10, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.bossGroup.add(this.bossNameText);

    // Boss HP bar track
    this.bossBarGraphics = this.add.graphics();
    this.bossGroup.add(this.bossBarGraphics);

    // Boss damage indicator
    this.bossDmgGraphics = this.add.graphics();
    this.bossGroup.add(this.bossDmgGraphics);

    this.bossHPFraction = 1;
    this.bossDmgIndicatorWidth = 0;
    this.bossAlive = false;

    // Listen for boss HP changes
    this.events.on('bossHPChanged', (data) => {
      this.onBossHPChanged(data);
    });

    // === MIDDLE ROW (y=848 to y=870): Player HP + Shield ===
    this.playerHPBar = new HPBar(
      this,
      leftMargin, panelY + 48,
      barWidth, barHeight,
      0xff3333,
      'HP'
    );

    this.shieldBar = new ShieldBar(
      this,
      leftMargin + barWidth + 40, panelY + 48,
      barWidth, barHeight
    );

    this.lockoutText = this.add.text(
      leftMargin + barWidth * 2 + 90, panelY + 50,
      '',
      { fontSize: '10px', color: '#ff4444', fontFamily: 'monospace' }
    );

    // === Phase indicator ===
    this.phaseText = this.add.text(
      CANVAS_WIDTH - 160, panelY + 10,
      '',
      { fontSize: '13px', color: '#ccccff', fontFamily: 'monospace' }
    );

    // === BOTTOM ROW (y=878 to y=950): Active skill cooldown ===
    this.cooldownGraphics = this.add.graphics();
    this.cooldownCenterX = leftMargin + 30;
    this.cooldownCenterY = panelY + 110;
    this.cooldownRadius = 22;

    this.skillLabel = this.add.text(
      this.cooldownCenterX + 35, panelY + 98,
      'MEGA FIREBALL',
      { fontSize: '11px', color: '#ff6644', fontFamily: 'monospace' }
    );

    this.skillStatusText = this.add.text(
      this.cooldownCenterX + 35, panelY + 114,
      'READY',
      { fontSize: '13px', color: '#44ff44', fontFamily: 'monospace', fontStyle: 'bold' }
    );

    this.fKeyHint = this.add.text(
      this.cooldownCenterX + 35, panelY + 130,
      '[F]',
      { fontSize: '11px', color: '#888888', fontFamily: 'monospace' }
    );
  }

  onBossHPChanged(data) {
    this.bossAlive = data.hp > 0;
    this.bossGroup.setVisible(this.bossAlive);
    if (!this.bossAlive) return;

    this.bossNameText.setText(data.name);
    this.bossHPFraction = data.hp / data.maxHp;

    // Draw boss HP bar
    this.drawBossHPBar();

    // Trigger damage indicator
    if (data.damageTaken > 0) {
      const dmgFraction = data.damageTaken / data.maxHp;
      this.bossDmgIndicatorWidth = dmgFraction * 600;
      this.animateBossDamageIndicator();
    }
  }

  drawBossHPBar() {
    const barX = 100;
    const barY = 826;
    const barW = 600;
    const barH = 14;

    this.bossBarGraphics.clear();

    // Background
    this.bossBarGraphics.fillStyle(0x222222, 1);
    this.bossBarGraphics.fillRect(barX, barY, barW, barH);

    // Dark red full layer
    this.bossBarGraphics.fillStyle(0x8b0000, 1);
    this.bossBarGraphics.fillRect(barX, barY, barW * this.bossHPFraction, barH);

    // Bright red actual HP fill (top layer)
    this.bossBarGraphics.fillStyle(0xdd0000, 1);
    this.bossBarGraphics.fillRect(barX, barY, barW * this.bossHPFraction, barH);

    // Border
    this.bossBarGraphics.lineStyle(2, 0x666666, 1);
    this.bossBarGraphics.strokeRect(barX, barY, barW, barH);
  }

  animateBossDamageIndicator() {
    // Draw white damage indicator at the edge of HP fill
    const barX = 100;
    const barY = 826;
    const barH = 14;
    const hpFillWidth = 600 * this.bossHPFraction;

    this.bossDmgGraphics.clear();
    this.bossDmgGraphics.fillStyle(0xffffff, 1);
    this.bossDmgGraphics.fillRect(barX + hpFillWidth, barY, this.bossDmgIndicatorWidth, barH);

    // Tween the indicator width to 0 over 600ms
    this.tweens.add({
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
      onComplete: () => {
        this.bossDmgGraphics.clear();
      }
    });
  }

  update() {
    if (!this.player) return;

    // Update player HP
    this.playerHPBar.update(this.player.hp, this.player.maxHp);

    // Update shield
    this.shieldBar.update(this.player.shieldHP, this.player.maxShieldHP);

    // Shield lockout
    if (this.player.shieldLockoutTimer > 0) {
      this.lockoutText.setText('BROKEN');
    } else if (this.player.shieldHP <= 0) {
      this.lockoutText.setText('DEPLETED');
    } else {
      this.lockoutText.setText('');
    }

    // Phase indicator for boss
    let bossEnemy = null;
    for (const enemy of this.enemies) {
      if (enemy.data?.isBoss && enemy.alive) {
        bossEnemy = enemy;
      }
    }

    if (bossEnemy) {
      const totalPhases = bossEnemy.phases.length;
      this.phaseText.setText(`Phase ${bossEnemy.currentPhase + 1} / ${totalPhases}`);
    } else {
      this.phaseText.setText('');
      // Hide boss bar if boss died
      if (this.bossAlive) {
        this.bossAlive = false;
        this.bossGroup.setVisible(false);
      }
    }

    // Active skill cooldown
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

    // Background circle
    this.cooldownGraphics.fillStyle(0x222233, 1);
    this.cooldownGraphics.fillCircle(cx, cy, r);

    if (ready) {
      // Glow effect
      this.cooldownGraphics.lineStyle(3, 0x44ff44, 0.6 + Math.sin(Date.now() * 0.005) * 0.3);
      this.cooldownGraphics.strokeCircle(cx, cy, r + 3);
      this.cooldownGraphics.fillStyle(0x44ff44, 0.3);
      this.cooldownGraphics.fillCircle(cx, cy, r);
      this.skillStatusText.setText('READY');
      this.skillStatusText.setColor('#44ff44');
    } else {
      // Cooldown arc (draining)
      const remaining = skillManager.getActiveCooldownRemaining();
      const seconds = (remaining / 1000).toFixed(1);
      this.skillStatusText.setText(`${seconds}s`);
      this.skillStatusText.setColor('#ff6644');

      // Draw filled arc for remaining cooldown
      const fillAngle = (1 - percent) * Math.PI * 2;
      this.cooldownGraphics.fillStyle(0xff4422, 0.5);
      this.cooldownGraphics.slice(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + fillAngle, true);
      this.cooldownGraphics.fillPath();

      // Border
      this.cooldownGraphics.lineStyle(2, 0xff4422, 0.7);
      this.cooldownGraphics.strokeCircle(cx, cy, r);
    }

    // Inner icon (fireball symbol)
    this.cooldownGraphics.fillStyle(0xff6600, ready ? 1 : 0.4);
    this.cooldownGraphics.fillCircle(cx, cy, 8);
  }
}
