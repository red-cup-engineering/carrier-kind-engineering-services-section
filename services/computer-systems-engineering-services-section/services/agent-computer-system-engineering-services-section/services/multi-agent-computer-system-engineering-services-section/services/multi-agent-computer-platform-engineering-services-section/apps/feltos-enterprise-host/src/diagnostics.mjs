/** Sampling a running node without a debugger.
 *
 * A debugger attached to the live node can evaluate any code in it, and twice an attached session
 * left behind a timer whose `import()` killed the node. The unit therefore closes the debugger
 * channel (`--disable-sigusr1`), and this is what replaces it: on SIGUSR2 the node samples its own
 * CPU and allocations through an in-process inspector session for `seconds`, and writes a
 * `.cpuprofile` and a `.heapprofile` under `<stateDir>/diagnostics/`. A signal carries no code, so
 * sampling can be asked for by any local operator without handing them the process. */
import { mkdirSync, writeFileSync } from "node:fs";
import { Session } from "node:inspector/promises";
import { join } from "node:path";

export function installSamplingSignal({ stateDir, seconds = 30, signal = "SIGUSR2", log = console.error } = {}) {
  if (typeof stateDir !== "string" || stateDir.length === 0) return;
  let sampling = false;
  process.on(signal, () => {
    if (sampling) return;
    sampling = true;
    void sample({ directory: join(stateDir, "diagnostics"), seconds })
      .then((files) => log(`[diagnostics] sampled ${seconds}s: ${files.join(", ")}`))
      .catch((error) => log(`[diagnostics] sampling failed: ${error?.message ?? error}`))
      .finally(() => { sampling = false; });
  });
}

async function sample({ directory, seconds }) {
  const session = new Session();
  session.connect();
  try {
    await session.post("Profiler.enable");
    await session.post("Profiler.setSamplingInterval", { interval: 1000 });
    await session.post("Profiler.start");
    await session.post("HeapProfiler.startSampling", { samplingInterval: 512 * 1024 });
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000).unref());
    const { profile } = await session.post("Profiler.stop");
    const { profile: heap } = await session.post("HeapProfiler.stopSampling");
    mkdirSync(directory, { recursive: true });
    const stem = join(directory, new Date().toISOString().replaceAll(":", "-"));
    writeFileSync(`${stem}.cpuprofile`, JSON.stringify(profile));
    writeFileSync(`${stem}.heapprofile`, JSON.stringify(heap));
    return [`${stem}.cpuprofile`, `${stem}.heapprofile`];
  } finally {
    session.disconnect();
  }
}
