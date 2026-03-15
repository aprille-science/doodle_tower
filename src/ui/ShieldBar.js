import HPBar from './HPBar.js';

export default class ShieldBar extends HPBar {
  constructor(scene, x, y, width, height) {
    super(scene, x, y, width, height, 0x4488ff, 'SHIELD', {
      bgColor: 0x222244,
      borderColor: 0x4466aa,
      labelColor: '#4488ff'
    });
  }
}
