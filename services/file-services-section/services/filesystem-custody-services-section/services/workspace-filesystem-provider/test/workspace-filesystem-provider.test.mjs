import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readWorkspaceFile, writeWorkspaceFile } from "../src/index.mjs";

const sha = text => createHash("sha256").update(text).digest("hex");

test("writes atomically, emits one durable receipt, and supports bounded readback", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "filesystem-custody-"));
  await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "src", "a.txt"), "before");
  const outbox = path.join(root, ".custody", "outbox.jsonl");
  const receipt = await writeWorkspaceFile({ root, path: "src/a.txt", expectedSha256: sha("before"), content: "after", outbox });
  assert.equal(receipt.changed, true);
  assert.equal(await readFile(path.join(root, "src/a.txt"), "utf8"), "after");
  assert.deepEqual(JSON.parse((await readFile(outbox, "utf8")).trim()), receipt);
  const read = await readWorkspaceFile({ root, path: "src/a.txt" });
  assert.equal(read.sha256, sha("after"));
});

test("refuses stale writes and paths outside the custody root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "filesystem-custody-"));
  await writeFile(path.join(root, "a.txt"), "before");
  await assert.rejects(() => writeWorkspaceFile({ root, path: "a.txt", expectedSha256: sha("other"), content: "after", outbox: path.join(root, "outbox.jsonl") }), { code: "stale-source" });
  await assert.rejects(() => readWorkspaceFile({ root, path: "../outside.txt" }), { code: "outside-root" });
});
