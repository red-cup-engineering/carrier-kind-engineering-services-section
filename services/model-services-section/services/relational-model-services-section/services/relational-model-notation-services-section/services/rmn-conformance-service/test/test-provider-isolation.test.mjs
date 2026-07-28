import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { startRmnProviderProcess } from "../src/test-provider.mjs";

test("ephemeral RMN providers own distinct task stores and retire them", async () => {
  const left = await startRmnProviderProcess();
  const right = await startRmnProviderProcess();
  try {
    assert.notEqual(left.taskStoreRoot, right.taskStoreRoot);
    assert.equal(existsSync(left.taskStoreRoot), true);
    assert.equal(existsSync(right.taskStoreRoot), true);
  } finally {
    await Promise.all([left.close(), right.close()]);
  }
  assert.equal(existsSync(left.taskStoreRoot), false);
  assert.equal(existsSync(right.taskStoreRoot), false);
});
