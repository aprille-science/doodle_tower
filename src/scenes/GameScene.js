import Phaser from 'phaser';
import {
  CANVAS_WIDTH, ARENA_HEIGHT, CELL_WIDTH, CELL_HEIGHT, GRID_COLS, GRID_ROWS
} from '../constants.js';
import GridSystem from '../systems/GridSystem.js';
import PhysicsSystem from '../systems/PhysicsSystem.js';
import DamageSystem from '../systems/DamageSystem.js';
import ShieldSystem from '../systems/ShieldSystem.js';
import AttackSystem from '../systems/AttackSystem.js';
import PhaseSystem from '../systems/PhaseSystem.js';
import { ObstacleMap } from '../systems/navigation/ObstacleMap.js';
import { Pathfinder } from '../systems/navigation/Pathfinder.js';
import { SteeringSystem } from '../systems/navigation/SteeringSystem.js';
import { MovementSystem } from '../systems/movement/MovementSystem.js';
import Player from '../entities/Player.js';
import Platform from '../entities/Platform.js';
import Enemy from '../entities/Enemy.js';
import TerrainTile from '../entities/TerrainTile.js';
import ParryEffect from '../ui/ParryEffect.js';
import { SkillManager } from '../skills/SkillManager.js';
import { SpriteHPBar } from '../ui/SpriteHPBar.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.selectedMapId = (data && data.mapId) || 'map_01';
  }

  create() {
    const mapData = this.cache.json.get(this.selectedMapId);
    const playerData = this.cache.json.get('player_default');

    // Load all attack pattern cache
    this.patternCache = {};
    const patternIds = [
      'pattern_stomp', 'pattern_laser', 'pattern_spread',
      'pattern_wanderer_stomp', 'pattern_dancer_spread',
      'pattern_laser_aimed', 'pattern_radial',
      'pattern_berserker_spread', 'pattern_shockwave'
    ];
    for (const id of patternIds) {
      const data = this.cache.json.get(id);
      if (data) this.patternCache[id] = data;
    }

    // Initialize grid
    this.gridSystem = new GridSystem(this);

    // Create terrain tiles
    this.terrainTiles = [];
    for (const terrainDef of mapData.initialTerrain) {
      for (const cell of terrainDef.cells) {
        const tile = new TerrainTile(this, {
          col: cell.col,
          row: cell.row,
          type: terrainDef.type,
          hp: terrainDef.hp,
          damage: terrainDef.damage,
          bouncePlayer: terrainDef.bouncePlayer,
          passthrough: terrainDef.passthrough,
          color: terrainDef.color
        });
        this.terrainTiles.push(tile);
      }
    }

    // Create player and platform
    this.platform = new Platform(this);
    this.player = new Player(this, playerData);

    // Create skill manager and attach to player
    this.player.skillManager = new SkillManager(this.player, this, playerData);

    // Create enemies
    this.enemies = [];
    this.reinforcements = mapData.reinforcements || [];
    this.defeatedEnemyIds = new Set();

    for (const enemyDef of mapData.initialEnemies) {
      const enemyData = this.cache.json.get(enemyDef.enemyId);
      if (!enemyData) continue;
      const enemy = new Enemy(this, enemyData, enemyDef.gridPosition);
      this.enemies.push(enemy);
    }

    // Create sprite HP bars
    this.spriteHPBars = [];
    this.playerHPBar = new SpriteHPBar(this, this.player, 0x33ee66);
    for (const enemy of this.enemies) {
      if (!enemy.data.isBoss) {
        const bar = new SpriteHPBar(this, enemy, 0xee3333);
        this.spriteHPBars.push(bar);
      }
    }

    // Create parry effect
    this.parryEffect = new ParryEffect(this);

    // Initialize navigation
    this.obstacleMap = new ObstacleMap(GRID_COLS, GRID_ROWS);
    this.obstacleMap.rebuildFromTerrain(this.terrainTiles);
    this.pathfinder = new Pathfinder();
    this.steeringSystem = new SteeringSystem();

    // Initialize movement system
    this.movementSystem = new MovementSystem(this.obstacleMap, this.pathfinder, this.steeringSystem);
    for (const enemy of this.enemies) {
      this.movementSystem.register(enemy, this.player, this);
    }

    // Initialize combat systems
    this.physicsSystem = new PhysicsSystem(this);
    this.shieldSystem = new ShieldSystem(this, this.player, this.parryEffect);
    this.damageSystem = new DamageSystem(this, this.player, this.shieldSystem);
    this.attackSystem = new AttackSystem(this, this.enemies, this.patternCache);
    this.phaseSystem = new PhaseSystem(this, this.enemies, this.attackSystem);

    // Launch UI scene in parallel
    this.scene.launch('UIScene', {
      player: this.player,
      enemies: this.enemies
    });

    // Send initial boss HP to UIScene
    for (const enemy of this.enemies) {
      if (enemy.data.isBoss) {
        this.time.delayedCall(100, () => {
          this.scene.get('UIScene').events.emit('bossHPChanged', {
            name: enemy.name,
            hp: enemy.hp,
            maxHp: enemy.maxHp,
            damageTaken: 0
          });
        });
      }
    }

    // Wire events
    this.events.on('chargeHitWall', (data) => {
      this.attackSystem.spawnShockwaveAtPoint(data.impactX, data.impactY, data.enemy);
    });

    this.events.on('tweenCycleComplete', (data) => {
      const enemy = data.enemy;
      if (!enemy.alive) return;
      if (enemy.attackOnEvent && enemy.attackOnEvent.event === 'tweenCycleComplete') {
        this.attackSystem.spawnEventAttack(enemy.attackOnEvent.pattern, enemy);
      }
    });

    this.events.on('enemyDamaged', (enemy, dmg) => {
      if (!enemy.alive) {
        this.onEnemyDefeated(enemy);
        return;
      }
      this.movementSystem.onEnemyHit(enemy);

      // Notify UIScene of boss HP changes
      if (enemy.data.isBoss) {
        this.scene.get('UIScene').events.emit('bossHPChanged', {
          name: enemy.name,
          hp: enemy.hp,
          maxHp: enemy.maxHp,
          damageTaken: dmg || 0
        });
      }
    });

    this.events.on('phaseTransition', (data) => {
      this.movementSystem.onPhaseEnter(data.enemy);
    });

    // Game state
    this.gameOver = false;
    this.gameWon = false;
    this.gamePaused = false;
    this.frozen = false; // true when game over/won — permanent freeze
    this.endText = null;
    this.pauseOverlay = null;
    this.pauseText = null;

    // ESC key for pause
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.frozen) return; // can't unpause after game over
      this.togglePause();
    });
  }

  togglePause() {
    this.gamePaused = !this.gamePaused;

    if (this.gamePaused) {
      // Show pause overlay
      this.pauseOverlay = this.add.graphics();
      this.pauseOverlay.fillStyle(0x000000, 0.5);
      this.pauseOverlay.fillRect(0, 0, CANVAS_WIDTH, ARENA_HEIGHT);
      this.pauseOverlay.setDepth(990);

      this.pauseText = this.add.text(CANVAS_WIDTH / 2, ARENA_HEIGHT / 2, 'PAUSED', {
        fontSize: '48px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5).setDepth(991);
    } else {
      // Remove pause overlay
      if (this.pauseOverlay) { this.pauseOverlay.destroy(); this.pauseOverlay = null; }
      if (this.pauseText) { this.pauseText.destroy(); this.pauseText = null; }
    }
  }

  freezeGame() {
    this.frozen = true;
    this.gamePaused = false; // clear pause state
    this.attackSystem.clearAll();
  }

  onEnemyDefeated(enemy) {
    this.defeatedEnemyIds.add(enemy.id);

    // Notify UIScene if boss died
    if (enemy.data.isBoss) {
      this.scene.get('UIScene').events.emit('bossHPChanged', {
        name: enemy.name,
        hp: 0,
        maxHp: enemy.maxHp,
        damageTaken: 0
      });
    }

    // Destroy the enemy's sprite HP bar
    for (let i = this.spriteHPBars.length - 1; i >= 0; i--) {
      if (this.spriteHPBars[i].entity === enemy) {
        this.spriteHPBars[i].destroy();
        this.spriteHPBars.splice(i, 1);
        break;
      }
    }

    // Check reinforcements
    for (const reinf of this.reinforcements) {
      if (reinf.trigger === 'enemy_defeated' && reinf.targetEnemyId === enemy.id) {
        this.time.delayedCall(reinf.spawnAfterMs || 2000, () => {
          if (this.frozen) return;
          this.spawnReinforcements(reinf);
        });
      }
    }
  }

  spawnReinforcements(reinf) {
    if (this.frozen) return;
    const count = Math.min(reinf.spawnCount, reinf.positions.length);
    for (let i = 0; i < count; i++) {
      const enemyData = this.cache.json.get(reinf.spawnEnemyId);
      if (!enemyData) continue;
      const pos = reinf.positions[i];
      const enemy = new Enemy(this, enemyData, pos);
      this.enemies.push(enemy);
      this.movementSystem.register(enemy, this.player, this);
      if (!enemyData.isBoss) {
        const bar = new SpriteHPBar(this, enemy, 0xee3333);
        this.spriteHPBars.push(bar);
      }
    }
    // Reschedule attacks to include new enemies
    this.attackSystem.enemies = this.enemies;
    this.attackSystem.reschedule();
  }

  onTerrainDestroyed() {
    this.obstacleMap.rebuildFromTerrain(this.terrainTiles);
    this.movementSystem.invalidateAllPaths();
  }

  update(time, delta) {
    // Frozen = game over/won — nothing updates
    if (this.frozen) return;

    // Paused = ESC pause — nothing updates
    if (this.gamePaused) return;

    // Update platform
    this.platform.update(delta);

    // Update player
    this.player.update(delta);

    // Update skills
    this.player.skillManager.update(delta);

    // Physics: player vs platform, walls, terrain
    this.physicsSystem.updatePlayer(this.player, this.platform, this.terrainTiles);

    // Physics: player vs enemies
    for (const enemy of this.enemies) {
      if (enemy.alive) {
        this.physicsSystem.checkPlayerEnemyCollision(this.player, enemy);
      }
      enemy.update(delta);
    }

    // Movement system
    this.movementSystem.update(delta, this.enemies, this.player, this);

    // Attack system
    this.attackSystem.update(delta);

    // Damage system (now passes enemies for player projectile hits)
    this.damageSystem.update(
      this.terrainTiles,
      this.attackSystem.attackZones,
      this.attackSystem.projectiles,
      this.physicsSystem,
      this.enemies
    );

    // Check for terrain changes
    const prevActiveCount = this._lastTerrainActiveCount || this.terrainTiles.length;
    const currentActiveCount = this.terrainTiles.filter(t => t.active).length;
    if (currentActiveCount !== prevActiveCount) {
      this.onTerrainDestroyed();
    }
    this._lastTerrainActiveCount = currentActiveCount;

    // Shield system
    this.shieldSystem.update(delta);

    // Phase system
    this.phaseSystem.update();

    // Update sprite HP bars
    this.playerHPBar.update();
    for (const bar of this.spriteHPBars) {
      bar.update();
    }

    // Parry effect
    this.parryEffect.update(delta);

    // Win condition
    const allDead = this.enemies.every(e => !e.alive);
    if (allDead) {
      this.gameWon = true;
      this.freezeGame();
      this.showEndText('YOU WIN!', 0x00ff00);
    }

    // Lose condition
    if (!this.player.alive) {
      this.gameOver = true;
      this.freezeGame();
      this.showEndText('GAME OVER', 0xff0000);
    }
  }

  showEndText(message, color) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    this.endText = this.add.text(CANVAS_WIDTH / 2, ARENA_HEIGHT / 2, message, {
      fontSize: '48px',
      color: hex,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(995);

    this.add.text(CANVAS_WIDTH / 2, ARENA_HEIGHT / 2 + 50, 'Press R to retry  |  Press M for menu', {
      fontSize: '15px',
      color: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(995);

    this.input.keyboard.once('keydown-R', () => {
      this.scene.stop('UIScene');
      this.scene.restart({ mapId: this.selectedMapId });
    });
    this.input.keyboard.once('keydown-M', () => {
      this.scene.stop('UIScene');
      this.scene.start('TitleScene');
    });
  }
}
