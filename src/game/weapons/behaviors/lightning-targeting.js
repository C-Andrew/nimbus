/** Each strike selects distinct active targets, nearest first at every hop. */
export function selectChainTargets(origin, enemies, initialRange, jumpRange, maxTargets, excluded = new Set()) {
  const targets = [];
  const visited = new Set(excluded);
  let from = origin;
  for (let hop = 0; hop < maxTargets; hop++) {
    const range = hop === 0 ? initialRange : jumpRange;
    let nearest = null;
    let nearestDistanceSq = range * range;
    for (const enemy of enemies) {
      if (!enemy.sprite.active || visited.has(enemy)) continue;
      const dx = enemy.sprite.x - from.x, dy = enemy.sprite.y - from.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq <= nearestDistanceSq) {
        nearest = enemy;
        nearestDistanceSq = distanceSq;
      }
    }
    if (!nearest) break;
    targets.push(nearest);
    visited.add(nearest);
    from = nearest.sprite;
  }
  return targets;
}

/** Blend electric blue toward white as jump depth increases. */
export function lightningHopColor(hexColor, whitenessPerJump, hop) {
  const value = Number.parseInt(hexColor.slice(1), 16);
  const blend = Math.min(1, Math.max(0, whitenessPerJump * hop));
  return [16,8,0].reduce((color,shift) => {
    const channel = (value >> shift) & 255;
    return (color << 8) | Math.round(channel + (255-channel)*blend);
  },0);
}

/** Select a whole jump from the previous frontier, never from new siblings. */
export function selectChainWave(origins, enemies, range, limit, excluded) {
  const selected = new Set(excluded);
  const links = [];
  for (let slot = 0; slot < limit; slot++) {
    let bestEnemy = null, bestOrigin = null;
    let nearestSq = range * range;
    for (const enemy of enemies) {
      if (!enemy.sprite.active || selected.has(enemy)) continue;
      for (const origin of origins) {
        const dx=enemy.sprite.x-origin.x, dy=enemy.sprite.y-origin.y;
        const distanceSq=dx*dx+dy*dy;
        if (distanceSq <= nearestSq) { nearestSq=distanceSq; bestEnemy=enemy; bestOrigin=origin; }
      }
    }
    if (!bestEnemy) break;
    links.push({ enemy: bestEnemy, origin: bestOrigin });
    selected.add(bestEnemy);
  }
  return links;
}

/** Nearest first, then prefer bearings furthest from already selected bolts. */
export function selectLightningVolley(origin, enemies, range, count, separationDegrees) {
  const candidates = [];
  const rangeSq = range * range, minimumAngle = separationDegrees * Math.PI / 180;
  for (const enemy of enemies) {
    if (!enemy.sprite.active) continue;
    const dx = enemy.sprite.x - origin.x, dy = enemy.sprite.y - origin.y;
    const distance = dx * dx + dy * dy;
    if (distance <= rangeSq) candidates.push({ enemy, distance, angle: Math.atan2(dy, dx), separation: Math.PI, chosen: false });
  }
  const selected = [];
  while (selected.length < count) {
    let best = null;
    for (const candidate of candidates) {
      if (candidate.chosen || (selected.length > 0 && candidate.separation + 1e-10 < minimumAngle)) continue;
      if (!best || candidate.separation > best.separation + 1e-12
        || (Math.abs(candidate.separation - best.separation) <= 1e-12 && candidate.distance < best.distance)) best = candidate;
    }
    if (!best) break;
    best.chosen = true;
    selected.push(best.enemy);
    // Maintain the closest selected bearing incrementally. No nested trig or maps.
    for (const candidate of candidates) {
      const difference = Math.abs(candidate.angle - best.angle);
      candidate.separation = Math.min(candidate.separation, difference, Math.PI * 2 - difference);
    }
  }
  return selected;
}
