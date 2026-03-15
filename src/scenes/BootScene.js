import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Load JSON data assets
    this.load.json('player_default', 'src/data/players/player_default.json');
    this.load.json('boss_01', 'src/data/enemies/boss_01.json');
    this.load.json('pattern_stomp', 'src/data/attack_patterns/pattern_stomp.json');
    this.load.json('pattern_laser', 'src/data/attack_patterns/pattern_laser.json');
    this.load.json('pattern_spread', 'src/data/attack_patterns/pattern_spread.json');
    this.load.json('map_01', 'src/data/maps/map_01.json');

    // Create placeholder textures
    const playerGfx = this.make.graphics({ add: false });
    playerGfx.fillStyle(0xffffff, 1);
    playerGfx.fillCircle(12, 12, 12);
    playerGfx.generateTexture('player_tex', 24, 24);
    playerGfx.destroy();

    const platformGfx = this.make.graphics({ add: false });
    platformGfx.fillStyle(0xaaaaaa, 1);
    platformGfx.fillRoundedRect(0, 0, 134, 12, 4);
    platformGfx.generateTexture('platform_tex', 134, 12);
    platformGfx.destroy();

    // Loading text
    const text = this.add.text(400, 480, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);
  }

  create() {
    this.scene.start('GameScene');
  }
}
