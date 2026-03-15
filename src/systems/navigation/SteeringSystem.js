import { CELL_WIDTH } from '../../constants.js';

export class SteeringSystem {
  computeSeparation(enemy, allEnemies, separationForce) {
    let fx = 0;
    let fy = 0;
    const threshold = CELL_WIDTH * 1.5;

    for (const other of allEnemies) {
      if (other === enemy || !other.alive) continue;

      const dx = enemy.x - other.x;
      const dy = enemy.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < threshold && dist > 0.01) {
        // Force magnitude falls off with distance (closer = stronger)
        const strength = separationForce * (1 - dist / threshold);
        fx += (dx / dist) * strength;
        fy += (dy / dist) * strength;
      }
    }

    return { x: fx, y: fy };
  }
}
