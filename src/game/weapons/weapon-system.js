import { weaponBehavior } from './weapon-behaviors.js';
import { GameState } from '../run/run-state.js';
import { emptyUpgradeTiers, validUpgradeTiers, normalizeUpgradeTiers, effectiveWeapon, canUpgrade } from './weapon-upgrades.js';
// Unique weapon slots and a reusable projectile pool; no physics dependency.
export class WeaponSystem {
  constructor(scene, player, catalog) {
    this.catalog = catalog;
    this.loadoutVersion = 0;
    this.definitions = catalog.definitions;
    this.scene = scene;
    this.player = player;
    this.runtimes = new Map();
    this.weapons = [];
    this.reset();
  }
  equip(id, tiers = emptyUpgradeTiers()) {
    const definition = this.definitions.get(id);
    if (!definition) return false;
    if (this.weapons.length >= this.catalog.maxEquippedWeapons || this.weapons.some(w => w.definition.id === definition.id)) return false;
    if (!validUpgradeTiers(tiers)) return false;
    let effective;
    try { tiers = normalizeUpgradeTiers(definition, tiers); effective = effectiveWeapon(definition, tiers); }
    catch { return false; }
    this.loadoutVersion++;
    let runtime = this.runtimes.get(id);
    if (!runtime) {
      runtime = weaponBehavior(definition).createRuntime(this.scene, this.player);
      this.runtimes.set(id, runtime);
    }
    this.weapons.push({ definition, tiers: {...tiers}, effective, runtime, elapsedMs: 0 });
    return true;
  }
  applyUpgrade(id, category) {
    const weapon = this.weapons.find(w => w.definition.id === id);
    if (!weapon || !canUpgrade(weapon.definition, weapon.tiers, category)) return false;
    const next = {...weapon.tiers, [category]:weapon.tiers[category]+1};
    const effective = effectiveWeapon(weapon.definition, next);
    weapon.elapsedMs *= effective.stats.intervalMs / weapon.effective.stats.intervalMs;
    weapon.tiers = next;
    weapon.effective = effective;
    return true;
  }
  clearEquipment() {
    for (const runtime of this.runtimes.values()) runtime.reset();
    this.weapons = [];
    this.loadoutVersion++;
  }
  destroy() {
    for (const runtime of this.runtimes.values()) runtime.destroy();
    this.runtimes.clear();
    this.weapons = [];
  }
  reset() {
    this.clearEquipment();
    for (const id of this.catalog.startingWeapons) this.equip(id);
  }
  update(delta, facing, enemies) {
    for (const weapon of this.weapons) {
      weapon.runtime.update(delta, enemies);
      if (![GameState.IN_GAME, GameState.READY].includes(this.scene.registry.get('state'))) return;
    }
    if (![GameState.IN_GAME, GameState.READY].includes(this.scene.registry.get('state'))) return;
    for (const weapon of this.weapons) {
      weapon.elapsedMs += delta;
      if (weapon.elapsedMs >= weapon.effective.stats.intervalMs) {
        weapon.elapsedMs %= weapon.effective.stats.intervalMs;
        weapon.runtime.fire(weapon.effective, facing, enemies);
        if (![GameState.IN_GAME, GameState.READY].includes(this.scene.registry.get('state'))) return;
      }
    }
  }
}
