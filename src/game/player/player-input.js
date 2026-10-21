export class PlayerInput {
  constructor(scene, config) {
    this.scene = scene; this.config = config;
    this.keys = scene.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    scene.input.keyboard.addCapture(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
  }
  clear() { this.scene.input.keyboard.resetKeys(); this.scene.input.activePointer.reset(); }
  update(delta, controllable) {
    const { player, facing, input, scale } = this.scene;
    const playerConfig = this.config;
    const playerStats = playerConfig.stats;
    const k = this.keys;
    let x = Number(k.D.isDown || k.RIGHT.isDown) - Number(k.A.isDown || k.LEFT.isDown);
    let y = Number(k.S.isDown || k.DOWN.isDown) - Number(k.W.isDown || k.UP.isDown);
    const pointer = input.activePointer;
    if (controllable && pointer.isDown) {
      x = pointer.x - scale.width / 2;
      y = pointer.y - scale.height / 2;
      if (Math.hypot(x, y) < playerConfig.controls.touchDeadzonePixels) { x = 0; y = 0; }
    }
    const length = Math.hypot(x, y);
    if (controllable && length) {
      facing.x = x / length;
      facing.y = y / length;
      const step = playerStats.movementSpeedPixelsPerSecond * Math.min(delta, 50) / 1000;
      const distance = pointer.isDown ? Math.min(step, length) : step;
      player.x += x / length * distance;
      player.y += y / length * distance;
    }
  }
}
