/** Move toward the current target at a constant speed without overshooting. */
export function chasePlayer(position, target, speedPixelsPerSecond, deltaMs) {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return;
  const step = Math.min(distance, speedPixelsPerSecond * deltaMs / 1000);
  position.x += dx / distance * step;
  position.y += dy / distance * step;
}

