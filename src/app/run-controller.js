import { animateReadyExit, animatePauseUi, animateRestartDeparture, animateRestartEntry, animateReadyEntry, cancelReadyExit } from '../ui/ready-transition.js';
import { canUpgrade, upgradeCategories } from '../game/weapons/weapon-upgrades.js';
import { GameState } from '../game/run/run-state.js';
import { createRunTimer } from '../game/run/run-timer.js';
import { createSaveController } from './save-controller.js';
import { renderGameState } from '../ui/game-controls.js';
import { renderUpgradeChoices } from '../ui/upgrade-dialog.js';
import { bindSaveControls } from '../ui/save-controls.js';
import { bindJoystickSetting } from '../ui/joystick-setting.js';

export function createRunController(ui, catalogs, createGame) {
  const runTimer = createRunTimer();
  let game;
  let runId = null;
  const saves = createSaveController(ui, () => ({ game, runId, runTimer }));
  bindJoystickSetting(ui, saves, () => game?.scene.getScene('prototype').playerInput?.joystick);
  async function bootGame() {
    ui.playButton.disabled = true;
    try {
      await saves.initialized;
      ui.forceJoystick.checked = saves.settings.forceVirtualJoystick === true;
      ui.prototype.hidden = false;
      game = createGame(ui.gameCanvas, catalogs, () => {
        try { game.scene.getScene('prototype').restorePermanentEffects?.(saves.permanentEffects); }
        catch (error) {
          ui.playStatus.textContent = 'Saved power-ups are incompatible. Export a backup before changing content.';
          ui.saveStatus.textContent = 'Existing saved progress has not been replaced.';
          console.error(error);
          return;
        }
        game.scene.getScene('prototype').playerInput?.joystick.setForced(ui.forceJoystick.checked);
        ui.playButton.disabled = false;
        if (saves.pendingCheckpoint) {
          const pendingCheckpoint = saves.pendingCheckpoint;
          try {
            game.scene.getScene('prototype').restoreRun(pendingCheckpoint);
            runId = pendingCheckpoint.id;
            runTimer.reset(pendingCheckpoint.durationMs);
            if (game.scene.getScene('prototype').pendingLevelUps > 0) enterLevelUp();
            else enterPausedState();
            ui.saveStatus.textContent = 'Interrupted run restored. Press Resume to continue.';
          } catch (error) {
            game.scene.getScene('prototype').resetRun();
            runId = null;
            runTimer.reset();
            ui.saveStatus.textContent = 'Checkpoint cannot be restored. Export a backup before starting a new run.';
            console.error(error);
          }
        }
      });
      game.events.on('permanent-effects-changed', saves.savePermanentEffects);
      game.events.on('level-up', enterLevelUp);
      game.events.on('player-defeated', () => {
        if (isState(GameState.IN_GAME)) endRun(true);
      });
      ui.playStatus.textContent = '';
    } catch (error) {
      console.error(error);
      ui.playStatus.textContent = 'Prototype could not load. Refresh to try again.';
    }
  }

  ui.infoPanel.addEventListener('toggle', (event) => {
    ui.infoButton.setAttribute('aria-expanded', String(event.newState === 'open'));
  });

  function setGameState(state) {
    const previous = game.registry.get('state');
    if (previous === state) return;
    cancelReadyExit();
    const leavingReady = previous === GameState.READY && state === GameState.IN_GAME;
    if (leavingReady) animateReadyExit(ui);
    if ((previous === GameState.PAUSED && state === GameState.RESTART) || (previous === GameState.RESTART && state === GameState.READY)) animateRestartDeparture(ui,previous);
    if (previous === GameState.PAUSED && state === GameState.IN_GAME) animatePauseUi(ui,false);
    if (previous === GameState.IN_GAME) runTimer.pause();
    if (state === GameState.READY) runTimer.reset();
    if (state === GameState.IN_GAME) runTimer.start();
    game.registry.set('state', state);
    game.scene.getScene('prototype').playerInput?.setState(state);
    game.scene.getScene('prototype').hud?.renderState(state, leavingReady, previous);
    renderGameState(ui, state, runTimer);
    if (state === GameState.PAUSED) animatePauseUi(ui,true);
    if (state === GameState.RESTART) animateRestartEntry(ui);
    if (previous === GameState.RESTART && state === GameState.READY) animateReadyEntry(ui);
  }

  function isState(state) {
    return game?.registry.get('state') === state;
  }

  function startRun() {
    if (!isState(GameState.READY)) return;
    game.scene.getScene('prototype').startProgression();
    runId = crypto.randomUUID();
    setGameState(GameState.IN_GAME);
    saves.saveCheckpoint();
    if (ui.infoPanel.matches(':popover-open')) ui.infoPanel.hidePopover();
    ui.gameCanvas.focus();
  }

  function enterPausedState() {
    game.scene.getScene('prototype').clearInput();
    setGameState(GameState.PAUSED);
    game.scene.pause('prototype');
    ui.endRunButton.focus();
  }

  function pauseRun() {
    if (!isState(GameState.IN_GAME)) return;
    enterPausedState();
    saves.saveCheckpoint();
  }


  function enterLevelUp() {
    const scene = game.scene.getScene('prototype');
    if (scene.pendingLevelUps <= 0) return;
    const selected = scene.weapons.weapons.find(weapon => weapon.definition.id === scene.upgradeWeaponId);
    if (selected && !upgradeCategories(selected.definition).some(category => canUpgrade(selected.definition, selected.tiers, category))) scene.upgradeWeaponId = null;
    if (!scene.upgradeWeaponId) {
      const owned = scene.weapons.weapons.filter(weapon => upgradeCategories(weapon.definition).some(category => canUpgrade(weapon.definition, weapon.tiers, category)));
      if (!owned.length) {
        scene.pendingLevelUps = 0;
        setGameState(GameState.IN_GAME);
        game.scene.resume('prototype');
        ui.gameCanvas.focus();
        saves.saveCheckpoint();
        return;
      }
      scene.upgradeWeaponId = owned[Math.floor(Math.random() * owned.length)].definition.id;
    }
    scene.clearInput();
    setGameState(GameState.LEVEL_UP);
    game.scene.pause('prototype');
    renderUpgradeChoices(ui, game.scene.getScene('prototype'), selectUpgrade);
    if (!ui.levelUpModal.open) ui.levelUpModal.showModal();
    ui.upgradeChoices.querySelector('button:not(:disabled)')?.focus();
    saves.saveCheckpoint();
  }

  function selectUpgrade(category) {
    if (!isState(GameState.LEVEL_UP)) return;
    const scene = game.scene.getScene('prototype');
    if (!scene.weapons.applyUpgrade(scene.upgradeWeaponId, category)) return;
    scene.pendingLevelUps--;
    scene.upgradeWeaponId = null;
    if (scene.pendingLevelUps > 0) { enterLevelUp(); return; }
    scene.clearInput();
    setGameState(GameState.IN_GAME);
    game.scene.resume('prototype');
    ui.gameCanvas.focus();
    saves.saveCheckpoint();
  }
  ui.levelUpModal.addEventListener('cancel', event => event.preventDefault());

  function resumeRun() {
    if (!isState(GameState.PAUSED)) return;
    game.scene.getScene('prototype').clearInput();
    setGameState(GameState.IN_GAME);
    game.scene.resume('prototype');
    ui.gameCanvas.focus();
  }

  async function endRun(defeated = false) {
    if (defeated === true) {
      if (!isState(GameState.IN_GAME)) return;
      game.scene.pause('prototype');
    } else if (!isState(GameState.PAUSED)) return;
    setGameState(GameState.RESTART);
    const scene = game.scene.getScene('prototype');
    ui.runKills.textContent = `${scene.enemies.kills} enemies defeated · Level ${scene.progression.level} · ${scene.progression.totalXp} total XP`;
    await saves.finishRun();
    if (!ui.playAgainButton.disabled) ui.playAgainButton.focus();
  }

  function resetRun() {
    if (!isState(GameState.RESTART) || ui.playAgainButton.disabled) return;
    game.scene.getScene('prototype').resetRun();
    runId = null;
    setGameState(GameState.READY);
    game.scene.resume('prototype');
    ui.playButton.focus();
  }

  ui.playButton.addEventListener('click', startRun);
  ui.pauseButton.addEventListener('click', () => {
    if (isState(GameState.IN_GAME)) pauseRun();
    else resumeRun();
  });
  ui.endRunButton.addEventListener('click', endRun);
  ui.playAgainButton.addEventListener('click', resetRun);


  ui.retrySaveButton.addEventListener('click', saves.finishRun);
  setInterval(saves.saveCheckpoint, 5000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden' || !game) return;
    if (game.registry.get('state') === GameState.IN_GAME) pauseRun();
    else saves.saveCheckpoint();
  });
  bindSaveControls(ui, saves, catalogs);
  renderGameState(ui, GameState.READY, runTimer);
  return { boot: bootGame };
}
