import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CheckpointWriter } from '../../src/storage/checkpoint-writer.js';
import { unpackCheckpoint } from '../../src/storage/checkpoint-payload.js';
import { SaveStore } from '../../src/storage/save-store.js';

const packet = () => ({ id: 'packed-test', durationMs: 1500, kills: 0, scene: {
  player: { x: -20, y: 30 }, facing: { x: 0, y: -1 }, weapons: [], spawnElapsedMs: 0,
  effects: [{ id: 'haste', stacks: 1, remainingMs: 500 }],
  enemies: { typeIds: ['stationary'], values: new Float64Array([0, -200, 300, 1, 250]) },
} });

test('packed fallback preserves the existing IndexedDB save format', async () => {
  const store = new SaveStore();
  await store.open();
  try {
    const writer = new CheckpointWriter(store, null);
    await writer.save(packet());
    const saved = await store.checkpoint();
    assert.deepEqual(saved.scene.enemies, [{ id: 'stationary', x: -200, y: 300, hp: 1, stunRemainingMs: 250 }]);
    assert.equal(saved.durationMs, 1500);
    assert.deepEqual(saved.scene.effects, [{ id: 'haste', stacks: 1, remainingMs: 500 }]);
    await assert.rejects(async () => writer.save({ ...packet(), scene: { ...packet().scene,
      effects: [{ id: 'haste', stacks: 1, remainingMs: 500 }],
  enemies: { typeIds: ['stationary'], values: new Float64Array([3, 0, 0, 1, 0]) } } }));
    assert.deepEqual(await store.checkpoint(), saved, 'invalid replacement preserves the previous save');
  } finally { store.db.close(); }
});

test('worker transfers the enemy buffer and resolves only after acknowledgement', async () => {
  class FakeWorker {
    postMessage(message, transfer) { this.message = structuredClone(message, { transfer }); }
    terminate() { this.terminated = true; }
  }
  const writer = new CheckpointWriter({}, FakeWorker);
  const checkpoint = packet();
  let resolved = false;
  const task = writer.save(checkpoint).then(() => { resolved = true; });
  assert.equal(checkpoint.scene.enemies.values.byteLength, 0, 'ownership transferred without cloning enemy objects');
  await Promise.resolve();
  assert(!resolved);
  assert.equal(unpackCheckpoint(writer.worker.message.checkpoint).scene.enemies.length, 1);
  writer.worker.onmessage({ data: { id: writer.worker.message.id } });
  await task;
  assert(resolved);
  assert.equal(writer.pending.size, 0);
});

test('worker failure rejects the write and enables fallback for the next save', async () => {
  let saved;
  class FakeWorker { postMessage() {} terminate() {} }
  const writer = new CheckpointWriter({ saveCheckpoint(data) { saved = data; } }, FakeWorker);
  const failed = assert.rejects(writer.save(packet()), /worker failed/);
  writer.worker.onerror();
  await failed;
  assert.equal(writer.worker, null);
  assert.equal(writer.pending.size, 0);
  await writer.save(packet());
  assert(Array.isArray(saved.scene.enemies));
});
