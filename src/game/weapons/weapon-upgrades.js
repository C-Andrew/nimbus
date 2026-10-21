import { weaponBehavior } from './weapon-behaviors.js';

// Legacy fields remain zero by default so schema-v1 saves round-trip unchanged.
export const UPGRADE_TYPES = Object.freeze(['size', 'projectile-count', 'fire-rate', 'effect']);
export const emptyUpgradeTiers = () => ({ size: 0, 'projectile-count': 0, 'fire-rate': 0, effect: 0 });
export const upgradeCategories = definition => weaponBehavior(definition).categories;
export function validUpgradeTiers(tiers) {
  return !!tiers && typeof tiers === 'object' && !Array.isArray(tiers) && Object.keys(tiers).length <= 32
    && Object.entries(tiers).every(([key, value]) => /^[a-zA-Z0-9-]{1,100}$/.test(key) && Number.isSafeInteger(value) && value >= 0);
}
export function normalizeUpgradeTiers(definition, tiers) {
  if (!validUpgradeTiers(tiers)) throw new Error('Invalid weapon upgrade tiers');
  const behavior = weaponBehavior(definition);
  const defaults = Object.fromEntries(behavior.categories.map(category => [category, 0]));
  const result = behavior.migrateTiers({ ...emptyUpgradeTiers(), ...defaults, ...tiers });
  for (const [category, tier] of Object.entries(result)) {
    if (tier !== 0 && !behavior.categories.includes(category)) throw new Error(`Unsupported upgrade tier: ${category}`);
  }
  return result;
}
export function validateUpgradeDefinition(definition) { weaponBehavior(definition).validateUpgrades(definition); }
export function effectiveWeapon(definition, savedTiers) {
  const behavior = weaponBehavior(definition), tiers = normalizeUpgradeTiers(definition, savedTiers);
  for (const category of behavior.categories) {
    if (tiers[category] > behavior.maximumTier(definition, category)) throw new Error(`Upgrade exceeds maximum tier: ${category}`);
  }
  return behavior.effective(definition, tiers);
}
export function canUpgrade(definition, tiers, category) {
  try {
    const behavior = weaponBehavior(definition);
    if (!behavior.categories.includes(category)) return false;
    const normalized = normalizeUpgradeTiers(definition, tiers);
    effectiveWeapon(definition, normalized);
    return normalized[category] < behavior.maximumTier(definition, category);
  } catch { return false; }
}
export function describeUpgrade(definition, tiers, category) {
  return weaponBehavior(definition).describeUpgrade(definition, tiers, category);
}
