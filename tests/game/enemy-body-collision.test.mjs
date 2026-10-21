import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enemiesOverlap } from '../../src/game/enemies/enemy-body-collision.js';

const enemy = (shape, x, y) => ({ sprite: { x, y }, type: { appearance: {
  shape, radiusPixels: 16, widthPixels: shape === 'rectangle' ? 160 : 44,
  heightPixels: shape === 'rectangle' ? 100 : 44, strokeWidthPixels: 0,
} } });

test('all enemy shapes collide symmetrically and allow edge contact', () => {
  for (const a of ['circle', 'triangle', 'rectangle']) for (const b of ['circle', 'triangle', 'rectangle']) {
    const first = enemy(a, -100, -100), second = enemy(b, -100, -100);
    assert(enemiesOverlap(first, second), `${a}/${b} at the same position`);
    second.sprite.x = 1000;
    assert(!enemiesOverlap(first, second));
    for (let x = -200; x < 0; x += 7) {
      second.sprite.x = x;
      assert.equal(enemiesOverlap(first, second), enemiesOverlap(second, first));
    }
  }
  assert(!enemiesOverlap(enemy('circle', 0, 0), enemy('circle', 32, 0)));
  assert(enemiesOverlap(enemy('circle', 0, 0), enemy('circle', 31, 0)));
  assert(!enemiesOverlap(enemy('rectangle', 0, 0), enemy('rectangle', 160, 0)));
  assert(enemiesOverlap(enemy('rectangle', 0, 0), enemy('rectangle', 159, 0)));
});

test('triangle empty corners stay open and visible strokes add clearance', () => {
  const triangle = enemy('triangle', 0, 0), smallCircle = enemy('circle', 20, -20);
  smallCircle.type.appearance.radiusPixels = 2;
  assert(!enemiesOverlap(triangle, smallCircle), 'triangle bounds are not a solid rectangle');
  smallCircle.sprite.x = 0; smallCircle.sprite.y = -23;
  assert(enemiesOverlap(triangle, smallCircle));
  const a = enemy('circle', 0, 0), b = enemy('circle', 33, 0);
  a.type.appearance.strokeWidthPixels = b.type.appearance.strokeWidthPixels = 2;
  assert(enemiesOverlap(a, b), 'outlines should not overlap either');
});
