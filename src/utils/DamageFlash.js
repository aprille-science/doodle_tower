export function flashDamageTint(entity, scene) {
  if (!entity || !entity.alive) return;
  if (scene.time.timeScale < 0.5) return;

  entity._damageFlash = true;
  scene.time.delayedCall(80, () => {
    if (entity) entity._damageFlash = false;
  });
}
