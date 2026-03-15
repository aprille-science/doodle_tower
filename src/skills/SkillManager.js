import { OrbitingFireballsPassive } from './implementations/OrbitingFireballsPassive.js';
import { MegaFireballActive } from './implementations/MegaFireballActive.js';

const PASSIVE_MAP = {
  orbiting_fireballs: OrbitingFireballsPassive
};

const ACTIVE_MAP = {
  mega_fireball: MegaFireballActive
};

export class SkillManager {
  constructor(player, scene, playerData) {
    this.player = player;
    this.scene = scene;
    this.passiveSkill = null;
    this.activeSkill = null;

    // Initialize passive
    if (playerData.passive) {
      const PassiveClass = PASSIVE_MAP[playerData.passive.type];
      if (PassiveClass) {
        this.passiveSkill = new PassiveClass(playerData.passive, player, scene);
        this.passiveSkill.activate();
      }
    }

    // Initialize active
    if (playerData.active) {
      const ActiveClass = ACTIVE_MAP[playerData.active.type];
      if (ActiveClass) {
        this.activeSkill = new ActiveClass(playerData.active, player, scene);
      }
    }

    // Wire F key
    const fKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    fKey.on('down', () => {
      if (this.activeSkill && this.activeSkill.isReady()) {
        const pointer = scene.input.activePointer;
        this.castActive(pointer.worldX, pointer.worldY);
      }
    });
  }

  castActive(worldX, worldY) {
    if (this.activeSkill) {
      this.activeSkill.cast(worldX, worldY);
    }
  }

  update(dt) {
    if (this.passiveSkill) this.passiveSkill.update(dt);
    if (this.activeSkill) this.activeSkill.update(dt);
  }

  getActiveCooldownPercent() {
    if (this.activeSkill) return this.activeSkill.getCooldownPercent();
    return 0;
  }

  isActiveReady() {
    if (this.activeSkill) return this.activeSkill.isReady();
    return false;
  }

  getActiveCooldownRemaining() {
    if (this.activeSkill) return Math.max(0, this.activeSkill.cooldownRemaining);
    return 0;
  }

  deactivate() {
    if (this.passiveSkill) this.passiveSkill.deactivate();
  }
}
