/** Pure camera/world geometry shared by spawning, cleanup, and tests. */
export function centeredViewport(player, width, height) {
  return { x: player.x - width / 2, y: player.y - height / 2, width, height };
}

export function isOutsideViewport(point, bounds, margin = 0) {
  return point.x < bounds.x - margin || point.y < bounds.y - margin
    || point.x > bounds.x + bounds.width + margin
    || point.y > bounds.y + bounds.height + margin;
}

/** Sample the expanded camera perimeter; the whole enemy remains offscreen. */
export function findWorldSpawnPosition(bounds, player, radius, distanceRatio, random = Math.random, margin = 32) {
  if (bounds.width <= 0 || bounds.height <= 0) return null;
  const minimumDistance=bounds.width*distanceRatio;
  const left=Math.min(bounds.x-radius-margin,player.x-minimumDistance);
  const right=Math.max(bounds.x+bounds.width+radius+margin,player.x+minimumDistance);
  const top=Math.min(bounds.y-radius-margin,player.y-minimumDistance);
  const bottom=Math.max(bounds.y+bounds.height+radius+margin,player.y+minimumDistance);
  const width=right-left,height=bottom-top;
  let offset=random()*2*(width+height);
  if(offset<width)return {x:left+offset,y:top};
  offset-=width;
  if(offset<height)return {x:right,y:top+offset};
  offset-=height;
  if(offset<width)return {x:right-offset,y:bottom};
  return {x:left,y:bottom-(offset-width)};
}
