import { SaveStore } from '../storage/save-store.js';
import { GameState } from '../game/run/run-state.js';

export function createSaveController(ui, getRun) {
  let saveStore = null;
  let storageReady = false;
  let pendingCheckpoint = null;
  const reportSaveError = error => { console.error(error); ui.saveStatus.textContent = 'Save failed. Progress may not be stored. Export a backup or retry.'; };

  async function refreshStats() {
    if (!storageReady) return;
    const p = await saveStore.profile();
    ui.lifetimeStats.textContent = `${p.stats.runsCompleted} runs · ${p.stats.totalKills} kills · ${(p.stats.totalPlayTimeMs/1000).toFixed(1)}s played · Best ${(p.stats.longestRunMs/1000).toFixed(1)}s`;
  }
  async function initSaves() {
    try {
      saveStore = new SaveStore();
      await saveStore.open();
      pendingCheckpoint = await saveStore.checkpoint();
      storageReady = true;
      await refreshStats();
      ui.saveStatus.textContent = 'Local saves ready';
    } catch (error) {
      reportSaveError(error);
      ui.lifetimeStats.textContent = 'Storage unavailable. Existing data has not been overwritten.';
    }
  }
  const savesInitialized = initSaves();
  function checkpointData() {
    const { game, runId, runTimer } = getRun();
    if (!game || !runId) return null;
    const state = game.registry.get('state');
    if (![GameState.IN_GAME, GameState.PAUSED, GameState.LEVEL_UP].includes(state)) return null;
    const scene = game.scene.getScene('prototype');
    return {id:runId,durationMs:runTimer.elapsed(),kills:scene.enemies.kills,scene:scene.snapshot()};
  }
  async function saveCheckpoint() {
    const data = checkpointData();
    if (!data || !storageReady) return;
    try { await saveStore.saveCheckpoint(data); ui.saveStatus.textContent = 'Progress saved locally'; }
    catch (error) { reportSaveError(error); }
  }
  async function finishRun() {
    const { game, runId, runTimer } = getRun();
    ui.playAgainButton.disabled = true;
    ui.retrySaveButton.hidden = true;
    if (!storageReady) {
      ui.saveStatus.textContent = 'Storage unavailable. This run is not saved.';
      ui.playAgainButton.disabled = false;
      return;
    }
    try {
      await saveStore.finalizeRun({id:runId,durationMs:runTimer.elapsed(),kills:game.scene.getScene('prototype').enemies.kills,progression:game.scene.getScene('prototype').progression.snapshot(),endedAt:new Date().toISOString()});
      ui.saveStatus.textContent = 'Run saved locally';
      await refreshStats();
      ui.playAgainButton.disabled = false;
    } catch (error) { reportSaveError(error); ui.retrySaveButton.hidden = false; }
  }
  return { initialized: savesInitialized, saveCheckpoint, finishRun, reportSaveError, get store() { return saveStore; }, get ready() { return storageReady; }, get pendingCheckpoint() { return pendingCheckpoint; } };
}
