import { contentId } from '../../content/content-loader.js';
export function isValidEffectState(entries) {
  return Array.isArray(entries) && entries.length <= 256 && new Set(entries.map(entry => entry?.id)).size === entries.length
    && entries.every(entry => contentId(entry?.id) && Number.isSafeInteger(entry.stacks) && entry.stacks >= 1 && entry.stacks <= 100
      && (entry.remainingMs === null || (Number.isFinite(entry.remainingMs) && entry.remainingMs > 0 && entry.remainingMs <= Number.MAX_SAFE_INTEGER)));
}
