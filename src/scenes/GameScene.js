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
import { TeamState } from '../systems/TeamState.js';

const SWAP_KEYS = ['H', 'J', 'K', 'L'];
const DEATH_DELAY_MS = 500;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.selectedMapId = (data && data.mapId) || 'map_01';
    // Accept team data array
    if (data && data.teamData && data.teamData.length > 0) {
      this.teamDataArray = data.teamData;
    } else {
      // Fallback: single character
      const charId = (data && data.characterId) || this.registry.get('selectedCharacter') || 'player_default';
      const charData = this.cache.json.get(charId);
      this.teamDataArray = charData ? [charData] : [];
    }
  }

  create() {
    const mapData = this.cache.json.get(this.selectedMapId);

    // Load all attack pattern cache
    this.patternCache = {};
    const patternIds = [
      'pattern_stomp', 'pattern_laser', 'pattern_spread',
      'pattern_wanderer_stomp', 'pattern_dancer_spread',
      'pattern_laser_aimed', 'pattern_radial',
      'pattern_berserker_spread', 'pattern_shockwave'
    ];
    for (const id of patternIds) {
      const d = this.cache.json.get(id);
      if (d) this.patternCache[id] = d;
    }

    // Initialize grid
    this.gridSystem = new GridSystem(this);

    // Create terrain tiles
    this.terrainTiles = [];
    for (const terrainDef of mapData.initialTerrain) {
      for (const cell of terrainDef.cells) {
        const tile = new TerrainTile(this, {
          col: cell.col, row: cell.row,
          type: terrainDef.type, hp: terrainDef.hp,
          damage: terrainDef.damage, bouncePlayer: terrainDef.bouncePlayer,
          passthrough: terrainDef.passthrough, color: terrainDef.color
        });
        this.terrainTiles.push(tile);
      }
    }

    // Create platform
    this.platform = new Platform(this);

    // Initialize TeamState
    this.teamState = new TeamState(this.teamDataArray);

    // Spawn the first character as active player
    const firstSlot = this.teamState.slots.find(s => s);
    if (firstSlot) {
      this.teamState.setActive(firstSlot.slotIndex);
      this.player = this.spawnPlayer(firstSlot);
    }

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

    // Initialize terrain effect system
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

    // Launch UI scene
    this.scene.launch('UIScene', {
      player: this.player,
      enemies: this.enemies,
      teamState: this.teamState
    });

    // Send initial boss HP
    for (const enemy of this.enemies) {
      if (enemy.data.isBoss) {
        this.time.delayedCall(100, () => {
          const uiScene = this.scene.get('UIScene');
          if (uiScene) uiScene.events.emit('bossHPChanged', {
            name: enemy.name, hp: enemy.hp, maxHp: enemy.maxHp, damageTaken: 0
          });
        });
      }
    }

    // Wire game events
    this.events.on('chargeHitWall', (data) => {
      this.attackSystem.spawnShockwaveAtPoint(data.impactX, data.impactY, data.enemy);
    });

    this.events.on('tweenCycleComplete', (data) => {
      const enemy = data.enemy;
      if (!enemy.alive) return;
      if (this.statusEffectManager.isFrozen(enemy)) return;
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
      if (enemy.data.isBoss) {
        const uiScene = this.scene.get('UIScene');
        if (uiScene) uiScene.events.emit('bossHPChanged', {
          name: enemy.name, hp: enemy.hp, maxHp: enemy.maxHp, damageTaken: dmg || 0
        });
      }
    });

    this.events.on('phaseTransition', (data) => {
      this.movementSystem.onPhaseEnter(data.enemy);
      this.onBossPhaseChanged(data.enemy, data.phase);
    });

    // Listen for portrait click swaps from UIScene
    this.events.on('requestSwap', (slotIndex) => {
      this.attemptSwap(slotIndex, false);
    });

    // Game state
    this.gameOver = false;
    this.gameWon = false;
    this.gamePaused = false;
    this.frozen = false;
    this.endText = null;
    this.pauseOverlay = null;
    this.pauseText = null;
    this.pauseQuitText = null;
    this.pauseHintText = null;
    this.deathSwapPending = false;

    // ESC key for pause
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.frozen) return;
      this.togglePause();
    });

    // Swap keys: H=0, J=1, K=2, L=3
    for (let i = 0; i < SWAP_KEYS.length; i++) {
      this.input.keyboard.on(`keydown-${SWAP_KEYS[i]}`, () => {
        if (this.frozen || this.gamePaused) return;
        this.attemptSwap(i, false);
      });
    }

    // Clean up on shutdown
    this.events.once('shutdown', () => this.cleanup());
  }

  // ----------------------------------------------------------------
  // Player spawn/swap
  // ----------------------------------------------------------------
  spawnPlayer(charState, position) {
    const data = charState.data;
    const player = new Player(this, data);

    // Restore preserved state
    player.hp = charState.hp;
    player.shieldHP = charState.shieldHP;
    player.shieldBroken = charState.shieldBroken;
    player.shieldLockoutTimer = charState.shieldLockoutRemaining;
    player.damageReduction = charState.damageReduction;

    // Position
    if (position) {
      player.x = position.x;
      player.y = position.y;
      if (position.vx !== undefined) player.vx = position.vx;
      if (position.vy !== undefined) player.vy = position.vy;
    } else if (charState.lastPosition) {
      player.x = charState.lastPosition.x;
      player.y = charState.lastPosition.y;
      player.vx = charState.lastPosition.vx;
      player.vy = charState.lastPosition.vy;
    }
    // else default position from Player constructor

    // Initialize skill manager
    player.skillManager = new SkillManager(player, this, data);

    // Sync cooldown from TeamState
    if (player.skillManager.activeSkill) {
      player.skillManager.activeSkill.cooldownRemaining = charState.activeCooldownRemaining;
    }

    return player;
  }

  attemptSwap(slotIndex, isAutoSwap) {
    if (this.frozen || this.deathSwapPending) return;

    // Manual swap checks
    if (!isAutoSwap) {
      if (this.teamState.isSwapOnCooldown()) return;
      // Queue during slow-mo
      if (this.shieldSystem.slowmoActive) {
        this.teamState.queuedSwapIndex = slotIndex;
        return;
      }
    }

    if (!this.teamState.canSwapTo(slotIndex)) return;

    this.executeSwap(slotIndex, isAutoSwap);
  }

  executeSwap(slotIndex, isAutoSwap) {
    const outgoing = this.teamState.getActiveState();

    // Save outgoing character state
    if (outgoing && this.player) {
      this.teamState.saveOutgoing(this.player);

      // Save active skill cooldown
      if (this.player.skillManager && this.player.skillManager.activeSkill) {
        outgoing.activeCooldownRemaining = this.player.skillManager.activeSkill.cooldownRemaining;
      }

      // Cancel parry window
      this.player.parryWindowTimer = 0;

      // Clean up passive skill
      if (this.player.skillManager) {
        this.player.skillManager.deactivate();
      }

      // Destroy old player
      if (this.playerHPBar) {
        this.playerHPBar.destroy();
        this.playerHPBar = null;
      }
      this.player.destroy();
      this.player = null;
    }

    // Set new active
    this.teamState.setActive(slotIndex);
    const incoming = this.teamState.getActiveState();

    // Spawn new player — use outgoing position if incoming has no saved position
    if (!incoming.lastPosition && outgoing && outgoing.lastPosition) {
      incoming.lastPosition = { ...outgoing.lastPosition };
    }
    this.player = this.spawnPlayer(incoming);

    // Auto-swap from death: grant invincibility
    if (isAutoSwap) {
      this.player.invulnTimer = 500;
    }

    // Start swap cooldown (manual only)
    if (!isAutoSwap) {
      this.teamState.startSwapCooldown();
    }

    // Create new player HP bar
    this.playerHPBar = new SpriteHPBar(this, this.player, 0x338833);

    // Update references in systems
    this.shieldSystem.player = this.player;
    this.damageSystem.player = this.player;

    // Re-register player with movement system for enemy targeting
    for (const enemy of this.enemies) {
      if (enemy._movementBehavior) {
        enemy._movementTarget = this.player;
      }
    }

    // Notify UIScene
    const uiScene = this.scene.get('UIScene');
    if (uiScene) {
      uiScene.events.emit('teamSwap', {
        player: this.player,
        teamState: this.teamState,
        activeSlot: slotIndex
      });
    }
  }

  // ----------------------------------------------------------------
  // Pause
  // ----------------------------------------------------------------
  togglePause() {
    this.gamePaused = !this.gamePaused;

    if (this.gamePaused) {
      this.time.paused = true;
      this.pauseOverlay = this.add.graphics();
      this.pauseOverlay.fillStyle(0xf5f0e8, 0.7);
      this.pauseOverlay.fillRect(0, 0, CANVAS_WIDTH, ARENA_HEIGHT);
      this.pauseOverlay.setDepth(990);

      this.pauseText = this.add.text(CANVAS_WIDTH / 2, ARENA_HEIGHT / 2 - 20, 'PAUSED', {
        fontSize: '48px', color: '#222233', fontFamily: 'monospace', fontStyle: 'bold',
        stroke: '#f5f0e8', strokeThickness: 3
      }).setOrigin(0.5).setDepth(991);

      this.pauseHintText = this.add.text(CANVAS_WIDTH / 2, ARENA_HEIGHT / 2 + 30, 'Press ESC to resume', {
        fontSize: '14px', color: '#555566', fontFamily: 'monospace'
      }).setOrigin(0.5).setDepth(991);

      this.pauseQuitText = this.add.text(CANVAS_WIDTH / 2, ARENA_HEIGHT / 2 + 60, '[ QUIT ]', {
        fontSize: '18px', color: '#cc3333', fontFamily: 'monospace', fontStyle: 'bold',
        stroke: '#f5f0e8', strokeThickness: 2
      }).setOrigin(0.5).setDepth(991).setInteractive({ useHandCursor: true });

      this.pauseQuitText.on('pointerover', () => this.pauseQuitText.setColor('#ff4444'));
      this.pauseQuitText.on('pointerout', () => this.pauseQuitText.setColor('#cc3333'));
      this.pauseQuitText.on('pointerdown', () => {
        this.scene.stop('UIScene');
        this.scene.start('MapSelectScene');
      });
    } else {
      this.time.paused = false;
      if (this.pauseOverlay) { this.pauseOverlay.destroy(); this.pauseOverlay = null; }
      if (this.pauseText) { this.pauseText.destroy(); this.pauseText = null; }
      if (this.pauseQuitText) { this.pauseQuitText.destroy(); this.pauseQuitText = null; }
      if (this.pauseHintText) { this.pauseHintText.destroy(); this.pauseHintText = null; }
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
    for (const rule of this.reinfRules) {
      if (rule.trigger === 'timed') {
        this.time.delayedCall(rule.timeMs, () => this.fireReinforcement(rule));
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
    this.statusEffectManager.clearEnemy(enemy);

    if (enemy.data.isBoss) {
      const uiScene = this.scene.get('UIScene');
      if (uiScene) uiScene.events.emit('bossHPChanged', {
        name: enemy.name, hp: 0, maxHp: enemy.maxHp, damageTaken: 0
      });
    }

    for (let i = this.spriteHPBars.length - 1; i >= 0; i--) {
      if (this.spriteHPBars[i].entity === enemy) {
        this.spriteHPBars[i].destroy();
        this.spriteHPBars.splice(i, 1);
        break;
      }
    }

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

  // ----------------------------------------------------------------
  // Update
  // ----------------------------------------------------------------
  update(time, delta) {
    if (this.frozen) return;
    if (this.gamePaused) return;

    // Tick team cooldowns (all characters, not just active)
    this.teamState.tickCooldowns(delta);
    this.teamState.tickSwapCooldown(delta);

    // Sync active character's cooldown back to TeamState
    const activeState = this.teamState.getActiveState();
    if (activeState && this.player && this.player.skillManager && this.player.skillManager.activeSkill) {
      activeState.activeCooldownRemaining = this.player.skillManager.activeSkill.cooldownRemaining;
    }

    // Check for queued swap (after slow-mo ends)
    if (this.teamState.queuedSwapIndex >= 0 && !this.shieldSystem.slowmoActive) {
      const qi = this.teamState.queuedSwapIndex;
      this.teamState.queuedSwapIndex = -1;
      this.attemptSwap(qi, false);
    }

    // Update platform
    this.platform.update(delta);

    // Update player
    if (this.player && this.player.alive) {
      this.player.update(delta);
      this.player.skillManager.update(delta);

      // Sync active skill cooldown TO teamState each frame so benched ticking stays in sync
      if (activeState && this.player.skillManager.activeSkill) {
        activeState.activeCooldownRemaining = this.player.skillManager.activeSkill.cooldownRemaining;
      }

      // Keep TeamState HP in sync
      if (activeState) {
        activeState.hp = this.player.hp;
        activeState.shieldHP = this.player.shieldHP;
      }
    }

    // Physics
    if (this.player && this.player.alive) {
      this.physicsSystem.updatePlayer(this.player, this.platform, this.terrainTiles);

      for (const enemy of this.enemies) {
        if (enemy.alive) {
          this.physicsSystem.checkPlayerEnemyCollision(this.player, enemy);
        }
        enemy.update(delta);
      }
    } else {
      for (const enemy of this.enemies) {
        enemy.update(delta);
      }
    }

    // Movement system
    this.movementSystem.update(delta, this.enemies, this.player, this);

    // Attack system
    this.attackSystem.update(delta);

    // Status effect system
    this.statusEffectManager.update(delta);

    // Terrain effect system
    this.terrainEffectManager.update(delta);

    // Terrain shield system
    this.terrainShieldSystem.update();

    // Damage system
    this.damageSystem.update(
      this.terrainTiles,
      this.attackSystem.attackZones,
      this.attackSystem.projectiles,
      this.physicsSystem,
      this.enemies
    );

    // Terrain changes
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
    if (this.playerHPBar) this.playerHPBar.update();
    for (const bar of this.spriteHPBars) {
      bar.update();
    }

    // Parry effect
    this.parryEffect.update(delta);

    // Emit team update to UIScene each frame
    const uiScene = this.scene.get('UIScene');
    if (uiScene) {
      uiScene.events.emit('teamUpdate', {
        teamState: this.teamState,
        player: this.player
      });
    }

    // Win condition
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

    // Lose condition: active character died
    if (this.player && !this.player.alive && !this.deathSwapPending) {
      this.handleActiveCharacterDeath();
    }
  }

  // ----------------------------------------------------------------
  // Death & auto-swap
  // ----------------------------------------------------------------
  handleActiveCharacterDeath() {
    this.teamState.faintActive();

    // Notify UIScene of faint
    const uiScene = this.scene.get('UIScene');
    if (uiScene) {
      uiScene.events.emit('characterFainted', { slotIndex: this.teamState.activeSlotIndex });
    }

    // Check if team is wiped
    if (this.teamState.isTeamWiped()) {
      this.gameOver = true;
      this.freezeGame();
      this.showEndText('GAME OVER', 0xff0000);
      return;
    }

    // Auto-swap with delay
    this.deathSwapPending = true;

    this.time.delayedCall(DEATH_DELAY_MS, () => {
      this.deathSwapPending = false;
      const nextSlot = this.teamState.getNextLivingSlotIndex();
      if (nextSlot >= 0) {
        this.executeSwap(nextSlot, true);
      } else {
        this.gameOver = true;
        this.freezeGame();
        this.showEndText('GAME OVER', 0xff0000);
      }
    });
  }

  // ----------------------------------------------------------------
  // End text
  // ----------------------------------------------------------------
  showEndText(message, color) {
    const overlay = this.add.graphics().setDepth(994);
    overlay.fillStyle(0xf5f0e8, 0.75);
    overlay.fillRect(0, 0, CANVAS_WIDTH, ARENA_HEIGHT);

    const hex = '#' + color.toString(16).padStart(6, '0');
    this.endText = this.add.text(CANVAS_WIDTH / 2, ARENA_HEIGHT / 2, message, {
      fontSize: '48px', color: hex, fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#f5f0e8', strokeThickness: 3
    }).setOrigin(0.5).setDepth(995);

    this.add.text(CANVAS_WIDTH / 2, ARENA_HEIGHT / 2 + 50, 'Press R to retry  |  Press M for menu', {
      fontSize: '15px', color: '#333344', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(995);

    this.input.keyboard.once('keydown-R', () => {
      this.scene.stop('UIScene');
      this.scene.restart({ mapId: this.selectedMapId, teamData: this.teamDataArray });
    });
    this.input.keyboard.once('keydown-M', () => {
      this.scene.stop('UIScene');
      this.scene.start('MapSelectScene');
    });
  }

  // ----------------------------------------------------------------
  // Cleanup
  // ----------------------------------------------------------------
  cleanup() {
    this.time.removeAllEvents();
    if (this.movementSystem) this.movementSystem.destroy();
    if (this.attackSystem) this.attackSystem.destroy();
    if (this.statusEffectManager) this.statusEffectManager.destroy();
    if (this.terrainEffectManager) this.terrainEffectManager.destroy();
    if (this.terrainShieldSystem) this.terrainShieldSystem.destroy();

    if (this.player && this.player.skillManager) {
      this.player.skillManager.deactivate();
    }

    for (const tile of this.terrainTiles) {
      if (tile.graphics) tile.graphics.destroy();
    }
    this.terrainTiles = [];

    for (const enemy of this.enemies) {
      enemy.destroy();
    }
    this.enemies = [];

    if (this.player) this.player.destroy();
    if (this.platform) this.platform.destroy();
    if (this.playerHPBar) this.playerHPBar.destroy();
    for (const bar of this.spriteHPBars) {
      bar.destroy();
    }
    this.spriteHPBars = [];
    if (this.gridSystem) this.gridSystem.destroy();
    if (this.parryEffect) this.parryEffect.destroy();
    this.tweens.killAll();

    this.events.off('chargeHitWall');
    this.events.off('tweenCycleComplete');
    this.events.off('enemyDamaged');
    this.events.off('phaseTransition');
    this.events.off('requestSwap');
    this.input.keyboard.removeAllListeners();
  }
}
