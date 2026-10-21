import { ChainLightning } from './behaviors/chain-lightning.js';
import { StraightProjectile } from './behaviors/straight-projectile.js';
import { GameState } from '../run/run-state.js';
import { emptyUpgradeTiers, validUpgradeTiers, normalizeUpgradeTiers, effectiveWeapon, canUpgrade } from './weapon-upgrades.js';
// Unique weapon slots and a reusable projectile pool; no physics dependency.
export class WeaponSystem {
  constructor(scene, player, catalog) {
    this.catalog = catalog;
    this.definitions = catalog.definitions;
    this.scene = scene;
    this.player = player;
    this.projectileBehavior = new StraightProjectile(scene, player);
    this.lightningBehavior = new ChainLightning(scene, player);
    this.reset();
  }
  equip(id, tiers = emptyUpgradeTiers()) {
    const definition = this.definitions.get(id);
    if (!definition) return false;
    if (this.weapons.length >= this.catalog.maxEquippedWeapons || this.weapons.some(w => w.definition.id === definition.id)) return false;
    if (!validUpgradeTiers(tiers)) return false;
    tiers = normalizeUpgradeTiers(definition,tiers);
    let effective;
    try { effective = effectiveWeapon(definition, tiers); } catch { return false; }
    const maxFireTier = Math.ceil((definition.stats.intervalMs - definition.upgrades['fire-rate'].minimumIntervalMs) / definition.upgrades['fire-rate'].intervalReductionMs);
    if (tiers['fire-rate'] > maxFireTier) return false;
    this.weapons.push({ definition, tiers: {...tiers}, effective, elapsedMs: 0 });
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
  reset() {
    this.lightningBehavior.reset();
    this.projectileBehavior.reset();
    this.weapons = [];
    for (const id of this.catalog.startingWeapons) this.equip(id);
  }
  update(delta, facing, enemies) {
    this.lightningBehavior.updateChain(delta,enemies);
    this.projectileBehavior.update(delta, enemies);
    if (![GameState.IN_GAME, GameState.READY].includes(this.scene.registry.get('state'))) return;
    for (const weapon of this.weapons) {
      weapon.elapsedMs += delta;
      if (weapon.elapsedMs >= weapon.effective.stats.intervalMs) {
        weapon.elapsedMs %= weapon.effective.stats.intervalMs;
        if (weapon.definition.behavior.type === 'chain-lightning') {
          if (enemies) this.lightningBehavior.fireChainLightning(weapon.effective, enemies);
        }
        else this.projectileBehavior.fire(weapon.effective, facing);
        if (![GameState.IN_GAME, GameState.READY].includes(this.scene.registry.get('state'))) return;
      }
    }
  }
}
