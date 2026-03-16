import { CELL_WIDTH, CELL_HEIGHT, GRID_COLS, GRID_ROWS } from '../constants.js';

const EFFECT_DEFS = {
  blaze: {
    outerColor: 0xff2200,
    innerColor: 0xff6600,
    statusType: 'burned',
    flickerSpeed: 0.008
  },
  frost: {
    outerColor: 0x2288cc,
    innerColor: 0x44ccff,
    statusType: 'frozen',
    flickerSpeed: 0.004
  },
  electric: {
    outerColor: 0xaaaa00,
    innerColor: 0xffee00,
    statusType: 'paralyzed',
    flickerSpeed: 0.012
  }
};

class EffectTile {
  constructor(scene, col, row, effectType, durationMs, statusDurationMs) {
    this.scene = scene;
    this.col = col;
    this.row = row;
    this.effectType = effectType;
    this.remaining = durationMs;
    this.duration = durationMs;
    this.statusDurationMs = statusDurationMs;
    this.active = true;

    this.def = EFFECT_DEFS[effectType];
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
    this.graphics.fillStyle(this.def.outerColor, alpha);
    this.graphics.fillRect(x + 2, y + 2, CELL_WIDTH - 4, CELL_HEIGHT - 4);
    // Flickering inner glow
    const flicker = 0.1 + Math.sin(Date.now() * this.def.flickerSpeed + this.col * 3 + this.row * 7) * 0.05;
    this.graphics.fillStyle(this.def.innerColor, flicker);
    this.graphics.fillRect(x + 8, y + 8, CELL_WIDTH - 16, CELL_HEIGHT - 16);
  }

  destroy() {
    this.active = false;
    this.graphics.destroy();
  }
}

export class TerrainEffectManager {
  constructor(scene) {
    this.scene = scene;
    this.tiles = [];
    // Track active cells per type to avoid duplicates: "type,col,row"
    this.activeCells = new Set();
  }

  addEffect(effectType, col, row, durationMs, statusDurationMs) {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
    const key = `${effectType},${col},${row}`;
    if (this.activeCells.has(key)) return;

    const tile = new EffectTile(this.scene, col, row, effectType, durationMs, statusDurationMs);
    this.tiles.push(tile);
    this.activeCells.add(key);
  }

  update(delta) {
    const statusMgr = this.scene.statusEffectManager;

    for (let i = this.tiles.length - 1; i >= 0; i--) {
      const tile = this.tiles[i];
      tile.update(delta);

      if (!tile.active) {
        this.activeCells.delete(`${tile.effectType},${tile.col},${tile.row}`);
        tile.destroy();
        this.tiles.splice(i, 1);
        continue;
      }

      // Apply status to enemies standing on this tile
      if (statusMgr && this.scene.enemies) {
        for (const enemy of this.scene.enemies) {
          if (!enemy.alive) continue;
          const eCol = Math.floor(enemy.x / CELL_WIDTH);
          const eRow = Math.floor(enemy.y / CELL_HEIGHT);
          if (eCol === tile.col && eRow === tile.row) {
            statusMgr.applyStatus(enemy, tile.def.statusType, tile.statusDurationMs);
          }
        }
      }
    }
  }

  destroy() {
    for (const t of this.tiles) t.destroy();
    this.tiles = [];
    this.activeCells.clear();
  }
}
