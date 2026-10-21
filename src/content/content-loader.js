export const CONTENT_VERSION = 1;
export const contentId = value => typeof value === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(value);

export async function readContent(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Content failed to load: ${url} (${response.status})`);
  return response.json();
}

/** Explicit manifests work in native browser modules and under GitHub Pages. */
export async function loadManifest(url) {
  const manifest = await readContent(url);
  if (manifest?.schemaVersion !== CONTENT_VERSION || !Array.isArray(manifest.files)
    || new Set(manifest.files).size !== manifest.files.length) throw new Error(`Invalid content manifest: ${url}`);
  const directory = new URL('./', url).href;
  const files = manifest.files.map(file => {
    if (typeof file !== 'string' || !file.startsWith('./') || !file.endsWith('.json')) throw new Error(`Invalid content file: ${file}`);
    const resolved = new URL(file, url);
    if (!resolved.href.startsWith(directory)) throw new Error(`Content file leaves its directory: ${file}`);
    return resolved;
  });
  return { manifest, entries: await Promise.all(files.map(readContent)) };
}

export function definitionMap(entries, validate) {
  const definitions = new Map();
  for (const entry of entries) {
    if (!contentId(entry?.id) || typeof entry.name !== 'string' || !entry.name.trim() || definitions.has(entry.id)) throw new Error('Invalid or duplicate content ID');
    validate(entry);
    definitions.set(entry.id, entry);
  }
  return definitions;
}
