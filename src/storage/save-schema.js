import { validUpgradeTiers } from '../game/weapons/weapon-upgrades.js';
import { isValidRunProgression } from '../game/run/run-progression.js';
import { isValidPlayerHealth } from '../game/player/player-health.js';

export const SAVE_VERSION = 1;
export const defaultProfile = () => ({
  schemaVersion: SAVE_VERSION,
  progression: { currency: 0, unlockedWeapons: ['basic-laser'], upgrades: {} },
  stats: { runsCompleted: 0, totalKills: 0, totalPlayTimeMs: 0, longestRunMs: 0 },
  settings: { audioVolume: 1, graphicsQuality: 'auto' },
});
const nonnegative = n => Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER;
const coordinate = n => Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER;
const integer = n => nonnegative(n) && Number.isInteger(n);
const id = s => typeof s === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(s);
const fail = () => { throw new Error('Invalid or unsupported save data'); };
export function validateProfile(p) {
  if (p?.schemaVersion !== SAVE_VERSION || !p.progression || !p.stats || !p.settings) fail();
  if (!integer(p.progression.currency) || !Array.isArray(p.progression.unlockedWeapons) || !p.progression.unlockedWeapons.every(id)) fail();
  if (!p.progression.upgrades || Array.isArray(p.progression.upgrades) || typeof p.progression.upgrades !== 'object' || !Object.entries(p.progression.upgrades).every(([k,v]) => id(k) && integer(v))) fail();
  for (const key of ['runsCompleted', 'totalKills']) if (!integer(p.stats[key])) fail();
  for (const key of ['totalPlayTimeMs', 'longestRunMs']) if (!nonnegative(p.stats[key])) fail();
  if (!nonnegative(p.settings.audioVolume) || p.settings.audioVolume > 1 || !['auto', 'low', 'high'].includes(p.settings.graphicsQuality)) fail();
  return p;
}
export function validateRun(r) {
  if (!r || !id(r.id) || !nonnegative(r.durationMs) || !integer(r.kills)) fail();
  if (r.progression !== undefined && !isValidRunProgression(r.progression)) fail();
  return r;
}
export function validateCheckpoint(c) {
  if (c === null) return c;
  validateRun(c);
  const s = c.scene;
  if (!s || !coordinate(s.player?.x) || !coordinate(s.player?.y) || !Number.isFinite(s.facing?.x) || !Number.isFinite(s.facing?.y) || Math.abs(Math.hypot(s.facing.x,s.facing.y)-1) > 0.001) fail();
  if (s.progression !== undefined && !isValidRunProgression(s.progression)) fail();
  if (s.player.health !== undefined && !isValidPlayerHealth(s.player.health)) fail();
  if (!Array.isArray(s.weapons) || s.weapons.length > 6 || new Set(s.weapons.map(w=>w.id)).size !== s.weapons.length || !s.weapons.every(w=>id(w.id)&&nonnegative(w.elapsedMs)&&(w.upgrades===undefined||validUpgradeTiers(w.upgrades)))) fail();
  if (s.pendingLevelUps !== undefined && (!integer(s.pendingLevelUps) || s.pendingLevelUps > (s.progression?.level ?? 0))) fail();
  if (s.upgradeWeaponId != null && (!id(s.upgradeWeaponId) || !s.weapons.some(w=>w.id===s.upgradeWeaponId) || !(s.pendingLevelUps > 0))) fail();
  if (s.spawnRunElapsedMs !== undefined && !nonnegative(s.spawnRunElapsedMs)) fail();
  if (!nonnegative(s.spawnElapsedMs) || !Array.isArray(s.enemies) || s.enemies.length > 10000 || !s.enemies.every(e=>id(e.id)&&coordinate(e.x)&&coordinate(e.y)&&integer(e.hp)&&(e.hp>0||(e.stunRemainingMs>0))&&(e.stunRemainingMs===undefined||nonnegative(e.stunRemainingMs)))) fail();
  return c;
}
export function validateBackup(data) {
  if (data?.format !== 'nimbus-save' || data.schemaVersion !== SAVE_VERSION || !Array.isArray(data.runs) || data.runs.length > 100000) fail();
  validateProfile(data.profile);
  data.runs.forEach(validateRun);
  if (new Set(data.runs.map(r=>r.id)).size !== data.runs.length) fail();
  validateCheckpoint(data.checkpoint);
  if (data.checkpoint && data.runs.some(r=>r.id===data.checkpoint.id)) fail();
  return data;
}
// Future save-format migrations belong here, before validation. Never downgrade
// or overwrite an unknown newer version with defaults.
export function migrateBackup(data) { return validateBackup(data); }

