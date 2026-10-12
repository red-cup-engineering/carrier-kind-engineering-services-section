import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageRoot = new URL("../", import.meta.url);

test("the canonical package contains its implementation, note, and preserved prototype", async () => {
  const required = [
    "hacking/src/envelope.mjs",
    "content/text/documents/articles/notes/2026/05/21/2026-05-21-note-on-spotcomp.md",
    "lib/legacy/2026-03-11-prototype/run.mjs",
    "lib/legacy/2026-08-03-fizzos-harness/settling/scripts/settling.mjs",
  ];

  for (const path of required) {
    const contents = await readFile(new URL(path, packageRoot), "utf8");
    assert.ok(contents.length > 0, `${path} should not be empty`);
  }
});

test("the current example is newline-delimited EAVT JSON", async () => {
  const text = await readFile(new URL("examples/simple-trace.jsonl", packageRoot), "utf8");
  const rows = text.trim().split("\n").map(JSON.parse);

  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.deepEqual(Object.keys(row), ["e", "a", "v", "t"]);
  }
});
