export class Pathfinder {
  constructor() {
    this.pathCache = new Map();
  }

  findPath(startCol, startRow, goalCol, goalRow, obstacleMap) {
    // If goal is blocked, find nearest passable neighbor
    let effectiveGoalCol = goalCol;
    let effectiveGoalRow = goalRow;

    if (!obstacleMap.isPassable(goalCol, goalRow)) {
      const alt = this.findNearestPassable(goalCol, goalRow, obstacleMap);
      if (!alt) return [];
      effectiveGoalCol = alt.col;
      effectiveGoalRow = alt.row;
    }

    if (startCol === effectiveGoalCol && startRow === effectiveGoalRow) return [];

    // A* with Manhattan heuristic, 4-directional
    const openSet = new MinHeap();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const key = (c, r) => c * 1000 + r;
    const startKey = key(startCol, startRow);
    const goalKey = key(effectiveGoalCol, effectiveGoalRow);

    gScore.set(startKey, 0);
    const h = Math.abs(effectiveGoalCol - startCol) + Math.abs(effectiveGoalRow - startRow);
    fScore.set(startKey, h);
    openSet.push({ col: startCol, row: startRow, f: h });

    const closedSet = new Set();

    while (openSet.size() > 0) {
      const current = openSet.pop();
      const ck = key(current.col, current.row);

      if (ck === goalKey) {
        return this.reconstructPath(cameFrom, current, key);
      }

      if (closedSet.has(ck)) continue;
      closedSet.add(ck);

      const neighbors = obstacleMap.getNeighbors(current.col, current.row);
      for (const neighbor of neighbors) {
        const nk = key(neighbor.col, neighbor.row);
        if (closedSet.has(nk)) continue;

        const tentativeG = (gScore.get(ck) || 0) + 1;
        if (tentativeG < (gScore.get(nk) || Infinity)) {
          cameFrom.set(nk, current);
          gScore.set(nk, tentativeG);
          const nf = tentativeG + Math.abs(effectiveGoalCol - neighbor.col) + Math.abs(effectiveGoalRow - neighbor.row);
          fScore.set(nk, nf);
          openSet.push({ col: neighbor.col, row: neighbor.row, f: nf });
        }
      }
    }

    return []; // No path found
  }

  reconstructPath(cameFrom, current, key) {
    const path = [{ col: current.col, row: current.row }];
    let ck = key(current.col, current.row);
    while (cameFrom.has(ck)) {
      const prev = cameFrom.get(ck);
      path.unshift({ col: prev.col, row: prev.row });
      ck = key(prev.col, prev.row);
    }
    // Remove start from path
    path.shift();
    return path;
  }

  findNearestPassable(col, row, obstacleMap) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (let r = 1; r <= 4; r++) {
      for (const [dc, dr] of dirs) {
        const nc = col + dc * r;
        const nr = row + dr * r;
        if (obstacleMap.isPassable(nc, nr)) {
          return { col: nc, row: nr };
        }
      }
    }
    return null;
  }

  getCachedPath(enemyId) {
    return this.pathCache.get(enemyId);
  }

  setCachedPath(enemyId, path) {
    this.pathCache.set(enemyId, path);
  }

  invalidateCache(enemyId) {
    this.pathCache.delete(enemyId);
  }

  invalidateAll() {
    this.pathCache.clear();
  }
}

// Simple binary min-heap for A*
class MinHeap {
  constructor() {
    this.data = [];
  }
  size() { return this.data.length; }
  push(item) {
    this.data.push(item);
    this._bubbleUp(this.data.length - 1);
  }
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }
  _bubbleUp(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p].f <= this.data[i].f) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }
  _sinkDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.data[l].f < this.data[smallest].f) smallest = l;
      if (r < n && this.data[r].f < this.data[smallest].f) smallest = r;
      if (smallest === i) break;
      [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
      i = smallest;
    }
  }
}
