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

    // Doodle-style enemy: sketched rectangle with pen ink
    if (this._damageFlash) {
      this.graphics.fillStyle(0xee6644, 0.6);
    } else if (this.phaseTransitioning && Math.floor(this.flashTimer / 100) % 2 === 0) {
      this.graphics.fillStyle(0xdddddd, 0.7);
    } else if (this._chargeTint) {
      this.graphics.fillStyle(0xcc3333, 0.4); // Red marker fill when charging
    } else {
      this.graphics.fillStyle(0xe8ddf5, 0.5); // Light purple pencil shading
    }
    this.graphics.fillRect(drawX, drawY, this.width, this.height);

    // Sketchy ink outline — thick pen stroke with slight offsets
    const pen = this._chargeTint ? 0xaa2222 : 0x333355;
    this.graphics.lineStyle(2, pen, 0.85);
    this.graphics.strokeRect(drawX + 0.5, drawY + 0.5, this.width - 1, this.height - 1);
    // Second pass for hand-drawn feel
    this.graphics.lineStyle(0.8, pen, 0.4);
    this.graphics.strokeRect(drawX - 0.3, drawY - 0.3, this.width + 0.6, this.height + 0.6);

    // Doodle face: angry eyes + mouth
    const cx = this.x;
    const cy = this.y;
    const faceScale = Math.min(this.width, this.height) / 50;
    this.graphics.fillStyle(0x222222, 0.9);
    // Eyes
    this.graphics.fillRect(cx - 8 * faceScale, cy - 4 * faceScale, 4 * faceScale, 4 * faceScale);
    this.graphics.fillRect(cx + 4 * faceScale, cy - 4 * faceScale, 4 * faceScale, 4 * faceScale);
    // Angry brows
    this.graphics.lineStyle(1.5 * faceScale, 0x222222, 0.8);
    this.graphics.lineBetween(
      cx - 10 * faceScale, cy - 8 * faceScale,
      cx - 4 * faceScale, cy - 6 * faceScale
    );
    this.graphics.lineBetween(
      cx + 10 * faceScale, cy - 8 * faceScale,
      cx + 4 * faceScale, cy - 6 * faceScale
    );
    // Mouth
    this.graphics.lineStyle(1 * faceScale, 0x222222, 0.7);
    this.graphics.lineBetween(
      cx - 5 * faceScale, cy + 6 * faceScale,
      cx + 5 * faceScale, cy + 6 * faceScale
    );
  }

  destroy() {
    this.graphics.destroy();
    this.nameText.destroy();
  }
}
