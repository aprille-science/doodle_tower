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
    const panelY = ARENA_HEIGHT;
    const barWidth = 200;
    const barHeight = 16;
    const leftMargin = 20;

    // Background panel
    this.panelBg = this.add.graphics();
    this.panelBg.fillStyle(0x0a0a1a, 1);
    this.panelBg.fillRect(0, panelY, CANVAS_WIDTH, UI_HEIGHT);
    this.panelBg.lineStyle(2, 0x333366, 1);
    this.panelBg.lineBetween(0, panelY, CANVAS_WIDTH, panelY);

    // Enemy HP bar (top of UI panel)
    const enemy = this.enemies[0];
    if (enemy) {
      this.enemyHPBar = new HPBar(
        this,
        leftMargin, panelY + 20,
        barWidth * 1.5, barHeight,
        0x9933cc,
        enemy.name
      );
    }

    // Player HP bar
    this.playerHPBar = new HPBar(
      this,
      leftMargin, panelY + 70,
      barWidth, barHeight,
      0xff3333,
      'HP'
    );

    // Shield bar
    this.shieldBar = new ShieldBar(
      this,
      leftMargin, panelY + 110,
      barWidth, barHeight
    );

    // Phase text
    this.phaseText = this.add.text(
      CANVAS_WIDTH - 180, panelY + 20,
      'Phase 1 / 3',
      { fontSize: '14px', color: '#ccccff', fontFamily: 'monospace' }
    );

    // Shield lockout indicator
    this.lockoutText = this.add.text(
      leftMargin + barWidth + 60, panelY + 112,
      '',
      { fontSize: '11px', color: '#ff4444', fontFamily: 'monospace' }
    );
  }

  update() {
    if (!this.player) return;

    // Update player HP
    this.playerHPBar.update(this.player.hp, this.player.maxHp);

    // Update shield
    this.shieldBar.update(this.player.shieldHP, this.player.maxShieldHP);

    // Shield lockout indicator
    if (this.player.shieldLockoutTimer > 0) {
      this.lockoutText.setText('BROKEN');
    } else if (this.player.shieldHP <= 0) {
      this.lockoutText.setText('DEPLETED');
    } else {
      this.lockoutText.setText('');
    }

    // Update enemy HP
    const enemy = this.enemies[0];
    if (enemy && this.enemyHPBar) {
      this.enemyHPBar.update(enemy.hp, enemy.maxHp);

      // Phase indicator
      const totalPhases = enemy.phases.length;
      this.phaseText.setText(`Phase ${enemy.currentPhase + 1} / ${totalPhases}`);
    }
  }
}
