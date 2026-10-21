// Cache local polygon geometry once per catalog shape, not once per pair/frame.
const geometryCache = new WeakMap();
const EPSILON = 1e-7;

function geometry(appearance) {
  let cached = geometryCache.get(appearance);
  if (cached) return cached;
  const w = appearance.widthPixels / 2, h = appearance.heightPixels / 2;
  const vertices = appearance.shape === 'triangle'
    ? new Float64Array([0, -h, w, h, -w, h])
    : new Float64Array([-w, -h, w, -h, w, h, -w, h]);
  const axes = new Float64Array(vertices.length);
  for (let i = 0; i < vertices.length; i += 2) {
    const next = (i + 2) % vertices.length;
    const dx = vertices[next] - vertices[i], dy = vertices[next + 1] - vertices[i + 1];
    const length = Math.hypot(dx, dy);
    axes[i] = -dy / length; axes[i + 1] = dx / length;
  }
  cached = { vertices, axes };
  geometryCache.set(appearance, cached);
  return cached;
}

function separated(a, ax, ay, b, bx, by, nx, ny) {
  const shapeA = a.type.appearance, shapeB = b.type.appearance;
  let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
  if (shapeA.shape === 'circle') {
    const center = ax * nx + ay * ny;
    minA = center - shapeA.radiusPixels; maxA = center + shapeA.radiusPixels;
  } else {
    const vertices = geometry(shapeA).vertices;
    for (let i = 0; i < vertices.length; i += 2) {
      const value = (ax + vertices[i]) * nx + (ay + vertices[i + 1]) * ny;
      minA = Math.min(minA, value); maxA = Math.max(maxA, value);
    }
  }
  if (shapeB.shape === 'circle') {
    const center = bx * nx + by * ny;
    minB = center - shapeB.radiusPixels; maxB = center + shapeB.radiusPixels;
  } else {
    const vertices = geometry(shapeB).vertices;
    for (let i = 0; i < vertices.length; i += 2) {
      const value = (bx + vertices[i]) * nx + (by + vertices[i + 1]) * ny;
      minB = Math.min(minB, value); maxB = Math.max(maxB, value);
    }
  }
  const padding = ((shapeA.strokeWidthPixels ?? 0) + (shapeB.strokeWidthPixels ?? 0)) / 2;
  return maxA + padding <= minB + EPSILON || maxB + padding <= minA + EPSILON;
}

/** Convex-body overlap tests with conservative visible-stroke clearance. */
export function enemiesOverlap(a, b, ax = a.sprite.x, ay = a.sprite.y) {
  const shapeA = a.type.appearance, shapeB = b.type.appearance;
  const bx = b.sprite.x, by = b.sprite.y;
  // Grid cells are deliberately coarse. Reject separated body bounds before SAT.
  if (Math.abs(ax - bx) >= bodyHalfWidth(a) + bodyHalfWidth(b)
    || Math.abs(ay - by) >= bodyHalfHeight(a) + bodyHalfHeight(b)) return false;
  if (shapeA.shape === 'circle' && shapeB.shape === 'circle') {
    const radius = shapeA.radiusPixels + shapeB.radiusPixels
      + ((shapeA.strokeWidthPixels ?? 0) + (shapeB.strokeWidthPixels ?? 0)) / 2;
    return (ax - bx) ** 2 + (ay - by) ** 2 < radius ** 2 - EPSILON;
  }
  if (shapeA.shape !== 'circle') {
    const axes = geometry(shapeA).axes;
    for (let i = 0; i < axes.length; i += 2) if (separated(a, ax, ay, b, bx, by, axes[i], axes[i + 1])) return false;
  }
  if (shapeB.shape !== 'circle') {
    const axes = geometry(shapeB).axes;
    for (let i = 0; i < axes.length; i += 2) if (separated(a, ax, ay, b, bx, by, axes[i], axes[i + 1])) return false;
  }
  if (shapeA.shape === 'circle' || shapeB.shape === 'circle') {
    const aIsCircle = shapeA.shape === 'circle';
    const cx = aIsCircle ? ax : bx, cy = aIsCircle ? ay : by;
    const px = aIsCircle ? bx : ax, py = aIsCircle ? by : ay;
    const vertices = geometry(aIsCircle ? shapeB : shapeA).vertices;
    let nearest = Infinity, nx = 0, ny = 0;
    for (let i = 0; i < vertices.length; i += 2) {
      const dx = cx - px - vertices[i], dy = cy - py - vertices[i + 1];
      const distance = dx * dx + dy * dy;
      if (distance < nearest) { nearest = distance; nx = dx; ny = dy; }
    }
    const length = Math.sqrt(nearest);
    if (length > 0 && separated(a, ax, ay, b, bx, by, nx / length, ny / length)) return false;
  }
  return true;
}

export function bodyHalfWidth(enemy) {
  const shape = enemy.type.appearance;
  return (shape.shape === 'circle' ? shape.radiusPixels : shape.widthPixels / 2) + (shape.strokeWidthPixels ?? 0) / 2;
}
export function bodyHalfHeight(enemy) {
  const shape = enemy.type.appearance;
  return (shape.shape === 'circle' ? shape.radiusPixels : shape.heightPixels / 2) + (shape.strokeWidthPixels ?? 0) / 2;
}
