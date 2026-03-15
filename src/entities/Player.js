import {
  CELL_WIDTH, CELL_HEIGHT, CANVAS_WIDTH, ARENA_HEIGHT,
  MOMENTUM_INFLUENCE_FACTOR
} from '../constants.js';

export default class Player {
  constructor(scene, data) {
    this.scene = scene;
    this.hp = data.hp;
    this.maxHp = data.hp;
    this.shieldHP = data.shieldHP;
    this.maxShieldHP = data.shieldHP;
    this.contactDamage = data.contactDamage;
    this.radius = data.radius;
    this.maxSpeed = data.maxSpeed;

    this.vx = data.initialVelocityX;
    this.vy = data.initialVelocityY;

    // Start above platform center
    this.x = CANVAS_WIDTH / 2;
    this.y = ARENA_HEIGHT - 100;

    this.shieldActive = false;
    this.shieldBroken = false;
    this.shieldLockoutTimer = 0;
    this.parryWindowTimer = 0;
    this.invulnTimer = 0;

    this.alive = true;

    this.graphics = scene.add.graphics();
    this.shieldGraphics = scene.add.graphics();
  }

  update(delta) {
    if (!this.alive) return;

    const dt = delta / 1000;

    // Move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Wall collisions
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
    }
    if (this.x + this.radius > CANVAS_WIDTH) {
      this.x = CANVAS_WIDTH - this.radius;
      this.vx = -Math.abs(this.vx);
    }
    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
    }

    // Invulnerability timer
    if (this.invulnTimer > 0) {
      this.invulnTimer -= delta;
    }

    // Shield lockout timer
    if (this.shieldLockoutTimer > 0) {
      this.shieldLockoutTimer -= delta;
    }

    // Parry window timer
    if (this.parryWindowTimer > 0) {
      this.parryWindowTimer -= delta;
      if (this.parryWindowTimer < 0) this.parryWindowTimer = 0;
    }

    this.draw();
  }

  handlePlatformCollision(platform) {
    if (this.y + this.radius >= platform.getTop() &&
        this.y + this.radius <= platform.getTop() + 20 &&
        this.x >= platform.getLeft() - this.radius &&
        this.x <= platform.getRight() + this.radius &&
        this.vy > 0) {
      this.y = platform.getTop() - this.radius;
      this.vy = -Math.abs(this.vy);
      this.vx += platform.momentum * MOMENTUM_INFLUENCE_FACTOR;
      this.vx = Phaser.Math.Clamp(this.vx, -this.maxSpeed, this.maxSpeed);
      return true;
    }
    return false;
  }

  checkFellBelow() {
    // If player falls below row 31 (bottom of arena)
    if (this.y - this.radius > ARENA_HEIGHT) {
      this.takeDamage(1, true); // bypass shield for fall damage
      this.respawn();
      return true;
    }
    return false;
  }

  respawn() {
    this.x = CANVAS_WIDTH / 2;
    this.y = ARENA_HEIGHT - 100;
    this.vy = -Math.abs(this.vy);
    this.invulnTimer = 1000; // brief invulnerability
  }

  takeDamage(amount, bypassShield = false) {
    if (this.invulnTimer > 0) return;

    if (!bypassShield && this.shieldActive && this.shieldHP > 0) {
      this.shieldHP -= amount;
      if (this.shieldHP <= 0) {
        this.shieldHP = 0;
        this.shieldBroken = true;
      }
    } else {
      this.hp -= amount;
      if (this.hp <= 0) {
        this.hp = 0;
        this.alive = false;
      }
    }
    this.invulnTimer = 200; // small invuln after any hit
  }

  activateShield() {
    if (this.shieldLockoutTimer > 0) return;
    this.shieldActive = true;
  }

  deactivateShield() {
    this.shieldActive = false;
  }

  isInParryWindow() {
    return this.parryWindowTimer > 0;
  }

  getCol() {
    return Math.floor(this.x / CELL_WIDTH);
  }

  getRow() {
    return Math.floor(this.y / CELL_HEIGHT);
  }

  draw() {
    this.graphics.clear();
    this.shieldGraphics.clear();

    if (!this.alive) return;

    // Blink when invulnerable
    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer / 80) % 2 === 0) {
      this.graphics.fillStyle(0xffffff, 0.3);
    } else {
      this.graphics.fillStyle(0xffffff, 1);
    }
    this.graphics.fillCircle(this.x, this.y, this.radius);

    // Shield visual
    if (this.shieldActive) {
      this.shieldGraphics.lineStyle(3, 0x4488ff, 0.7);
      this.shieldGraphics.strokeCircle(this.x, this.y, this.radius + 8);
    }
  }

  destroy() {
    this.graphics.destroy();
    this.shieldGraphics.destroy();
  }
}
