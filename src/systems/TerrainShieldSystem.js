import { CELL_WIDTH, CELL_HEIGHT, GRID_COLS, GRID_ROWS } from '../constants.js';
import TerrainTile from '../entities/TerrainTile.js';

export class TerrainShieldSystem {
  constructor(scene) {
    this.scene = scene;
    this.shields = [];
  }

  register(enemy) {
    const config = enemy.data.terrainShield;
    if (!config) return;

    const shieldData = {
      enemy,
      config,
      tiles: []
    };

    this.createShieldTiles(shieldData);
    this.shields.push(shieldData);
  }

  createShieldTiles(shieldData) {
    const { enemy, config } = shieldData;
    const sides = config.sides || ['top', 'bottom', 'left', 'right'];
    const hp = config.hp || 3;
    const color = config.color || '0x8844cc';

    const enemyCols = enemy.size.cols;
    const enemyRows = enemy.size.rows;

    for (const side of sides) {
      const offsets = this.getSideOffsets(side, enemyCols, enemyRows);
      for (const off of offsets) {
        const tile = new TerrainTile(this.scene, {
          col: 0,
          row: 0,
          type: 'shield',
          hp: hp,
          damage: 0,
          bouncePlayer: true,
          passthrough: false,
          color: color,
          alpha: 0.85
        });
        tile._shieldOwner = enemy;
        tile._offsetX = off.dx;
        tile._offsetY = off.dy;
        shieldData.tiles.push(tile);
        this.scene.terrainTiles.push(tile);
      }
    }

    this.updatePositions(shieldData);
  }

  getSideOffsets(side, enemyCols, enemyRows) {
    const offsets = [];
    const ew = enemyCols * CELL_WIDTH;
    const eh = enemyRows * CELL_HEIGHT;

    switch (side) {
      case 'top':
        for (let i = 0; i < enemyCols; i++) {
          offsets.push({
            dx: -ew / 2 + i * CELL_WIDTH,
            dy: -eh / 2 - CELL_HEIGHT
          });
        }
        break;
      case 'bottom':
        for (let i = 0; i < enemyCols; i++) {
          offsets.push({
            dx: -ew / 2 + i * CELL_WIDTH,
            dy: eh / 2
          });
        }
        break;
      case 'left':
        for (let j = 0; j < enemyRows; j++) {
          offsets.push({
            dx: -ew / 2 - CELL_WIDTH,
            dy: -eh / 2 + j * CELL_HEIGHT
          });
        }
        break;
      case 'right':
        for (let j = 0; j < enemyRows; j++) {
          offsets.push({
            dx: ew / 2,
            dy: -eh / 2 + j * CELL_HEIGHT
          });
        }
        break;
    }
    return offsets;
  }

  updatePositions(shieldData) {
    const { enemy, tiles } = shieldData;
    for (const tile of tiles) {
      if (!tile.active) continue;
      tile.x = enemy.x + tile._offsetX;
      tile.y = enemy.y + tile._offsetY;
      tile.col = Math.floor(tile.x / CELL_WIDTH);
      tile.row = Math.floor(tile.y / CELL_HEIGHT);
      tile.draw();
    }
  }

  update() {
    for (let i = this.shields.length - 1; i >= 0; i--) {
      const shieldData = this.shields[i];
      if (!shieldData.enemy.alive) {
        this.destroyShield(shieldData);
        this.shields.splice(i, 1);
        continue;
      }
      this.updatePositions(shieldData);
    }
  }

  destroyShield(shieldData) {
    for (const tile of shieldData.tiles) {
      tile.active = false;
      tile.graphics.clear();
      const idx = this.scene.terrainTiles.indexOf(tile);
      if (idx !== -1) this.scene.terrainTiles.splice(idx, 1);
    }
  }

  getShieldBoundsExpansion(enemy) {
    for (const sd of this.shields) {
      if (sd.enemy !== enemy) continue;
      let extraLeft = 0, extraRight = 0, extraTop = 0, extraBottom = 0;
      const sides = sd.config.sides || ['top', 'bottom', 'left', 'right'];
      const hasActiveTile = (side) => {
        const ew = enemy.size.cols * CELL_WIDTH;
        const eh = enemy.size.rows * CELL_HEIGHT;
        return sd.tiles.some(t => {
          if (!t.active) return false;
          if (side === 'top') return t._offsetY < -eh / 2;
          if (side === 'bottom') return t._offsetY >= eh / 2;
          if (side === 'left') return t._offsetX < -ew / 2;
          if (side === 'right') return t._offsetX >= ew / 2;
          return false;
        });
      };
      if (sides.includes('top') && hasActiveTile('top')) extraTop = CELL_HEIGHT;
      if (sides.includes('bottom') && hasActiveTile('bottom')) extraBottom = CELL_HEIGHT;
      if (sides.includes('left') && hasActiveTile('left')) extraLeft = CELL_WIDTH;
      if (sides.includes('right') && hasActiveTile('right')) extraRight = CELL_WIDTH;
      return { extraLeft, extraRight, extraTop, extraBottom };
    }
    return null;
  }

  isShieldTile(tile) {
    return !!tile._shieldOwner;
  }

  destroy() {
    for (const shieldData of this.shields) {
      for (const tile of shieldData.tiles) {
        tile.active = false;
        if (tile.graphics) tile.graphics.destroy();
      }
    }
    this.shields = [];
  }
}
