import { readEnemyContent } from '../helpers/content.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { EnemySpatialIndex } from '../../src/game/enemies/enemy-spatial-index.js';
import { EnemySystem as EnemySpawner } from '../../src/game/enemies/enemy-system.js';
import { enemiesOverlap } from '../../src/game/enemies/enemy-body-collision.js';
import { enemyTouchesCircle, projectileContactTime } from '../../src/game/enemies/enemy-collisions.js';

const data = await readEnemyContent();
const definitions = new Map(data.enemies.map(type => [type.id, type]));
const catalog = { ...data, definitions };
function drawable(x = 0, y = 0) {
  return {
    x, y, active: true,
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setActive(active) { this.active = active; return this; },
    setVisible() { return this; }, setOrigin() { return this; }, setDepth() { return this; },
    destroy() { this.destroyed = true; },
    setRadius() { return this; }, setTo() { return this; }, setSize() { return this; },
    setFillStyle() { return this; }, setStrokeStyle() { return this; },
    setFontSize() { return this; }, setColor() { return this; }, setText() { return this; },
  };
}
function makeSpawner(maxActiveEnemies = data.spawner.maxActiveEnemies) {
  const scene = {
    scale: { width: 800, height: 600 }, registry: { get: () => 'In-Game' },
    add: { circle: drawable, triangle: drawable, rectangle: drawable, text: drawable },
  };
  return new EnemySpawner(scene, { x: 0, y: 0 }, { ...catalog, spawner: { ...catalog.spawner, maxActiveEnemies } }, () => {}, drawable);
}

// A fixed seed makes the full-scan equivalence checks repeatable.
let seed = 42;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const coordinate = () => random() * 4000 - 2000;

test('broad phase includes every exact contact and swept hit for all shapes', () => {
  const grid = new EnemySpatialIndex(definitions);
  const types = [...definitions.values()];
  const enemies = Array.from({ length: 600 }, (_, i) => ({
    type: types[i % types.length], sprite: drawable(coordinate(), coordinate()),
  }));
  for (const enemy of enemies) grid.update(enemy);
  const result = [];
  for (let i = 0; i < 500; i++) {
    const x = coordinate(), y = coordinate(), toX = coordinate(), toY = coordinate();
    const radius = random() * 40;
    const contacts = new Set(grid.queryCircle(x, y, radius, result));
    const hits = new Set(grid.querySegment(x, y, toX, toY, radius, result));
    for (const enemy of enemies) {
      if (enemyTouchesCircle(enemy, { x, y }, radius)) assert(contacts.has(enemy), 'contact omitted');
      if (projectileContactTime(enemy, x, y, toX, toY, radius) !== null) assert(hits.has(enemy), 'swept hit omitted');
    }
  }
});

test('queries preserve expanded triangle tips, cell boundaries, and large bodies', () => {
  const grid = new EnemySpatialIndex(definitions, 16);
  const triangle = { type: definitions.get('splitter'), sprite: drawable(-128, -128) };
  const block = { type: definitions.get('block'), sprite: drawable(128, 128) };
  grid.update(triangle); grid.update(block);
  // Expanded triangle tip is more than one projectile radius above its body.
  assert.notEqual(projectileContactTime(triangle, -128, -170, -128, -170, 10), null);
  assert(grid.querySegment(-128, -170, -128, -170, 10, []).includes(triangle));
  assert(grid.queryCircle(48, 128, 0, []).includes(block));
  assert(grid.querySegment(48, 128, 48, 128, 0, []).includes(block));
});

test('nearest laser hit and strongest contact match full scans, including ties', () => {
  const spawner = makeSpawner();
  for (let i = 0; i < 300; i++) spawner.spawn(data.enemies[i % data.enemies.length].id, { x: coordinate(), y: coordinate() });
  spawner.spawn('block', { x: 90, y: 0 });
  spawner.spawn('block', { x: 90, y: 0 });
  let damaged = null;
  spawner.damageEnemy = enemy => { damaged = enemy; return true; };
  spawner.hitTest(0, 0, 200, 0);
  // Verify against pool order rather than spatial cell iteration order.
  function expectedHit(x, y, toX, toY, radius) {
    let best = null, earliest = Infinity;
    for (const enemy of spawner.enemies) {
      const t = projectileContactTime(enemy, x, y, toX, toY, radius);
      if (t !== null && t < earliest) { earliest = t; best = enemy; }
    }
    return best;
  }
  assert.equal(damaged, expectedHit(0, 0, 200, 0, 8));
  const isolated = makeSpawner();
  const tie = isolated.spawn('block', { x: 90, y: 0 });
  const tied = isolated.spawn('block', { x: 90, y: 0 });
  // Deliberately overlap a fixture to retain tie-breaking regression coverage.
  tied.sprite.setPosition(90, 0); isolated.spatialIndex.update(tied);
  isolated.damageEnemy = enemy => { assert.equal(enemy, tie); return true; };
  isolated.hitTest(0, 0, 200, 0);
  for (let i = 0; i < 100; i++) {
    const x = coordinate(), y = coordinate(), toX = coordinate(), toY = coordinate();
    damaged = null;
    const expected = expectedHit(x, y, toX, toY, 20);
    assert.equal(spawner.hitTest(x, y, toX, toY, 1, 20), !!expected);
    assert.equal(damaged, expected);
    spawner.player.x = x; spawner.player.y = y;
    const damage = spawner.enemies.reduce((max, enemy) => enemyTouchesCircle(enemy, spawner.player, 13)
      ? Math.max(max, enemy.type.stats.baseDamage) : max, 0);
    assert.equal(spawner.contactDamage(13), damage);
  }
});

test('index follows movement, despawn, stun death, splitting, pool reuse, restore, and reset', () => {
  const spawner = makeSpawner();
  const chaser = spawner.spawn('stationary', { x: 140, y: 0 });
  spawner.update(1000);
  assert.equal(chaser.sprite.x, 100);
  assert.equal(spawner.spatialIndex.locations.get(chaser).x, 0, 'movement crosses cell boundary');
  assert(!spawner.spatialIndex.columns.has(1), 'vacated cell is removed');
  assert(spawner.spatialIndex.queryCircle(chaser.sprite.x, chaser.sprite.y, 0, []).includes(chaser));
  spawner.stunEnemy(chaser, 500);
  spawner.damageEnemy(chaser, chaser.hp);
  assert(spawner.spatialIndex.locations.has(chaser), 'stunned lethal enemy remains collidable');
  spawner.updateStatuses(500);
  assert(!spawner.spatialIndex.locations.has(chaser));
  const reused = spawner.spawn('stationary', { x: -900, y: -900 });
  assert.equal(reused, chaser);
  assert(!spawner.spatialIndex.queryCircle(160, 0, 0, []).includes(reused));
  spawner.spawn('stationary', { x: 100000, y: 100000 });
  spawner.update(0);
  assert.equal(spawner.spatialIndex.locations.size, 1, 'distant enemy removed');
  const splitter = spawner.spawn('splitter', { x: 0, y: 0 });
  spawner.damageEnemy(splitter, splitter.hp);
  assert.equal(spawner.spatialIndex.locations.size, 1 + definitions.get('splitter').onDeath.count);
  assert(!spawner.spatialIndex.locations.has(splitter));
  const saved = spawner.snapshot();
  spawner.restore(saved);
  assert.equal(spawner.spatialIndex.locations.size, saved.length);
  spawner.reset();
  assert.equal(spawner.spatialIndex.locations.size, 0);
  assert.equal(spawner.spatialIndex.columns.size, 0);
  assert.equal(spawner.contactDamage(13), 0);
  assert.equal(spawner.hitTest(-100, 0, 100, 0), false);
});

test('local queries exclude distant enemies in a large population', () => {
  const grid = new EnemySpatialIndex(definitions);
  for (let i = 0; i < 2000; i++) grid.update({ sprite: drawable(i * 256, 0) });
  const candidates = grid.querySegment(-20, 0, 20, 0, 8, []);
  assert.equal(candidates.length, 1, 'one nearby candidate instead of 2,000 full-scan checks');
});


test('three 2,000-enemy lifecycle cycles trim inactive objects and restore reusable pools', () => {
  const spawner = makeSpawner(2000); // Explicit stress-test override; gameplay uses 500.
  for (let run = 0; run < 3; run++) {
    for (let i = 0; i < 2000; i++) spawner.spawn(i % 2 ? 'stationary' : 'splitter', { x: i, y: 0 });
    assert.equal(spawner.activeEnemies.size, 2000);
    assert.equal(spawner.packedSnapshot().values.length, 10000);
    for (const enemy of spawner.activeEnemies) spawner.recycle(enemy);
    assert.equal(spawner.activeEnemies.size, 0);
    assert.equal(spawner.spatialIndex.locations.size, 0);
    const before = [...spawner.enemies];
    spawner.reset();
    assert.equal(spawner.enemies.length, 128, 'retains at most 64 idle enemies per shape');
    assert.equal(before.filter(enemy => enemy.sprite.destroyed).length, 1872);
    assert.equal(spawner.snapshot().length, 0);
  }
});


test('enemy bodies remain separated during repeated crowded movement and split spawns', () => {
  const spawner = makeSpawner();
  const block = spawner.spawn('block', { x: 0, y: 0 });
  const stunned = spawner.spawn('stationary', { x: 200, y: 0 });
  spawner.stunEnemy(stunned, 10000);
  const fixedX = stunned.sprite.x, fixedY = stunned.sprite.y;
  for (let i = 0; i < 70; i++) spawner.spawn(i % 3 ? 'stationary' : 'splitter', { x: 200, y: 0 });
  const verify = () => {
    const enemies = [...spawner.activeEnemies];
    for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
      assert(!enemiesOverlap(enemies[i], enemies[j]), 'enemy bodies must not overlap');
    }
  };
  verify();
  for (let frame = 0; frame < 150; frame++) {
    spawner.update(16.67);
    verify();
  }
  assert.equal(block.sprite.x, 0); assert.equal(block.sprite.y, 0);
  assert.equal(stunned.sprite.x, fixedX); assert.equal(stunned.sprite.y, fixedY);
  const splitter = [...spawner.activeEnemies].find(enemy => enemy.type.id === 'splitter');
  spawner.damageEnemy(splitter, splitter.hp);
  verify();
  const saved = spawner.snapshot();
  spawner.restore(saved);
  verify();
});


test('the 500-enemy limit covers spawns, Splitter children, pooled reuse, and old saves', () => {
  const spawner = makeSpawner();
  assert.equal(spawner.spawnConfig.maxActiveEnemies, 500);
  const splitter = spawner.spawn('splitter', { x: 0, y: 0 });
  for (let i = 1; i < 500; i++) assert(spawner.spawn('stationary', { x: i * 100, y: 0 }));
  assert.equal(spawner.activeEnemies.size, 500);
  const poolSize = spawner.enemies.length;
  assert.equal(spawner.spawn('stationary', { x: -100, y: 0 }), false);
  assert.equal(spawner.spawn('block', { x: -100, y: 0 }), false);
  assert.equal(spawner.enemies.length, poolSize, 'full capacity does not allocate more objects');
  spawner.damageEnemy(splitter, splitter.hp);
  assert.equal(spawner.activeEnemies.size, 500, 'children share the same cap after their parent dies');
  const victim = [...spawner.activeEnemies][0];
  spawner.damageEnemy(victim, victim.hp);
  assert.equal(spawner.activeEnemies.size, 499);
  assert(spawner.spawn('stationary', { x: -1000, y: 0 }));
  assert.equal(spawner.activeEnemies.size, 500, 'spawning resumes when capacity is freed');
  const oldSave = Array.from({ length: 520 }, (_, i) => ({ id: 'stationary', x: i * 100, y: 0, hp: 1 }));
  spawner.restore(oldSave);
  assert.equal(spawner.activeEnemies.size, 500);
  assert.equal(spawner.snapshot().length, 500);
  assert.equal(spawner.kills, 0, 'discarded excess save entries do not award kills');
  spawner.reset();
  assert(spawner.spawn('stationary', { x: 0, y: 0 }));
});
