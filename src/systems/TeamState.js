import { CANVAS_WIDTH, ARENA_HEIGHT } from '../constants.js';

const SWAP_COOLDOWN_MS = 5000;

class CharacterState {
  constructor(data, slotIndex) {
    this.id = data.id;
    this.data = data;
    this.slotIndex = slotIndex;
    this.hp = data.hp;
    this.maxHp = data.hp;
    this.shieldHP = data.shieldHP;
    this.maxShieldHP = data.shieldHP;
    this.shieldBroken = false;
    this.shieldLockoutRemaining = 0;
    this.activeCooldownRemaining = data.active ? data.active.cooldownMs : 0;
    // Start with cooldown ready (0)
    this.activeCooldownRemaining = 0;
    this.fainted = false;
    this.isActive = false;
    this.lastPosition = null; // { x, y, vx, vy } — null means first time
    this.damageReduction = 1;
  }
}

export class TeamState {
  constructor(teamDataArray) {
    this.slots = [];
    for (let i = 0; i < 4; i++) {
      if (i < teamDataArray.length) {
        this.slots.push(new CharacterState(teamDataArray[i], i));
      } else {
        this.slots.push(null); // empty slot
      }
    }
    this.activeSlotIndex = -1;
    this.swapCooldownRemaining = 0;
    this.queuedSwapIndex = -1;
  }

  getActiveState() {
    if (this.activeSlotIndex < 0) return null;
    return this.slots[this.activeSlotIndex];
  }

  getLivingStates() {
    return this.slots.filter(s => s && !s.fainted);
  }

  getAllFilledSlots() {
    return this.slots.filter(s => s !== null);
  }

  setActive(slotIndex) {
    // Deactivate current
    for (const s of this.slots) {
      if (s) s.isActive = false;
    }
    this.activeSlotIndex = slotIndex;
    if (this.slots[slotIndex]) {
      this.slots[slotIndex].isActive = true;
    }
  }

  startSwapCooldown() {
    this.swapCooldownRemaining = SWAP_COOLDOWN_MS;
  }

  isSwapOnCooldown() {
    return this.swapCooldownRemaining > 0;
  }

  canSwapTo(slotIndex) {
    const slot = this.slots[slotIndex];
    if (!slot) return false;
    if (slot.fainted) return false;
    if (slotIndex === this.activeSlotIndex) return false;
    return true;
  }

  // Save the outgoing player's state
  saveOutgoing(player) {
    const state = this.getActiveState();
    if (!state) return;
    state.hp = player.hp;
    state.shieldHP = player.shieldHP;
    state.shieldBroken = player.shieldBroken;
    state.shieldLockoutRemaining = player.shieldLockoutTimer;
    state.damageReduction = player.damageReduction;
    state.lastPosition = {
      x: player.x,
      y: player.y,
      vx: player.vx,
      vy: player.vy
    };
  }

  // Mark the active character as fainted
  faintActive() {
    const state = this.getActiveState();
    if (state) {
      state.fainted = true;
      state.hp = 0;
    }
  }

  // Find next living character for auto-swap
  getNextLivingSlotIndex() {
    for (let i = 0; i < 4; i++) {
      const s = this.slots[i];
      if (s && !s.fainted && i !== this.activeSlotIndex) {
        return i;
      }
    }
    return -1;
  }

  isTeamWiped() {
    return this.slots.every(s => !s || s.fainted);
  }

  // Tick all non-fainted characters' cooldowns
  tickCooldowns(dt) {
    for (const s of this.slots) {
      if (!s || s.fainted) continue;
      if (s.activeCooldownRemaining > 0) {
        s.activeCooldownRemaining -= dt;
        if (s.activeCooldownRemaining < 0) s.activeCooldownRemaining = 0;
      }
    }
  }

  // Tick swap cooldown
  tickSwapCooldown(dt) {
    if (this.swapCooldownRemaining > 0) {
      this.swapCooldownRemaining -= dt;
      if (this.swapCooldownRemaining < 0) this.swapCooldownRemaining = 0;
    }
  }

  getSwapCooldownPercent() {
    return this.swapCooldownRemaining / SWAP_COOLDOWN_MS;
  }

  // Default spawn point
  static getDefaultSpawn() {
    return { x: CANVAS_WIDTH / 2, y: ARENA_HEIGHT - 100 };
  }
}
