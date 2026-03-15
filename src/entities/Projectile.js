import { CELL_WIDTH, CELL_HEIGHT, CANVAS_WIDTH, ARENA_HEIGHT } from '../constants.js';

export default class Projectile {
  constructor(scene, data) {
    this.scene = scene;
    this.damage = data.damage;
    this.piercing = data.piercing || false;
    this.speed = data.speed;
    this.color = parseInt(data.color);
    this.active = true;

    // Calculate spawn position from grid coords
    this.x = data.spawnGridCol * CELL_WIDTH + CELL_WIDTH / 2;
    this.y = data.spawnGridRow * CELL_HEIGHT + CELL_HEIGHT / 2;

    // Direction from degrees (0 = right, 90 = down, 270 = up)
    const rad = Phaser.Math.DegToRad(data.directionDegrees);
    this.vx = Math.cos(rad) * this.speed;
    this.vy = Math.sin(rad) * this.speed;

    this.radius = 6;
    this.graphics = scene.add.graphics();
    this.draw();
  }

  update(delta) {
    if (!this.active) return;

    const dt = delta / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Out of bounds check
    if (this.x < -20 || this.x > CANVAS_WIDTH + 20 || this.y < -20 || this.y > ARENA_HEIGHT + 20) {
      this.active = false;
      this.graphics.clear();
      return;
    }

    this.draw();
  }

  draw() {
    this.graphics.clear();
    if (!this.active) return;
    this.graphics.fillStyle(this.color, 1);
    this.graphics.fillCircle(this.x, this.y, this.radius);
  }

  getCol() {
    return Math.floor(this.x / CELL_WIDTH);
  }

  getRow() {
    return Math.floor(this.y / CELL_HEIGHT);
  }

  destroy() {
    this.active = false;
    this.graphics.destroy();
  }
}
