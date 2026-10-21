import { VirtualJoystick } from './virtual-joystick.js';

export class PlayerInput {
  constructor(scene, config) {
    this.scene = scene; this.config = config;
    this.keys = scene.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    scene.input.keyboard.addCapture(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.joystick = new VirtualJoystick(scene.game.canvas.parentElement, config.controls.touchDeadzonePixels);
    scene.events.once('shutdown', () => this.joystick.destroy());
  }
  clear() { this.scene.input.keyboard.resetKeys(); this.scene.input.activePointer.reset(); this.joystick.clear(); }
  setState(state) { this.joystick.setState(state); }
  update(delta, controllable) {
    const { player, facing, input, scale } = this.scene;
    const playerConfig = this.config;
    const playerStats = playerConfig.stats;
    const k = this.keys;
    let x = Number(k.D.isDown || k.RIGHT.isDown) - Number(k.A.isDown || k.LEFT.isDown);
    let y = Number(k.S.isDown || k.DOWN.isDown) - Number(k.W.isDown || k.UP.isDown);
    const pointer = input.activePointer;
    const usingJoystick = this.joystick.enabled;
    let strength = 1;
    if (usingJoystick && this.joystick.pointerId !== null) {
      x = this.joystick.vector.x; y = this.joystick.vector.y;
      strength = Math.hypot(x, y);
    } else if (!usingJoystick && controllable && pointer.isDown) {
      x = pointer.x - scale.width / 2;
      y = pointer.y - scale.height / 2;
      if (Math.hypot(x, y) < playerConfig.controls.touchDeadzonePixels) { x = 0; y = 0; }
    }
    const length = Math.hypot(x, y);
    if (controllable && length) {
      facing.x = x / length;
      facing.y = y / length;
      const step = playerStats.movementSpeedPixelsPerSecond * Math.min(delta, 50) / 1000;
      const distance = usingJoystick ? step * strength : pointer.isDown ? Math.min(step, length) : step;
      player.x += x / length * distance;
      player.y += y / length * distance;
    }
  }
}
