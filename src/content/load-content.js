import { readContent } from './content-loader.js';
import { loadPlayerConfig } from '../game/player/player-config.js';
import { loadWeaponCatalog } from '../game/weapons/weapon-catalog.js';
import { loadEnemyCatalog } from '../game/enemies/enemy-catalog.js';
import { validateStatDefinitions } from '../game/stats/stat-block.js';
import { loadPowerUpCatalog } from '../game/effects/power-up-catalog.js';

export async function loadContent() {
  const rules = readContent(new URL('./stats.json', import.meta.url)).then(validateStatDefinitions);
  const [playerConfig, weaponCatalog, enemyCatalog, statDefinitions, powerUpCatalog] = await Promise.all([
    rules.then(loadPlayerConfig), loadWeaponCatalog(), loadEnemyCatalog(), rules, rules.then(loadPowerUpCatalog),
  ]);
  return { playerConfig, weaponCatalog, enemyCatalog, statDefinitions, powerUpCatalog };
}
