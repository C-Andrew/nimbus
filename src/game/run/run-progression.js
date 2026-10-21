/** Session-local counters. No rewards or persistence side effects live here. */
export class RunProgression {
  constructor(xpPerLevel, onChange = () => {}) {
    if (!Number.isSafeInteger(xpPerLevel) || xpPerLevel <= 0) {
      throw new RangeError('XP per level must be a positive safe integer');
    }
    if (typeof onChange !== 'function') throw new TypeError('Progression change handler must be a function');
    this.onChange = onChange;
    this.xpPerLevel = xpPerLevel;
    this.reset();
  }

  reset() {
    this.currentXp = 0;
    this.totalXp = 0;
    this.level = 0;
    this.onChange(this.snapshot());
  }

  addXp(amount) {
    if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(this.totalXp + amount)) {
      throw new RangeError('XP award must be a nonnegative safe integer within the session limit');
    }
    const previousLevel = this.level;
    this.totalXp += amount;
    this.level = Math.floor(this.totalXp / this.xpPerLevel);
    this.currentXp = this.totalXp % this.xpPerLevel;
    if (amount > 0) this.onChange(this.snapshot());
    return this.level - previousLevel;
  }

  snapshot() {
    return { currentXp: this.currentXp, totalXp: this.totalXp, level: this.level, xpPerLevel: this.xpPerLevel };
  }

  restore(saved) {
    if (saved === undefined) {
      this.reset(); // Backward compatibility for checkpoints predating XP.
      return;
    }
    if (!isValidRunProgression(saved) || saved.xpPerLevel !== this.xpPerLevel) {
      throw new Error('Invalid or incompatible saved progression');
    }
    this.currentXp = saved.currentXp;
    this.totalXp = saved.totalXp;
    this.level = saved.level;
    this.onChange(this.snapshot());
  }
}

export function isValidRunProgression(value) {
  if (!value || !['currentXp', 'totalXp', 'level', 'xpPerLevel'].every(key => Number.isSafeInteger(value[key]) && value[key] >= 0)) return false;
  return value.xpPerLevel > 0
    && value.currentXp === value.totalXp % value.xpPerLevel
    && value.level === Math.floor(value.totalXp / value.xpPerLevel);
}
