export class ObstacleMap {
  constructor(gridCols, gridRows) {
    this.cols = gridCols;
    this.rows = gridRows;
    this.blocked = [];
    this.enemyPresence = [];
    for (let c = 0; c < gridCols; c++) {
      this.blocked[c] = new Array(gridRows).fill(false);
      this.enemyPresence[c] = new Array(gridRows).fill(false);
    }
  }

  setBlocked(col, row, blocked) {
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      this.blocked[col][row] = blocked;
    }
  }

  isPassable(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return !this.blocked[col][row];
  }

  getNeighbors(col, row) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const result = [];
    for (const [dc, dr] of dirs) {
      const nc = col + dc;
      const nr = row + dr;
      if (this.isPassable(nc, nr)) {
        result.push({ col: nc, row: nr });
      }
    }
    return result;
  }

  rebuildFromTerrain(terrainTiles) {
    for (let c = 0; c < this.cols; c++) {
      this.blocked[c].fill(false);
    }
    for (const tile of terrainTiles) {
      if (!tile.active) continue;
      // Skip shield tiles — they move with enemies
      if (tile._shieldOwner) continue;
      // Hard-blocked: not passthrough AND not bouncy-only
      if (!tile.passthrough && tile.bouncePlayer) {
        this.setBlocked(tile.col, tile.row, true);
      }
    }
  }

  setEnemyPresence(col, row, present) {
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      this.enemyPresence[col][row] = present;
    }
  }

  getEnemyPresence(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.enemyPresence[col][row];
  }

  clearEnemyPresence() {
    for (let c = 0; c < this.cols; c++) {
      this.enemyPresence[c].fill(false);
    }
  }
}
