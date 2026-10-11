import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { writeLegacySqlite } from "./write-legacy-sqlite.mjs";
import { importSqlRevisionIndex } from "../receive.mjs";
import { openRevisionJournal } from "../../../src/search/revision-journal.mjs";
const scratch = (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), "revision-index-offline-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
};
const blob = (n) => n.toString(16).padStart(40, "0");
test("an SQLite archive index is read once into the journal, with a receipt", (t) => {
  const directory = scratch(t);
  const file = path.join(directory, "revisions.sqlite");
  // The layout the SQLite archive index wrote.
  writeLegacySqlite(file, [
    `CREATE TABLE body (id TEXT PRIMARY KEY, title TEXT, bytes INTEGER);
    CREATE VIRTUAL TABLE body_text USING fts5 (id UNINDEXED, title, text, tokenize = 'unicode61 remove_diacritics 2');
    CREATE TABLE occurrence (id TEXT, source TEXT, path TEXT, revision TEXT, at TEXT, deleted INTEGER, PRIMARY KEY (id, source, path, revision));
    CREATE TABLE cursor (source TEXT, tip TEXT, PRIMARY KEY (source, tip));`,
    ["INSERT INTO body VALUES (?, ?, ?)", blob(7), "Cedar", 9],
    ["INSERT INTO body_text VALUES (?, ?, ?)", blob(7), "Cedar", "cedar fog"],
    ["INSERT INTO occurrence VALUES (?, ?, ?, ?, ?, ?)", blob(7), "repo", "cedar.md", "c1", "2026-01-01T00:00:00Z", 0],
    ["INSERT INTO occurrence VALUES (?, ?, ?, ?, ?, ?)", blob(7), "repo", "cedar.md", "c2", "2026-02-01T00:00:00Z", 1],
    ["INSERT INTO cursor VALUES (?, ?)", "repo", "tip-a"],
  ]);
  const before = readFileSync(file);
  const expectedSha256 = createHash("sha256").update(before).digest("hex");

  const root = path.join(directory, "received.journal");
  const journal = openRevisionJournal({ root });
  assert.equal(journal.admission, null);
  assert.deepEqual({ ...importSqlRevisionIndex(file, journal, { expectedSha256 }) }, { from: file, sourceSha256: expectedSha256, bodies: 1, occurrences: 2, sources: 1 });

  assert.ok(readFileSync(file).equals(before), "the SQLite file is read, never written");
  const again = openRevisionJournal({ root });
  assert.equal(again.admission.bodies, 1);
  assert.equal(again.textOf(blob(7)), "cedar fog");
  assert.deepEqual(again.cursorOf("repo"), ["tip-a"]);
  assert.deepEqual(again.occurrencesOf(blob(7)), [{ source: "repo", path: "cedar.md", first: "2026-01-01T00:00:00Z", last: "2026-02-01T00:00:00Z", deleted: 1 }]);
  assert.deepEqual(again.search("fog", { limit: 5 }).map((hit) => hit.key), [blob(7)]);
  // Read again, nothing is held twice.
  importSqlRevisionIndex(file, again, { expectedSha256 });
  assert.equal(openRevisionJournal({ root }).sources()[0].occurrences, 2);
});


const schema = `CREATE TABLE body (id TEXT PRIMARY KEY, title TEXT, bytes INTEGER);
CREATE TABLE body_text (id TEXT, title TEXT, text TEXT);
CREATE TABLE occurrence (id TEXT, source TEXT, path TEXT, revision TEXT, at TEXT, deleted INTEGER);
CREATE TABLE cursor (source TEXT, tip TEXT);`;
const digest = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

for (const table of ["body", "body_text", "occurrence", "cursor"]) {
  test(`missing ${table} schema refuses without a successful empty receipt`, (t) => {
    const directory = scratch(t), file = path.join(directory, "old.sqlite");
    writeLegacySqlite(file, [schema, `DROP TABLE ${table};`]);
    const before = readFileSync(file), journal = openRevisionJournal({ root: path.join(directory, "received") });
    assert.throws(() => importSqlRevisionIndex(file, journal, { expectedSha256: digest(file) }), /required custody tables|reader refused/u);
    assert.equal(journal.admission, null);
    assert.equal(journal.size, 0);
    assert.deepEqual(readFileSync(file), before);
  });
}

test("an empty correct historical schema receives with an identity-bearing receipt", (t) => {
  const directory = scratch(t), file = path.join(directory, "old.sqlite");
  writeLegacySqlite(file, [schema]);
  const journal = openRevisionJournal({ root: path.join(directory, "received") }), expectedSha256 = digest(file);
  assert.deepEqual(importSqlRevisionIndex(file, journal, { expectedSha256 }), { from: file, sourceSha256: expectedSha256, bodies: 0, occurrences: 0, sources: 0 });
});

test("multiple cursor tips and repeat receiving preserve current aggregation and idempotence", (t) => {
  const directory = scratch(t), file = path.join(directory, "old.sqlite");
  writeLegacySqlite(file, [schema,
    ["INSERT INTO body VALUES (?, ?, ?)", blob(8), "Fog", 3],
    ["INSERT INTO body_text VALUES (?, ?, ?)", blob(8), "Fog", "fog"],
    ["INSERT INTO occurrence VALUES (?, ?, ?, ?, ?, ?)", blob(8), "repo", "fog.md", "one", null, 0],
    ["INSERT INTO cursor VALUES (?, ?)", "repo", "tip-a"],
    ["INSERT INTO cursor VALUES (?, ?)", "repo", "tip-b"],
  ]);
  const root = path.join(directory, "received"), journal = openRevisionJournal({ root }), expectedSha256 = digest(file);
  importSqlRevisionIndex(file, journal, { expectedSha256 });
  assert.deepEqual(journal.cursorOf("repo"), ["tip-a", "tip-b"]);
  importSqlRevisionIndex(file, journal, { expectedSha256 });
  assert.equal(openRevisionJournal({ root }).sources()[0].occurrences, 1);
});

for (const value of [null, "not-a-number", -1]) {
  test(`invalid body bytes ${JSON.stringify(value)} refuse before admission`, (t) => {
    const directory = scratch(t), file = path.join(directory, "old.sqlite");
    writeLegacySqlite(file, [schema,
      ["INSERT INTO body VALUES (?, ?, ?)", blob(9), "Fog", value],
      ["INSERT INTO body_text VALUES (?, ?, ?)", blob(9), "Fog", "fog"],
    ]);
    const journal = openRevisionJournal({ root: path.join(directory, "received") });
    assert.throws(() => importSqlRevisionIndex(file, journal, { expectedSha256: digest(file) }), /invalid body row/u);
    assert.equal(journal.admission, null);
    assert.equal(journal.size, 0);
  });
}

test("interrupted receiving leaves durable batches distinct from completion and retries once", (t) => {
  const directory = scratch(t), file = path.join(directory, "old.sqlite"), commands = [schema];
  for (let n = 1; n <= 501; n += 1) {
    commands.push(["INSERT INTO body VALUES (?, ?, ?)", blob(n), "Fog", 3]);
    commands.push(["INSERT INTO body_text VALUES (?, ?, ?)", blob(n), "Fog", "fog"]);
  }
  writeLegacySqlite(file, commands);
  const root = path.join(directory, "received"), journal = openRevisionJournal({ root }), expectedSha256 = digest(file);
  let calls = 0;
  const interrupted = { ...journal, admitBody(...args) { if (++calls === 501) throw new Error("interrupted"); return journal.admitBody(...args); } };
  assert.throws(() => importSqlRevisionIndex(file, interrupted, { expectedSha256 }), /interrupted/u);
  const partial = openRevisionJournal({ root });
  assert.equal(partial.size, 500);
  assert.equal(partial.admission, null);
  importSqlRevisionIndex(file, partial, { expectedSha256 });
  assert.equal(openRevisionJournal({ root }).size, 501);
  assert.equal(openRevisionJournal({ root }).admission.sourceSha256, expectedSha256);
});
