import assert from 'node:assert/strict';
import { centeredViewport, findWorldSpawnPosition, isOutsideViewport } from '../../src/game/world/world-geometry.js';
import { validateCheckpoint } from '../../src/storage/save-schema.js';
for (const player of [{x:0,y:0},{x:-100000,y:75000},{x:10000000,y:-10000000}]) {
  for (const [width,height] of [[390,844],[1440,900],[844,390]]) {
    const bounds = centeredViewport(player,width,height);
    assert.equal(player.x-bounds.x,width/2);
    assert.equal(player.y-bounds.y,height/2);
    for (let i=0;i<100;i++) {
      const p = findWorldSpawnPosition(bounds,player,16,0.5);
      assert(p);
      assert(Math.hypot(p.x-player.x,p.y-player.y)>=width/2);
      assert(isOutsideViewport(p,bounds,16),'entire enemy starts offscreen');
      assert(p.x+16<bounds.x || p.x-16>bounds.x+width || p.y+16<bounds.y || p.y-16>bounds.y+height);
    }
  }
}
const bounds=centeredViewport({x:-1000,y:-1000},400,800);
assert(!isOutsideViewport({x:-1000,y:-1000},bounds));
assert(isOutsideViewport({x:0,y:0},bounds));
const c={id:'world-test',durationMs:1,kills:0,scene:{player:{x:-10000,y:-20000},facing:{x:0,y:-1},weapons:[],enemies:[{id:'stationary',x:-11000,y:-21000,hp:3}],spawnElapsedMs:0}};
validateCheckpoint(c);
assert.throws(()=>validateCheckpoint({...c,scene:{...c.scene,player:{x:Infinity,y:0}}}));
console.log('Passed: centered camera geometry, distant/negative world spawning, cleanup bounds, and signed save coordinates.');

for (const [width,height,radius] of [[390,844,16],[1440,320,22],[200,100,80],[1,1,200]]) {
 const player={x:-5000,y:3000},view=centeredViewport(player,width,height);
 for(const sample of [0,0.1,0.25,0.5,0.75,0.999999]) {
  const p=findWorldSpawnPosition(view,player,radius,0.5,()=>sample,32);
  assert(p.x+radius<view.x || p.x-radius>view.x+width || p.y+radius<view.y || p.y-radius>view.y+height);
  assert(Math.hypot(p.x-player.x,p.y-player.y)>=width/2);
 }
}
assert.equal(findWorldSpawnPosition({x:0,y:0,width:0,height:100},{x:0,y:0},16,0.5),null);
console.log('Passed: offscreen perimeter, full-body clearance, small/landscape views, and minimum spawn distance.');
