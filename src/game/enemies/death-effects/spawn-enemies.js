export const spawnEnemiesEffect = Object.freeze({
  validate(effect, definitions, parentId) {
    if (!definitions.has(effect.enemyTypeId) || effect.enemyTypeId === parentId
      || !Number.isSafeInteger(effect.count) || effect.count < 1 || effect.count > 32
      || !Number.isFinite(effect.radiusPixels) || effect.radiusPixels <= 0) throw new Error(`Invalid death spawn: ${parentId}`);
  },
  apply(effect, { spawn, x, y }) {
    const rotation = Math.random() * Math.PI * 2;
    for (let i = 0; i < effect.count; i++) {
      const angle = rotation + i * Math.PI * 2 / effect.count;
      spawn(effect.enemyTypeId, { x: x + Math.cos(angle) * effect.radiusPixels, y: y + Math.sin(angle) * effect.radiusPixels });
    }
  },
});
