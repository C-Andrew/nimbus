import { StatBlock } from '../stats/stat-block.js';

/** Validate configuration at the boundary; runtime code consumes one catalog. */
export function validatePlayerConfig(config, statDefinitions) {
  if (config?.schemaVersion !== 1 || config.id !== 'player' || typeof config.name !== 'string' || typeof config.description !== 'string') {
    throw new Error('Invalid player catalog');
  }
  const { initialPosition, initialFacing, controls, appearance } = config;
  const stats = new StatBlock(config.stats, statDefinitions).values;
  const nonnegative = value => Number.isFinite(value) && value >= 0;
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
  return Object.freeze({ ...config, stats });
}

export async function loadPlayerConfig(statDefinitions) {
  const response = await fetch(new URL('../../content/player.json', import.meta.url));
  if (!response.ok) throw new Error(`Player catalog failed to load: ${response.status}`);
  return validatePlayerConfig(await response.json(), statDefinitions);
}
