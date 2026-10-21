const FONT = 'enemy-hp-digits';

/** One shared digit atlas; changing HP never rasterizes or uploads a text texture. */
function ensureFont(scene) {
  if (scene.cache.bitmapFont.exists(FONT)) return;
  const width = 16, height = 26, size = 20, atlasWidth = width * 10;
  const texture = scene.textures.createCanvas(FONT, atlasWidth, height);
  const context = texture.context;
  context.font = `${size}px monospace`;
  context.fillStyle = '#ffffff';
  context.textBaseline = 'top';
  const chars = {};
  for (let digit = 0; digit <= 9; digit++) {
    const x = digit * width;
    context.fillText(String(digit), x + 1, 1);
    chars[48 + digit] = {
      x, y: 0, width, height, centerX: width / 2, centerY: height / 2,
      xOffset: 0, yOffset: 0, xAdvance: 13, data: {}, kerning: {},
      u0: x / atlasWidth, v0: 1, u1: (x + width) / atlasWidth, v1: 0,
    };
  }
  texture.refresh();
  scene.cache.bitmapFont.add(FONT, {
    data: { font: FONT, size, lineHeight: height, chars }, texture: FONT, frame: null,
  });
}

export function createHitpointLabel(scene) {
  ensureFont(scene);
  const text = scene.add.bitmapText(0, 0, FONT, '', 12).setOrigin(0.5).setDepth(2);
  // Keep presentation details out of enemy lifecycle and health logic.
  return {
    setFontSize(size) { text.setFontSize(size); return this; },
    setColor(color) { text.setTint(Number.parseInt(color.slice(1), 16)); return this; },
    setPosition(x, y) { text.setPosition(x, y); return this; },
    setText(value) { text.setText(value); return this; },
    setVisible(visible) { text.setVisible(visible); return this; },
    destroy() { text.destroy(); },
  };
}
