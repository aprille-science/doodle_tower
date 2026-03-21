import {
  PARRY_WINDOW_MS, PARRY_SLOWDOWN_SCALE, PARRY_SLOWDOWN_DURATION_MS,
  SHIELD_BREAK_LOCKOUT_MS
} from '../constants.js';

export default class ShieldSystem {
  constructor(scene, player, parryEffect) {
    this.scene = scene;
    this.player = player;
    this.parryEffect = parryEffect;
    this.slowmoTimer = 0;
    this.slowmoActive = false;

    // G key input for shield
    scene.input.keyboard.on('keydown-G', () => {
      this.onShieldActivate();
    });

    scene.input.keyboard.on('keyup-G', () => {
      this.player.deactivateShield();
    });
  }

  onShieldActivate() {
    if (this.player.shieldLockoutTimer > 0) return;
    this.player.activateShield();
    this.player.parryWindowTimer = PARRY_WINDOW_MS;
  }

  checkParry() {
    if (this.player.isInParryWindow() && this.player.shieldActive) {
      this.triggerParry();
      return true;
    }
    return false;
  }

  triggerParry() {
    this.player.parryWindowTimer = 0;

    // Slow-mo effect
    this.scene.time.timeScale = PARRY_SLOWDOWN_SCALE;
    this.slowmoActive = true;
    this.slowmoTimer = PARRY_SLOWDOWN_DURATION_MS;

    // Parry visual + sound
    this.parryEffect.trigger(this.player.x, this.player.y);

    // Play parry sound (generated tone)
    this.playParrySound();
  }

  playParrySound() {
    try {
      const audioCtx = this.scene.sound.context;
      if (!audioCtx) return;

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.05);
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.15);

      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      // Audio may not be available
    }
  }

  update(delta) {
    // Handle shield break lockout
    if (this.player.shieldBroken && this.player.shieldActive) {
      this.player.deactivateShield();
      this.player.shieldLockoutTimer = SHIELD_BREAK_LOCKOUT_MS;
      this.player.shieldBroken = false;
    }

    // Handle slow-mo recovery
    if (this.slowmoActive) {
      this.slowmoTimer -= delta; // Use real delta, not scaled
      if (this.slowmoTimer <= 0) {
        this.scene.time.timeScale = 1.0;
        this.slowmoActive = false;
      }
    }
  }
}
