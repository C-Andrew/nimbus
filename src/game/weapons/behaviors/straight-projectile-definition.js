import { StraightProjectile } from './straight-projectile.js';
import { validateFireRate, maximumTier, upgradedStats, describeFireRate, validateEffectTier } from './definition-utils.js';

export const straightProjectileDefinition = Object.freeze({
  categories: Object.freeze(['size', 'fire-rate', 'effect']),
  createRuntime: (scene, player) => new StraightProjectile(scene, player),
  maximumTier,
  migrateTiers: tiers => tiers,
  validate(definition) {
    const b = definition.behavior, p = definition.projectile;
    if (b.aim !== 'player-facing' || b.onHit !== 'consume-projectile' || p?.shape !== 'rectangle') throw new Error(`Unsupported projectile: ${definition.id}`);
    for (const key of ['speedPixelsPerSecond', 'lifetimeMs', 'muzzleOffsetPixels']) {
      if (!Number.isFinite(definition.stats[key]) || definition.stats[key] <= 0) throw new Error(`Invalid ${key}`);
    }
    for (const key of ['widthPixels', 'heightPixels', 'collisionRadiusPixels']) {
      if (!Number.isFinite(p[key]) || p[key] <= 0) throw new Error(`Invalid ${key}`);
    }
    if (!/^#[0-9a-f]{6}$/i.test(p.color)) throw new Error('Invalid projectile color');
  },
  validateUpgrades(definition) {
    validateFireRate(definition);
    const u = definition.upgrades;
    validateEffectTier(u.effect);
    if (!Number.isFinite(u.size?.multiplierPerTier) || u.size.multiplierPerTier <= 1 || !Number.isSafeInteger(u.size.maxTiers) || u.size.maxTiers < 1
      || u.effect.type !== 'additional-projectile' || !Number.isFinite(u.effect.angleOffsetDegrees) || u.effect.angleOffsetDegrees <= 0 || u.effect.angleOffsetDegrees > 180) throw new Error('Invalid projectile upgrades');
  },
  effective(definition, tiers) {
    const scale = definition.upgrades.size.multiplierPerTier ** tiers.size;
    const projectile = { ...definition.projectile, widthPixels: definition.projectile.widthPixels * scale,
      heightPixels: definition.projectile.heightPixels * scale, collisionRadiusPixels: definition.projectile.collisionRadiusPixels * scale };
    if (![projectile.widthPixels, projectile.heightPixels, projectile.collisionRadiusPixels].every(Number.isFinite)) throw new Error('Projectile size exceeds supported range');
    return { ...definition, stats: upgradedStats(definition, tiers), projectile,
      projectileAnglesDegrees: Array.from({ length: tiers.effect + 1 }, (_, i) => (i - tiers.effect / 2) * definition.upgrades.effect.angleOffsetDegrees) };
  },
  describeUpgrade(definition, tiers, category) {
    if (category === 'fire-rate') return describeFireRate(definition);
    if (category === 'size') return ['Size', `Increase projectile size by ${Math.round((definition.upgrades.size.multiplierPerTier - 1) * 100)}% (${tiers.size}/${definition.upgrades.size.maxTiers} upgrades).`];
    return ['Effect', `Add a laser to the centered cone (${definition.upgrades.effect.angleOffsetDegrees}° spacing) (${tiers.effect}/${definition.upgrades.effect.maxTiers} upgrades).`];
  },
});
