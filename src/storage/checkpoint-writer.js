import { unpackCheckpoint } from './checkpoint-payload.js';

/** One worker per controller; failures leave the last committed save intact. */
export class CheckpointWriter {
  constructor(store, WorkerClass = globalThis.Worker) {
    this.store = store;
    this.worker = null;
    this.pending = new Map();
    this.nextId = 0;
    if (!WorkerClass) return;
    try {
      this.worker = new WorkerClass(new URL('./checkpoint-worker.js', import.meta.url), { type: 'module' });
      this.worker.onmessage = ({ data }) => {
        const request = this.pending.get(data.id);
        if (!request) return;
        this.pending.delete(data.id);
        if (data.error) request.reject(new Error(data.error)); else request.resolve();
      };
      this.worker.onerror = this.worker.onmessageerror = () => this.disableWorker();
    } catch { /* CSP or unavailable workers: use the validated main-thread path. */ }
  }
  disableWorker() {
    this.worker?.terminate();
    this.worker = null;
    for (const request of this.pending.values()) request.reject(new Error('Checkpoint worker failed; next save will use fallback storage'));
    this.pending.clear();
  }
  save(checkpoint) {
    if (!this.worker) return this.store.saveCheckpoint(unpackCheckpoint(checkpoint));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const values = checkpoint.scene.enemies?.values;
      try { this.worker.postMessage({ id, checkpoint }, values instanceof Float64Array ? [values.buffer] : []); }
      catch (error) { this.pending.delete(id); reject(error); }
    });
  }
}
