import { SaveStore } from '../storage/save-store.js';
import { CheckpointWriter } from '../storage/checkpoint-writer.js';
import { GameState } from '../game/run/run-state.js';

export function createSaveController(ui, getRun) {
  let saveStore = null;
  let checkpointWriter = null;
  let checkpointTask = null;
  let checkpointRequested = false;
  let storageReady = false;
  let pendingCheckpoint = null;
  let settings = {};
  let permanentEffects = [];
  const reportSaveError = error => { console.error(error); ui.saveStatus.textContent = 'Save failed. Progress may not be stored. Export a backup or retry.'; };

  async function refreshStats() {
    if (!storageReady) return;
    const p = await saveStore.profile();
    settings = { ...p.settings };
    permanentEffects = p.progression.effects ?? [];
    ui.lifetimeStats.textContent = `${p.stats.runsCompleted} runs · ${p.stats.totalKills} kills · ${(p.stats.totalPlayTimeMs/1000).toFixed(1)}s played · Best ${(p.stats.longestRunMs/1000).toFixed(1)}s`;
  }
  async function initSaves() {
    try {
      saveStore = new SaveStore();
      await saveStore.open();
      checkpointWriter = new CheckpointWriter(saveStore);
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
    return {id:runId,durationMs:runTimer.elapsed(),kills:scene.enemies.kills,scene:scene.snapshot({ packedEnemies: true })};
  }
  function saveCheckpoint() {
    if (!storageReady) return Promise.resolve();
    checkpointRequested = true;
    if (checkpointTask) return checkpointTask;
    checkpointTask = (async () => {
      do {
        checkpointRequested = false;
        const data = checkpointData();
        if (!data) continue;
        await checkpointWriter.save(data);
        ui.saveStatus.textContent = 'Progress saved locally';
      } while (checkpointRequested);
    })().catch(reportSaveError).finally(() => { checkpointTask = null; });
    return checkpointTask;
  }
  async function savePermanentEffects() {
    const scene = getRun().game?.scene.getScene('prototype');
    if (!storageReady || !scene?.effects) return;
    const effects = scene.effects.permanentSnapshot();
    try {
      await saveStore.updateProfile(profile => { profile.progression.effects = effects; });
      permanentEffects = effects;
    } catch (error) { reportSaveError(error); }
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
      // Drain any older checkpoint before committing the completed run.
      await checkpointTask;
      await saveStore.finalizeRun({id:runId,durationMs:runTimer.elapsed(),kills:game.scene.getScene('prototype').enemies.kills,progression:game.scene.getScene('prototype').progression.snapshot(),endedAt:new Date().toISOString()});
      ui.saveStatus.textContent = 'Run saved locally';
      await refreshStats();
      ui.playAgainButton.disabled = false;
    } catch (error) { reportSaveError(error); ui.retrySaveButton.hidden = false; }
  }
  return { initialized: savesInitialized, saveCheckpoint, savePermanentEffects, finishRun, reportSaveError, get store() { return saveStore; }, get ready() { return storageReady; }, get settings() { return settings; }, get permanentEffects() { return permanentEffects; }, get pendingCheckpoint() { return pendingCheckpoint; } };
}
