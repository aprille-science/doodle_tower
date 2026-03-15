import {
  GRID_COLS, GRID_ROWS, CELL_WIDTH, CELL_HEIGHT,
  ARENA_WIDTH, ARENA_HEIGHT, GRID_LINE_ALPHA
} from '../constants.js';

export default class GridSystem {
  constructor(scene) {
    this.scene = scene;
    this.gridGraphics = scene.add.graphics();
    this.highlightGraphics = scene.add.graphics();
    this.drawGrid();
  }

  drawGrid() {
    this.gridGraphics.lineStyle(1, 0xffffff, GRID_LINE_ALPHA);

    // Vertical lines
    for (let col = 0; col <= GRID_COLS; col++) {
      const x = col * CELL_WIDTH;
      this.gridGraphics.lineBetween(x, 0, x, ARENA_HEIGHT);
    }

    // Horizontal lines
    for (let row = 0; row <= GRID_ROWS; row++) {
      const y = row * CELL_HEIGHT;
      this.gridGraphics.lineBetween(0, y, ARENA_WIDTH, y);
    }
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
    this.gridGraphics.destroy();
    this.highlightGraphics.destroy();
  }
}
