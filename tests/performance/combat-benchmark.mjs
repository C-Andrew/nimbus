import { readEnemyContent, readWeaponContent } from '../helpers/content.mjs';
// CPU-only regression benchmark: real combat models, stubbed Phaser rendering.
// Run with node tests/performance/combat-benchmark.mjs. This does not measure FPS/GPU work.
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { EnemySystem as EnemySpawner } from '../../src/game/enemies/enemy-system.js';
import { WeaponSystem } from '../../src/game/weapons/weapon-system.js';
const enemyData = await readEnemyContent(), weaponData = await readWeaponContent();
const enemiesCatalog = { ...enemyData, definitions: new Map(enemyData.enemies.map(type => [type.id, type])) };
const weaponsCatalog = { ...weaponData, definitions: new Map(weaponData.weapons.map(type => [type.id, type])) };
// Plain stubs avoid Proxy cost in the measured movement/collision path.
function fluent() { return this; }
function drawable() {
  const node = {
    x: 0, y: 0, active: true,
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setActive(value) { this.active = value; return this; },
  };
  for (const method of ['setVisible','setRadius','setTo','setSize','setFillStyle','setStrokeStyle','setFontSize','setColor','setText','setDepth','clear','lineStyle','beginPath','moveTo','lineTo','strokePath','destroy']) node[method] = fluent;
  return node;
}
const percentile = (samples, p) => [...samples].sort((a,b) => a-b)[Math.min(samples.length-1, Math.floor(samples.length*p))];
const runs = [];
const originalRandom = Math.random;
try {
for (let run = 0; run < 3; run++) {
  let seed = 42;
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const scene = { scale: { width: 960, height: 640 }, registry: { get: () => 'In-Game' },
    add: { circle: drawable, triangle: drawable, rectangle: drawable, graphics: drawable } };
  const player = { x: 0, y: 0 };
  const enemies = new EnemySpawner(scene, player, enemiesCatalog, () => {}, drawable);
  for (let i = 0; i < 500; i++) enemies.spawn(i % 4 ? 'stationary' : 'splitter', { x: (i % 25 - 12)*52, y: (Math.floor(i/25)-10)*52 });
  const weapons = new WeaponSystem(scene, player, weaponsCatalog);
  weapons.weapons = [];
  weapons.equip('chain-lightning', { size: 0, 'projectile-count': 3, 'fire-rate': 12, effect: 5 });
  const frameTimes = [], fireTimes = [], spawnTimes = [], slowFrames = [];
  const place = enemies.spawner.findFreePosition.bind(enemies.spawner);
  enemies.spawner.findFreePosition = (...args) => { const begin=performance.now(); const value=place(...args); spawnTimes.push(performance.now()-begin); return value; };
  let peak = enemies.activeEnemies.size;
  for (let frame = 0; frame < 900; frame++) {
    player.x = Math.sin(frame / 90) * 120; player.y = Math.cos(frame / 110) * 120;
    const begin = performance.now();
    enemies.update(1000/60);
    const beforeWeapon = performance.now();
    weapons.update(1000/60, { x: 0, y: -1 }, enemies);
    fireTimes.push(performance.now() - beforeWeapon);
    const elapsed = performance.now() - begin;
    frameTimes.push(elapsed);
    if (elapsed > 1000/60) slowFrames.push({ frame, totalMs: elapsed, enemyUpdateMs: beforeWeapon - begin, lightningMs: fireTimes.at(-1) });
    peak = Math.max(peak, enemies.activeEnemies.size);
  }
  runs.push({ run: run+1, initialEnemies: 500, peakEnemies: peak, finalEnemies: enemies.activeEnemies.size,
    updateMedianMs: percentile(frameTimes,.5), updateP95Ms: percentile(frameTimes,.95), updateMaxMs: Math.max(...frameTimes),
    lightningP95Ms: percentile(fireTimes,.95), lightningMaxMs: Math.max(...fireTimes), spawnPlacementMaxMs: spawnTimes.length ? Math.max(...spawnTimes) : 0, slowFrames });
}
} finally { Math.random = originalRandom; }
console.log(JSON.stringify({ note: 'CPU model timings only; excludes Phaser rendering, browser scheduling and GPU.', runs }, null, 2));
