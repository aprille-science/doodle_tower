import Phaser from 'phaser';
import {
  CANVAS_WIDTH, ARENA_HEIGHT, CELL_WIDTH, CELL_HEIGHT
} from '../constants.js';
import GridSystem from '../systems/GridSystem.js';
import PhysicsSystem from '../systems/PhysicsSystem.js';
import DamageSystem from '../systems/DamageSystem.js';
import ShieldSystem from '../systems/ShieldSystem.js';
import AttackSystem from '../systems/AttackSystem.js';
import PhaseSystem from '../systems/PhaseSystem.js';
import Player from '../entities/Player.js';
import Platform from '../entities/Platform.js';
import Enemy from '../entities/Enemy.js';
import TerrainTile from '../entities/TerrainTile.js';
import ParryEffect from '../ui/ParryEffect.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Load data
    const mapData = this.cache.json.get('map_01');
    const playerData = this.cache.json.get('player_default');

    // Load attack pattern cache
    this.patternCache = {};
    this.patternCache['pattern_stomp'] = this.cache.json.get('pattern_stomp');
    this.patternCache['pattern_laser'] = this.cache.json.get('pattern_laser');
    this.patternCache['pattern_spread'] = this.cache.json.get('pattern_spread');

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

    // Create enemies
    this.enemies = [];
    for (const enemyDef of mapData.initialEnemies) {
      const enemyData = this.cache.json.get(enemyDef.enemyId);
      const enemy = new Enemy(this, enemyData, enemyDef.gridPosition);
      this.enemies.push(enemy);
    }

    // Create parry effect
    this.parryEffect = new ParryEffect(this);

    // Initialize systems
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

    // Game state
    this.gameOver = false;
    this.gameWon = false;
    this.endText = null;
  }

  update(time, delta) {
    if (this.gameOver || this.gameWon) return;

    // Update platform
    this.platform.update(delta);

    // Update player
    this.player.update(delta);

    // Physics: player vs platform, walls, terrain
    this.physicsSystem.updatePlayer(this.player, this.platform, this.terrainTiles);

    // Physics: player vs enemies
    for (const enemy of this.enemies) {
      this.physicsSystem.checkPlayerEnemyCollision(this.player, enemy);
      enemy.update(delta);
    }

    // Attack system
    this.attackSystem.update(delta);

    // Damage system
    this.damageSystem.update(
      this.terrainTiles,
      this.attackSystem.attackZones,
      this.attackSystem.projectiles,
      this.physicsSystem
    );

    // Shield system
    this.shieldSystem.update(delta);

    // Phase system
    this.phaseSystem.update();

    // Parry effect
    this.parryEffect.update(delta);

    // Win condition
    const allDead = this.enemies.every(e => !e.alive);
    if (allDead) {
      this.gameWon = true;
      this.attackSystem.clearAll();
      this.showEndText('YOU WIN!', 0x00ff00);
    }

    // Lose condition
    if (!this.player.alive) {
      this.gameOver = true;
      this.attackSystem.clearAll();
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
    }).setOrigin(0.5);

    // Restart prompt
    this.add.text(CANVAS_WIDTH / 2, ARENA_HEIGHT / 2 + 60, 'Press R to restart', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-R', () => {
      this.scene.stop('UIScene');
      this.scene.restart();
    });
  }
}
