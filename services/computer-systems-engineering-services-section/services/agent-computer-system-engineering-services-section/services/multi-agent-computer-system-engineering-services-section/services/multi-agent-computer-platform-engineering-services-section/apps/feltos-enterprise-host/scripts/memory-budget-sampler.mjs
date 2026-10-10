// Preloaded (--import) into a FeltOS node under check-memory-budget.mjs: samples the node's own
// JavaScript memory (heapUsed + external + arrayBuffers) and RSS every 100 ms, marks the moment it
// listens, and on request (SIGUSR2) collects garbage first so a sample reads what the node holds.
import { appendFileSync } from "node:fs";

const out = process.env.FELTOS_MEMORY_SAMPLES;
const started = Date.now();
const sample = (label) => {
  const usage = process.memoryUsage();
  appendFileSync(out, `${JSON.stringify({ t: Date.now() - started, label, js: usage.heapUsed + usage.external + usage.arrayBuffers, heapUsed: usage.heapUsed, external: usage.external, arrayBuffers: usage.arrayBuffers, rss: usage.rss })}\n`);
};
if (out) {
  setInterval(() => sample("tick"), 100).unref();
  process.on("SIGUSR2", () => { globalThis.gc?.(); globalThis.gc?.(); sample("collected"); });
  const write = process.stderr.write.bind(process.stderr);
  let listened = false;
  process.stderr.write = (chunk, ...rest) => {
    if (!listened && /\[feltos-enterprise-host\] \S+ on \S+; state/u.test(String(chunk))) { listened = true; sample("listen"); }
    return write(chunk, ...rest);
  };
}
