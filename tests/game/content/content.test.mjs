import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadContent } from '../../../src/content/load-content.js';
import { validateEnemyCatalog } from '../../../src/game/enemies/enemy-catalog.js';
import { readEnemyContent } from '../../helpers/content.mjs';

test('all content manifests load through the production startup validators', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(await readFile(url, 'utf8')) });
  try {
    const catalogs = await loadContent();
    assert.equal(catalogs.enemyCatalog.enemies.length, 3);
    assert.equal(catalogs.weaponCatalog.weapons.length, 2);
    assert.equal(catalogs.powerUpCatalog.powerUps.length, 0);
    assert.equal(catalogs.enemyCatalog.spawner.maxActiveEnemies, 500);
    assert.equal(catalogs.enemyCatalog.readySpawn.positions.length, 3);
    assert(catalogs.enemyCatalog.definitions.has('stationary'), 'save IDs are preserved');
  } finally { globalThis.fetch = previous; }
});

test('content validation rejects duplicate IDs, broken death references and spawn references', async () => {
  const original = await readEnemyContent();
  const duplicate = structuredClone(original); duplicate.enemies.push(duplicate.enemies[0]);
  assert.throws(() => validateEnemyCatalog(duplicate), /duplicate/);
  const badDeath = structuredClone(original); badDeath.enemies.find(enemy => enemy.id === 'splitter').onDeath.enemyTypeId = 'missing';
  assert.throws(() => validateEnemyCatalog(badDeath), /Invalid death spawn/);
  const badSpawn = structuredClone(original); badSpawn.spawner.tables[0].enemyTypeId = 'missing';
  assert.throws(() => validateEnemyCatalog(badSpawn), /Invalid enemy spawn table/);
});
