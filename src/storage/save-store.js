import { SAVE_VERSION, defaultProfile, validateProfile, validateRun, validateCheckpoint, migrateBackup } from './save-schema.js';

export class SaveStore {
  async open() {
    this.db = await new Promise((resolve,reject) => {
      const request = indexedDB.open('nimbus', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('profile');
        db.createObjectStore('runs', { keyPath: 'id' });
        db.createObjectStore('checkpoint');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Save database upgrade blocked; close other Nimbus tabs'));
    });
    this.db.onversionchange = () => this.db.close();
    const profile = await this.read('profile', 'player');
    if (profile === undefined) await this.transaction(['profile'], tx => tx.objectStore('profile').put(defaultProfile(), 'player'));
    else validateProfile(profile);
  }
  transaction(stores, work) {
    return new Promise((resolve,reject) => {
      const tx = this.db.transaction(stores, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Save transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('Save transaction aborted'));
      try { work(tx); } catch (error) { tx.abort(); reject(error); }
    });
  }
  read(store, key) {
    return new Promise((resolve,reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async profile() { return validateProfile(await this.read('profile','player')); }
  updateProfile(change) {
    return this.transaction(['profile'],tx=>{
      const request=tx.objectStore('profile').get('player');
      request.onsuccess=()=>{
        try {
          const profile=validateProfile(request.result);
          change(profile); // Synchronous mutation; no awaits inside the transaction.
          validateProfile(profile);
          tx.objectStore('profile').put(profile,'player');
        } catch { tx.abort(); }
      };
    });
  }
  async checkpoint() { return validateCheckpoint((await this.read('checkpoint','active')) ?? null); }
  saveCheckpoint(checkpoint) {
    validateCheckpoint(checkpoint);
    return this.transaction(['checkpoint','runs'], tx => {
      const req = tx.objectStore('runs').get(checkpoint.id);
      req.onsuccess = () => { if (!req.result) tx.objectStore('checkpoint').put(checkpoint,'active'); };
    });
  }
  finalizeRun(run) {
    validateRun(run);
    return this.transaction(['runs','profile','checkpoint'], tx => {
      const runs = tx.objectStore('runs');
      const exists = runs.get(run.id);
      exists.onsuccess = () => {
        if (exists.result) return; // Idempotent across duplicate events / retries.
        const profileReq = tx.objectStore('profile').get('player');
        profileReq.onsuccess = () => {
          try {
            const profile = validateProfile(profileReq.result);
            profile.stats.runsCompleted++;
            profile.stats.totalKills += run.kills;
            profile.stats.totalPlayTimeMs += run.durationMs;
            profile.stats.longestRunMs = Math.max(profile.stats.longestRunMs,run.durationMs);
            validateProfile(profile);
            runs.add(run);
            tx.objectStore('profile').put(profile,'player');
            const checkpointReq = tx.objectStore('checkpoint').get('active');
            checkpointReq.onsuccess = () => {
              if (checkpointReq.result?.id === run.id) tx.objectStore('checkpoint').delete('active');
            };
          } catch { tx.abort(); }
        };
      };
    });
  }
  async exportBackup() {
    return new Promise((resolve,reject) => {
      const tx=this.db.transaction(['profile','runs','checkpoint'],'readonly');
      const p=tx.objectStore('profile').get('player'), r=tx.objectStore('runs').getAll(), c=tx.objectStore('checkpoint').get('active');
      tx.oncomplete=()=>resolve({format:'nimbus-save',schemaVersion:SAVE_VERSION,exportedAt:new Date().toISOString(),profile:p.result,runs:r.result,checkpoint:c.result??null});
      tx.onerror=()=>reject(tx.error);
    });
  }
  importBackup(data) {
    migrateBackup(data);
    return this.transaction(['profile','runs','checkpoint'],tx=>{
      for(const name of ['profile','runs','checkpoint'])tx.objectStore(name).clear();
      tx.objectStore('profile').put(data.profile,'player');
      for(const run of data.runs)tx.objectStore('runs').add(run);
      if(data.checkpoint)tx.objectStore('checkpoint').put(data.checkpoint,'active');
    });
  }
}
