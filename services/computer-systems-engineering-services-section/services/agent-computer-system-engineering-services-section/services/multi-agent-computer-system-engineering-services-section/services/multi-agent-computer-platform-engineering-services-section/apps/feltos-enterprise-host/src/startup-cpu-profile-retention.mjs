import { readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const PROFILE = /^startup-\d+-(\d+)\.cpuprofile$/;

/** Each start writes one profile beside the deployment status; only the newest `keep` stay. */
export async function retainNewestStartupProfiles(directory, keep = 5) {
  const profiles = (await readdir(directory)).map(name => ({ name, at: Number(PROFILE.exec(name)?.[1]) }))
    .filter(({ at }) => Number.isFinite(at)).sort((a, b) => b.at - a.at || (a.name < b.name ? 1 : -1));
  const removed = profiles.slice(keep).map(({ name }) => name);
  for (const name of removed) await unlink(join(directory, name)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  return removed;
}
