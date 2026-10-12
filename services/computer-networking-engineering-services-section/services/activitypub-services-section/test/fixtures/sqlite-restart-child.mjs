#!/usr/bin/env node
// Fixture for test/local-server.test.mjs: exercises the SQLite runtime and
// custody adapters as one *separate OS process*, twice, against the same
// on-disk state file, to prove KV and queued-message state actually survive
// a process restart rather than merely a fresh module instance.
import { createSqliteActivityPubRuntime } from "../../src/sqlite-runtime.mjs";
import { createActivityPubSqliteCustody } from "../../src/sqlite-custody.mjs";

function flag(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function seed() {
  const runtime = await createSqliteActivityPubRuntime({ environment: process.env });
  const custody = createActivityPubSqliteCustody({ database: runtime.database });
  await custody.kv.set(["actor", "codex"], { name: "codex", restarted: false });
  await runtime.queue.enqueue({ order: 1 });
  await runtime.queue.enqueue({ order: 2 });
  runtime.close();
  process.stdout.write(`${JSON.stringify({ ok: true, phase: "seed" })}\n`);
}

async function verify() {
  const runtime = await createSqliteActivityPubRuntime({
    environment: process.env,
    queueOptions: { pollInterval: { milliseconds: 20 } },
  });
  const custody = createActivityPubSqliteCustody({ database: runtime.database });
  const stored = await custody.kv.get(["actor", "codex"]);
  const kvSurvived = stored?.name === "codex";

  const queueOrder = [];
  const controller = new AbortController();
  const drained = new Promise((resolve) => {
    runtime.queue.listen(async (message) => {
      queueOrder.push(message.order);
      if (queueOrder.length === 2) { controller.abort(); resolve(); }
    }, { signal: controller.signal }).catch(() => {});
  });
  await Promise.race([
    drained,
    new Promise((_, reject) => setTimeout(() => reject(new Error("restart-survival queue drain timed out")), 5000)),
  ]);
  runtime.close();
  process.stdout.write(`${JSON.stringify({ ok: true, phase: "verify", kvSurvived, queueOrder })}\n`);
}

const phase = flag("--phase");
(phase === "seed" ? seed() : phase === "verify" ? verify() : Promise.reject(new Error("usage: --phase seed|verify"))).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
