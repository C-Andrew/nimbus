import { readEnemyContent } from '../helpers/content.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateSpawnPhases, spawnWaveSize } from '../../src/game/enemies/spawn-schedule.js';
import { EnemySystem as EnemySpawner } from '../../src/game/enemies/enemy-system.js';
const catalog=await readEnemyContent();
const phases=catalog.spawner.tables.find(table=>table.id==='chasers').phases;
validateSpawnPhases(phases);
for(const [time,min,max] of [[0,1,5],[29999,1,5],[30000,6,12],[119999,6,12],[120000,13,24],[239999,13,24],[240000,13,24]]) {
 assert.equal(spawnWaveSize(phases,time,()=>0),min);
 assert.equal(spawnWaveSize(phases,time,()=>0.999999),max);
}
assert.throws(()=>validateSpawnPhases([{startMs:1,minCount:1,maxCount:5}]));
assert.throws(()=>validateSpawnPhases([{startMs:0,minCount:6,maxCount:5}]));
const scene={scale:{width:800,height:600}};
const spawner=new EnemySpawner(scene,{x:0,y:0},{...catalog,definitions:new Map()});
let counts={stationary:0,splitter:0};
spawner.spawn=id=>counts[id]++;
spawner.update(2999);assert.equal(counts.stationary,0);assert.equal(counts.splitter,0);
spawner.update(1);assert(counts.stationary>=1&&counts.stationary<=5);assert(counts.splitter>=1&&counts.splitter<=2);
for(const [time,chaserMin,chaserMax,splitMin,splitMax] of [[29999,6,12,2,4],[119999,13,24,4,6],[239999,13,24,4,6]]) {
 spawner.runElapsedMs=time;counts={stationary:0,splitter:0};
 spawner.update(1);
 assert(counts.stationary>=chaserMin&&counts.stationary<=chaserMax);
 assert(counts.splitter>=splitMin&&counts.splitter<=splitMax);
}
const splitPhases=catalog.spawner.tables.find(table=>table.id==='splitters').phases;
for(const [time,min,max] of [[0,1,2],[29999,1,2],[30000,2,4],[119999,2,4],[120000,4,6],[240000,4,6]]) {
 assert.equal(spawnWaveSize(splitPhases,time,()=>0),min);
 assert.equal(spawnWaveSize(splitPhases,time,()=>0.999999),max);
}
spawner.runElapsedMs=30500;counts={stationary:0,splitter:0};
spawner.update(100);assert.equal(counts.stationary,0);assert.equal(counts.splitter,0);
spawner.update(2400);assert(counts.stationary>=6&&counts.splitter>=2,'restored timing continues at next scheduled wave');
spawner.reset();assert.equal(spawner.runElapsedMs,0);assert.equal(spawner.elapsedMs,0);
console.log('Passed: independent Chaser/Splitter wave ranges, exact boundaries, three-second cadence, recovery, and run reset.');
