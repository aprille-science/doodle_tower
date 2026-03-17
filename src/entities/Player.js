import {
  CELL_WIDTH, CELL_HEIGHT, CANVAS_WIDTH, ARENA_HEIGHT,
  MOMENTUM_INFLUENCE_FACTOR, GAME_SPEED_SCALE, PLAYER_SPEED_SCALE,
  SHIELD_DRAIN_RATE
} from '../constants.js';

export default class Player {
  constructor(scene, data) {
    this.scene = scene;
    this.hp = data.hp;
    this.maxHp = data.hp;
    this.shieldHP = data.shieldHP;
    this.maxShieldHP = data.shieldHP;
    this.attackDamage = data.attackDamage || data.contactDamage;
    this.contactDamage = data.contactDamage;
    this.radius = data.radius;
    const playerScale = GAME_SPEED_SCALE * PLAYER_SPEED_SCALE;
    this.speed = (data.speed || data.maxSpeed) * playerScale;
    this.maxSpeed = this.speed;

    this.vx = data.initialVelocityX * playerScale;
    this.vy = data.initialVelocityY * playerScale;

    // Start above platform center
    this.x = CANVAS_WIDTH / 2;
    this.y = ARENA_HEIGHT - 100;

    this.shieldActive = false;
    this.shieldBroken = false;
    this.shieldLockoutTimer = 0;
    this.parryWindowTimer = 0;
    this.invulnTimer = 0;

    this.alive = true;
    this.damageReduction = 1; // multiplier, 0.5 = 50% less damage

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

    // Keep speed constant
    this.normalizeSpeed();

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

    // Shield drain while active
    if (this.shieldActive && this.shieldHP > 0) {
      this.shieldHP -= SHIELD_DRAIN_RATE * dt;
      if (this.shieldHP <= 0) {
        this.shieldHP = 0;
        this.shieldBroken = true;
      }
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
      // Normalize velocity to constant speed
      this.normalizeSpeed();
      return true;
    }
    return false;
  }

  normalizeSpeed() {
    const mag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (mag > 0) {
      this.vx = (this.vx / mag) * this.speed;
      this.vy = (this.vy / mag) * this.speed;
    }
  }

  checkFellBelow() {
    // Bounce off bottom arena wall and take damage
    if (this.y + this.radius > ARENA_HEIGHT) {
      this.y = ARENA_HEIGHT - this.radius;
      this.vy = -Math.abs(this.vy);
      this.takeDamage(1, true); // bypass shield for fall damage
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
    if (this._rageInvuln) return;

    if (!bypassShield && this.shieldActive && this.shieldHP > 0) {
      // Shield is active and has charge — block all damage
      this.invulnTimer = 200;
      return;
    }

    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
    this.invulnTimer = 200;
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

    // Doodle-style player: pencil-drawn circle with fill
    if (this._damageFlash) {
      this.graphics.fillStyle(0xcc3333, 0.9);
    } else if (this.invulnTimer > 0 && Math.floor(this.invulnTimer / 80) % 2 === 0) {
      this.graphics.fillStyle(0x666666, 0.3);
    } else {
      this.graphics.fillStyle(0xf5f0e8, 1); // Paper-colored fill
    }
    this.graphics.fillCircle(this.x, this.y, this.radius);

    // Sketchy ink outline — draw multiple slightly offset circles
    this.graphics.lineStyle(1.5, 0x222222, 0.9);
    this.graphics.strokeCircle(this.x + 0.3, this.y + 0.3, this.radius);
    this.graphics.lineStyle(1, 0x333333, 0.5);
    this.graphics.strokeCircle(this.x - 0.3, this.y - 0.3, this.radius + 0.5);

    // Eyes (two small dots)
    this.graphics.fillStyle(0x222222, 1);
    this.graphics.fillCircle(this.x - 3, this.y - 2, 1.5);
    this.graphics.fillCircle(this.x + 3, this.y - 2, 1.5);

    // Shield visual — dashed-looking ring
    if (this.shieldActive) {
      this.shieldGraphics.lineStyle(2, 0x3366aa, 0.7);
      this.shieldGraphics.strokeCircle(this.x, this.y, this.radius + 8);
      this.shieldGraphics.lineStyle(1, 0x3366aa, 0.3);
      this.shieldGraphics.strokeCircle(this.x, this.y, this.radius + 10);
    }
  }

  destroy() {
    this.graphics.destroy();
    this.shieldGraphics.destroy();
  }
}
