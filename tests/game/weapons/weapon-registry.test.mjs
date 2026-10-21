import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WeaponSystem } from '../../../src/game/weapons/weapon-system.js';
import { validateWeaponCatalog } from '../../../src/game/weapons/weapon-catalog.js';
import { describeUpgrade } from '../../../src/game/weapons/weapon-upgrades.js';
import { readWeaponContent } from '../../helpers/content.mjs';
const data = await readWeaponContent();

test('two weapons using one behavior own independent runtime state and cooldowns', () => {
  const first = data.weapons.find(definition => definition.id === 'chain-lightning');
  const second = { ...structuredClone(first), id: 'second-lightning', name: 'Second lightning' };
  const catalog = validateWeaponCatalog({ ...data, startingWeapons: [], weapons: [first, second] });
  const scene = { registry: { get: () => 'In-Game' }, scale: { width: 800, height: 600 } };
  const system = new WeaponSystem(scene, { x: 0, y: 0 }, catalog);
  system.equip(first.id); system.equip(second.id);
  const [a, b] = system.weapons;
  assert.notEqual(a.runtime, b.runtime);
  let aFired = 0, bFired = 0;
  a.runtime.fire = () => { aFired++; }; b.runtime.fire = () => { bFired++; };
  a.elapsedMs = first.stats.intervalMs - 10;
  system.update(10, { x: 0, y: -1 });
  assert.equal(aFired, 1); assert.equal(bFired, 0);
  a.runtime.activeChains.push({ marker: true });
  assert.equal(b.runtime.activeChains.length, 0);
  system.clearEquipment();
  assert.equal(a.runtime.activeChains.length, 0); assert.equal(system.weapons.length, 0);
  system.equip(second.id); assert.equal(system.weapons[0].runtime, b.runtime, 'owned runtime can reuse its pools');
  assert.match(describeUpgrade(first, a.tiers, 'effect')[1], /chain jump/);
});

test('weapon registry rejects unregistered behavior types and invalid upgrade definitions', () => {
  const bad = structuredClone(data); bad.weapons[0].behavior.type = 'unregistered';
  assert.throws(() => validateWeaponCatalog(bad), /Unsupported weapon behavior/);
  const invalid = structuredClone(data); invalid.weapons[0].upgrades.effect.type = 'unregistered';
  assert.throws(() => validateWeaponCatalog(invalid), /Invalid/);
});
