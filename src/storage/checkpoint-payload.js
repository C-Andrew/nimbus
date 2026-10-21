/** Materialize a transferred snapshot in the worker, preserving save schema v1. */
export function unpackCheckpoint(checkpoint) {
  const packed = checkpoint.scene.enemies;
  if (Array.isArray(packed)) return checkpoint;
  if (!packed || !(packed.values instanceof Float64Array) || !Array.isArray(packed.typeIds)
    || packed.values.length % 5 !== 0 || packed.values.length > 50000) throw new Error('Invalid packed checkpoint');
  const enemies = [];
  for (let i = 0; i < packed.values.length; i += 5) {
    const code = packed.values[i];
    if (!Number.isInteger(code) || code < 0 || code >= packed.typeIds.length) throw new Error('Invalid checkpoint enemy type');
    enemies.push({ id: packed.typeIds[code], x: packed.values[i + 1], y: packed.values[i + 2],
      hp: packed.values[i + 3], stunRemainingMs: packed.values[i + 4] });
  }
  return { ...checkpoint, scene: { ...checkpoint.scene, enemies } };
}
