import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

const config = {
  type: Phaser.WEBGL,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  parent: document.body,
  backgroundColor: '#1a1a2e',
  scene: [BootScene, GameScene, UIScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  audio: {
    disableWebAudio: false
  }
};

const game = new Phaser.Game(config);
