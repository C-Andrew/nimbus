import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joystickVector } from '../../src/game/player/virtual-joystick.js';

test('joystick respects dead zone, analog speed, and maximum drag distance', () => {
  const result = {};
  assert.equal(joystickVector(0, 0, 36, 8, result), result);
  assert.equal(result.x, 0); assert.equal(result.y, 0);
  joystickVector(8, 0, 36, 8, result);
  assert.equal(result.x, 0);
  joystickVector(22, 0, 36, 8, result);
  assert.equal(result.x, 0.5);
  joystickVector(300, 400, 36, 8, result);
  assert.equal(result.x, 0.6); assert.equal(result.y, 0.8);
  assert(Math.abs(Math.hypot(result.offsetX, result.offsetY) - 36) < 1e-10);
  joystickVector(-300, -400, 36, 8, result);
  assert.equal(result.x, -0.6); assert.equal(result.y, -0.8);
  joystickVector(30, 0, 8, 8, result);
  assert.equal(result.x, 0, 'a base smaller than its dead zone cannot produce invalid movement');
});

test('joystick captures one touch, clears across states and interruptions, and removes listeners', async () => {
  const { VirtualJoystick } = await import('../../src/game/player/virtual-joystick.js');
  const { GameState } = await import('../../src/game/run/run-state.js');
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  class Element extends EventTarget {
    constructor() { super(); this.style = {}; this.captured = new Set(); this.offsetWidth = 48; }
    setAttribute() {}
    append(child) { this.child = child; }
    remove() { this.removed = true; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 120, height: 120 }; }
    setPointerCapture(id) { this.captured.add(id); }
    hasPointerCapture(id) { return this.captured.has(id); }
    releasePointerCapture(id) { this.captured.delete(id); }
  }
  const media = new EventTarget(); media.matches = true;
  const browser = new EventTarget(); browser.matchMedia = () => media;
  globalThis.window = browser;
  globalThis.document = { createElement: () => new Element() };
  const parent = new Element();
  const pointer = (target, type, id, x = 60, y = 60) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: id, clientX: x, clientY: y });
    target.dispatchEvent(event);
  };
  let stick;
  try {
    stick = new VirtualJoystick(parent, 8);
    assert(stick.element.hidden, 'hidden in Ready');
    stick.setState(GameState.IN_GAME);
    assert(!stick.element.hidden);
    pointer(stick.element, 'pointerdown', 1, 200, 60);
    assert.equal(stick.vector.x, 1);
    assert(stick.element.hasPointerCapture(1));
    pointer(stick.element, 'pointerdown', 2, 0, 60);
    pointer(stick.element, 'pointerup', 2);
    assert.equal(stick.pointerId, 1, 'another finger cannot steal or release movement');
    pointer(stick.element, 'pointercancel', 1);
    assert.equal(stick.vector.x, 0);
    assert(!stick.element.hasPointerCapture(1));
    for (const state of [GameState.PAUSED, GameState.LEVEL_UP, GameState.RESTART, GameState.READY]) {
      stick.setState(GameState.IN_GAME);
      pointer(stick.element, 'pointerdown', 3, 200, 60);
      stick.setState(state);
      assert(stick.element.hidden);
      assert.equal(stick.pointerId, null);
      assert.equal(stick.vector.x, 0);
    }
    stick.setState(GameState.IN_GAME);
    for (const interruption of ['blur', 'resize']) {
      pointer(stick.element, 'pointerdown', 4, 200, 60);
      browser.dispatchEvent(new Event(interruption));
      assert.equal(stick.vector.x, 0);
    }
    media.matches = false; media.dispatchEvent(new Event('change'));
    assert(stick.element.hidden, 'coarse-pointer controls disappear when only a mouse is available');
    stick.setForced(true);
    assert(!stick.element.hidden, 'desktop override shows the joystick in-game');
    stick.setState(GameState.PAUSED);
    assert(stick.element.hidden, 'desktop override cannot show controls while paused');
    stick.setState(GameState.IN_GAME);
    assert(!stick.element.hidden);
    stick.setForced(false);
    assert(stick.element.hidden, 'disabling the override restores device detection');
    media.matches = true; media.dispatchEvent(new Event('change'));
    stick.destroy();
    assert(stick.element.removed);
    pointer(stick.element, 'pointerdown', 5, 200, 60);
    assert.equal(stick.pointerId, null, 'destroyed controls no longer accept input');
  } finally {
    stick?.destroy();
    globalThis.window = oldWindow; globalThis.document = oldDocument;
  }
});
