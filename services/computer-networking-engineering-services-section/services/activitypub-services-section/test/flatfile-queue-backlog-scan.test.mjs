import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FlatfileMessageQueue } from "../src/flatfile-queue.mjs";

const drain = async (queue, expected, enqueueDuring) => {
  const seen = [], controller = new AbortController();
  const listening = queue.listen(async (message) => {
    seen.push(message.id);
    if (enqueueDuring && seen.length === 1) await queue.enqueue({ id: "late" });
    if (seen.length >= expected) controller.abort();
  }, { signal: controller.signal });
  await listening;
  return seen;
};

test("a large ready backlog is listed once per bounded quantum, not once per claimed message", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "flatfile-queue-scan-"));
  const queue = new FlatfileMessageQueue({ directory, pollInterval: 1 });
  try {
    const messages = Array.from({ length: 1280 }, (_, index) => ({ id: `m${index}` }));
    await queue.enqueueMany(messages);
    const seen = await drain(queue, 1280);
    assert.equal(seen.length, 1280);
    assert.deepEqual([...seen].sort(), messages.map((message) => message.id).sort());
    const diagnostics = queue.getCapacityDiagnostics();
    assert.equal(diagnostics.claimedMessages, 1280);
    assert.ok(diagnostics.readyDirectoryScans <= 1280 / diagnostics.scanQuantum + 3,
      `listed the ready spool ${diagnostics.readyDirectoryScans} times for 1280 messages`);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("a message enqueued while a backlog drains is still handled", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "flatfile-queue-scan-"));
  const queue = new FlatfileMessageQueue({ directory, pollInterval: 1 });
  try {
    await queue.enqueueMany(Array.from({ length: 600 }, (_, index) => ({ id: `m${index}` })));
    const seen = await drain(queue, 601, true);
    assert.equal(seen.length, 601);
    assert.ok(seen.includes("late"));
    assert.equal(new Set(seen).size, 601);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
