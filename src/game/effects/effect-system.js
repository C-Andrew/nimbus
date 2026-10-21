import { effectHandler } from './effect-registry.js';
import { isValidEffectState } from './effect-state.js';

export function validatePowerUpState(entries, definitions, permanentOnly = false) {
  if (!isValidEffectState(entries)) throw new Error('Invalid saved power-ups');
  for (const entry of entries) {
    const definition = definitions.get(entry.id);
    if (!definition || entry.stacks > definition.maxStacks || (permanentOnly && definition.scope !== 'permanent')
      || (definition.scope === 'timed' ? entry.remainingMs === null || entry.remainingMs > definition.durationMs : entry.remainingMs !== null)) throw new Error(`Unsupported saved power-up: ${entry.id}`);
  }
  return entries;
}

/** Effects own their active-time clocks; gameplay pause never advances them. */
export class EffectSystem {
  constructor(stats, definitions, onPermanentChange = () => {}) {
    this.stats = stats; this.definitions = definitions; this.active = new Map(); this.onPermanentChange = onPermanentChange;
  }
  context(id, index, stacks) { return { stats: this.stats, sourceId: `powerup-${id}-${index}`, stacks }; }
  apply(id) {
    const definition = this.definitions.get(id);
    if (!definition) throw new Error(`Unknown power-up: ${id}`);
    const stacks = (this.active.get(id)?.stacks ?? 0) + 1;
    if (stacks > definition.maxStacks || (!this.active.has(id) && this.active.size >= 256)) return false;
    const entry = { id, stacks, remainingMs: definition.scope === 'timed' ? definition.durationMs : null };
    this.install(entry);
    if (definition.scope === 'permanent') this.onPermanentChange(this.permanentSnapshot());
    return true;
  }
  install(entry) {
    const definition = this.definitions.get(entry.id);
    this.stats.batch(() => definition.effects.forEach((effect, index) => effectHandler(effect).apply(this.context(entry.id, index, entry.stacks), effect)));
    this.active.set(entry.id, { ...entry });
  }
  remove(id, notify = true) {
    if (!this.active.has(id)) return;
    const definition = this.definitions.get(id);
    this.stats.batch(() => definition.effects.forEach((effect, index) => effectHandler(effect).remove(this.context(id, index, 0), effect)));
    this.active.delete(id);
    if (notify && definition.scope === 'permanent') this.onPermanentChange(this.permanentSnapshot());
  }
  advance(deltaMs) {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new RangeError('Invalid effect time');
    for (const entry of this.active.values()) {
      if (entry.remainingMs === null) continue;
      entry.remainingMs -= deltaMs;
      if (entry.remainingMs <= 0) this.remove(entry.id);
    }
  }
  clearRun() {
    this.stats.batch(() => {
      for (const entry of this.active.values()) if (this.definitions.get(entry.id).scope !== 'permanent') this.remove(entry.id);
    });
  }
  snapshot() { return Array.from(this.active.values(), entry => ({ ...entry })); }
  permanentSnapshot() { return this.snapshot().filter(entry => this.definitions.get(entry.id).scope === 'permanent'); }
  restoreRun(entries) {
    validatePowerUpState(entries, this.definitions);
    // Profile progression is authoritative when a checkpoint predates a permanent grant.
    this.restore([...this.permanentSnapshot(), ...entries.filter(entry => this.definitions.get(entry.id).scope !== 'permanent')]);
  }
  restore(entries, { permanentOnly = false } = {}) {
    validatePowerUpState(entries, this.definitions, permanentOnly);
    const previous = new Map(this.active);
    try {
      this.stats.batch(() => {
        for (const id of this.active.keys()) this.remove(id, false);
        for (const entry of entries) this.install(entry);
      });
    } catch (error) { this.active = previous; throw error; }
  }
}
