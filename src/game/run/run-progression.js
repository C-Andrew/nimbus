const nonnegativeInteger = value => Number.isSafeInteger(value) && value >= 0;

export function isValidProgressionConfig(value) {
  return Number.isSafeInteger(value?.xpPerLevel) && value.xpPerLevel > 0
    && nonnegativeInteger(value.xpIncreasePerLevel ?? 0);
}

// Exact arithmetic keeps checkpoint validation reliable even near the safe XP limit.
function totalXpForLevel(level, base, increase) {
  const n = BigInt(level);
  return n * BigInt(base) + n * (n - 1n) / 2n * BigInt(increase);
}

function progressAt(totalXp, base, increase) {
  const total = BigInt(totalXp);
  let low = 0;
  let high = Math.floor(totalXp / base);
  while (low < high) {
    const middle = low + Math.ceil((high - low) / 2);
    if (totalXpForLevel(middle, base, increase) <= total) low = middle;
    else high = middle - 1;
  }
  const threshold = BigInt(base) + BigInt(low) * BigInt(increase);
  if (threshold > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('XP threshold exceeds the session limit');
  return {
    level: low,
    currentXp: Number(total - totalXpForLevel(low, base, increase)),
    xpPerLevel: Number(threshold),
  };
}

/** Session-local counters. No rewards or persistence side effects live here. */
export class RunProgression {
  constructor(config, onChange = () => {}) {
    if (typeof config === 'number') config = { xpPerLevel: config };
    if (!isValidProgressionConfig(config)) throw new RangeError('Invalid XP curve configuration');
    if (typeof onChange !== 'function') throw new TypeError('Progression change handler must be a function');
    this.onChange = onChange;
    this.config = { xpPerLevel: config.xpPerLevel, xpIncreasePerLevel: config.xpIncreasePerLevel ?? 0 };
    this.reset();
  }

  reset() {
    this.baseXpPerLevel = this.config.xpPerLevel;
    this.xpIncreasePerLevel = this.config.xpIncreasePerLevel;
    this.xpPerLevel = this.baseXpPerLevel;
    this.currentXp = 0;
    this.totalXp = 0;
    this.level = 0;
    this.onChange(this.snapshot());
  }

  addXp(amount) {
    if (!nonnegativeInteger(amount) || !Number.isSafeInteger(this.totalXp + amount)) {
      throw new RangeError('XP award must be a nonnegative safe integer within the session limit');
    }
    const previousLevel = this.level;
    const totalXp = this.totalXp + amount;
    const next = progressAt(totalXp, this.baseXpPerLevel, this.xpIncreasePerLevel);
    Object.assign(this, next, { totalXp });
    if (amount > 0) this.onChange(this.snapshot());
    return this.level - previousLevel;
  }

  snapshot() {
    const value = { currentXp: this.currentXp, totalXp: this.totalXp, level: this.level, xpPerLevel: this.xpPerLevel };
    if (this.xpIncreasePerLevel > 0) {
      value.curve = { xpPerLevel: this.baseXpPerLevel, xpIncreasePerLevel: this.xpIncreasePerLevel };
    }
    return value;
  }

  restore(saved) {
    if (saved === undefined) {
      this.reset(); // Backward compatibility for checkpoints predating XP.
      return;
    }
    if (!isValidRunProgression(saved) || (saved.curve?.xpPerLevel ?? saved.xpPerLevel) !== this.config.xpPerLevel) {
      throw new Error('Invalid or incompatible saved progression');
    }
    // A checkpoint owns its curve so tuning changes cannot invalidate earned levels/upgrades.
    this.baseXpPerLevel = saved.curve?.xpPerLevel ?? saved.xpPerLevel;
    this.xpIncreasePerLevel = saved.curve?.xpIncreasePerLevel ?? 0;
    this.xpPerLevel = saved.xpPerLevel;
    this.currentXp = saved.currentXp;
    this.totalXp = saved.totalXp;
    this.level = saved.level;
    this.onChange(this.snapshot());
  }
}

export function isValidRunProgression(value) {
  if (!value || !['currentXp', 'totalXp', 'level', 'xpPerLevel'].every(key => nonnegativeInteger(value[key]))) return false;
  const curve = value.curve === undefined ? { xpPerLevel: value.xpPerLevel } : value.curve;
  if (!isValidProgressionConfig(curve)) return false;
  const increase = curve.xpIncreasePerLevel ?? 0;
  return BigInt(value.xpPerLevel) === BigInt(curve.xpPerLevel) + BigInt(value.level) * BigInt(increase)
    && value.currentXp < value.xpPerLevel
    && totalXpForLevel(value.level, curve.xpPerLevel, increase) + BigInt(value.currentXp) === BigInt(value.totalXp);
}
