import { loadManifest, definitionMap } from '../../content/content-loader.js';
import { effectHandler } from './effect-registry.js';
export function validatePowerUpCatalog(entries, statDefinitions) {
  const definitions = definitionMap(entries, definition => {
    if (!['run', 'timed', 'permanent'].includes(definition.scope)
      || !Number.isSafeInteger(definition.maxStacks) || definition.maxStacks < 1 || definition.maxStacks > 100
      || !Array.isArray(definition.effects) || !definition.effects.length || definition.effects.length > 16
      || (definition.scope === 'timed' && (!Number.isFinite(definition.durationMs) || definition.durationMs <= 0))) throw new Error(`Invalid power-up: ${definition.id}`);
    for (const effect of definition.effects) effectHandler(effect).validate(effect, statDefinitions);
  });
  return { powerUps: entries, definitions };
}
export async function loadPowerUpCatalog(statDefinitions) {
  const { entries } = await loadManifest(new URL('../../content/power-ups/index.json', import.meta.url));
  return validatePowerUpCatalog(entries, statDefinitions);
}
