import { createHitpointLabel } from './hitpoint-label.js';
const colorValue = value => Number.parseInt(value.slice(1), 16);

export class EnemyRenderer {
  constructor(scene, createLabel = createHitpointLabel) { this.scene = scene; this.createLabel = createLabel; }
  create(type) {
    const appearance = type.appearance;
    return {
        sprite: appearance.shape === 'circle'
        ? this.scene.add.circle(0,0,appearance.radiusPixels,colorValue(appearance.color))
        : appearance.shape === 'triangle'
        ? this.scene.add.triangle(0,0,appearance.widthPixels/2,0,appearance.widthPixels,appearance.heightPixels,0,appearance.heightPixels,colorValue(appearance.color))
        : this.scene.add.rectangle(0,0,appearance.widthPixels,appearance.heightPixels,colorValue(appearance.color)),
        label: this.createLabel(this.scene),
    };
  }
  configure(enemy, type, position) {
    const appearance = type.appearance;
    if (appearance.shape === 'circle') enemy.sprite.setRadius(appearance.radiusPixels);
    else if (appearance.shape === 'triangle') {
      enemy.sprite.setTo(appearance.widthPixels/2,0,appearance.widthPixels,appearance.heightPixels,0,appearance.heightPixels);
      enemy.sprite.setSize(appearance.widthPixels,appearance.heightPixels);
    }
    else enemy.sprite.setSize(appearance.widthPixels,appearance.heightPixels);
    enemy.sprite.setPosition(position.x, position.y).setFillStyle(colorValue(appearance.color)).setActive(true).setVisible(true);
    enemy.sprite.setStrokeStyle(appearance.strokeWidthPixels, colorValue(appearance.strokeColor));
    enemy.label.setFontSize(appearance.hitpointFontSizePixels).setColor(appearance.hitpointTextColor);
    enemy.label.setPosition(position.x, position.y).setText(String(enemy.hp)).setVisible(appearance.showHitpoints);
  }
}
