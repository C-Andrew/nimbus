import { loadManifest, readContent, definitionMap } from '../../content/content-loader.js';
import { deathEffect } from './death-effects/registry.js';
import { validateSpawnPhases } from './spawn-schedule.js';
import { validateXpReward } from './enemy-rewards.js';
import { ENEMY_BEHAVIORS } from './enemy-behaviors.js';

export function validateEnemyCatalog(enemyCatalog) {
  if (enemyCatalog.schemaVersion !== 1 || !Array.isArray(enemyCatalog.enemies)) throw new Error('Invalid enemy catalog');
  const definitions = definitionMap(enemyCatalog.enemies, enemy => {
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
  });
  for (const enemy of definitions.values()) {
    const effect=enemy.onDeath;
    if (effect) deathEffect(effect).validate(effect, definitions, enemy.id);
  }
  const readySpawnConfig = enemyCatalog.readySpawn;
  if (!definitions.has(readySpawnConfig?.enemyTypeId) || !Array.isArray(readySpawnConfig.positions) || !readySpawnConfig.positions.length || !readySpawnConfig.positions.every(position => Number.isFinite(position?.offsetXPixels) && Number.isFinite(position?.offsetYPixels))) throw new Error('Invalid Ready spawn configuration');
  const spawnConfig = enemyCatalog.spawner;
  if (!definitions.has(spawnConfig?.enemyTypeId) || !Number.isFinite(spawnConfig.intervalMs) || spawnConfig.intervalMs <= 0 || typeof spawnConfig.spawnImmediately !== 'boolean' || !Number.isFinite(spawnConfig.minimumDistanceScreenWidthRatio) || spawnConfig.minimumDistanceScreenWidthRatio < 0) throw new Error('Invalid enemy spawner configuration');

  if (!Number.isSafeInteger(spawnConfig.maxActiveEnemies) || spawnConfig.maxActiveEnemies < 1 || spawnConfig.maxActiveEnemies > 10000) throw new Error('Invalid active enemy limit');
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

export async function loadEnemyCatalog() {
  const [{ entries }, encounter] = await Promise.all([
    loadManifest(new URL('../../content/enemies/index.json', import.meta.url)),
    readContent(new URL('../../content/encounters/default.json', import.meta.url)),
  ]);
  return validateEnemyCatalog({ ...encounter, enemies: entries });
}
