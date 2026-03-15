import { CELL_WIDTH, CELL_HEIGHT, CELL_HIGHLIGHT_ALPHA, WARNING_HIGHLIGHT_ALPHA } from '../constants.js';

export default class AttackZone {
  constructor(scene, patternData) {
    this.scene = scene;
    this.cells = patternData.cells;
    this.damage = patternData.damage;
    this.bouncePlayer = patternData.bouncePlayer;
    this.passthrough = patternData.passthrough;
    this.breakable = patternData.breakable;
    this.color = parseInt(patternData.color);
    this.warningDurationMs = patternData.warningDurationMs;
    this.activeDurationMs = patternData.activeDurationMs;

    this.state = 'warning'; // 'warning' | 'active' | 'done'
    this.elapsed = 0;
    this.active = true;

    this.graphics = scene.add.graphics();
    this.draw();
  }

  update(delta) {
    this.elapsed += delta;

    if (this.state === 'warning' && this.elapsed >= this.warningDurationMs) {
      this.state = 'active';
      this.elapsed = 0;
      this.draw();
    } else if (this.state === 'active' && this.elapsed >= this.activeDurationMs) {
      this.state = 'done';
      this.active = false;
      this.graphics.clear();
    }
  }

  draw() {
    this.graphics.clear();
    if (this.state === 'warning') {
      // Yellow warning highlight
      this.graphics.fillStyle(0xffff00, WARNING_HIGHLIGHT_ALPHA);
    } else if (this.state === 'active') {
      this.graphics.fillStyle(this.color, CELL_HIGHLIGHT_ALPHA);
    } else {
      return;
    }

    for (const cell of this.cells) {
      this.graphics.fillRect(
        cell.col * CELL_WIDTH,
        cell.row * CELL_HEIGHT,
        CELL_WIDTH,
        CELL_HEIGHT
      );
    }
  }

  isActive() {
    return this.state === 'active';
  }

  isDone() {
    return this.state === 'done';
  }

  destroy() {
    this.graphics.destroy();
  }
}
