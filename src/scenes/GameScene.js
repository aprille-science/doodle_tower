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
import { StatusEffectManager } from '../systems/StatusEffectManager.js';
import { TerrainEffectManager } from '../systems/TerrainEffectManager.js';
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
import { TerrainShieldSystem } from '../systems/TerrainShieldSystem.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.selectedMapId = (data && data.mapId) || 'map_01';
    this.selectedCharacterId = (data && data.characterId)
      || this.registry.get('selectedCharacter')
      || 'player_default';
  }

  create() {
    const mapData = this.cache.json.get(this.selectedMapId);
    const playerData = this.cache.json.get(this.selectedCharacterId);

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
    this.defeatedEnemyIds = new Set();

    for (const enemyDef of mapData.initialEnemies) {
      const enemyData = this.cache.json.get(enemyDef.enemyId);
      if (!enemyData) continue;
      const enemy = new Enemy(this, enemyData, enemyDef.gridPosition);
      this.enemies.push(enemy);
    }

    // Initialize reinforcement system
    this.setupReinforcements(mapData.reinforcements || []);

    // Initialize status effect system
    this.statusEffectManager = new StatusEffectManager(this);

    // Initialize terrain effect system (blaze/frost/electric tiles)
    this.terrainEffectManager = new TerrainEffectManager(this);

    // Create sprite HP bars
    this.spriteHPBars = [];
    this.playerHPBar = new SpriteHPBar(this, this.player, 0x338833);
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

    // Initialize terrain shield system
    this.terrainShieldSystem = new TerrainShieldSystem(this);
    for (const enemy of this.enemies) {
      this.terrainShieldSystem.register(enemy);
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
      if (this.statusEffectManager.isFrozen(enemy)) return; // Frozen enemies can't attack
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
      this.onBossPhaseChanged(data.enemy, data.phase);
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
      if (this.frozen) return;
      this.togglePause();
    });

    // Clean up everything when scene shuts down (restart or transition)
    this.events.once('shutdown', () => this.cleanup());
  }

  cleanup() {
    // 1. Stop all scene timers to prevent callbacks firing on dead scene
    this.time.removeAllEvents();

    // 2. Destroy movement system (kills all tweens from TweenX/TweenY)
    if (this.movementSystem) this.movementSystem.destroy();

    // 3. Destroy attack system (kills timers, zones, projectiles)
    if (this.attackSystem) this.attackSystem.destroy();

    // 4. Destroy status/terrain/shield systems
    if (this.statusEffectManager) this.statusEffectManager.destroy();
    if (this.terrainEffectManager) this.terrainEffectManager.destroy();
    if (this.terrainShieldSystem) this.terrainShieldSystem.destroy();

    // 5. Deactivate skill manager (cleans up orbiting fireball graphics, etc.)
    if (this.player && this.player.skillManager) {
      this.player.skillManager.deactivate();
    }

    // 6. Destroy all terrain tiles
    for (const tile of this.terrainTiles) {
      if (tile.graphics) tile.graphics.destroy();
    }
    this.terrainTiles = [];

    // 7. Destroy all enemies
    for (const enemy of this.enemies) {
      enemy.destroy();
    }
    this.enemies = [];

    // 8. Destroy player
    if (this.player) this.player.destroy();

    // 9. Destroy platform
    if (this.platform) this.platform.destroy();

    // 10. Destroy HP bars
    if (this.playerHPBar) this.playerHPBar.destroy();
    for (const bar of this.spriteHPBars) {
      bar.destroy();
    }
    this.spriteHPBars = [];

    // 11. Destroy grid & UI elements
    if (this.gridSystem) this.gridSystem.destroy();
    if (this.parryEffect) this.parryEffect.destroy();

    // 12. Kill all remaining tweens
    this.tweens.killAll();

    // 13. Remove all event listeners
    this.events.removeAllListeners();
  }

  togglePause() {
    this.gamePaused = !this.gamePaused;

    if (this.gamePaused) {
      // Pause all scene timers (attack timers, delayed calls)
      this.time.paused = true;

      // Show pause overlay — paper overlay
      this.pauseOverlay = this.add.graphics();
      this.pauseOverlay.fillStyle(0xf5f0e8, 0.7);
      this.pauseOverlay.fillRect(0, 0, CANVAS_WIDTH, ARENA_HEIGHT);
      this.pauseOverlay.setDepth(990);

      this.pauseText = this.add.text(CANVAS_WIDTH / 2, ARENA_HEIGHT / 2, 'PAUSED', {
        fontSize: '48px',
        color: '#222233',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        stroke: '#f5f0e8',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(991);
    } else {
      // Resume scene timers
      this.time.paused = false;

      if (this.pauseOverlay) { this.pauseOverlay.destroy(); this.pauseOverlay = null; }
      if (this.pauseText) { this.pauseText.destroy(); this.pauseText = null; }
    }
  }

  freezeGame() {
    this.frozen = true;
    this.gamePaused = false;
    this.time.paused = false;
    this.attackSystem.clearAll();
  }

  // ----------------------------------------------------------------
  // Reinforcement system
  // ----------------------------------------------------------------
  setupReinforcements(reinfDefs) {
    this.reinfRules = reinfDefs.map(r => ({ ...r, _triggerCount: 0 }));

    // Schedule timed reinforcements
    for (const rule of this.reinfRules) {
      if (rule.trigger === 'timed') {
        this.time.delayedCall(rule.timeMs, () => {
          this.fireReinforcement(rule);
        });
      }
    }
  }

  fireReinforcement(rule) {
    if (this.frozen) return;
    const max = rule.maxTriggers !== undefined ? rule.maxTriggers : 1;
    if (rule._triggerCount >= max) return;
    rule._triggerCount++;

    const count = Math.min(rule.spawnCount, rule.positions.length);
    for (let i = 0; i < count; i++) {
      const enemyData = this.cache.json.get(rule.spawnEnemyId);
      if (!enemyData) continue;
      const pos = rule.positions[i];
      const enemy = new Enemy(this, enemyData, pos);
      this.enemies.push(enemy);
      this.movementSystem.register(enemy, this.player, this);
      this.terrainShieldSystem.register(enemy);
      if (!enemyData.isBoss) {
        const bar = new SpriteHPBar(this, enemy, 0xee3333);
        this.spriteHPBars.push(bar);
      }
    }
    this.attackSystem.enemies = this.enemies;
    this.attackSystem.reschedule();
  }

  onEnemyDefeated(enemy) {
    this.defeatedEnemyIds.add(enemy.id);

    // Clean up status effects for dead enemy
    this.statusEffectManager.clearEnemy(enemy);

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

    // Check enemy_defeated reinforcements
    for (const rule of this.reinfRules) {
      if (rule.trigger === 'enemy_defeated' && rule.targetEnemyId === enemy.id) {
        const delay = rule.spawnAfterMs || 2000;
        this.time.delayedCall(delay, () => this.fireReinforcement(rule));
      }
    }
  }

  onBossPhaseChanged(enemy, newPhase) {
    for (const rule of this.reinfRules) {
      if (rule.trigger === 'boss_phase' && rule.bossId === enemy.id && rule.phase === newPhase) {
        const delay = rule.spawnAfterMs || 1000;
        this.time.delayedCall(delay, () => this.fireReinforcement(rule));
      }
    }
  }

  onTerrainDestroyed() {
    this.obstacleMap.rebuildFromTerrain(this.terrainTiles);
    this.movementSystem.invalidateAllPaths();
  }

  update(time, delta) {
    if (this.frozen) return;
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

    // Status effect system
    this.statusEffectManager.update(delta);

    // Terrain effect system (blaze/frost/electric tiles)
    this.terrainEffectManager.update(delta);

    // Terrain shield system (follow enemies)
    this.terrainShieldSystem.update();

    // Damage system
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

    // Win condition — all enemies dead AND no pending reinforcements
    const allDead = this.enemies.every(e => !e.alive);
    const pendingReinf = this.reinfRules.some(r => {
      const max = r.maxTriggers !== undefined ? r.maxTriggers : 1;
      return r._triggerCount < max;
    });
    if (allDead && !pendingReinf) {
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
    // Semi-transparent paper overlay
    const overlay = this.add.graphics().setDepth(994);
    overlay.fillStyle(0xf5f0e8, 0.75);
    overlay.fillRect(0, 0, CANVAS_WIDTH, ARENA_HEIGHT);

    const hex = '#' + color.toString(16).padStart(6, '0');
    this.endText = this.add.text(CANVAS_WIDTH / 2, ARENA_HEIGHT / 2, message, {
      fontSize: '48px',
      color: hex,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#f5f0e8',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(995);

    this.add.text(CANVAS_WIDTH / 2, ARENA_HEIGHT / 2 + 50, 'Press R to retry  |  Press M for menu', {
      fontSize: '15px',
      color: '#333344',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(995);

    this.input.keyboard.once('keydown-R', () => {
      this.scene.stop('UIScene');
      this.scene.restart({ mapId: this.selectedMapId, characterId: this.selectedCharacterId });
    });
    this.input.keyboard.once('keydown-M', () => {
      this.scene.stop('UIScene');
      this.scene.start('TitleScene');
    });
  }
}
