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

    // === TOP ROW (y=808 to y=835): Enemy HP + Phase ===
    this.enemyHPBars = [];
    const aliveEnemies = this.enemies.filter(e => e.alive);
    const enemyBarWidth = Math.min(barWidth, (CANVAS_WIDTH - 200) / Math.max(1, aliveEnemies.length) - 10);

    // Just create a single combined enemy HP bar for all enemies
    this.enemyHPBar = new HPBar(
      this,
      leftMargin, panelY + 12,
      CANVAS_WIDTH - 220, barHeight,
      0x9933cc,
      'ENEMIES'
    );

    this.phaseText = this.add.text(
      CANVAS_WIDTH - 160, panelY + 10,
      '',
      { fontSize: '13px', color: '#ccccff', fontFamily: 'monospace' }
    );

    // === MIDDLE ROW (y=840 to y=870): Player HP + Shield ===
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

    // Update enemy HP - show total HP across all enemies
    let totalHp = 0;
    let totalMaxHp = 0;
    let bossEnemy = null;
    for (const enemy of this.enemies) {
      totalHp += Math.max(0, enemy.hp);
      totalMaxHp += enemy.maxHp;
      if (enemy.phases && enemy.phases.length > 1 && enemy.alive) {
        bossEnemy = enemy;
      }
    }
    this.enemyHPBar.update(totalHp, totalMaxHp);

    // Phase indicator for boss
    if (bossEnemy) {
      const totalPhases = bossEnemy.phases.length;
      this.phaseText.setText(`Phase ${bossEnemy.currentPhase + 1} / ${totalPhases}`);
    } else {
      this.phaseText.setText('');
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
