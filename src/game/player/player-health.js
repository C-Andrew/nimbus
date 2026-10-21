/** Run-local health. Advance only during active gameplay. */
export class PlayerHealth {
  constructor(stats) {
    this.maxHp = stats.maxHitpoints;
    this.contactInvulnerabilityMs = stats.contactInvulnerabilityMs;
    this.reset();
  }

  reset() {
    this.hp = this.maxHp;
    this.invulnerabilityMs = 0;
  }

  advance(deltaMs) {
    this.invulnerabilityMs = Math.max(0, this.invulnerabilityMs - deltaMs);
  }

  takeDamage(damage) {
    if (!Number.isFinite(damage) || damage < 0) {
      throw new RangeError('Contact damage must be finite and nonnegative');
    }
    if (damage === 0 || this.hp === 0 || this.invulnerabilityMs > 0) return false;
    this.hp = Math.max(0, this.hp - damage);
    this.invulnerabilityMs = this.contactInvulnerabilityMs;
    return true;
  }

  snapshot() {
    return { hp: this.hp, invulnerabilityMs: this.invulnerabilityMs };
  }

  restore(saved) {
    // Checkpoints created before health was introduced start at full health.
    if (saved === undefined) {
      this.reset();
      return;
    }
    if (!isValidPlayerHealth(saved) || saved.hp > this.maxHp || saved.invulnerabilityMs > this.contactInvulnerabilityMs) throw new Error('Invalid saved player health');
    this.hp = saved.hp;
    this.invulnerabilityMs = saved.invulnerabilityMs;
  }
}

export function isValidPlayerHealth(saved) {
  return saved !== null && typeof saved === 'object'
    && Number.isInteger(saved.hp) && saved.hp > 0 && saved.hp <= Number.MAX_SAFE_INTEGER
    && Number.isFinite(saved.invulnerabilityMs)
    && saved.invulnerabilityMs >= 0
    && saved.invulnerabilityMs <= Number.MAX_SAFE_INTEGER;
}

export function circlesOverlap(a, radiusA, b, radiusB) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const radius = radiusA + radiusB;
  return dx * dx + dy * dy <= radius * radius;
}
