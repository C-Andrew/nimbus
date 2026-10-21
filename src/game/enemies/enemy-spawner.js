import { spawnWaveSize } from './spawn-schedule.js';
import { rollXpReward } from './enemy-rewards.js';
import { ENEMY_BEHAVIORS } from './enemy-behaviors.js';
import { centeredViewport, findWorldSpawnPosition, isOutsideViewport } from '../world/world-geometry.js';
import { enemyTouchesCircle, projectileContactTime } from './enemy-collisions.js';
import { EnemySpatialIndex } from './enemy-spatial-index.js';
import { createHitpointLabel } from './hitpoint-label.js';

const colorValue = value => Number.parseInt(value.slice(1), 16);

export class EnemySpawner {
  constructor(scene, player, catalog, onKill = () => {}, createLabel = createHitpointLabel) {
    this.catalog = catalog;
    this.definitions = catalog.definitions;
    this.spawnConfig = catalog.spawner;
    this.scene = scene;
    this.onKill = onKill;
    this.createLabel = createLabel;
    this.player = player;
    this.enemies = [];
    this.activeEnemies = new Set();
    this.freeEnemies = new Map();
    this.nextCollisionOrder = 0;
    this.typeIds = [...this.definitions.keys()];
    this.typeCodes = new Map(this.typeIds.map((id, index) => [id, index]));
    this.spatialIndex = new EnemySpatialIndex(this.definitions);
    this.collisionCandidates = [];
    this.kills = 0;
    this.runElapsedMs = 0;
    this.elapsedMs = this.spawnConfig.spawnImmediately ? this.spawnConfig.intervalMs : 0;
  }
  spawn(typeId = this.spawnConfig.enemyTypeId, position = null) {
    const type = this.definitions.get(typeId);
    if (!type) return false;
    const appearance = type.appearance;
    const { width, height } = this.scene.scale;
    const bounds = centeredViewport(this.player, width, height);
    const spawnRadius = (appearance.shape === 'circle' ? appearance.radiusPixels : Math.max(appearance.widthPixels,appearance.heightPixels)/2) + appearance.strokeWidthPixels/2;
    const p = position ?? findWorldSpawnPosition(bounds, this.player, spawnRadius, this.spawnConfig.minimumDistanceScreenWidthRatio, Math.random, this.spawnConfig.offscreenMarginPixels);
    if (!p) return false; // Wait for a valid viewport before automatic spawning.
    let enemy = this.freeEnemies.get(appearance.shape)?.pop();
    if (!enemy) {
      enemy = {
        sprite: appearance.shape === 'circle'
        ? this.scene.add.circle(0,0,appearance.radiusPixels,colorValue(appearance.color))
        : appearance.shape === 'triangle'
        ? this.scene.add.triangle(0,0,appearance.widthPixels/2,0,appearance.widthPixels,appearance.heightPixels,0,appearance.heightPixels,colorValue(appearance.color))
        : this.scene.add.rectangle(0,0,appearance.widthPixels,appearance.heightPixels,colorValue(appearance.color)),
        label: this.createLabel(this.scene),
      };
      enemy.collisionOrder = this.nextCollisionOrder++;
      this.enemies.push(enemy);
    }
    enemy.type = type;
    enemy.hp = type.stats.maxHitpoints;
    enemy.stunRemainingMs = 0;
    if (appearance.shape === 'circle') enemy.sprite.setRadius(appearance.radiusPixels);
    else if (appearance.shape === 'triangle') {
      enemy.sprite.setTo(appearance.widthPixels/2,0,appearance.widthPixels,appearance.heightPixels,0,appearance.heightPixels);
      enemy.sprite.setSize(appearance.widthPixels,appearance.heightPixels);
    }
    else enemy.sprite.setSize(appearance.widthPixels,appearance.heightPixels);
    enemy.sprite.setPosition(p.x, p.y).setFillStyle(colorValue(appearance.color)).setActive(true).setVisible(true);
    enemy.sprite.setStrokeStyle(appearance.strokeWidthPixels, colorValue(appearance.strokeColor));
    enemy.label.setFontSize(appearance.hitpointFontSizePixels).setColor(appearance.hitpointTextColor);
    enemy.label.setPosition(p.x, p.y).setText(String(enemy.hp)).setVisible(appearance.showHitpoints);
    this.activeEnemies.add(enemy);
    this.spatialIndex.update(enemy);
    return enemy;
  }
  stunEnemy(enemy, durationMs) {
    if (enemy.sprite.active) enemy.stunRemainingMs = Math.max(enemy.stunRemainingMs ?? 0, durationMs);
  }
  updateStatuses(delta) {
    const initialState = this.scene.registry?.get('state');
    for (const enemy of this.activeEnemies) {
      if (!enemy.sprite.active || !(enemy.stunRemainingMs > 0)) continue;
      enemy.stunRemainingMs = Math.max(0,enemy.stunRemainingMs-delta);
      if (enemy.stunRemainingMs === 0 && enemy.hp > 0) {
        enemy.sprite.setFillStyle(colorValue(enemy.type.appearance.color));
      }
      if (enemy.stunRemainingMs === 0 && enemy.hp === 0) {
        this.finishDeath(enemy);
        if (this.scene.registry?.get('state') !== initialState) return false;
      }
    }
    return true;
  }
  update(delta) {
    if (!this.updateStatuses(delta)) return;
    const { width, height } = this.scene.scale;
    const bounds = centeredViewport(this.player, width, height);
    // Recycle distant abandoned enemies so travel does not grow memory forever.
    const margin = Math.max(width, height) * 2;
    for (const enemy of this.activeEnemies) {
      if (enemy.sprite.active && !(enemy.stunRemainingMs > 0) && isOutsideViewport(enemy.sprite, bounds, margin)) {
        this.recycle(enemy);
      }
      if (!enemy.sprite.active) continue;
      if (enemy.stunRemainingMs > 0) continue;
      ENEMY_BEHAVIORS[enemy.type.behavior.type](enemy.sprite, this.player, enemy.type.stats.movementSpeedPixelsPerSecond, delta);
      enemy.label.setPosition(enemy.sprite.x, enemy.sprite.y);
      this.spatialIndex.update(enemy);
    }
    const previousTime=this.runElapsedMs;
    this.runElapsedMs+=delta;
    this.elapsedMs=this.runElapsedMs % this.spawnConfig.intervalMs;
    for(const table of this.spawnConfig.tables) {
      const firstWave=Math.floor(previousTime/table.intervalMs)+1;
      const lastWave=Math.floor(this.runElapsedMs/table.intervalMs);
      for(let wave=firstWave;wave<=lastWave;wave++) {
        const count=spawnWaveSize(table.phases,wave*table.intervalMs);
        for(let i=0;i<count;i++)this.spawn(table.enemyTypeId);
      }
    }
  }

  contactDamage(playerRadius) {
    // Simultaneous overlaps use the strongest hit; a shared player cooldown
    // prevents damage from depending on enemy iteration order or frame rate.
    let damage = 0;
    const candidates = this.spatialIndex.queryCircle(this.player.x, this.player.y, playerRadius, this.collisionCandidates);
    for (const enemy of candidates) {
      if (enemy.sprite.active && enemyTouchesCircle(enemy, this.player, playerRadius)) {
        damage = Math.max(damage, enemy.type.stats.baseDamage);
      }
    }
    return damage;
  }

  // Swept shape checks avoid lasers skipping through enemies between frames.
  hitTest(fromX, fromY, toX, toY, damage = 1, projectileRadius = 8) {
    let first = null, earliest = Infinity;
    const candidates = this.spatialIndex.querySegment(fromX, fromY, toX, toY, projectileRadius, this.collisionCandidates);
    for (const enemy of candidates) {
      if (!enemy.sprite.active) continue;
      const t = projectileContactTime(enemy,fromX,fromY,toX,toY,projectileRadius);
      if (t !== null && (t < earliest || (t === earliest && enemy.collisionOrder < first.collisionOrder))) {
        earliest = t;
        first = enemy;
      }
    }
    if (!first) return false;
    return this.damageEnemy(first, damage);
  }
  damageEnemy(enemy, damage) {
    if (!enemy.sprite.active) return false;
    const hp = Math.max(0, enemy.hp - damage);
    if (hp !== enemy.hp) {
      enemy.hp = hp;
      enemy.label.setText(String(hp));
    }
    if (enemy.hp === 0 && !(enemy.stunRemainingMs > 0)) this.finishDeath(enemy);
    return true;
  }
  finishDeath(enemy) {
    if (!enemy.sprite.active || enemy.hp > 0) return;
    // Capture data before pooling can reuse the defeated enemy's object.
    const deathEffect=enemy.type.onDeath;
    const x=enemy.sprite.x, y=enemy.sprite.y;
    const xp=rollXpReward(enemy.type.rewards.xp);
    this.kills++;
    this.recycle(enemy);
    if(deathEffect?.type==='spawn-enemies') {
      const rotation=Math.random()*Math.PI*2;
      for(let i=0;i<deathEffect.count;i++) {
        const angle=rotation+i*Math.PI*2/deathEffect.count;
        this.spawn(deathEffect.enemyTypeId,{
          x:x+Math.cos(angle)*deathEffect.radiusPixels,
          y:y+Math.sin(angle)*deathEffect.radiusPixels,
        });
      }
    }
    // Emit after children exist so an XP-triggered checkpoint is consistent.
    this.onKill(xp);
  }
  recycle(enemy) {
    if (!enemy.sprite.active) return;
    enemy.sprite.setActive(false).setVisible(false);
    enemy.label.setVisible(false);
    this.activeEnemies.delete(enemy);
    this.spatialIndex.remove(enemy);
    const shape = enemy.type.appearance.shape;
    let free = this.freeEnemies.get(shape);
    if (!free) this.freeEnemies.set(shape, free = []);
    free.push(enemy);
  }
  nearby(x, y, radius, result) {
    return this.nearbyBounds(x - radius, y - radius, x + radius, y + radius, result);
  }
  nearbyBounds(left, top, right, bottom, result) {
    this.spatialIndex.queryBounds(left, top, right, bottom, result);
    // Preserve the pool-order tie semantics of the original targeting helpers.
    result.sort((a, b) => a.collisionOrder - b.collisionOrder);
    return result;
  }
  snapshot() {
    return Array.from(this.activeEnemies, e => ({id:e.type.id,x:e.sprite.x,y:e.sprite.y,hp:e.hp,stunRemainingMs:e.stunRemainingMs ?? 0}));
  }
  packedSnapshot() {
    const values = new Float64Array(this.activeEnemies.size * 5);
    let offset = 0;
    for (const enemy of this.activeEnemies) {
      values[offset++] = this.typeCodes.get(enemy.type.id);
      values[offset++] = enemy.sprite.x;
      values[offset++] = enemy.sprite.y;
      values[offset++] = enemy.hp;
      values[offset++] = enemy.stunRemainingMs ?? 0;
    }
    return { typeIds: this.typeIds, values };
  }
  restore(entries) {
    this.reset();
    for (const entry of entries) {
      if (!this.definitions.has(entry.id)) throw new Error(`Unknown saved enemy: ${entry.id}`);
      const enemy = this.spawn(entry.id, {x:entry.x,y:entry.y});
      if (!enemy) throw new Error(`Cannot restore enemy: ${entry.id}`);
      enemy.hp = Math.min(entry.hp,enemy.type.stats.maxHitpoints);
      enemy.stunRemainingMs = entry.stunRemainingMs ?? 0;
      enemy.label.setText(String(enemy.hp));
    }
  }
  reset() {
    this.spatialIndex.clear();
    this.collisionCandidates.length = 0;
    this.activeEnemies.clear();
    this.freeEnemies.clear();
    this.kills = 0;
    this.runElapsedMs = 0;
    const retained = [];
    // Trim historical peaks between runs, never remove living enemies to cap load.
    for (const enemy of this.enemies) {
      enemy.sprite.setActive(false).setVisible(false);
      enemy.label.setVisible(false);
      const shape = enemy.type.appearance.shape;
      let free = this.freeEnemies.get(shape);
      if (!free) this.freeEnemies.set(shape, free = []);
      if (free.length < 64) { free.push(enemy); retained.push(enemy); }
      else { enemy.sprite.destroy(); enemy.label.destroy(); }
    }
    this.enemies = retained;
    this.elapsedMs = this.spawnConfig.spawnImmediately ? this.spawnConfig.intervalMs : 0;
  }
}
