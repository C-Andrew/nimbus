/** Validate configuration at the boundary; runtime code consumes one catalog. */
export function validatePlayerConfig(config) {
  if (config?.schemaVersion !== 1 || config.id !== 'player' || typeof config.name !== 'string' || typeof config.description !== 'string') {
    throw new Error('Invalid player catalog');
  }
  const { stats, initialPosition, initialFacing, controls, appearance } = config;
  const positive = value => Number.isFinite(value) && value > 0;
  const nonnegative = value => Number.isFinite(value) && value >= 0;
  if (!Number.isSafeInteger(stats?.maxHitpoints) || stats.maxHitpoints <= 0
    || !positive(stats.movementSpeedPixelsPerSecond) || !positive(stats.collisionRadiusPixels)
    || !nonnegative(stats.contactInvulnerabilityMs)) throw new Error('Invalid player stats');
  if (!Number.isFinite(initialPosition?.x) || !Number.isFinite(initialPosition?.y)
    || !Number.isFinite(initialFacing?.x) || !Number.isFinite(initialFacing?.y)
    || Math.abs(Math.hypot(initialFacing.x, initialFacing.y) - 1) > 0.001) throw new Error('Invalid player initial transform');
  if (!nonnegative(controls?.touchDeadzonePixels)) throw new Error('Invalid player controls');
  for (const key of ['color', 'strokeColor', 'facingMarkerColor']) {
    if (!/^#[0-9a-f]{6}$/i.test(appearance?.[key])) throw new Error(`Invalid player ${key}`);
  }
  if (!nonnegative(appearance.strokeWidthPixels) || !nonnegative(appearance.facingMarkerOffsetPixels)
    || !nonnegative(appearance.invulnerableAlpha) || appearance.invulnerableAlpha > 1
    || !Number.isInteger(appearance.lowHealthThresholdHitpoints) || appearance.lowHealthThresholdHitpoints < 0
    || appearance.lowHealthThresholdHitpoints > stats.maxHitpoints) throw new Error('Invalid player appearance');
  if (!Number.isSafeInteger(config.progression?.xpPerLevel) || config.progression.xpPerLevel <= 0) throw new Error('Invalid player progression');
  Object.freeze(config.progression);
  Object.freeze(stats);
  Object.freeze(initialPosition);
  Object.freeze(initialFacing);
  Object.freeze(controls);
  Object.freeze(appearance);
  return Object.freeze(config);
}

export async function loadPlayerConfig() {
  const response = await fetch(new URL('../../data/player.json', import.meta.url));
  if (!response.ok) throw new Error(`Player catalog failed to load: ${response.status}`);
  return validatePlayerConfig(await response.json());
}
