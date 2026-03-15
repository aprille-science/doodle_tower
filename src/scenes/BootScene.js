import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Load JSON data assets
    this.load.json('player_default', 'src/data/players/player_default.json');

    // Enemies
    this.load.json('boss_01', 'src/data/enemies/boss_01.json');
    this.load.json('wanderer_01', 'src/data/enemies/wanderer_01.json');
    this.load.json('dancer_01', 'src/data/enemies/dancer_01.json');
    this.load.json('hunter_01', 'src/data/enemies/hunter_01.json');
    this.load.json('guardian_01', 'src/data/enemies/guardian_01.json');
    this.load.json('berserker_01', 'src/data/enemies/berserker_01.json');

    // Attack patterns
    this.load.json('pattern_stomp', 'src/data/attack_patterns/pattern_stomp.json');
    this.load.json('pattern_laser', 'src/data/attack_patterns/pattern_laser.json');
    this.load.json('pattern_spread', 'src/data/attack_patterns/pattern_spread.json');
    this.load.json('pattern_wanderer_stomp', 'src/data/attack_patterns/pattern_wanderer_stomp.json');
    this.load.json('pattern_dancer_spread', 'src/data/attack_patterns/pattern_dancer_spread.json');
    this.load.json('pattern_laser_aimed', 'src/data/attack_patterns/pattern_laser_aimed.json');
    this.load.json('pattern_radial', 'src/data/attack_patterns/pattern_radial.json');
    this.load.json('pattern_berserker_spread', 'src/data/attack_patterns/pattern_berserker_spread.json');
    this.load.json('pattern_shockwave', 'src/data/attack_patterns/pattern_shockwave.json');

    // Map
    this.load.json('map_01', 'src/data/maps/map_01.json');

    // Loading text
    this.add.text(400, 480, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);
  }

  create() {
    this.scene.start('GameScene');
  }
}
