export class BasePassiveSkill {
  constructor(config, player, scene) {
    this.config = config;
    this.player = player;
    this.scene = scene;
  }

  activate() {}
  update(dt) {}
  deactivate() {}
}
