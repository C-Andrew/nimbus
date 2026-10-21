import { validateUpgradeDefinition } from './weapon-upgrades.js';

export async function loadWeaponCatalog() {
  // Catalog is loaded before the scene starts; load failures reach the boot error UI.
  const response = await fetch(new URL('../../data/weapons.json', import.meta.url));
  if (!response.ok) throw new Error(`Weapon catalog failed to load: ${response.status}`);
  const weaponCatalog = await response.json();
  if (weaponCatalog.schemaVersion !== 1 || !Number.isInteger(weaponCatalog.maxEquippedWeapons) || weaponCatalog.maxEquippedWeapons < 1 || !Array.isArray(weaponCatalog.weapons)) throw new Error('Invalid weapon catalog');
  const definitions = new Map();
  for (const weapon of weaponCatalog.weapons) {
    if (!weapon.id || !weapon.name || definitions.has(weapon.id)) throw new Error('Invalid or duplicate weapon ID');
    const b = weapon.behavior, p = weapon.projectile;
    if (b?.trigger !== 'automatic') throw new Error(`Unsupported trigger: ${weapon.id}`);
    for (const key of ['intervalMs', 'damage']) {
      if (!Number.isFinite(weapon.stats?.[key]) || weapon.stats[key] <= 0) throw new Error(`Invalid ${key}: ${weapon.id}`);
    }
    if (b.type === 'straight-projectile') {
      if (b.aim !== 'player-facing' || b.onHit !== 'consume-projectile' || p?.shape !== 'rectangle') throw new Error(`Unsupported projectile: ${weapon.id}`);
      for (const key of ['speedPixelsPerSecond', 'lifetimeMs', 'muzzleOffsetPixels']) {
        if (!Number.isFinite(weapon.stats[key]) || weapon.stats[key] <= 0) throw new Error(`Invalid ${key}: ${weapon.id}`);
      }
      for (const key of ['widthPixels', 'heightPixels', 'collisionRadiusPixels']) {
        if (!Number.isFinite(p[key]) || p[key] <= 0) throw new Error(`Invalid ${key}: ${weapon.id}`);
      }
      if (!/^#[0-9a-f]{6}$/i.test(p.color)) throw new Error(`Invalid projectile color: ${weapon.id}`);
    } else if (b.type === 'chain-lightning') {
      if (b.aim !== 'nearest-enemy' || b.onHit !== 'chain') throw new Error('Invalid lightning behavior');
      for (const key of ['targetRangePixels','jumpRangePixels','stunDurationMs','jumpDelayMs']) {
        if (!Number.isFinite(weapon.stats[key]) || weapon.stats[key] <= 0) throw new Error(`Invalid ${key}`);
      }
      if (!Number.isFinite(weapon.stats.initialDirectionSeparationDegrees) || weapon.stats.initialDirectionSeparationDegrees <= 0 || weapon.stats.initialDirectionSeparationDegrees > 180) throw new Error('Invalid direction separation');
      if (!Number.isSafeInteger(weapon.stats.maxTargetsPerJump) || weapon.stats.maxTargetsPerJump < 1 || weapon.stats.maxTargetsPerJump > 3) throw new Error('Invalid targets per jump');
      if (!Number.isSafeInteger(weapon.stats.jumps) || weapon.stats.jumps < 0 || weapon.stats.jumps > 100) throw new Error('Invalid jump count');
      const appearance = weapon.appearance;
      if (!Number.isFinite(appearance?.whitenessPerJump) || appearance.whitenessPerJump <= 0 || appearance.whitenessPerJump > 1) throw new Error('Invalid lightning brightness step');
      if (!/^#[0-9a-f]{6}$/i.test(appearance?.color) || !Number.isFinite(appearance.widthPixels) || appearance.widthPixels <= 0) throw new Error('Invalid lightning appearance');
    } else throw new Error(`Unsupported weapon behavior: ${weapon.id}`);
    validateUpgradeDefinition(weapon);
    definitions.set(weapon.id, weapon);
  }
  if (!Array.isArray(weaponCatalog.startingWeapons) || new Set(weaponCatalog.startingWeapons).size !== weaponCatalog.startingWeapons.length || weaponCatalog.startingWeapons.length > weaponCatalog.maxEquippedWeapons || weaponCatalog.startingWeapons.some(id => !definitions.has(id))) throw new Error('Invalid starting weapons');
  return { ...weaponCatalog, definitions };

}
