import { loadManifest, definitionMap } from '../../content/content-loader.js';
import { weaponBehavior } from './weapon-behaviors.js';
import { validateUpgradeDefinition } from './weapon-upgrades.js';

export function validateWeaponCatalog(catalog) {
  if (catalog.schemaVersion !== 1 || !Number.isInteger(catalog.maxEquippedWeapons) || catalog.maxEquippedWeapons < 1 || catalog.maxEquippedWeapons > 6 || !Array.isArray(catalog.weapons)) throw new Error('Invalid weapon catalog');
  const definitions = definitionMap(catalog.weapons, definition => {
    if (definition.behavior?.trigger !== 'automatic') throw new Error(`Unsupported trigger: ${definition.id}`);
    for (const key of ['intervalMs', 'damage']) {
      if (!Number.isFinite(definition.stats?.[key]) || definition.stats[key] <= 0) throw new Error(`Invalid ${key}: ${definition.id}`);
    }
    weaponBehavior(definition).validate(definition);
    validateUpgradeDefinition(definition);
  });
  if (!Array.isArray(catalog.startingWeapons) || new Set(catalog.startingWeapons).size !== catalog.startingWeapons.length
    || catalog.startingWeapons.length > catalog.maxEquippedWeapons || catalog.startingWeapons.some(id => !definitions.has(id))) throw new Error('Invalid starting weapons');
  return { ...catalog, definitions };
}
export async function loadWeaponCatalog() {
  const { manifest, entries } = await loadManifest(new URL('../../content/weapons/index.json', import.meta.url));
  return validateWeaponCatalog({ ...manifest, weapons: entries });
}
