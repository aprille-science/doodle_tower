import { CELL_WIDTH, CELL_HEIGHT } from '../constants.js';

export default class Enemy {
  constructor(scene, data, gridPosition) {
    this.scene = scene;
    this.id = data.id;
    this.name = data.name;
    this.hp = data.hp;
    this.maxHp = data.hp;
    this.phases = data.phases;
    this.currentPhase = 0;
    this.size = data.size;

    this.col = gridPosition.col;
    this.row = gridPosition.row;

    this.x = this.col * CELL_WIDTH;
    this.y = this.row * CELL_HEIGHT;
    this.width = this.size.cols * CELL_WIDTH;
    this.height = this.size.rows * CELL_HEIGHT;

    this.alive = true;
    this.phaseTransitioning = false;
    this.phaseTransitionTimer = 0;
    this.flashTimer = 0;

    this.graphics = scene.add.graphics();
    this.nameText = scene.add.text(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.name,
      { fontSize: '11px', color: '#ffffff', fontFamily: 'monospace' }
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
      this.draw();
    }
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
    this.draw();
  }

  getCurrentPhaseData() {
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
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  draw() {
    this.graphics.clear();
    if (!this.alive) return;

    // Flash during phase transition
    if (this.phaseTransitioning && Math.floor(this.flashTimer / 100) % 2 === 0) {
      this.graphics.fillStyle(0xffffff, 0.9);
    } else {
      this.graphics.fillStyle(0x6633aa, 1);
    }
    this.graphics.fillRect(this.x, this.y, this.width, this.height);

    // Outline
    this.graphics.lineStyle(2, 0x9966cc, 1);
    this.graphics.strokeRect(this.x, this.y, this.width, this.height);
  }

  destroy() {
    this.graphics.destroy();
    this.nameText.destroy();
  }
}
