import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { createRunController } from '../../src/app/run-controller.js';
import { SaveStore } from '../../src/storage/save-store.js';

const callbacks = new Map();
const element = () => ({
  hidden: false, disabled: false, open: false, textContent: '',
  addEventListener(event, callback) { this[event] = callback; },
  focus() {}, matches() { return false; }, setAttribute() {},
  close() { this.open = false; },
});
const ui = Object.fromEntries([
  'playButton', 'prototype', 'gameCanvas', 'saveStatus', 'retrySaveButton',
  'lifetimeStats', 'playStatus', 'infoPanel', 'infoButton', 'pauseButton',
  'pauseActions', 'endRunButton', 'restartScreen', 'playAgainButton',
  'gameState', 'playEntry', 'runDuration', 'runKills', 'levelUpModal',
  'exportSave', 'importSave', 'saveFile', 'persistSave', 'forceJoystick',
].map(name => [name, element()]));
const originalDocument = globalThis.document;
const originalInterval = globalThis.setInterval;
globalThis.document = { body: { dataset: {} }, addEventListener(event, cb) { callbacks.set(event, cb); } };
globalThis.setInterval = () => 0;
let state = 'Ready';
let paused = false;
let permanentEffects = [{ id: 'heart', stacks: 1, remainingMs: null }];
let restoredEffects;
const scene = {
  enemies: { kills: 2 }, progression: { level: 0, totalXp: 0, snapshot: () => ({ level: 0, currentXp: 0, totalXp: 0, xpPerLevel: 100 }) },
  startProgression() {}, clearInput() {}, resetRun() {},
  restorePermanentEffects(entries) { restoredEffects = entries; },
  effects: { permanentSnapshot: () => permanentEffects },
  snapshot: () => ({ player: { x: 0, y: 0 }, facing: { x: 0, y: -1 }, weapons: [], enemies: [], spawnElapsedMs: 0 }),
};
const game = {
  registry: { get: () => state, set: (_key, value) => { state = value; } },
  scene: { getScene: () => scene, pause: () => { paused = true; }, resume: () => { paused = false; } },
  events: { on(event, cb) { callbacks.set(event, cb); } },
};
try {
  const seedStore = new SaveStore();
  await seedStore.open();
  await seedStore.updateProfile(profile => { profile.progression.effects = permanentEffects; });
  seedStore.db.close();
  const controller = createRunController(ui, {}, (_parent, _catalogs, ready) => {
    queueMicrotask(ready);
    return game;
  });
  await controller.boot();
  assert.equal(ui.playStatus.textContent, '');
  assert.equal(ui.playButton.disabled, false);
  assert.deepEqual(restoredEffects, permanentEffects);
  permanentEffects = [{ id: 'heart', stacks: 2, remainingMs: null }];
  await callbacks.get('permanent-effects-changed')();
  const verifyStore = new SaveStore(); await verifyStore.open();
  assert.deepEqual((await verifyStore.profile()).progression.effects, permanentEffects);
  verifyStore.db.close();
  ui.playButton.click();
  assert.equal(state, 'In-Game');
  assert.equal(ui.playEntry.hidden, true);
  ui.pauseButton.click();
  assert.equal(state, 'Paused');
  assert(paused);
  assert.equal(ui.pauseButton.textContent, '▶ Resume');
  ui.pauseButton.click();
  assert.equal(state, 'In-Game');
  assert(!paused);
  document.visibilityState = 'hidden';
  callbacks.get('visibilitychange')();
  assert.equal(state, 'Paused');
  await ui.endRunButton.click();
  assert.equal(state, 'Restart');
  assert.equal(ui.playAgainButton.disabled, false);
  assert.equal(ui.saveStatus.textContent, 'Run saved locally');
  ui.playAgainButton.click();
  assert.equal(state, 'Ready');
  assert(!paused);
  assert.equal(ui.playEntry.hidden, false);
  console.log('Passed: controller boot, play, pause/resume, hidden-tab pause, saved completion, and restart.');
} finally {
  globalThis.document = originalDocument;
  globalThis.setInterval = originalInterval;
}
