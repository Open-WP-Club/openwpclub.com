import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { sponsorshipState } from '../src/lib/sponsorship-policy.mjs';

export function transitionState(registry, now = Date.now()) {
  return { schemaVersion: 1, registryHash: createHash('sha256').update(JSON.stringify(registry)).digest('hex'), ...sponsorshipState(registry, now) };
}
if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const source = new URL('../src/data/sponsorship.json', import.meta.url);
  const target = new URL('../src/data/sponsorship-state.json', import.meta.url);
  const registry = JSON.parse(await readFile(source, 'utf8'));
  const next = JSON.stringify(transitionState(registry), null, 2) + '\n';
  let previous = '';
  try { previous = await readFile(target, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (next !== previous) await writeFile(target, next);
  console.log(`changed=${next !== previous}`);
}
