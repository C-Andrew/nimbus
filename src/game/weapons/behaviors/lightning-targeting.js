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
    let best = null;
    let nearestSq = range * range;
    for (const enemy of enemies) {
      if (!enemy.sprite.active || selected.has(enemy)) continue;
      for (const origin of origins) {
        const dx=enemy.sprite.x-origin.x, dy=enemy.sprite.y-origin.y;
        const distanceSq=dx*dx+dy*dy;
        if (distanceSq <= nearestSq) { nearestSq=distanceSq; best={enemy,origin}; }
      }
    }
    if (!best) break;
    links.push(best);
    selected.add(best.enemy);
  }
  return links;
}

/** Nearest first, then prefer bearings furthest from already selected bolts. */
export function selectLightningVolley(origin, enemies, range, count, separationDegrees) {
  const candidates=enemies.filter(enemy=>enemy.sprite.active&&Math.hypot(enemy.sprite.x-origin.x,enemy.sprite.y-origin.y)<=range);
  const selected=[],angles=[];
  while(selected.length<count) {
    let best=null,bestSeparation=-1,bestDistance=Infinity,bestAngle=0;
    for(const enemy of candidates) {
      if(selected.includes(enemy))continue;
      const dx=enemy.sprite.x-origin.x,dy=enemy.sprite.y-origin.y;
      const distance=dx*dx+dy*dy,angle=Math.atan2(dy,dx);
      const separation=angles.length?Math.min(...angles.map(other=>Math.abs(Math.atan2(Math.sin(angle-other),Math.cos(angle-other))))):Math.PI;
      if(angles.length&&separation+1e-10<separationDegrees*Math.PI/180)continue;
      if(separation>bestSeparation||(separation===bestSeparation&&distance<bestDistance)) {
        best=enemy;bestSeparation=separation;bestDistance=distance;bestAngle=angle;
      }
    }
    if(!best)break;
    selected.push(best);angles.push(bestAngle);
  }
  return selected;
}
