import { createHudText } from './hud-text.js';

/** Screen-fixed stat bar updated only on value or layout changes. */
export class StatBar {
  constructor(scene, color) {
    this.ratio = 0;
    this.width = 260;
    this.track = scene.add.rectangle(18,0,this.width,22,0x101820,0.95)
      .setOrigin(0,0.5).setStrokeStyle(1,0x53636c).setScrollFactor(0).setDepth(3);
    this.fill = scene.add.rectangle(20,0,1,18,color,0.85)
      .setOrigin(0,0.5).setScrollFactor(0).setDepth(4).setVisible(false);
    this.label = createHudText(scene,28,0,'',{fontSize:'14px',color:'#ffffff'}).setOrigin(0,0.5);
  }
  setValue(value, maximum, text, color) {
    this.ratio = maximum > 0 ? Math.max(0,Math.min(1,value/maximum)) : 0;
    this.label.setText(text);
    this.fill.setFillStyle(color);
    this.layoutFill();
  }
  resize(width, y) {
    this.width=Math.max(1,width);
    this.track.setPosition(18,y).setSize(this.width,22);
    this.fill.setPosition(20,y);
    this.label.setPosition(28,y);
    this.layoutFill();
  }
  layoutFill() {
    this.fill.setVisible(this.ratio>0);
    this.fill.setSize(Math.max(0.001,(this.width-4)*this.ratio),18);
  }
}
