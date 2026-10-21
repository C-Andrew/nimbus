import { spawnEnemiesEffect } from './spawn-enemies.js';
export const DEATH_EFFECTS = Object.freeze({ 'spawn-enemies': spawnEnemiesEffect });
export function deathEffect(definition) {
  const effect = DEATH_EFFECTS[definition.type];
  if (!effect || !Object.hasOwn(DEATH_EFFECTS, definition.type)) throw new Error(`Unsupported death effect: ${definition.type}`);
  return effect;
}
