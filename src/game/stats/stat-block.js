import { contentId } from '../../content/content-loader.js';

export function validateStatDefinitions(document) {
  if (document?.schemaVersion !== 1 || !document.stats || Array.isArray(document.stats)) throw new Error('Invalid stat definitions');
  for (const [id, rule] of Object.entries(document.stats)) {
    if (!contentId(id) || !rule || !Number.isFinite(rule.minimum) || !Number.isFinite(rule.maximum) || rule.minimum > rule.maximum
      || (rule.integer !== undefined && typeof rule.integer !== 'boolean')
      || (rule.integer && (!Number.isInteger(rule.minimum) || !Number.isInteger(rule.maximum)))
      || (rule.default !== undefined && (!Number.isFinite(rule.default) || rule.default < rule.minimum || rule.default > rule.maximum
        || (rule.integer && !Number.isInteger(rule.default))))) throw new Error(`Invalid stat rule: ${id}`);
  }
  return document.stats;
}
export function validateModifiers(modifiers, definitions) {
  if (!Array.isArray(modifiers) || modifiers.length > 128) throw new Error('Invalid stat modifiers');
  for (const modifier of modifiers) {
    if (!modifier || !Object.hasOwn(definitions, modifier.stat) || !['add', 'multiply'].includes(modifier.operation)
      || !Number.isFinite(modifier.value) || (modifier.operation === 'multiply' && modifier.value < 0)) throw new Error('Invalid stat modifier');
  }
  return modifiers;
}

/** Recompute on source changes only: (base + sum(add)) * product(multiply), then limits. */
export class StatBlock {
  constructor(base, definitions, onChange = () => {}) {
    this.definitions = definitions;
    this.base = {};
    this.sources = new Map();
    this.onChange = onChange;
    for (const key of Object.keys(base)) if (!Object.hasOwn(definitions, key)) throw new Error(`Unknown base stat: ${key}`);
    for (const [key, rule] of Object.entries(definitions)) {
      const value = base[key] ?? rule.default;
      if (!Number.isFinite(value) || value < rule.minimum || value > rule.maximum || (rule.integer && !Number.isInteger(value))) throw new Error(`Invalid base stat: ${key}`);
      this.base[key] = value;
    }
    Object.freeze(this.base);
    this.values = Object.freeze({ ...this.base });
  }
  setSource(id, modifiers) {
    if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,256}$/.test(id)) throw new Error('Invalid modifier source');
    validateModifiers(modifiers, this.definitions);
    const next = this.pendingSources ?? new Map(this.sources);
    next.set(id, modifiers.map(modifier => ({ ...modifier })));
    if (!this.pendingSources) this.commit(next);
  }
  removeSource(id) {
    const current = this.pendingSources ?? this.sources;
    if (!current.has(id)) return;
    const next = this.pendingSources ?? new Map(this.sources); next.delete(id);
    if (!this.pendingSources) this.commit(next);
  }
  batch(work) {
    if (this.pendingSources) return work();
    this.pendingSources = new Map(this.sources);
    try {
      work();
      const next = this.pendingSources;
      this.pendingSources = null;
      this.commit(next);
    }
    finally { this.pendingSources = null; }
  }
  commit(sources) {
    const values = {};
    // Stable source order makes application/removal order independent of results.
    const ordered = [...sources].sort(([a], [b]) => a.localeCompare(b));
    for (const [key, base] of Object.entries(this.base)) {
      let addition = 0, multiplier = 1;
      for (const [, modifiers] of ordered) for (const modifier of modifiers) {
        if (modifier.stat !== key) continue;
        if (modifier.operation === 'add') addition += modifier.value; else multiplier *= modifier.value;
      }
      let value = (base + addition) * multiplier;
      if (!Number.isFinite(value)) throw new Error(`Stat overflow: ${key}`);
      const rule = this.definitions[key];
      if (rule.integer) value = Math.round(value);
      values[key] = Math.max(rule.minimum, Math.min(rule.maximum, value));
    }
    const previous = this.values;
    this.sources = sources;
    if (Object.keys(values).every(key => values[key] === previous[key])) return;
    this.values = Object.freeze(values);
    this.onChange(this.values, previous);
  }
}
