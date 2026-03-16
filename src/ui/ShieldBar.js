import HPBar from './HPBar.js';

export default class ShieldBar extends HPBar {
  constructor(scene, x, y, width, height) {
    super(scene, x, y, width, height, 0x3366aa, 'SHIELD', {
      bgColor: 0xddd8cc,
      borderColor: 0x222233,
      labelColor: '#3366aa'
    });
  }
}
