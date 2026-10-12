import { Session } from 'node:inspector/promises';
import { workerData } from 'node:worker_threads';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { retainNewestStartupProfiles } from './startup-cpu-profile-retention.mjs';

// A worker samples the main event loop even when that loop cannot run timers.
// This uses the in-process inspector protocol; no inspector listener is opened.
const keepAlive = setInterval(() => {}, 1000);
const session = new Session();
session.connectToMainThread();
try {
  await session.post('Profiler.enable');
  await session.post('Profiler.start');
  await setTimeout(workerData.durationMs ?? 30_000);
  const { profile } = await session.post('Profiler.stop');
  const directory = dirname(workerData.statusPath);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = join(directory, `startup-${process.pid}-${Date.now()}.cpuprofile`);
  await writeFile(file, JSON.stringify(profile), { flag: 'wx', mode: 0o600 });
  await retainNewestStartupProfiles(directory, workerData.keepProfiles ?? 5);
  const counts = new Map();
  for (const id of profile.samples ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
  const top = profile.nodes.map(n => ({ function: n.callFrame.functionName, samples: counts.get(n.id) ?? 0 }))
    .sort((a, b) => b.samples - a.samples).slice(0, 12);
  process.stderr.write(`[startup-cpu] ${JSON.stringify({ file, top })}\n`);
} finally {
  session.disconnect();
  clearInterval(keepAlive);
}
