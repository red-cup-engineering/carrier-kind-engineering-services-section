import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readLegacySqlite } from "../src/legacy-sqlite-reader.mjs";

const WRITER = [
  "import sqlite3, sys",
  "c = sqlite3.connect(sys.argv[1])",
  "c.executescript(sys.stdin.read())",
  "c.commit()",
].join("\n");

function fixture(dir, script) {
  const file = join(dir, "legacy.sqlite");
  const run = spawnSync("python3", ["-I", "-c", WRITER, file], { input: script, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  return file;
}

test("the legacy reader streams a table in order and reports the tables a file holds", () => {
  const dir = mkdtempSync(join(tmpdir(), "legacy-reader-"));
  try {
    const file = fixture(dir, "CREATE TABLE a (id INTEGER PRIMARY KEY, v TEXT); INSERT INTO a VALUES (2,'two'),(1,'one');");
    const seen = readLegacySqlite(file, [{ table: "a", order: "id" }, { table: "missing" }], (legacy) => ({ has: [legacy.has("a"), legacy.has("missing")], rows: [...legacy.rows("a")] }));
    assert.deepEqual(seen.has, [true, false]);
    assert.deepEqual(seen.rows.map((row) => row.v), ["one", "two"]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("rowid: true adds the rowid of a table that keeps no column for it", () => {
  const dir = mkdtempSync(join(tmpdir(), "legacy-reader-"));
  try {
    const file = fixture(dir, "CREATE VIRTUAL TABLE texts USING fts5(body); INSERT INTO texts(rowid, body) VALUES (7,'seven'),(3,'three');");
    const rows = readLegacySqlite(file, [{ table: "texts", order: "rowid", rowid: true }], (legacy) => [...legacy.rows("texts")]);
    assert.deepEqual(rows.map((row) => [row.rowid, row.body]), [[3, "three"], [7, "seven"]]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
