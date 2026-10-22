import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameHud } from '../../src/game/hud/game-hud.js';
import { GameState } from '../../src/game/run/run-state.js';

function label() {
  return {
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setVisible(visible) { this.visible = visible; return this; },
    setText() { return this; },
    setWordWrapWidth() { return this; },
  };
}

for (const reducedMotion of [false, true]) {
  test(`pause/resume and restart preserve HUD positions and visibility, reduced motion: ${reducedMotion}`, () => {
    const originalWindow = globalThis.window;
    globalThis.window = { matchMedia: () => ({ matches: reducedMotion }) };
    try {
      let state = GameState.IN_GAME;
      const hud = Object.create(GameHud.prototype);
      hud.scene = {
        scale: { width: 800, height: 600 },
        game: { loop: { actualFps: 60 } },
        registry: { get: () => state },
        readout: label(), help: label(), progressionHud: label(),
      };
      const bar = () => ({
        resize(width, y) { this.width = width; this.y = y; },
        setVisible(visible) { this.visible = visible; },
      });
      hud.healthBar = bar();
      hud.xpBar = bar();
      hud.weaponSlots = [{ frame: label(), icon: label() }];
      const positions = () => ({
        healthY: hud.healthBar.y, xpY: hud.xpBar.y,
        totalY: hud.scene.progressionHud.y,
        fpsY: hud.scene.readout.y, helpVisible: hud.scene.help.visible,
      });
      hud.renderState(state);
      const expected = positions();
      assert.deepEqual(expected, { healthY: 58, xpY: 90, totalY: 110, fpsY: 24, helpVisible: false });
      state = GameState.PAUSED;
      hud.renderState(state, false, GameState.IN_GAME);
      assert.deepEqual(positions(), expected);
      hud.scene.scale = { width: 390, height: 844 };
      hud.resize();
      assert.deepEqual(positions(), expected, 'mobile resize while paused retains the gameplay layout');
      assert.equal(hud.healthBar.width, 320);
      state = GameState.IN_GAME;
      hud.renderState(state, false, GameState.PAUSED);
      assert.deepEqual(positions(), expected);
      hud.renderState(GameState.PAUSED);
      assert.deepEqual(positions(), expected, 'direct checkpoint recovery into pause uses the same layout');
      for (const previous of [GameState.IN_GAME, GameState.PAUSED]) {
        state = GameState.RESTART;
        hud.renderState(state, false, previous);
        assert.deepEqual(positions(), expected, `Restart from ${previous} keeps the gameplay layout`);
        assert.equal(hud.healthBar.visible, true);
        assert.equal(hud.xpBar.visible, true);
        assert.equal(hud.scene.progressionHud.visible, true);
        hud.scene.scale = { width: 320, height: 568 };
        hud.resize();
        assert.deepEqual(positions(), expected, 'resize during Restart keeps the gameplay layout');
        assert.equal(hud.healthBar.width, 284);
      }
      hud.renderState(GameState.READY);
      assert.equal(hud.healthBar.visible, false, 'Ready still hides run stats');
    } finally {
      if (originalWindow === undefined) delete globalThis.window;
      else globalThis.window = originalWindow;
    }
  });
}
