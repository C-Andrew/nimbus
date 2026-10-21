import { validateModifiers } from '../stats/stat-block.js';

export const EFFECT_TYPES = Object.freeze({
  'stat-modifier': Object.freeze({
    validate(effect, statDefinitions) { validateModifiers(effect.modifiers, statDefinitions); },
    apply({ stats, sourceId, stacks }, effect) {
      const modifiers = effect.modifiers.map(modifier => ({ ...modifier,
        value: modifier.operation === 'add' ? modifier.value * stacks : modifier.value ** stacks }));
      stats.setSource(sourceId, modifiers);
    },
    remove({ stats, sourceId }) { stats.removeSource(sourceId); },
  }),
});
export function effectHandler(effect) {
  const handler = EFFECT_TYPES[effect?.type];
  if (!handler || !Object.hasOwn(EFFECT_TYPES, effect.type)) throw new Error(`Unsupported effect: ${effect?.type}`);
  return handler;
}
