import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bindJoystickSetting } from '../../src/ui/joystick-setting.js';
import { SaveStore } from '../../src/storage/save-store.js';
import { defaultProfile, validateProfile } from '../../src/storage/save-schema.js';

test('joystick switch applies immediately and persists through profile reloads', async () => {
  const store = new SaveStore(); await store.open();
  let change, forced = false;
  const ui = { forceJoystick: { checked: true, addEventListener(_event, handler) { change = handler; } } };
  const saves = { ready: true, store, reportSaveError(error) { throw error; } };
  try {
    bindJoystickSetting(ui, saves, () => ({ setForced(value) { forced = value; } }));
    const writing = change();
    assert.equal(forced, true, 'input updates before the storage transaction completes');
    await writing;
    assert.equal((await store.profile()).settings.forceVirtualJoystick, true);
    ui.forceJoystick.checked = false;
    await change();
    assert.equal((await store.profile()).settings.forceVirtualJoystick, false);
    saves.ready = false;
    ui.forceJoystick.checked = true;
    await change();
    assert.equal(forced, true, 'session setting works when storage is unavailable');
    assert.equal((await store.profile()).settings.forceVirtualJoystick, false);
    const legacy = defaultProfile(); delete legacy.settings.forceVirtualJoystick;
    assert.equal(validateProfile(legacy), legacy, 'old saves remain supported');
    legacy.settings.forceVirtualJoystick = 'yes';
    assert.throws(() => validateProfile(legacy), /Invalid/);
  } finally { store.db.close(); }
});
