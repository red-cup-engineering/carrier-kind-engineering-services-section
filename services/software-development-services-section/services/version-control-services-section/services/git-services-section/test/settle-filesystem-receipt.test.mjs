import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { settleFilesystemReceipt } from "../src/settle-filesystem-receipt.mjs";

const sha = value => createHash("sha256").update(value).digest("hex");
const git = (cwd, ...args) => {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
};

test("settles exactly the custody-witnessed path and rejects ambient staging", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "receipt-settlement-"));
  git(root, "init"); git(root, "config", "user.name", "test"); git(root, "config", "user.email", "test@example.invalid");
  await writeFile(path.join(root, "a.txt"), "before"); await writeFile(path.join(root, "b.txt"), "before");
  git(root, "add", "--", "a.txt", "b.txt"); git(root, "commit", "-m", "initial");
  await writeFile(path.join(root, "a.txt"), "after"); await writeFile(path.join(root, "b.txt"), "ambient");
  const receipt = { kind: "filesystem-write-receipt/v1", changed: true, id: "sha256:receipt", root, path: "a.txt", after: sha("after") };
  const receiptPath = path.join(root, "receipt.jsonl"); await writeFile(receiptPath, `${JSON.stringify(receipt)}\n`);
  const settled = await settleFilesystemReceipt({ repository: root, receiptPath, message: "settle a", gitBin: "git" });
  assert.equal(settled.path, "a.txt");
  assert.equal(spawnSync("git", ["show", "HEAD:a.txt"], { cwd: root, encoding: "utf8" }).stdout, "after");
  assert.equal(spawnSync("git", ["show", "HEAD:b.txt"], { cwd: root, encoding: "utf8" }).stdout, "before");
});
