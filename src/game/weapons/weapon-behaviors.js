import { straightProjectileDefinition } from './behaviors/straight-projectile-definition.js';
import { chainLightningDefinition } from './behaviors/chain-lightning-definition.js';

// The only registration point for new weapon algorithms. Data reuses these IDs.
export const WEAPON_BEHAVIORS = Object.freeze({
  'straight-projectile': straightProjectileDefinition,
  'chain-lightning': chainLightningDefinition,
});
export function weaponBehavior(definition) {
  const behavior = WEAPON_BEHAVIORS[definition.behavior?.type];
  if (!behavior || !Object.hasOwn(WEAPON_BEHAVIORS, definition.behavior.type)) throw new Error(`Unsupported weapon behavior: ${definition.id}`);
  return behavior;
}
