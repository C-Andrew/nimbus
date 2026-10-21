export const UPGRADE_TYPES = Object.freeze(['size', 'projectile-count', 'fire-rate', 'effect']);
export const emptyUpgradeTiers = () => ({ size: 0, 'projectile-count': 0, 'fire-rate': 0, effect: 0 });
export const upgradeCategories = definition => definition.behavior.type === 'chain-lightning'
  ? ['projectile-count', 'fire-rate', 'effect'] : ['size', 'fire-rate', 'effect'];

export function validUpgradeTiers(tiers) {
  return !!tiers && ['size','fire-rate','effect'].every(key=>Number.isSafeInteger(tiers[key])&&tiers[key]>=0)
    && (tiers['projectile-count']===undefined || (Number.isSafeInteger(tiers['projectile-count'])&&tiers['projectile-count']>=0));
}

export function normalizeUpgradeTiers(definition, tiers) {
  if (!validUpgradeTiers(tiers)) throw new Error('Invalid weapon upgrade tiers');
  const result={...emptyUpgradeTiers(),...tiers};
  // Preserve earned tiers when restoring older lightning size upgrades.
  if (definition.behavior.type === 'chain-lightning') {
    result['projectile-count']+=result.size;
    result.size=0;
  }
  return result;
}

export function validateUpgradeDefinition(definition) {
  const u=definition.upgrades;
  if (!u || !Number.isFinite(u['fire-rate']?.intervalReductionMs) || u['fire-rate'].intervalReductionMs<=0
    || !Number.isFinite(u['fire-rate'].minimumIntervalMs) || u['fire-rate'].minimumIntervalMs<=0 || u['fire-rate'].minimumIntervalMs>definition.stats.intervalMs
    || !Number.isSafeInteger(u.effect?.maxTiers) || u.effect.maxTiers<1 || u.effect.maxTiers>100) throw new Error(`Invalid upgrade definition: ${definition.id}`);
  if (definition.behavior.type==='chain-lightning') {
    const count=u['projectile-count'];
    if (!Number.isSafeInteger(count?.maxTiers)||count.maxTiers<1||count.maxTiers>10||!Number.isSafeInteger(count.additionalChainsPerTier)||count.additionalChainsPerTier!==1
      ||u.effect.type!=='additional-jump'||!Number.isSafeInteger(u.effect.jumpsPerTier)||u.effect.jumpsPerTier<1) throw new Error('Invalid lightning upgrades');
  } else {
    if (!Number.isFinite(u.size?.multiplierPerTier)||u.size.multiplierPerTier<=1||!Number.isSafeInteger(u.size.maxTiers)||u.size.maxTiers<1
      ||u.effect.type!=='additional-projectile'||!Number.isFinite(u.effect.angleOffsetDegrees)||u.effect.angleOffsetDegrees<=0||u.effect.angleOffsetDegrees>180) throw new Error('Invalid projectile upgrades');
  }
}

export function effectiveWeapon(definition, savedTiers) {
  const tiers=normalizeUpgradeTiers(definition,savedTiers),u=definition.upgrades;
  for(const category of upgradeCategories(definition)) {
    if(category!=='fire-rate'&&tiers[category]>u[category].maxTiers)throw new Error(`Upgrade exceeds maximum tier: ${category}`);
  }
  const stats={...definition.stats,intervalMs:Math.max(u['fire-rate'].minimumIntervalMs,definition.stats.intervalMs-tiers['fire-rate']*u['fire-rate'].intervalReductionMs)};
  if(definition.behavior.type==='chain-lightning') {
    stats.jumps+=tiers.effect*u.effect.jumpsPerTier;
    stats.projectileCount=1+tiers['projectile-count']*u['projectile-count'].additionalChainsPerTier;
    return {...definition,stats};
  }
  const scale=u.size.multiplierPerTier**tiers.size;
  const projectile={...definition.projectile,widthPixels:definition.projectile.widthPixels*scale,heightPixels:definition.projectile.heightPixels*scale,collisionRadiusPixels:definition.projectile.collisionRadiusPixels*scale};
  if(![projectile.widthPixels,projectile.heightPixels,projectile.collisionRadiusPixels].every(Number.isFinite))throw new Error('Projectile size exceeds supported range');
  return {...definition,stats,projectile,projectileAnglesDegrees:Array.from({length:tiers.effect+1},(_,i)=>(i-tiers.effect/2)*u.effect.angleOffsetDegrees)};
}

export function canUpgrade(definition, tiers, category) {
  if(!upgradeCategories(definition).includes(category)||!validUpgradeTiers(tiers))return false;
  try {
    const normalized=normalizeUpgradeTiers(definition,tiers);
    if(category==='fire-rate')return effectiveWeapon(definition,normalized).stats.intervalMs>definition.upgrades['fire-rate'].minimumIntervalMs;
    return normalized[category]<definition.upgrades[category].maxTiers;
  } catch {return false;}
}
