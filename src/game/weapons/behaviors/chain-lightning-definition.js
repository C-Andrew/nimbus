import { ChainLightning } from './chain-lightning.js';
import { validateFireRate, maximumTier, upgradedStats, describeFireRate, validateEffectTier } from './definition-utils.js';

export const chainLightningDefinition = Object.freeze({
  categories: Object.freeze(['projectile-count', 'fire-rate', 'effect']),
  createRuntime: (scene, player) => new ChainLightning(scene, player),
  maximumTier,
  migrateTiers(tiers) { return { ...tiers, 'projectile-count': tiers['projectile-count'] + tiers.size, size: 0 }; },
  validate(definition) {
    const b = definition.behavior, stats = definition.stats, appearance = definition.appearance;
    if (b.aim !== 'nearest-enemy' || b.onHit !== 'chain') throw new Error('Invalid lightning behavior');
    for (const key of ['targetRangePixels', 'jumpRangePixels', 'stunDurationMs', 'jumpDelayMs']) {
      if (!Number.isFinite(stats[key]) || stats[key] <= 0) throw new Error(`Invalid ${key}`);
    }
    if (!Number.isFinite(stats.initialDirectionSeparationDegrees) || stats.initialDirectionSeparationDegrees <= 0 || stats.initialDirectionSeparationDegrees > 180) throw new Error('Invalid direction separation');
    if (!Number.isSafeInteger(stats.maxTargetsPerJump) || stats.maxTargetsPerJump < 1 || stats.maxTargetsPerJump > 3) throw new Error('Invalid targets per jump');
    if (!Number.isSafeInteger(stats.jumps) || stats.jumps < 0 || stats.jumps > 100) throw new Error('Invalid jump count');
    if (!Number.isFinite(appearance?.whitenessPerJump) || appearance.whitenessPerJump <= 0 || appearance.whitenessPerJump > 1
      || !/^#[0-9a-f]{6}$/i.test(appearance?.color) || !Number.isFinite(appearance.widthPixels) || appearance.widthPixels <= 0) throw new Error('Invalid lightning appearance');
  },
  validateUpgrades(definition) {
    validateFireRate(definition);
    const u = definition.upgrades, count = u['projectile-count'];
    validateEffectTier(u.effect);
    if (!Number.isSafeInteger(count?.maxTiers) || count.maxTiers < 1 || count.maxTiers > 10 || count.additionalChainsPerTier !== 1
      || u.effect.type !== 'additional-jump' || !Number.isSafeInteger(u.effect.jumpsPerTier) || u.effect.jumpsPerTier < 1) throw new Error('Invalid lightning upgrades');
  },
  effective(definition, tiers) {
    const stats = upgradedStats(definition, tiers);
    stats.jumps += tiers.effect * definition.upgrades.effect.jumpsPerTier;
    stats.projectileCount = 1 + tiers['projectile-count'] * definition.upgrades['projectile-count'].additionalChainsPerTier;
    return { ...definition, stats };
  },
  describeUpgrade(definition, tiers, category) {
    if (category === 'fire-rate') return describeFireRate(definition);
    if (category === 'projectile-count') return ['Projectile Count', `Fire an additional chain toward a different enemy (${tiers['projectile-count']}/${definition.upgrades['projectile-count'].maxTiers} upgrades).`];
    return ['Effect', `Add ${definition.upgrades.effect.jumpsPerTier} chain jump (${tiers.effect}/${definition.upgrades.effect.maxTiers} upgrades).`];
  },
});
