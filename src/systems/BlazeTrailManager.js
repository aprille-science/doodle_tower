import { CELL_WIDTH, CELL_HEIGHT, GRID_COLS, GRID_ROWS } from '../constants.js';

class BlazeTile {
  constructor(scene, col, row, durationMs, burnDurationMs) {
    this.scene = scene;
    this.col = col;
    this.row = row;
    this.remaining = durationMs;
    this.duration = durationMs;
    this.burnDurationMs = burnDurationMs;
    this.active = true;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(5);
    this.draw();
  }

  update(delta) {
    this.remaining -= delta;
    if (this.remaining <= 0) {
      this.active = false;
      this.graphics.clear();
      return;
    }
    this.draw();
  }

  draw() {
    this.graphics.clear();
    const alpha = Math.min(0.4, (this.remaining / this.duration) * 0.4);
    const x = this.col * CELL_WIDTH;
    const y = this.row * CELL_HEIGHT;
    this.graphics.fillStyle(0xff2200, alpha);
    this.graphics.fillRect(x + 2, y + 2, CELL_WIDTH - 4, CELL_HEIGHT - 4);
    // Flickering inner glow
    const flicker = 0.1 + Math.sin(Date.now() * 0.008 + this.col * 3 + this.row * 7) * 0.05;
    this.graphics.fillStyle(0xff6600, flicker);
    this.graphics.fillRect(x + 8, y + 8, CELL_WIDTH - 16, CELL_HEIGHT - 16);
  }

  destroy() {
    this.active = false;
    this.graphics.destroy();
  }
}

export class BlazeTrailManager {
  constructor(scene) {
    this.scene = scene;
    this.tiles = [];
    // Track which cells already have a blaze to avoid duplicates
    this.activeCells = new Set();
  }

  addBlaze(col, row, durationMs, burnDurationMs) {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
    const key = `${col},${row}`;
    if (this.activeCells.has(key)) return; // already blazing

    const tile = new BlazeTile(this.scene, col, row, durationMs, burnDurationMs);
    this.tiles.push(tile);
    this.activeCells.add(key);
  }

  update(delta) {
    for (let i = this.tiles.length - 1; i >= 0; i--) {
      this.tiles[i].update(delta);
      if (!this.tiles[i].active) {
        const t = this.tiles[i];
        this.activeCells.delete(`${t.col},${t.row}`);
        t.destroy();
        this.tiles.splice(i, 1);
      }
    }
  }

  destroy() {
    for (const t of this.tiles) t.destroy();
    this.tiles = [];
    this.activeCells.clear();
  }
}
