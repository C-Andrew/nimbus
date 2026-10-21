import { SaveStore } from './save-store.js';
import { unpackCheckpoint } from './checkpoint-payload.js';

const store = new SaveStore();
// Opening lazily lets the caller receive errors through the request channel.
let ready;
let queue = Promise.resolve();
self.onmessage = ({ data: { id, checkpoint } }) => {
  queue = queue.then(async () => {
    try {
      ready ??= store.open().catch(error => { ready = null; throw error; });
      await ready;
      await store.saveCheckpoint(unpackCheckpoint(checkpoint));
      self.postMessage({ id });
    } catch (error) { self.postMessage({ id, error: error.message }); }
  });
};
