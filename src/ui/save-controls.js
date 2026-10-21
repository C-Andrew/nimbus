import { validateBackup } from '../storage/save-schema.js';

export function bindSaveControls(ui, saves, { weaponCatalog, enemyCatalog }) {
  ui.exportSave.addEventListener('click', async () => {
    try {
      if (!saves.ready) throw new Error('Storage unavailable');
      await saves.saveCheckpoint();
      const backup = await saves.store.exportBackup();
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
      const link = document.createElement('a'); link.href=url; link.download='nimbus-save.json'; link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      ui.saveStatus.textContent = 'Backup exported';
    } catch(error) { saves.reportSaveError(error); }
  });
  ui.importSave.addEventListener('click',()=>ui.saveFile.click());
  ui.saveFile.addEventListener('change',async event=>{
    const file=event.target.files[0];
    if(!file)return;
    try {
      if(!saves.ready)throw new Error('Storage unavailable');
      if(file.size>10*1024*1024)throw new Error('Backup exceeds 10 MB');
      const data=validateBackup(JSON.parse(await file.text()));
      if (data.checkpoint) {
        if(data.checkpoint.scene.weapons.some(w=>!weaponCatalog.weapons.some(d=>d.id===w.id)) || data.checkpoint.scene.enemies.some(e=>!enemyCatalog.enemies.some(d=>d.id===e.id && e.hp<=d.stats.maxHitpoints))) throw new Error('Backup contains unsupported game content');
      }
      if(!window.confirm('Replace this browser’s Nimbus progress with this backup? Export your current save first if you want to keep it.'))return;
      await saves.store.importBackup(data);
      location.reload();
    }catch(error){ console.error(error); ui.saveStatus.textContent='Import failed. Your existing save was not replaced.'; }
    finally{event.target.value='';}
  });
  ui.persistSave.addEventListener('click',async()=>{
    try {
      const granted=await navigator.storage?.persist?.();
      ui.storageDetail.textContent=granted?'Persistent storage enabled. Keep exported backups too.':'Persistent storage was not granted or is unavailable. Export backups to protect progress.';
    }catch(error){saves.reportSaveError(error);}
  });

}
