import { CELL_WIDTH, CELL_HEIGHT } from '../constants.js';

export default class PhysicsSystem {
  constructor(scene) {
    this.scene = scene;
  }

  updatePlayer(player, platform, terrainTiles) {
    // Platform collision
    player.handlePlatformCollision(platform);

    // Fall below arena
    player.checkFellBelow();

    // Terrain collision
    this.checkTerrainCollisions(player, terrainTiles);
  }

  checkTerrainCollisions(player, terrainTiles) {
    const playerCol = player.getCol();
    const playerRow = player.getRow();

    for (const tile of terrainTiles) {
      if (!tile.active) continue;
      if (tile.col === playerCol && tile.row === playerRow) {
        if (tile.bouncePlayer) {
          this.bouncePlayerFromTile(player, tile);
        }
      }
    }
  }

  bouncePlayerFromTile(player, tile) {
    const tileCenterX = tile.col * CELL_WIDTH + CELL_WIDTH / 2;
    const tileCenterY = tile.row * CELL_HEIGHT + CELL_HEIGHT / 2;

    const dx = player.x - tileCenterX;
    const dy = player.y - tileCenterY;

    if (Math.abs(dx) > Math.abs(dy)) {
      player.vx = dx > 0 ? Math.abs(player.vx) : -Math.abs(player.vx);
    } else {
      player.vy = dy > 0 ? Math.abs(player.vy) : -Math.abs(player.vy);
    }
  }

  checkPlayerEnemyCollision(player, enemy) {
    if (!enemy.alive || !player.alive) return false;

    const bounds = enemy.getBounds();
    const dist = this.circleRectOverlap(
      player.x, player.y, player.radius,
      bounds.x, bounds.y, bounds.width, bounds.height
    );

    if (dist) {
      enemy.takeDamage(player.contactDamage);
      // Bounce player away from enemy
      const ex = bounds.x + bounds.width / 2;
      const ey = bounds.y + bounds.height / 2;
      const dx = player.x - ex;
      const dy = player.y - ey;
      if (Math.abs(dx) > Math.abs(dy)) {
        player.vx = dx > 0 ? Math.abs(player.vx) : -Math.abs(player.vx);
      } else {
        player.vy = dy > 0 ? Math.abs(player.vy) : -Math.abs(player.vy);
      }
      return true;
    }
    return false;
  }

  circleRectOverlap(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Phaser.Math.Clamp(cx, rx, rx + rw);
    const closestY = Phaser.Math.Clamp(cy, ry, ry + rh);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (cr * cr);
  }

  checkProjectilePlayerCollision(projectile, player) {
    if (!projectile.active || !player.alive) return false;
    const dx = projectile.x - player.x;
    const dy = projectile.y - player.y;
    const dist = dx * dx + dy * dy;
    const minDist = projectile.radius + player.radius;
    return dist < (minDist * minDist);
  }
}
