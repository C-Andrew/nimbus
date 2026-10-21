import { GameState } from '../game/run/run-state.js';
import { formatDuration } from '../game/run/run-timer.js';

function requireElement(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Missing required UI element: ${selector}`);
  return element;
}

export function getGameControls() {
  return Object.fromEntries(Object.entries({
  levelUpModal: '#level-up-modal', upgradeWeaponName: '#upgrade-weapon-name', upgradeChoices: '#upgrade-choices',
  playButton: '#play-game', prototype: '#prototype', gameCanvas: '#game-canvas',
  saveStatus: '#save-status', retrySaveButton: '#retry-save', lifetimeStats: '#lifetime-stats',
  playStatus: '#play-status', infoPanel: '#game-info', infoButton: '.info-button',
  pauseButton: '#pause-game', pauseActions: '#pause-actions', endRunButton: '#end-run',
  restartScreen: '#restart-screen', playAgainButton: '#play-again', gameState: '#game-state',
  playEntry: '.play-entry', runDuration: '#run-duration', runKills: '#run-kills',
  exportSave: '#export-save', importSave: '#import-save', saveFile: '#save-file',
  persistSave: '#persist-save', storageDetail: '#storage-detail',
}).map(([name, selector]) => [name, requireElement(selector)]));
}

export function renderGameState(ui, state, runTimer) {
  document.body.dataset.gameState = state;
  ui.gameState.textContent = state;
  ui.playEntry.hidden = state !== GameState.READY;
  ui.infoButton.hidden = state !== GameState.READY;
  ui.pauseButton.hidden = state !== GameState.IN_GAME && state !== GameState.PAUSED;
  ui.pauseActions.hidden = state !== GameState.PAUSED;
  ui.restartScreen.hidden = state !== GameState.RESTART;
  if (state !== GameState.LEVEL_UP && ui.levelUpModal.open) ui.levelUpModal.close();
  if (state === GameState.RESTART) {
    ui.runDuration.textContent = formatDuration(runTimer.elapsed());
  }
  ui.pauseButton.textContent = state === GameState.PAUSED ? '▶ Resume' : 'Ⅱ Pause';
}

