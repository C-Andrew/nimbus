import { canUpgrade, upgradeCategories } from '../game/weapons/weapon-upgrades.js';

export function renderUpgradeChoices(ui, scene, selectUpgrade) {
  const weapon = scene.weapons.weapons.find(w=>w.definition.id === scene.upgradeWeaponId);
  const name=document.createElement('span');
  name.textContent=weapon.definition.name;
  ui.upgradeWeaponName.replaceChildren();
  if(weapon.definition.icon) {
    const icon=document.createElement('img');
    icon.src=weapon.definition.icon;
    icon.alt='';
    icon.width=32;icon.height=32;
    ui.upgradeWeaponName.append(icon);
  }
  ui.upgradeWeaponName.append(name);
  ui.upgradeChoices.replaceChildren();
  const upgrades = weapon.definition.upgrades;
  const lightning = weapon.definition.behavior.type === 'chain-lightning';
  const labels = {
    size: ['Size', lightning ? '' : `Increase projectile size by ${Math.round((upgrades.size.multiplierPerTier-1)*100)}% (${weapon.tiers.size}/${upgrades.size.maxTiers} upgrades).`],
    'projectile-count': ['Projectile Count', lightning ? `Fire an additional chain toward a different enemy (${weapon.tiers['projectile-count']}/${upgrades['projectile-count'].maxTiers} upgrades).` : ''],
    'fire-rate': ['Fire Rate', `Reduce firing interval by ${upgrades['fire-rate'].intervalReductionMs} ms (minimum ${upgrades['fire-rate'].minimumIntervalMs} ms).`],
    effect: ['Effect', lightning ? `Add ${upgrades.effect.jumpsPerTier} chain jump (${weapon.tiers.effect}/${upgrades.effect.maxTiers} upgrades).` : `Add a laser to the centered cone (${upgrades.effect.angleOffsetDegrees}° spacing) (${weapon.tiers.effect}/${upgrades.effect.maxTiers} upgrades).`],
  };
  for (const category of upgradeCategories(weapon.definition)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.upgrade = category;
    button.disabled = !canUpgrade(weapon.definition, weapon.tiers, category);
    const title = document.createElement('strong'); title.textContent = labels[category][0];
    const detail = document.createElement('span'); detail.textContent = button.disabled ? 'Maximum reached' : labels[category][1];
    button.append(title, detail);
    button.addEventListener('click', () => selectUpgrade(category));
    ui.upgradeChoices.append(button);
  }
}

