import {
  CELL_WIDTH, CELL_HEIGHT, PLATFORM_ROW, PLATFORM_WIDTH_CELLS, CANVAS_WIDTH
} from '../constants.js';

export default class Platform {
  constructor(scene) {
    this.scene = scene;
    this.widthCells = PLATFORM_WIDTH_CELLS;
    this.width = this.widthCells * CELL_WIDTH;
    this.height = CELL_HEIGHT * 0.5;
    this.y = PLATFORM_ROW * CELL_HEIGHT;
    this.x = (CANVAS_WIDTH - this.width) / 2;
    this.momentum = 0;
    this.speed = 400;
    this.momentumDecay = 3.0;
    this.momentumAccel = 5.0;

    this.graphics = scene.add.graphics();
    this.cursors = scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D
    });

    this.draw();
  }

  update(delta) {
    const dt = delta / 1000;
    let dir = 0;

    if (this.cursors.left.isDown || this.cursors.a.isDown) dir -= 1;
    if (this.cursors.right.isDown || this.cursors.d.isDown) dir += 1;

    if (dir !== 0) {
      this.momentum += dir * this.momentumAccel * dt;
      this.momentum = Phaser.Math.Clamp(this.momentum, -1, 1);
    } else {
      // Decay momentum toward 0
      if (this.momentum > 0) {
        this.momentum = Math.max(0, this.momentum - this.momentumDecay * dt);
      } else if (this.momentum < 0) {
        this.momentum = Math.min(0, this.momentum + this.momentumDecay * dt);
      }
    }

    this.x += this.momentum * this.speed * dt;

    // Clamp to arena bounds
    if (this.x < 0) { this.x = 0; this.momentum = 0; }
    if (this.x + this.width > CANVAS_WIDTH) {
      this.x = CANVAS_WIDTH - this.width;
      this.momentum = 0;
    }

    this.draw();
  }

  draw() {
    this.graphics.clear();
    this.graphics.fillStyle(0xaaaaaa, 1);
    this.graphics.fillRoundedRect(this.x, this.y, this.width, this.height, 4);
  }

  getCenterX() {
    return this.x + this.width / 2;
  }

  getLeft() { return this.x; }
  getRight() { return this.x + this.width; }
  getTop() { return this.y; }

  destroy() {
    this.graphics.destroy();
  }
}
