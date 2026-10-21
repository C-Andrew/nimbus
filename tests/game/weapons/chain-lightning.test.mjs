import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectChainTargets, selectChainWave, lightningHopColor } from '../../../src/game/weapons/behaviors/lightning-targeting.js';
import { effectiveWeapon, emptyUpgradeTiers, validateUpgradeDefinition } from '../../../src/game/weapons/weapon-upgrades.js';
const makeEnemy = (x,y,active=true) => ({sprite:{x,y,active}});
const a=makeEnemy(50,0), b=makeEnemy(110,0), c=makeEnemy(180,0), dead=makeEnemy(10,0,false);
assert.deepEqual(selectChainTargets({x:0,y:0},[a,b,c,dead],100,75,3),[a,b,c]);
assert.deepEqual(selectChainTargets({x:0,y:0},[a,b,c],49,75,3),[]);
assert.deepEqual(selectChainTargets({x:0,y:0},[a,b,c],100,59,3),[a]);
assert.deepEqual(selectChainTargets({x:0,y:0},[a,b,c],100,75,2),[a,b]);
assert.deepEqual(selectChainTargets({x:0,y:0},[a],100,1000,8),[a],'no target revisited');
const config=JSON.parse(await readFile(new URL('../../../src/data/weapons.json',import.meta.url),'utf8'));
const definition=config.weapons.find(w=>w.id==='chain-lightning');
validateUpgradeDefinition(definition);
const zero=emptyUpgradeTiers();
assert.equal(effectiveWeapon(definition,zero).stats.jumps,1);
const upgraded=effectiveWeapon(definition,{size:2,'fire-rate':12,effect:5});
assert.equal(upgraded.stats.jumps,6);
assert.equal(upgraded.stats.intervalMs,300);
assert.equal(upgraded.stats.jumpRangePixels,180);
assert.equal(upgraded.stats.projectileCount,3,'legacy size tiers convert to count');
assert.equal(upgraded.stats.targetRangePixels,300);
assert.equal(upgraded.stats.damage,1);
console.log('Passed: nearest-target chains, range limits, distinct targets, jump/size/rate upgrades.');

assert.equal(lightningHopColor('#0088ff',0.15,0),0x0088ff);
const colors=Array.from({length:7},(_,hop)=>lightningHopColor('#0088ff',0.15,hop));
assert.equal(new Set(colors).size,7);
for(let i=1;i<colors.length;i++) {
  assert(((colors[i]>>16)&255)>((colors[i-1]>>16)&255));
  assert(((colors[i]>>8)&255)>((colors[i-1]>>8)&255));
  assert.equal(colors[i]&255,255,'blue stays at full intensity');
}
assert.equal(lightningHopColor('#0088ff',0.15,100),0xffffff,'brightness caps at white');
console.log('Passed: electric-blue first strike and monotonically brighter blue-to-white jumps.');

const targets=Array.from({length:18},(_,i)=>makeEnemy(10+i*4,0));
const excluded=new Set();
let origins=[{x:0,y:0}];
for(let jump=0;jump<6;jump++) {
 const links=selectChainWave(origins,targets,100,Math.min(jump+1,3),excluded);
 assert.equal(links.length,Math.min(jump+1,3));
 for(const {enemy,origin} of links){assert(!excluded.has(enemy));assert(origins.includes(origin));excluded.add(enemy);}
 origins=links.map(link=>({x:link.enemy.sprite.x,y:link.enemy.sprite.y}));
}
assert.equal(excluded.size,15,'1 + 2 + 3 + 3 + 3 + 3 distinct targets');
assert.deepEqual(selectChainWave([{x:1000,y:1000}],targets,1,3,new Set()),[]);
console.log('Passed: fan-out of 1, 2, then 3 per jump, frontier links, no duplicate targets, and range termination.');

const {selectLightningVolley}=await import('../../../src/game/weapons/behaviors/lightning-targeting.js');
const north=makeEnemy(0,-50),south=makeEnemy(0,70),east=makeEnemy(60,0),sameNorth=makeEnemy(0,-80);
assert.deepEqual(selectLightningVolley({x:0,y:0},[north,south,east,sameNorth],300,3,15),[north,south,east]);
assert.equal(selectLightningVolley({x:0,y:0},[north,sameNorth],300,3,15).length,1,'same-direction targets do not duplicate bolts');
assert.deepEqual(selectLightningVolley({x:0,y:0},[north],10,2,15),[]);
const countUpgraded=effectiveWeapon(definition,{...zero,'projectile-count':2});
assert.equal(countUpgraded.stats.projectileCount,3);
assert.equal(countUpgraded.stats.jumpRangePixels,180);
console.log('Passed: distinct directional volley targets, unavailable bearings, count upgrades, and fixed jump range.');
