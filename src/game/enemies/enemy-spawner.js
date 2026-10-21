import { spawnWaveSize } from './spawn-schedule.js';
import { centeredViewport, findWorldSpawnPosition } from '../world/world-geometry.js';
import { bodyHalfWidth, bodyHalfHeight } from './enemy-body-collision.js';

/** Spawn timing and placement; owns no enemy health, rendering, or pools. */
export class EnemySpawner {
  constructor(scene, player, config, canOccupy) {
    this.scene = scene; this.player = player; this.config = config; this.canOccupy = canOccupy;
    this.runElapsedMs = 0;
    this.elapsedMs = config.spawnImmediately ? config.intervalMs : 0;
  }
  position(type, position, probe) {
    const appearance = type.appearance;
    const { width, height } = this.scene.scale;
    const bounds = centeredViewport(this.player, width, height);
    const radius = (appearance.shape === 'circle' ? appearance.radiusPixels : Math.max(appearance.widthPixels, appearance.heightPixels) / 2) + appearance.strokeWidthPixels / 2;
    const origin = position ?? findWorldSpawnPosition(bounds, this.player, radius, this.config.minimumDistanceScreenWidthRatio, Math.random, this.config.offscreenMarginPixels);
    if (!origin) return null;
    probe.type = type;
    return this.findFreePosition(probe, origin, position === null ? bounds : null);
  }
  advance(delta, spawn) {
    const previousTime = this.runElapsedMs;
    this.runElapsedMs += delta;
    this.elapsedMs = this.runElapsedMs % this.config.intervalMs;
    for (const table of this.config.tables) {
      const firstWave = Math.floor(previousTime / table.intervalMs) + 1;
      const lastWave = Math.floor(this.runElapsedMs / table.intervalMs);
      for (let wave = firstWave; wave <= lastWave; wave++) {
        const count = spawnWaveSize(table.phases, wave * table.intervalMs);
        for (let i = 0; i < count; i++) spawn(table.enemyTypeId);
      }
    }
  }
  findFreePosition(enemy, origin, offscreenBounds = null) {
    const width = bodyHalfWidth(enemy), height = bodyHalfHeight(enemy);
    const spacing = Math.max(width, height) * 2 + 2;
    // Bounded spawn work. Probe outward on a deterministic golden-angle spiral.
    for (let attempt = 0; attempt < 512; attempt++) {
      const radius = attempt === 0 ? 0 : spacing * Math.sqrt(attempt);
      const angle = attempt * 2.399963229728653;
      const x = origin.x + Math.cos(angle) * radius, y = origin.y + Math.sin(angle) * radius;
      if (offscreenBounds) {
        const margin = this.config.offscreenMarginPixels;
        if (!(x + width <= offscreenBounds.x - margin || x - width >= offscreenBounds.x + offscreenBounds.width + margin
          || y + height <= offscreenBounds.y - margin || y - height >= offscreenBounds.y + offscreenBounds.height + margin)) continue;
        if (Math.hypot(x - this.player.x, y - this.player.y) < offscreenBounds.width * this.config.minimumDistanceScreenWidthRatio) continue;
      }
      if (this.canOccupy(enemy, x, y)) return { x, y };
    }
    return null;
  }

}
