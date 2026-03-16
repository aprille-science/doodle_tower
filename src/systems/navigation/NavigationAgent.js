import { CELL_WIDTH, CELL_HEIGHT, NAV_RECALC_INTERVAL_MS, ENEMY_SEPARATION_FORCE, ENEMY_ARENA_MAX_ROW, ARENA_WIDTH, GAME_SPEED_SCALE } from '../../constants.js';

export class NavigationAgent {
  constructor(enemy, obstacleMap, pathfinder, steeringSystem) {
    this.enemy = enemy;
    this.obstacleMap = obstacleMap;
    this.pathfinder = pathfinder;
    this.steeringSystem = steeringSystem;
    this.currentPath = [];
    this.waypointIndex = 0;
    this.lastRecalcTime = 0;
    this.needsRecalc = true;
  }

  moveToward(targetWorldX, targetWorldY, rawSpeed, dt, allEnemies) {
    const speed = rawSpeed * GAME_SPEED_SCALE;
    const enemy = this.enemy;
    const startCol = Math.floor(enemy.x / CELL_WIDTH);
    const startRow = Math.floor(enemy.y / CELL_HEIGHT);
    const goalCol = Math.max(0, Math.min(15, Math.floor(targetWorldX / CELL_WIDTH)));
    const goalRow = Math.max(0, Math.min(15, Math.floor(targetWorldY / CELL_HEIGHT)));

    const now = Date.now();
    if (this.needsRecalc || now - this.lastRecalcTime > NAV_RECALC_INTERVAL_MS) {
      this.currentPath = this.pathfinder.findPath(startCol, startRow, goalCol, goalRow, this.obstacleMap);
      this.waypointIndex = 0;
      this.lastRecalcTime = now;
      this.needsRecalc = false;
    }

    let moveX = targetWorldX;
    let moveY = targetWorldY;

    if (this.currentPath.length > 0 && this.waypointIndex < this.currentPath.length) {
      const wp = this.currentPath[this.waypointIndex];
      moveX = wp.col * CELL_WIDTH + CELL_WIDTH / 2;
      moveY = wp.row * CELL_HEIGHT + CELL_HEIGHT / 2;

      const dist = Math.sqrt((enemy.x - moveX) ** 2 + (enemy.y - moveY) ** 2);
      if (dist < 10) {
        this.waypointIndex++;
        if (this.waypointIndex >= this.currentPath.length) {
          this.needsRecalc = true;
        }
      }
    }

    const dx = moveX - enemy.x;
    const dy = moveY - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let vx = 0;
    let vy = 0;
    if (dist > 1) {
      vx = (dx / dist) * speed;
      vy = (dy / dist) * speed;
    }

    // Apply separation steering
    const sep = this.steeringSystem.computeSeparation(enemy, allEnemies, ENEMY_SEPARATION_FORCE);
    vx += sep.x;
    vy += sep.y;

    enemy.x += vx * dt;
    enemy.y += vy * dt;
    this.clampToArena(enemy);
  }

  moveAwayFrom(sourceWorldX, sourceWorldY, rawSpeed, dt, allEnemies) {
    const speed = rawSpeed * GAME_SPEED_SCALE;
    const enemy = this.enemy;
    const dx = enemy.x - sourceWorldX;
    const dy = enemy.y - sourceWorldY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let vx = 0;
    let vy = 0;
    if (dist > 0.01) {
      vx = (dx / dist) * speed;
      vy = (dy / dist) * speed;
    } else {
      vx = speed;
    }

    const sep = this.steeringSystem.computeSeparation(enemy, allEnemies, ENEMY_SEPARATION_FORCE);
    vx += sep.x;
    vy += sep.y;

    enemy.x += vx * dt;
    enemy.y += vy * dt;
    this.clampToArena(enemy);
  }

  moveDirectly(velocityX, velocityY, dt, allEnemies) {
    const enemy = this.enemy;
    const sep = this.steeringSystem.computeSeparation(enemy, allEnemies, ENEMY_SEPARATION_FORCE);

    enemy.x += (velocityX * GAME_SPEED_SCALE + sep.x) * dt;
    enemy.y += (velocityY * GAME_SPEED_SCALE + sep.y) * dt;
    this.clampToArena(enemy);
  }

  clampToArena(enemy) {
    const halfW = (enemy.width || CELL_WIDTH) / 2;
    const halfH = (enemy.height || CELL_HEIGHT) / 2;

    // Expand bounds for terrain shield if present
    const shieldSys = enemy.scene && enemy.scene.terrainShieldSystem;
    const expansion = shieldSys ? shieldSys.getShieldBoundsExpansion(enemy) : null;
    const extraL = expansion ? expansion.extraLeft : 0;
    const extraR = expansion ? expansion.extraRight : 0;
    const extraT = expansion ? expansion.extraTop : 0;
    const extraB = expansion ? expansion.extraBottom : 0;

    if (enemy.x - halfW - extraL < 0) enemy.x = halfW + extraL;
    if (enemy.x + halfW + extraR > ARENA_WIDTH) enemy.x = ARENA_WIDTH - halfW - extraR;
    if (enemy.y - halfH - extraT < 0) enemy.y = halfH + extraT;
    const maxY = ENEMY_ARENA_MAX_ROW * CELL_HEIGHT;
    if (enemy.y + halfH + extraB > maxY) enemy.y = maxY - halfH - extraB;
  }

  invalidatePath() {
    this.needsRecalc = true;
    this.currentPath = [];
    this.waypointIndex = 0;
  }
}
