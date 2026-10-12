import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SqliteKvStore, SqliteMessageQueue } from "@fedify/sqlite";
import { createSqliteActivityPubRuntime } from "../src/sqlite-runtime.mjs";

async function tempStatePath() {
  const dir = await mkdtemp(path.join(tmpdir(), "activitypub-sqlite-runtime-"));
  return { dir, statePath: path.join(dir, "nested", "fedify.sqlite") };
}

test("the local runtime requires an explicit state path or ACTIVITYPUB_SQLITE_PATH", async () => {
  await assert.rejects(
    () => createSqliteActivityPubRuntime({ environment: {} }),
    /ACTIVITYPUB_SQLITE_PATH is required/u,
  );
});

test("the local runtime opens (and creates the parent directory for) one SQLite file backing both KV and queue", async () => {
  const { dir, statePath } = await tempStatePath();
  try {
    const runtime = await createSqliteActivityPubRuntime({ statePath });
    try {
      assert.equal(runtime.statePath, statePath);
      assert.ok(runtime.database instanceof DatabaseSync);
      assert.ok(runtime.queue instanceof SqliteMessageQueue);
      // Same open handle backs both the queue and (via sqlite-custody.mjs) the KV store.
      const kv = new SqliteKvStore(runtime.database);
      await kv.set(["probe"], "alive");
      assert.equal(await kv.get(["probe"]), "alive");
    } finally {
      runtime.close();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("queued messages enqueued before a restart are still consumed in order after reopening the same file", async () => {
  const { dir, statePath } = await tempStatePath();
  try {
    const first = await createSqliteActivityPubRuntime({ statePath });
    await first.queue.enqueue({ order: 1 });
    await first.queue.enqueue({ order: 2 });
    first.close();

    const second = await createSqliteActivityPubRuntime({
      statePath,
      queueOptions: { pollInterval: { milliseconds: 20 } },
    });
    try {
      const seen = [];
      const controller = new AbortController();
      const handled = new Promise((resolve) => {
        second.queue.listen(async (message) => {
          seen.push(message.order);
          if (seen.length === 2) { controller.abort(); resolve(); }
        }, { signal: controller.signal }).catch(() => {});
      });
      await Promise.race([
        handled,
        new Promise((_, reject) => setTimeout(() => reject(new Error("timed out waiting for restarted queue to redeliver")), 5000)),
      ]);
      assert.deepEqual(seen, [1, 2]);
    } finally {
      second.close();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
