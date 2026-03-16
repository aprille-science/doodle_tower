import { CELL_WIDTH, CELL_HEIGHT } from '../constants.js';

export default class Enemy {
  constructor(scene, data, gridPosition) {
    this.scene = scene;
    this.data = data; // Store full JSON data for movement system access
    this.id = data.id;
    this.name = data.name;
    this.hp = data.hp;
    this.maxHp = data.hp;
    this.phases = data.phases || [{ phase: 0, hpThreshold: 1.0, attackPatterns: [], attackIntervalMs: 9999 }];
    this.currentPhase = 0;
    this.size = data.size || { cols: 1, rows: 1 };
    this.movementBehavior = data.movementBehavior || null;
    this.attackOnEvent = data.attackOnEvent || null;

    this.col = gridPosition.col;
    this.row = gridPosition.row;

    this.x = this.col * CELL_WIDTH + (this.size.cols * CELL_WIDTH) / 2;
    this.y = this.row * CELL_HEIGHT + (this.size.rows * CELL_HEIGHT) / 2;
    this.width = this.size.cols * CELL_WIDTH;
    this.height = this.size.rows * CELL_HEIGHT;

    this.alive = true;
    this.phaseTransitioning = false;
    this.phaseTransitionTimer = 0;
    this.flashTimer = 0;

    // Navigation agent — assigned by MovementSystem.register()
    this.navAgent = null;
    // Movement behavior — assigned by MovementSystem.register()
    this._movementBehavior = null;
    // Charge tint flag
    this._chargeTint = false;
    // True when enemy is actively charging (deals contact damage)
    this.isCharging = false;
    // Visibility flag for teleport
    this._visible = true;

    this.graphics = scene.add.graphics();
    this.nameText = scene.add.text(
      this.x,
      this.y,
      this.name,
      { fontSize: '10px', color: '#ffffff', fontFamily: 'monospace' }
    ).setOrigin(0.5);

    this.draw();
  }

  update(delta) {
    if (!this.alive) return;

    if (this.phaseTransitioning) {
      this.phaseTransitionTimer -= delta;
      this.flashTimer -= delta;
      if (this.phaseTransitionTimer <= 0) {
        this.phaseTransitioning = false;
      }
    }

    // Update name text position
    this.nameText.setPosition(this.x, this.y);
    this.draw();
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.graphics.clear();
      this.nameText.setVisible(false);
    }
  }

  getCurrentPhaseData() {
    if (!this.phases || this.currentPhase >= this.phases.length) return null;
    return this.phases[this.currentPhase];
  }

  startPhaseTransition(newPhase) {
    this.currentPhase = newPhase;
    this.phaseTransitioning = true;
    this.phaseTransitionTimer = 1500;
    this.flashTimer = 1500;
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height
    };
  }

  draw() {
    this.graphics.clear();
    if (!this.alive || !this._visible) return;

    const drawX = this.x - this.width / 2;
    const drawY = this.y - this.height / 2;

    // Flash during phase transition or damage
    if (this._damageFlash) {
      this.graphics.fillStyle(0xffffff, 1);
    } else if (this.phaseTransitioning && Math.floor(this.flashTimer / 100) % 2 === 0) {
      this.graphics.fillStyle(0xffffff, 0.9);
    } else if (this._chargeTint) {
      this.graphics.fillStyle(0xff2222, 1);
    } else {
      this.graphics.fillStyle(0x6633aa, 1);
    }
    this.graphics.fillRect(drawX, drawY, this.width, this.height);

    // Outline
    this.graphics.lineStyle(2, 0x9966cc, 1);
    this.graphics.strokeRect(drawX, drawY, this.width, this.height);
  }

  destroy() {
    this.graphics.destroy();
    this.nameText.destroy();
  }
}
