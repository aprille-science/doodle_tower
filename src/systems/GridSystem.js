import {
  GRID_COLS, GRID_ROWS, CELL_WIDTH, CELL_HEIGHT,
  ARENA_WIDTH, ARENA_HEIGHT
} from '../constants.js';

// Graph paper colors
const PAPER_BG = 0xf5f0e8;        // Warm cream paper
const GRID_LINE = 0xb8cfe0;       // Light blue grid lines
const GRID_LINE_ALPHA = 0.45;
const MAJOR_GRID_LINE = 0x8aaecc; // Darker blue every 4 cells
const MAJOR_LINE_ALPHA = 0.6;
const MARGIN_LINE = 0xd48b8b;     // Red margin line
const MARGIN_ALPHA = 0.5;

export default class GridSystem {
  constructor(scene) {
    this.scene = scene;
    this.bgGraphics = scene.add.graphics().setDepth(-2);
    this.gridGraphics = scene.add.graphics().setDepth(-1);
    this.highlightGraphics = scene.add.graphics();
    this.drawBackground();
    this.drawGrid();
  }

  drawBackground() {
    // Paper background
    this.bgGraphics.fillStyle(PAPER_BG, 1);
    this.bgGraphics.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // Subtle paper texture — faint speckles
    for (let i = 0; i < 120; i++) {
      const tx = Math.random() * ARENA_WIDTH;
      const ty = Math.random() * ARENA_HEIGHT;
      this.bgGraphics.fillStyle(0xd8d0c4, 0.2 + Math.random() * 0.15);
      this.bgGraphics.fillCircle(tx, ty, 0.5 + Math.random() * 1);
    }
  }

  drawGrid() {
    // Minor grid lines (every cell)
    this.gridGraphics.lineStyle(0.5, GRID_LINE, GRID_LINE_ALPHA);

    for (let col = 0; col <= GRID_COLS; col++) {
      const x = col * CELL_WIDTH;
      this.gridGraphics.lineBetween(x, 0, x, ARENA_HEIGHT);
    }
    for (let row = 0; row <= GRID_ROWS; row++) {
      const y = row * CELL_HEIGHT;
      this.gridGraphics.lineBetween(0, y, ARENA_WIDTH, y);
    }

    // Major grid lines (every 4 cells) — slightly thicker, darker
    this.gridGraphics.lineStyle(1, MAJOR_GRID_LINE, MAJOR_LINE_ALPHA);
    for (let col = 0; col <= GRID_COLS; col += 4) {
      const x = col * CELL_WIDTH;
      this.gridGraphics.lineBetween(x, 0, x, ARENA_HEIGHT);
    }
    for (let row = 0; row <= GRID_ROWS; row += 4) {
      const y = row * CELL_HEIGHT;
      this.gridGraphics.lineBetween(0, y, ARENA_WIDTH, y);
    }

    // Red margin line on left side
    this.gridGraphics.lineStyle(1.5, MARGIN_LINE, MARGIN_ALPHA);
    this.gridGraphics.lineBetween(CELL_WIDTH, 0, CELL_WIDTH, ARENA_HEIGHT);

    // Arena border — bold outer rectangle
    this.gridGraphics.lineStyle(2, 0x555555, 0.6);
    this.gridGraphics.strokeRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  }

  highlightCells(cells, color, alpha) {
    for (const cell of cells) {
      this.highlightGraphics.fillStyle(color, alpha);
      this.highlightGraphics.fillRect(
        cell.col * CELL_WIDTH,
        cell.row * CELL_HEIGHT,
        CELL_WIDTH,
        CELL_HEIGHT
      );
    }
  }

  clearHighlights() {
    this.highlightGraphics.clear();
  }

  getCellAt(x, y) {
    return {
      col: Math.floor(x / CELL_WIDTH),
      row: Math.floor(y / CELL_HEIGHT)
    };
  }

  getCellCenter(col, row) {
    return {
      x: col * CELL_WIDTH + CELL_WIDTH / 2,
      y: row * CELL_HEIGHT + CELL_HEIGHT / 2
    };
  }

  destroy() {
    this.bgGraphics.destroy();
    this.gridGraphics.destroy();
    this.highlightGraphics.destroy();
  }
}
