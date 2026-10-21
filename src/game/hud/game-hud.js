import { nearestExit } from '../../ui/ready-transition.js';
import { StatBar } from './stat-bar.js';
import { GameState } from '../run/run-state.js';


export class GameHud {
  constructor(scene, config) {
    this.scene = scene;
    this.stats = config.stats;
    this.appearance = config.appearance;
    this.weaponSignature = null;
    this.weaponSlots = Array.from({length:scene.weapons.catalog.maxEquippedWeapons}, (_, index) => ({
      frame:scene.add.rectangle(38+index*44,scene.scale.height-32,36,36,0x151d25,0.95).setStrokeStyle(1,0x34434c).setScrollFactor(0).setDepth(3),
      icon:scene.add.image(38+index*44,scene.scale.height-32,'__WHITE').setDisplaySize(28,28).setVisible(false).setScrollFactor(0).setDepth(4),
    }));
    this.renderWeapons();
    scene.readout = scene.add.text(18, 90, '', { fontFamily: 'monospace', fontSize: '13px', color: '#bded85' });
    scene.help = scene.add.text(18, 116, 'Press Play Game to begin', { fontFamily: 'sans-serif', fontSize: '12px', color: '#a7b0bd' });
    this.healthBar = new StatBar(scene,0x83d96f);
    this.xpBar = new StatBar(scene,0x329dff);
    scene.progressionHud = scene.add.text(18,scene.scale.height-143,'',{fontFamily:'monospace',fontSize:'11px',color:'#c4d2da'}).setDepth(5);
    for (const hud of [scene.readout, scene.help, scene.progressionHud]) hud.setScrollFactor(0);
  }
  renderState(state, leavingReady = false, previous) {
    const scene = this.scene;
    this.cancelHudTransition?.();
    const inGame = state === GameState.IN_GAME;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scene.readout.setText(`${Math.round(scene.game.loop.actualFps)} FPS`);
    if (state===GameState.READY && previous===GameState.RESTART && !reducedMotion) {
      scene.help.setPosition(18,116).setVisible(true);
      scene.readout.setPosition(18,90);
      const objects=[scene.help,scene.readout,scene.progressionHud,
        this.healthBar.track,this.healthBar.fill,this.healthBar.label,
        this.xpBar.track,this.xpBar.fill,this.xpBar.label,
        ...this.weaponSlots.flatMap(slot=>[slot.frame,slot.icon])].filter(object=>object.visible);
      const motions=objects.map(object=>{
        const offset=nearestExit(object.getBounds(),scene.scale.width,scene.scale.height);
        return {object,x:object.x,y:object.y,offset};
      });
      const started=performance.now();
      const tick=()=>{
        const fraction=Math.min(1,(performance.now()-started)/280);
        const eased=fraction*fraction*(3-2*fraction);
        for(const {object,x,y,offset} of motions)object.setPosition(x+offset.x*(1-eased),y+offset.y*(1-eased));
        if(fraction===1)cleanup();
      };
      const cleanup=()=>{
        scene.game.events.off('step',tick);
        scene.events.off('shutdown',cleanup);
        for(const {object,x,y} of motions)object.setPosition(x,y);
        this.cancelHudTransition=null;
      };
      this.cancelHudTransition=cleanup;
      scene.game.events.on('step',tick);
      scene.events.once('shutdown',cleanup);
      tick();
      return;
    }
    const pauseTransition=state===GameState.PAUSED || (previous===GameState.PAUSED&&inGame);
    if (!reducedMotion && (leavingReady||pauseTransition)) {
      const enteringPause=state===GameState.PAUSED;
      scene.help.setVisible(true);
      scene.help.setText(enteringPause?'Gameplay paused':'WASD / arrows · touch and hold to move');
      const startX=18,startY=enteringPause?-scene.help.height-16:116;
      const endX=leavingReady?-scene.help.width-16:18;
      const endY=enteringPause?116:leavingReady?116:-scene.help.height-16;
      const fpsStart=scene.readout.y,fpsEnd=inGame?24:90;
      const started=performance.now();
      const tick=()=>{
        const fraction=Math.min(1,(performance.now()-started)/280);
        const eased=fraction*fraction*(3-2*fraction);
        scene.help.setPosition(startX+(endX-startX)*eased,startY+(endY-startY)*eased);
        scene.readout.setPosition(18,fpsStart+(fpsEnd-fpsStart)*eased);
        if(fraction===1){cleanup();scene.help.setVisible(!inGame);}
      };
      const cleanup=()=>{
        scene.game.events.off('step',tick);
        scene.events.off('shutdown',cleanup);
        this.cancelHudTransition=null;
      };
      this.cancelHudTransition=cleanup;
      scene.game.events.on('step',tick);
      scene.events.once('shutdown',cleanup);
      tick();
    } else {
      scene.help.setPosition(18,116).setVisible(!inGame);
      scene.readout.setPosition(18,inGame?24:90);
    }
  }
  renderProgression({ level, currentXp, totalXp, xpPerLevel }) {
    const scene = this.scene;
    this.xpBar.setValue(currentXp,xpPerLevel,`LV ${level}  ·  XP ${currentXp} / ${xpPerLevel}`,0x329dff);
    scene.progressionHud.setText(`TOTAL XP ${totalXp}`);
  }
  renderHealth() {
    const scene = this.scene;
    const color=scene.health.hp <= this.appearance.lowHealthThresholdHitpoints ? 0xf17b68 : 0x83d96f;
    this.healthBar.setValue(scene.health.hp,this.stats.maxHitpoints,`HP ${scene.health.hp} / ${this.stats.maxHitpoints}`,color);
  }
  resize() {
    const scene = this.scene;
    const { width } = scene.scale;
    scene.progressionHud.setPosition(18, scene.scale.height - 143);
    scene.progressionHud.setWordWrapWidth(Math.max(100, width - 36));
    const barWidth=Math.max(1,Math.min(320,width-36));
    this.healthBar.resize(barWidth,scene.scale.height-78);
    this.xpBar.resize(barWidth,scene.scale.height-110);
    const spacing = Math.min(44, (width-36)/this.weaponSlots.length);
    this.weaponSlots.forEach((slot,index)=>{
      slot.frame.setPosition(18+spacing/2+index*spacing,scene.scale.height-32);
      slot.icon.setPosition(slot.frame.x,slot.frame.y);
    });
    scene.help.setWordWrapWidth(Math.max(100, width - 36));
  }
  renderWeapons() {
    const weapons=this.scene.weapons.weapons;
    const signature=weapons.map(w=>w.definition.id).join('|');
    if(signature===this.weaponSignature)return;
    this.weaponSignature=signature;
    this.weaponSlots.forEach((slot,index)=>{
      const weapon=weapons[index];
      const texture=weapon ? `weapon-icon-${weapon.definition.id}` : '';
      const visible=!!weapon&&this.scene.textures.exists(texture);
      slot.icon.setVisible(visible);
      if(visible)slot.icon.setTexture(texture).setDisplaySize(28,28);
      slot.frame.setStrokeStyle(1,weapon?0x6ca6b5:0x34434c);
    });
  }
  update(time, controllable) {
    this.renderWeapons();
    const scene = this.scene;
    if (!scene.lastReadout || time - scene.lastReadout > 500) {
      scene.help.setText(controllable ? 'WASD / arrows · touch and hold to move' : 'Gameplay paused');
      scene.readout.setText(`${Math.round(scene.game.loop.actualFps)} FPS`);
      scene.lastReadout = time;
    }
  }
  reset() {
    this.scene.help.setText('Press Play Game to begin');
    this.scene.lastReadout = 0;
  }
}
