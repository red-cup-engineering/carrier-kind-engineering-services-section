import test from "node:test";
import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { FlatfileMessageQueue } from "../src/flatfile-queue.mjs";

test("idle queue polling retains only live abort subscriptions and closes them", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "flatfile-queue-lifetime-"));
  const queue = new FlatfileMessageQueue({ directory, pollInterval: 1 });
  const controller = new AbortController();
  const listening = queue.listen(() => {}, { signal: controller.signal });
  try {
    for (let tick = 0; tick < 25; tick++) {
      await setTimeout(2);
      assert.ok(getEventListeners(controller.signal, "abort").length <= 2);
    }
    controller.abort();
    await listening;
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  } finally { controller.abort(); await listening; rmSync(directory, { recursive: true, force: true }); }
});
