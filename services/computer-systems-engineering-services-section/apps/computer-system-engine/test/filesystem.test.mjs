import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { foldFileLinesUtf8, readJsonFile, writeFileAtomic, writeFileAtomicAsync, writeFileAtomicIf, writeFileAtomicNew } from "../src/filesystem.mjs";

async function inScratch(run) {
  const dir = await mkdtemp(join(tmpdir(), "computer-system-engine-fs-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("atomic writes create missing parents and leave no temp sibling", () => inScratch(async (dir) => {
  const dest = join(dir, "nested", "deep", "file.txt");
  await writeFileAtomicAsync(dest, "hello");
  assert.equal(await readFile(dest, "utf8"), "hello");
  writeFileAtomic(join(dir, "nested", "deep", "sync.txt"), "sync");
  assert.deepEqual((await readdir(join(dir, "nested", "deep"))).sort(), ["file.txt", "sync.txt"]);
}));

test("atomic replace overwrites, carries bytes, and applies modes", () => inScratch(async (dir) => {
  const dest = join(dir, "file.bin");
  writeFileAtomic(dest, "first");
  await writeFileAtomicAsync(dest, Buffer.from([1, 2, 3]));
  assert.deepEqual(await readFile(dest), Buffer.from([1, 2, 3]));
  const secret = join(dir, "private", "secret.txt");
  writeFileAtomic(secret, "s", { mode: 0o600, directoryMode: 0o700 });
  assert.equal((await stat(secret)).mode & 0o777, 0o600);
  assert.equal((await stat(join(dir, "private"))).mode & 0o777, 0o700);
}));

test("create-only writes refuse an existing target; conditional writes publish only when current", () => inScratch(async (dir) => {
  const dest = join(dir, "fact.json");
  writeFileAtomicNew(dest, "one");
  assert.throws(() => writeFileAtomicNew(dest, "two"), (error) => error.code === "EEXIST");
  assert.equal(writeFileAtomicIf(dest, "three", () => false), false);
  assert.equal(await readFile(dest, "utf8"), "one");
  assert.equal(writeFileAtomicIf(dest, "three", () => true), true);
  assert.deepEqual(await readdir(dir), ["fact.json"]);
}));

test("JSON and line reads degrade and fold without holding the file", () => inScratch(async (dir) => {
  assert.equal(readJsonFile(join(dir, "absent.json")), null);
  const lines = join(dir, "rows.jsonl");
  writeFileAtomic(lines, '{"a":1}\n{"a":2}\n{"a":3}');
  const seen = [];
  foldFileLinesUtf8(lines, (line) => seen.push(JSON.parse(line).a), 4);
  assert.deepEqual(seen, [1, 2, 3]);
}));
