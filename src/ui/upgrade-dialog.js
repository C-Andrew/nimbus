import { canUpgrade, upgradeCategories, describeUpgrade } from '../game/weapons/weapon-upgrades.js';

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
  for (const category of upgradeCategories(weapon.definition)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.upgrade = category;
    button.disabled = !canUpgrade(weapon.definition, weapon.tiers, category);
    const [label, description] = describeUpgrade(weapon.definition, weapon.tiers, category);
    const title = document.createElement('strong'); title.textContent = label;
    const detail = document.createElement('span'); detail.textContent = button.disabled ? 'Maximum reached' : description;
    button.append(title, detail);
    button.addEventListener('click', () => selectUpgrade(category));
    ui.upgradeChoices.append(button);
  }
}

