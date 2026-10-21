import { readFile, access } from 'node:fs/promises';
import { loadContent } from '../src/content/load-content.js';

// Run the exact startup validators offline. No browser, CDN, or build dependency.
const root = new URL('../', import.meta.url);
const originalFetch = globalThis.fetch;
globalThis.fetch = async url => {
  const path = new URL(url);
  if (path.protocol !== 'file:' || !path.href.startsWith(root.href)) throw new Error(`External content reference: ${url}`);
  return { ok: true, json: async () => JSON.parse(await readFile(path, 'utf8')) };
};
try {
  const catalogs = await loadContent();
  for (const definition of [...catalogs.weaponCatalog.weapons, ...catalogs.enemyCatalog.enemies, ...catalogs.powerUpCatalog.powerUps]) {
    if (definition.icon) {
      const icon = new URL(definition.icon, root);
      if (!icon.href.startsWith(root.href)) throw new Error(`External icon: ${definition.id}`);
      await access(icon);
    }
  }
  console.log(`Content valid: ${catalogs.enemyCatalog.enemies.length} enemies, ${catalogs.weaponCatalog.weapons.length} weapons, ${catalogs.powerUpCatalog.powerUps.length} power-ups, ${Object.keys(catalogs.statDefinitions).length} player stats.`);
} finally { globalThis.fetch = originalFetch; }
