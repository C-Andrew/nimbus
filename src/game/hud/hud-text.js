const layers = new WeakMap();

/** A few screen-fixed labels use native browser text, independent of canvas DPI. */
export function createHudText(scene, x, y, value, style) {
  let layer = layers.get(scene);
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'hud-text-layer';
    scene.game.canvas.parentElement.append(layer);
    layers.set(scene, layer);
    scene.events.once('shutdown', () => { layer.remove(); layers.delete(scene); });
  }
  const node = document.createElement('span');
  node.className = 'hud-text';
  Object.assign(node.style, { fontSize: style.fontSize, color: style.color });
  layer.append(node);
  return new HudText(node, x, y, value);
}

class HudText {
  constructor(node, x, y, value) {
    this.node = node;
    this.originX = 0;
    this.originY = 0;
    this.visible = true;
    this.setText(value);
    this.setPosition(x, y);
  }
  get width() { return this.node.offsetWidth; }
  get height() { return this.node.offsetHeight; }
  setText(value) {
    if (this.node.textContent !== value) this.node.textContent = value;
    return this;
  }
  setPosition(x, y) {
    this.x = x; this.y = y;
    this.node.style.left = `${x}px`;
    this.node.style.top = `${y}px`;
    return this;
  }
  setOrigin(x, y = x) {
    this.originX = x; this.originY = y;
    this.node.style.transform = `translate(${-x * 100}%, ${-y * 100}%)`;
    return this;
  }
  setVisible(visible) {
    this.visible = visible;
    this.node.hidden = !visible;
    return this;
  }
  setWordWrapWidth(width) {
    this.node.style.maxWidth = `${width}px`;
    this.node.style.whiteSpace = 'normal';
    return this;
  }
  getBounds() {
    const width = this.width, height = this.height;
    const left = this.x - width * this.originX, top = this.y - height * this.originY;
    return { left, top, right: left + width, bottom: top + height, width, height };
  }
}
