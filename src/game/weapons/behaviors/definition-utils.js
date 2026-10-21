export function validateFireRate(definition) {
  const rate = definition.upgrades?.['fire-rate'];
  if (!rate || !Number.isFinite(rate.intervalReductionMs) || rate.intervalReductionMs <= 0
    || !Number.isFinite(rate.minimumIntervalMs) || rate.minimumIntervalMs <= 0
    || rate.minimumIntervalMs > definition.stats.intervalMs) throw new Error(`Invalid fire-rate upgrade: ${definition.id}`);
}
export function maximumTier(definition, category) {
  if (category === 'fire-rate') {
    const rate = definition.upgrades[category];
    return Math.ceil((definition.stats.intervalMs - rate.minimumIntervalMs) / rate.intervalReductionMs);
  }
  return definition.upgrades[category].maxTiers;
}
export function upgradedStats(definition, tiers) {
  const rate = definition.upgrades['fire-rate'];
  return { ...definition.stats, intervalMs: Math.max(rate.minimumIntervalMs, definition.stats.intervalMs - tiers['fire-rate'] * rate.intervalReductionMs) };
}
export function describeFireRate(definition) {
  const rate = definition.upgrades['fire-rate'];
  return ['Fire Rate', `Reduce firing interval by ${rate.intervalReductionMs} ms (minimum ${rate.minimumIntervalMs} ms).`];
}
export function validateEffectTier(effect) {
  if (!Number.isSafeInteger(effect?.maxTiers) || effect.maxTiers < 1 || effect.maxTiers > 100) throw new Error('Invalid effect tier limit');
}
