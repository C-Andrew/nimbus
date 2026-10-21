import { readFile } from 'node:fs/promises';
export const readJson = async url => JSON.parse(await readFile(url, 'utf8'));
export async function readManifest(name) {
  const url = new URL(`../../src/content/${name}/index.json`, import.meta.url);
  const manifest = await readJson(url);
  return { manifest, entries: await Promise.all(manifest.files.map(file => readJson(new URL(file, url)))) };
}
export async function readEnemyContent() {
  const [{ entries }, encounter] = await Promise.all([readManifest('enemies'), readJson(new URL('../../src/content/encounters/default.json', import.meta.url))]);
  return { ...encounter, enemies: entries };
}
export async function readWeaponContent() {
  const { manifest, entries } = await readManifest('weapons');
  return { ...manifest, weapons: entries };
}
