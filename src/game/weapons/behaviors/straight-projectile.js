import { GameState } from '../../run/run-state.js';
import { centeredViewport, isOutsideViewport } from '../../world/world-geometry.js';

export class StraightProjectile {
  constructor(scene, player) { this.scene = scene; this.player = player; this.projectiles = []; }
  fire(definition, facing) {
    for (const angleDegrees of definition.projectileAnglesDegrees) {
      const radians = angleDegrees * Math.PI / 180;
      const cos = Math.cos(radians), sin = Math.sin(radians);
      this.fireProjectile(definition, {
        x: facing.x * cos - facing.y * sin,
        y: facing.x * sin + facing.y * cos,
      });
    }
  }
  fireProjectile(definition, facing) {
    const stats = definition.stats, visual = definition.projectile;
    let shot = this.projectiles.find(p => !p.sprite.active);
    if (!shot) {
      shot = { sprite: this.scene.add.rectangle(0, 0, 1, 1, 0xffffff).setDepth(1) };
      this.projectiles.push(shot);
    }
    shot.damage = stats.damage;
    shot.collisionRadius = visual.collisionRadiusPixels;
    shot.sprite.setSize(visual.widthPixels, visual.heightPixels).setFillStyle(Number.parseInt(visual.color.slice(1), 16));
    shot.sprite.setPosition(this.player.x + facing.x * stats.muzzleOffsetPixels, this.player.y + facing.y * stats.muzzleOffsetPixels)
    .setRotation(Math.atan2(facing.y, facing.x)).setActive(true).setVisible(true);
    shot.vx = facing.x * stats.speedPixelsPerSecond;
    shot.vy = facing.y * stats.speedPixelsPerSecond;
    shot.remainingMs = stats.lifetimeMs;
  }
  update(delta, enemies) {
    for (const shot of this.projectiles) {
      if (!shot.sprite.active) continue;
      const fromX = shot.sprite.x, fromY = shot.sprite.y;
      shot.remainingMs -= delta;
      shot.sprite.x += shot.vx * delta / 1000;
      shot.sprite.y += shot.vy * delta / 1000;
      if (enemies?.hitTest(fromX, fromY, shot.sprite.x, shot.sprite.y, shot.damage, shot.collisionRadius)) {
        shot.sprite.setActive(false).setVisible(false);
        if (![GameState.IN_GAME, GameState.READY].includes(this.scene.registry.get('state'))) return;
        continue;
      }
      const { width, height } = this.scene.scale;
      if (shot.remainingMs <= 0 || isOutsideViewport(shot.sprite, centeredViewport(this.player, width, height), 24)) {
        shot.sprite.setActive(false).setVisible(false);
      }
    }
  }
  reset() {
    for (const shot of this.projectiles) shot.sprite.setActive(false).setVisible(false);
  }
}
