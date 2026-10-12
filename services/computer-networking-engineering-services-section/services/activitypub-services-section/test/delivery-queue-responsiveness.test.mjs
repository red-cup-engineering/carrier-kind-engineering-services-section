import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setImmediate } from "node:timers/promises";
import { createFlatfileActivityPubRuntime } from "../src/flatfile-runtime.mjs";

test("a replenished delivery backlog permits timers without losing pending messages", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "native-delivery-queue-"));
  const runtime = createFlatfileActivityPubRuntime({ stateDirectory: directory });
  const abort = new AbortController();
  let handled = 0, handledWhenTimerRan;
  await runtime.queue.enqueue({ id: "retained-delivery" });
  const timer = setTimeout(() => { handledWhenTimerRan = handled; }, 0);
  try {
    await runtime.queue.listen(async (message) => {
      handled++;
      if (handled >= 200) abort.abort();
      await runtime.queue.enqueue(message);
    }, { signal: abort.signal });
    await setImmediate();
    assert.ok(handledWhenTimerRan !== undefined && handledWhenTimerRan < 200,
      "delivery retries monopolized the event loop until the backlog stopped");
    const pending = readdirSync(path.join(directory, "queue/ready"))
      .filter(name => name.endsWith(".json"))
      .map(name => JSON.parse(readFileSync(path.join(directory, "queue/ready", name), "utf8")));
    assert.ok(pending.length >= 1);
    assert.ok(pending.every(row => row.message.id === "retained-delivery"));
    const reopened = createFlatfileActivityPubRuntime({ stateDirectory: directory });
    assert.equal((await reopened.queue.getDepth()).queued, pending.length);
    reopened.close();
  } finally {
    clearTimeout(timer); abort.abort(); runtime.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
