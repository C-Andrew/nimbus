import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StatBlock, validateStatDefinitions } from '../../../src/game/stats/stat-block.js';
import { EffectSystem, validatePowerUpState } from '../../../src/game/effects/effect-system.js';
import { validatePowerUpCatalog } from '../../../src/game/effects/power-up-catalog.js';
import { readJson } from '../../helpers/content.mjs';
const rules = validateStatDefinitions(await readJson(new URL('../../../src/content/stats.json', import.meta.url)));
const { stats: base } = await readJson(new URL('../../../src/content/player.json', import.meta.url));
const definition = (id, scope, stat, operation, value) => ({ id, name: id, scope, maxStacks: 3,
  ...(scope === 'timed' ? { durationMs: 1000 } : {}), effects: [{ type: 'stat-modifier', modifiers: [{ stat, operation, value }] }] });
const entries = [definition('boots', 'run', 'movementSpeedPixelsPerSecond', 'add', 20),
  definition('haste', 'timed', 'movementSpeedPixelsPerSecond', 'multiply', 1.5),
  definition('heart', 'permanent', 'maxHitpoints', 'add', 2)];
const catalog = validatePowerUpCatalog(entries, rules);

test('run, timed, and permanent effects stack, expire on active time, and reset by scope', () => {
  const stats = new StatBlock(base, rules);
  let permanent;
  const effects = new EffectSystem(stats, catalog.definitions, state => { permanent = state; });
  effects.apply('boots'); effects.apply('haste'); effects.apply('heart');
  assert.equal(stats.values.movementSpeedPixelsPerSecond, 180);
  assert.equal(stats.values.maxHitpoints, 12);
  assert.deepEqual(permanent, [{ id: 'heart', stacks: 1, remainingMs: null }]);
  effects.advance(500);
  const saved = effects.snapshot();
  const restoredStats = new StatBlock(base, rules), restored = new EffectSystem(restoredStats, catalog.definitions);
  restored.restore(saved);
  assert.deepEqual(restoredStats.values, stats.values);
  assert.deepEqual(restored.snapshot(), saved);
  restored.advance(499); assert.equal(restoredStats.values.movementSpeedPixelsPerSecond, 180);
  restored.advance(1); assert.equal(restoredStats.values.movementSpeedPixelsPerSecond, 120);
  restored.clearRun();
  assert.equal(restoredStats.values.movementSpeedPixelsPerSecond, base.movementSpeedPixelsPerSecond);
  assert.equal(restoredStats.values.maxHitpoints, 12);
  assert(restored.apply('heart')); assert(restored.apply('heart')); assert.equal(restored.apply('heart'), false);
  assert.equal(restoredStats.values.maxHitpoints, 16);
});

test('effect definitions and restore reject bad references without changing active effects', () => {
  assert.throws(() => validatePowerUpCatalog([definition('bad', 'run', 'unknown', 'add', 1)], rules));
  assert.throws(() => validatePowerUpCatalog([{ ...entries[0], effects: [{ type: 'unknown' }] }], rules));
  const effects = new EffectSystem(new StatBlock(base, rules), catalog.definitions);
  effects.apply('heart'); const before = effects.snapshot();
  assert.throws(() => effects.restore([{ id: 'haste', stacks: 1, remainingMs: 2000 }]));
  assert.throws(() => effects.restore([{ id: 'missing', stacks: 1, remainingMs: null }]));
  assert.throws(() => validatePowerUpState([{ id: 'boots', stacks: 1, remainingMs: null }], catalog.definitions, true));
  assert.deepEqual(effects.snapshot(), before);
});


test('checkpoint recovery cannot roll permanent profile progression back', () => {
  const effects = new EffectSystem(new StatBlock(base, rules), catalog.definitions);
  effects.apply('heart'); effects.apply('heart');
  effects.restoreRun([{ id: 'heart', stacks: 1, remainingMs: null }, { id: 'boots', stacks: 1, remainingMs: null }]);
  assert.equal(effects.stats.values.maxHitpoints, 14);
  assert.equal(effects.stats.values.movementSpeedPixelsPerSecond, 120);
  assert.equal(effects.permanentSnapshot()[0].stacks, 2);
});
