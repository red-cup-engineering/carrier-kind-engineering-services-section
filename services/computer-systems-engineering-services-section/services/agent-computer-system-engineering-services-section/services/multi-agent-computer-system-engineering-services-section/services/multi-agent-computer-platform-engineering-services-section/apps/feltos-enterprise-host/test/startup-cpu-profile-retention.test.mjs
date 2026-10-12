import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { retainNewestStartupProfiles } from '../src/startup-cpu-profile-retention.mjs';

test('only the newest five startup profiles stay beside the deployment status', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'startup-profiles-'));
  try {
    for (let at = 1; at <= 8; at++) await writeFile(join(directory, `startup-${100 + at}-${1700000000000 + at}.cpuprofile`), '{}');
    await writeFile(join(directory, 'status.json'), '{}');
    await writeFile(join(directory, 'startup-notes.txt'), '');
    const removed = await retainNewestStartupProfiles(directory);
    assert.deepEqual(removed.sort(), ['startup-101-1700000000001.cpuprofile', 'startup-102-1700000000002.cpuprofile', 'startup-103-1700000000003.cpuprofile']);
    assert.deepEqual((await readdir(directory)).sort(), [
      'startup-104-1700000000004.cpuprofile', 'startup-105-1700000000005.cpuprofile', 'startup-106-1700000000006.cpuprofile',
      'startup-107-1700000000007.cpuprofile', 'startup-108-1700000000008.cpuprofile', 'startup-notes.txt', 'status.json']);
    assert.deepEqual(await retainNewestStartupProfiles(directory), []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
