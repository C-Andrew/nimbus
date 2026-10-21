import { startDevReload } from './dev/dev-reload.js';
import { getGameControls } from './ui/game-controls.js';
import { loadContent } from './content/load-content.js';

const ui = getGameControls();
startDevReload();
ui.playButton.disabled = true;
try {
  const catalogs = await loadContent();
  const [{ createRunController }, { createGame }] = await Promise.all([
    import('./app/run-controller.js'), import('./game/create-game.js'),
  ]);
  await createRunController(ui, catalogs, createGame).boot();
} catch (error) {
  console.error(error);
  ui.playStatus.textContent = 'Prototype could not load. Refresh to try again.';
}
