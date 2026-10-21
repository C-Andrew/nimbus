import { selectLightningVolley, selectChainWave, lightningHopColor } from './lightning-targeting.js';

export class ChainLightning {
  constructor(scene, player) {
    this.scene = scene; this.player = player;
    this.chainPool = []; this.activeChains = [];
  }
  get activeChain() { return this.activeChains[0] ?? null; }
  fireChainLightning(definition, enemies) {
    if (this.activeChains.length) return;
    const targets = selectLightningVolley(this.player,enemies.enemies,definition.stats.targetRangePixels,definition.stats.projectileCount,definition.stats.initialDirectionSeparationDegrees);
    for (const target of targets) {
      let graphic=this.chainPool.find(item=>!item.inUse);
      if(!graphic) {graphic={inUse:false,graphics:this.scene.add.graphics().setDepth(2)};this.chainPool.push(graphic);}
      graphic.inUse=true;
      graphic.graphics.clear().setVisible(true);
      const chain={definition,visited:new Set(),hop:0,remainingJumps:definition.stats.jumps,frontier:[],elapsedMs:0,graphic};
      this.activeChains.push(chain);
      this.strikeChainTarget(target,enemies,{x:this.player.x,y:this.player.y},chain);
      chain.frontier=[{x:target.sprite.x,y:target.sprite.y}];
      chain.hop=1;
    }
  }
  strikeChainTarget(enemy, enemies, origin, chain) {
    const {stats,appearance} = chain.definition;
    const color = lightningHopColor(appearance.color,appearance.whitenessPerJump,chain.hop);
    const {x,y} = origin;
    const toX=enemy.sprite.x,toY=enemy.sprite.y;
    const dx=toX-x,dy=toY-y,length=Math.hypot(dx,dy)||1,bend=Math.min(10,length/6);
    chain.graphic.graphics.lineStyle(appearance.widthPixels,color,1);
    chain.graphic.graphics.beginPath().moveTo(x,y)
    .lineTo(x+dx/3-dy/length*bend,y+dy/3+dx/length*bend)
    .lineTo(x+dx*2/3+dy/length*bend,y+dy*2/3-dx/length*bend)
    .lineTo(toX,toY).strokePath();
    chain.visited.add(enemy);
    enemy.sprite.setFillStyle(color);
    enemies.stunEnemy(enemy,stats.stunDurationMs);
    enemies.damageEnemy(enemy,stats.damage);
  }
  updateChain(delta,enemies) {
    if (!enemies) return;
    for (const chain of [...this.activeChains]) this.advanceChain(delta,enemies,chain);
  }
  advanceChain(delta,enemies,chain) {
    chain.elapsedMs+=delta;
    if (chain.elapsedMs < chain.definition.stats.jumpDelayMs) return;
    if (chain.remainingJumps > 0) {
      const limit=Math.min(chain.hop+1,chain.definition.stats.maxTargetsPerJump);
      const links=selectChainWave(chain.frontier,enemies.enemies,chain.definition.stats.jumpRangePixels,limit,chain.visited);
      if(links.length) {
        chain.remainingJumps--;
        const frontier=[];
        for(const {enemy,origin} of links) {
          this.strikeChainTarget(enemy,enemies,origin,chain);
          frontier.push({x:enemy.sprite.x,y:enemy.sprite.y});
        }
        chain.frontier=frontier;
        chain.elapsedMs=0;
        chain.hop++;
        return;
      }
    }
    chain.graphic.graphics.clear().setVisible(false);
    chain.graphic.inUse=false;
    this.activeChains.splice(this.activeChains.indexOf(chain),1);
  }
  reset() {
    for (const item of this.chainPool) { item.graphics.clear().setVisible(false); item.inUse = false; }
    this.activeChains = [];
  }
}
