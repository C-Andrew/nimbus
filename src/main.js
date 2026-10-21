import { startDevReload } from './dev/dev-reload.js';
import { getGameControls } from './ui/game-controls.js';
import { loadPlayerConfig } from './game/player/player-config.js';
import { loadWeaponCatalog } from './game/weapons/weapon-catalog.js';
import { loadEnemyCatalog } from './game/enemies/enemy-catalog.js';

const ui = getGameControls();
startDevReload();
ui.playButton.disabled = true;
try {
  const [playerConfig, weaponCatalog, enemyCatalog] = await Promise.all([
    loadPlayerConfig(), loadWeaponCatalog(), loadEnemyCatalog(),
  ]);
  const [{ createRunController }, { createGame }] = await Promise.all([
    import('./app/run-controller.js'), import('./game/create-game.js'),
  ]);
  await createRunController(ui, { playerConfig, weaponCatalog, enemyCatalog }, createGame).boot();
} catch (error) {
  console.error(error);
  ui.playStatus.textContent = 'Prototype could not load. Refresh to try again.';
}
