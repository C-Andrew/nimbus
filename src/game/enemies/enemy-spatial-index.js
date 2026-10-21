/** Broad phase only: exact shape collisions remain in enemy-collisions.js. */
export class EnemySpatialIndex {
  constructor(definitions, cellSize = 128) {
    if (!Number.isFinite(cellSize) || cellSize <= 0) throw new RangeError('Invalid spatial cell size');
    this.cellSize = cellSize;
    this.columns = new Map();
    this.locations = new Map();
    this.halfWidth = 0;
    this.halfHeight = 0;
    this.projectilePaddingScale = 1;
    for (const { appearance } of definitions.values()) {
      const halfWidth = appearance.shape === 'circle' ? appearance.radiusPixels : appearance.widthPixels / 2;
      const halfHeight = appearance.shape === 'circle' ? appearance.radiusPixels : appearance.heightPixels / 2;
      this.halfWidth = Math.max(this.halfWidth, halfWidth + (appearance.strokeWidthPixels ?? 0) / 2);
      this.halfHeight = Math.max(this.halfHeight, halfHeight + (appearance.strokeWidthPixels ?? 0) / 2);
      if (appearance.shape === 'triangle') {
        // The existing sweep expands edge planes, producing mitered corners.
        // Their tips extend farther than one projectile radius beyond the body.
        const side = Math.hypot(halfWidth, appearance.heightPixels);
        this.projectilePaddingScale = Math.max(this.projectilePaddingScale,
          side / halfWidth, (side + halfWidth) / appearance.heightPixels);
      }
    }
  }

  update(enemy) {
    const x = Math.floor(enemy.sprite.x / this.cellSize);
    const y = Math.floor(enemy.sprite.y / this.cellSize);
    const previous = this.locations.get(enemy);
    if (previous?.x === x && previous.y === y) return;
    this.remove(enemy);
    let column = this.columns.get(x);
    if (!column) this.columns.set(x, column = new Map());
    let cell = column.get(y);
    if (!cell) column.set(y, cell = new Set());
    cell.add(enemy);
    this.locations.set(enemy, { x, y });
  }

  remove(enemy) {
    const location = this.locations.get(enemy);
    if (!location) return;
    const column = this.columns.get(location.x);
    const cell = column.get(location.y);
    cell.delete(enemy);
    if (!cell.size) column.delete(location.y);
    if (!column.size) this.columns.delete(location.x);
    this.locations.delete(enemy);
  }

  clear() {
    this.columns.clear();
    this.locations.clear();
  }

  queryCircle(x, y, radius, result) {
    return this.queryBounds(x - radius, y - radius, x + radius, y + radius, result);
  }

  querySegment(fromX, fromY, toX, toY, radius, result) {
    const padding = radius * this.projectilePaddingScale;
    return this.queryBounds(Math.min(fromX, toX) - padding, Math.min(fromY, toY) - padding,
      Math.max(fromX, toX) + padding, Math.max(fromY, toY) + padding, result);
  }

  queryBounds(left, top, right, bottom, result) {
    // Centers occupy exactly one cell. Expand by catalog body extents so large
    // enemies are found even when their centers lie outside the query bounds.
    const minX = Math.floor((left - this.halfWidth) / this.cellSize);
    const maxX = Math.floor((right + this.halfWidth) / this.cellSize);
    const minY = Math.floor((top - this.halfHeight) / this.cellSize);
    const maxY = Math.floor((bottom + this.halfHeight) / this.cellSize);
    result.length = 0;
    for (let x = minX; x <= maxX; x++) {
      const column = this.columns.get(x);
      if (!column) continue;
      for (let y = minY; y <= maxY; y++) {
        const cell = column.get(y);
        if (cell) for (const enemy of cell) result.push(enemy);
      }
    }
    return result;
  }
}
