/** Apply control preferences immediately; failed storage must not block input. */
export function bindJoystickSetting(ui, saves, getJoystick) {
  ui.forceJoystick.addEventListener('change', async () => {
    const forced = ui.forceJoystick.checked;
    getJoystick()?.setForced(forced);
    if (!saves.ready) return;
    try {
      await saves.store.updateProfile(profile => { profile.settings.forceVirtualJoystick = forced; });
    } catch (error) { saves.reportSaveError(error); }
  });
}
