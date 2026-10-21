import { validateSpawnPhases } from './spawn-schedule.js';
import { validateXpReward } from './enemy-rewards.js';
import { ENEMY_BEHAVIORS } from './enemy-behaviors.js';

export async function loadEnemyCatalog() {
  const response = await fetch(new URL('../../data/enemies.json', import.meta.url));
  if (!response.ok) throw new Error(`Enemy catalog failed to load: ${response.status}`);
  const enemyCatalog = await response.json();
  if (enemyCatalog.schemaVersion !== 1 || !Array.isArray(enemyCatalog.enemies)) throw new Error('Invalid enemy catalog');
  const definitions = new Map();
  const colorValue = value => Number.parseInt(value.slice(1), 16);
  for (const enemy of enemyCatalog.enemies) {
    if (!enemy.id || !enemy.name || definitions.has(enemy.id)) throw new Error('Invalid or duplicate enemy ID');
    validateXpReward(enemy.rewards?.xp);
    const a = enemy.appearance;
    if (!Object.hasOwn(ENEMY_BEHAVIORS, enemy.behavior?.type) || !['circle','rectangle','triangle'].includes(a?.shape)) throw new Error(`Unsupported enemy behavior: ${enemy.id}`);
    if (!Number.isInteger(enemy.stats?.maxHitpoints) || enemy.stats.maxHitpoints <= 0) throw new Error(`Invalid hitpoints: ${enemy.id}`);
    if (!Number.isInteger(enemy.stats.baseDamage) || enemy.stats.baseDamage < 0) throw new Error(`Invalid base damage: ${enemy.id}`);
    if (!Number.isFinite(enemy.stats.movementSpeedPixelsPerSecond) || enemy.stats.movementSpeedPixelsPerSecond < 0) throw new Error(`Invalid movement speed: ${enemy.id}`);
    for (const key of [...(a.shape === 'circle' ? ['radiusPixels'] : ['widthPixels','heightPixels']), 'hitpointFontSizePixels']) {
      if (!Number.isFinite(a[key]) || a[key] <= 0) throw new Error(`Invalid ${key}: ${enemy.id}`);
    }
    if (!Number.isFinite(a.strokeWidthPixels) || a.strokeWidthPixels < 0 || typeof a.showHitpoints !== 'boolean') throw new Error(`Invalid appearance: ${enemy.id}`);
    for (const key of ['color', 'strokeColor', 'hitpointTextColor']) {
      if (!/^#[0-9a-f]{6}$/i.test(a[key])) throw new Error(`Invalid ${key}: ${enemy.id}`);
    }
    definitions.set(enemy.id, enemy);
  }
  for (const enemy of definitions.values()) {
    const effect=enemy.onDeath;
    if(effect && (effect.type!=='spawn-enemies' || !definitions.has(effect.enemyTypeId)
      || effect.enemyTypeId===enemy.id || !Number.isSafeInteger(effect.count) || effect.count<1 || effect.count>32
      || !Number.isFinite(effect.radiusPixels) || effect.radiusPixels<=0)) throw new Error(`Invalid death effect: ${enemy.id}`);
  }
  const readySpawnConfig = enemyCatalog.readySpawn;
  if (!definitions.has(readySpawnConfig?.enemyTypeId) || !Number.isFinite(readySpawnConfig.offsetXPixels) || !Number.isFinite(readySpawnConfig.offsetYPixels)) throw new Error('Invalid Ready spawn configuration');
  const spawnConfig = enemyCatalog.spawner;
  if (!definitions.has(spawnConfig?.enemyTypeId) || !Number.isFinite(spawnConfig.intervalMs) || spawnConfig.intervalMs <= 0 || typeof spawnConfig.spawnImmediately !== 'boolean' || !Number.isFinite(spawnConfig.minimumDistanceScreenWidthRatio) || spawnConfig.minimumDistanceScreenWidthRatio < 0) throw new Error('Invalid enemy spawner configuration');

  if (!Array.isArray(spawnConfig.tables) || !spawnConfig.tables.length) throw new Error('Missing enemy spawn tables');
  if (!Number.isFinite(spawnConfig.offscreenMarginPixels) || spawnConfig.offscreenMarginPixels <= 0) throw new Error('Invalid offscreen spawn margin');
  const tableIds=new Set();
  for(const table of spawnConfig.tables) {
    if(typeof table.id!=='string'||!table.id||tableIds.has(table.id)||!definitions.has(table.enemyTypeId)||!Number.isSafeInteger(table.intervalMs)||table.intervalMs<=0)throw new Error('Invalid enemy spawn table');
    tableIds.add(table.id);
    validateSpawnPhases(table.phases);
  }
  return { ...enemyCatalog, definitions };
}
