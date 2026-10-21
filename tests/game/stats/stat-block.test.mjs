import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StatBlock, validateStatDefinitions } from '../../../src/game/stats/stat-block.js';
import { PlayerHealth } from '../../../src/game/player/player-health.js';
import { readJson } from '../../helpers/content.mjs';
const rules = validateStatDefinitions(await readJson(new URL('../../../src/content/stats.json', import.meta.url)));
const { stats: base } = await readJson(new URL('../../../src/content/player.json', import.meta.url));

test('stats combine additive and multiplicative sources deterministically and recalculate on change', () => {
  let notifications = 0;
  const stats = new StatBlock(base, rules, () => notifications++);
  const original = stats.values;
  stats.setSource('boost', [{ stat: 'movementSpeedPixelsPerSecond', operation: 'multiply', value: 1.5 }]);
  stats.setSource('boots', [{ stat: 'movementSpeedPixelsPerSecond', operation: 'add', value: 20 }]);
  assert.equal(stats.values.movementSpeedPixelsPerSecond, 180);
  const other = new StatBlock(base, rules);
  other.setSource('boots', [{ stat: 'movementSpeedPixelsPerSecond', operation: 'add', value: 20 }]);
  other.setSource('boost', [{ stat: 'movementSpeedPixelsPerSecond', operation: 'multiply', value: 1.5 }]);
  assert.deepEqual(stats.values, other.values);
  const current = stats.values;
  stats.setSource('boots', [{ stat: 'movementSpeedPixelsPerSecond', operation: 'add', value: 20 }]);
  assert.equal(stats.values, current, 'equivalent modifiers do not invalidate cached stats');
  assert.equal(notifications, 2);
  stats.removeSource('boots'); stats.removeSource('boost');
  assert.deepEqual(stats.values, original);
  assert(Object.isFrozen(stats.values));
});

test('stat updates are atomic, clamp limits, round integer stats, and support new stat defaults', () => {
  const stats = new StatBlock(base, rules);
  stats.setSource('health', [{ stat: 'maxHitpoints', operation: 'add', value: 1.2 }]);
  assert.equal(stats.values.maxHitpoints, 11);
  stats.setSource('health', [{ stat: 'maxHitpoints', operation: 'add', value: -999 }]);
  assert.equal(stats.values.maxHitpoints, 1);
  const before = stats.values;
  assert.throws(() => stats.setSource('bad', [{ stat: 'unknown', operation: 'add', value: 10 }]));
  assert.throws(() => stats.batch(() => {
    stats.setSource('temporary', [{ stat: 'maxHitpoints', operation: 'add', value: 10 }]);
    stats.setSource('overflow', [{ stat: 'movementSpeedPixelsPerSecond', operation: 'multiply', value: Number.MAX_VALUE }]);
  }));
  assert.equal(stats.values, before);
  assert(!stats.sources.has('temporary'));
  const extended = new StatBlock(base, { ...rules, armor: { minimum: 0, maximum: 100, default: 0 } });
  extended.setSource('shield', [{ stat: 'armor', operation: 'add', value: 5 }]);
  assert.equal(extended.values.armor, 5);
});

test('effective health limits update alongside stats and preserve existing damage', () => {
  const health = new PlayerHealth(base);
  health.takeDamage(2);
  const stats = new StatBlock(base, rules, values => health.setStats(values));
  stats.setSource('heart', [{ stat: 'maxHitpoints', operation: 'add', value: 5 }]);
  assert.equal(health.maxHp, 15); assert.equal(health.hp, 8);
  health.reset(); assert.equal(health.hp, 15);
  stats.removeSource('heart');
  assert.equal(health.maxHp, 10); assert.equal(health.hp, 10);
});
