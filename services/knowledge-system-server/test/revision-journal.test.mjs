import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { importSqlRevisionIndex, isSqliteFile } from "../src/search/import-sql-revision-index.mjs";
import { openRevisionJournal, snippetOf } from "../src/search/revision-journal.mjs";

const scratch = (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), "revision-journal-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
};
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
const SQL = /node:sqlite|better-sqlite3|DatabaseSync|CREATE (VIRTUAL )?TABLE|INSERT (OR [A-Z]+ )?INTO|SELECT [^"`']* FROM/u;
const blob = (n) => n.toString(16).padStart(40, "0");

test("a journal holds bodies, texts, occurrences and cursors, and reopens at what it held", (t) => {
  const root = path.join(scratch(t), "revisions.journal");
  const first = openRevisionJournal({ root });
  assert.equal(first.admitBody(blob(1), "Cedar", 9, "cedar fog"), true);
  assert.equal(first.admitBody(blob(1), "Cedar", 9, "cedar fog"), false);
  first.admitBody(blob(0x2a), "Pheží", 12, "Pheží salt marsh");
  first.occur(blob(1), "repo", "notes/cedar.md", "c1", "2026-01-01T00:00:00Z", false);
  first.occur(blob(1), "repo", "notes/cedar.md", "c2", "2026-03-01T00:00:00Z", true);
  first.occur(blob(1), "other", "cedar.md", "c9", null, false);
  first.occur(blob(0x2a), "repo", "salt.md", "c1", "2026-02-01T00:00:00Z", false);
  first.setCursor("repo", ["tip-a", "tip-b"]);
  assert.equal(first.seen("repo", "salt.md", "c1"), true);
  first.flush();

  const again = openRevisionJournal({ root });
  assert.equal(again.size, 2);
  assert.equal(again.textOf(blob(1)), "cedar fog");
  assert.equal(again.title(blob(0x2a)), "Pheží");
  assert.deepEqual(again.cursorOf("repo"), ["tip-a", "tip-b"]);
  assert.equal(again.seen("repo", "notes/cedar.md", "c2"), true);
  assert.equal(again.seen("repo", "notes/cedar.md", "c3"), false);
  assert.deepEqual(again.occurrencesOf(blob(1)), [
    { source: "repo", path: "notes/cedar.md", first: "2026-01-01T00:00:00Z", last: "2026-03-01T00:00:00Z", deleted: 1 },
    { source: "other", path: "cedar.md", first: null, last: null, deleted: 0 },
  ]);
  // Words match folded, diacritics away.
  assert.deepEqual(again.search("PHEZI marsh", { limit: 5 }).map((hit) => hit.key), [blob(0x2a)]);
  assert.deepEqual(again.sources(), [
    { source: "other", occurrences: 1, latest: null },
    { source: "repo", occurrences: 3, latest: "2026-03-01T00:00:00Z" },
  ]);

  // An occurrence held already is kept once; a later cursor replaces the earlier one.
  again.occur(blob(1), "repo", "notes/cedar.md", "c1", "2026-01-01T00:00:00Z", false);
  again.setCursor("repo", ["tip-c"]);
  again.flush();
  const third = openRevisionJournal({ root });
  assert.equal(third.sources().find((source) => source.source === "repo").occurrences, 3);
  assert.deepEqual(third.cursorOf("repo"), ["tip-c"]);
});

test("an FTS5 expression matches through the term index, phrases word for word over the journal's text", (t) => {
  const root = path.join(scratch(t), "revisions.journal");
  const first = openRevisionJournal({ root });
  first.admitBody(blob(10), "Fog", 15, "cedar fog lifts");
  first.admitBody(blob(11), "Lift", 15, "fog cedar lifts");
  first.admitBody(blob(12), "Salt", 10, "salt marsh");
  first.flush();
  const journal = openRevisionJournal({ root });
  const keys = (expression) => journal.match(expression, { limit: 10 }).map((hit) => hit.key).sort();
  assert.deepEqual(keys('"cedar fog"'), [blob(10)]);
  assert.deepEqual(keys("cedar OR salt"), [blob(10), blob(11), blob(12)]);
  assert.deepEqual(keys("cedar NOT lifts"), []);
  assert.deepEqual(keys("mar*"), [blob(12)]);
  assert.throws(() => journal.match("text:cedar", { limit: 10 }), /unsupported FTS5 query syntax/u);
});

test("discarded changes are never recorded", (t) => {
  const root = path.join(scratch(t), "revisions.journal");
  const journal = openRevisionJournal({ root });
  journal.admitBody(blob(3), "Gone", 4, "gone");
  journal.occur(blob(3), "repo", "gone.md", "c1", null, false);
  journal.discard();
  journal.flush();
  assert.equal(openRevisionJournal({ root }).size, 0);
  assert.deepEqual(openRevisionJournal({ root }).sources(), []);
});

test("a text past the journal's string bound is kept in parts and read whole", (t) => {
  const root = path.join(scratch(t), "revisions.journal");
  const text = Array.from({ length: 60_000 }, (_, n) => `w${n} "quoted\\" ${n % 7 === 0 ? "\n" : ""}`).join(" ");
  const journal = openRevisionJournal({ root });
  journal.admitBody(blob(4), "Vast", Buffer.byteLength(text), text);
  journal.admitBody(blob(5), "Small", 5, "small");
  journal.flush();
  const again = openRevisionJournal({ root });
  assert.equal(again.textOf(blob(4)), text);
  assert.equal(again.textOf(blob(5)), "small");
  assert.deepEqual(again.search("w59999", { limit: 5 }).map((hit) => hit.key), [blob(4)]);
});

test("a snippet marks the query's words in the words around the first of them", () => {
  const text = "one two three four five six seven eight nine ten eleven twelve Cedar fog lies over the marsh at dawn";
  assert.equal(snippetOf(text, "cedar"), "…seven eight nine ten eleven twelve «Cedar» fog lies over the marsh at dawn");
  assert.equal(snippetOf("Pheží salt", "phezi"), "«Pheží» salt");
});

test("an SQLite archive index is read once into the journal, with a receipt", (t) => {
  const directory = scratch(t);
  const file = path.join(directory, "revisions.sqlite");
  const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
  const db = new DatabaseSync(file);
  // The layout the SQLite archive index wrote.
  db.exec(`CREATE TABLE body (id TEXT PRIMARY KEY, title TEXT, bytes INTEGER);
    CREATE VIRTUAL TABLE body_text USING fts5 (id UNINDEXED, title, text, tokenize = 'unicode61 remove_diacritics 2');
    CREATE TABLE occurrence (id TEXT, source TEXT, path TEXT, revision TEXT, at TEXT, deleted INTEGER, PRIMARY KEY (id, source, path, revision));
    CREATE TABLE cursor (source TEXT, tip TEXT, PRIMARY KEY (source, tip));`);
  db.prepare("INSERT INTO body VALUES (?, ?, ?)").run(blob(7), "Cedar", 9);
  db.prepare("INSERT INTO body_text VALUES (?, ?, ?)").run(blob(7), "Cedar", "cedar fog");
  db.prepare("INSERT INTO occurrence VALUES (?, ?, ?, ?, ?, ?)").run(blob(7), "repo", "cedar.md", "c1", "2026-01-01T00:00:00Z", 0);
  db.prepare("INSERT INTO occurrence VALUES (?, ?, ?, ?, ?, ?)").run(blob(7), "repo", "cedar.md", "c2", "2026-02-01T00:00:00Z", 1);
  db.prepare("INSERT INTO cursor VALUES (?, ?)").run("repo", "tip-a");
  db.close();
  assert.equal(isSqliteFile(file), true);
  assert.equal(isSqliteFile(path.join(directory, "absent.sqlite")), false);

  const root = `${file}.journal`;
  const journal = openRevisionJournal({ root });
  assert.equal(journal.admission, null);
  assert.deepEqual({ ...importSqlRevisionIndex(file, journal) }, { from: file, bodies: 1, occurrences: 2, sources: 1 });

  const again = openRevisionJournal({ root });
  assert.equal(again.admission.bodies, 1);
  assert.equal(again.textOf(blob(7)), "cedar fog");
  assert.deepEqual(again.cursorOf("repo"), ["tip-a"]);
  assert.deepEqual(again.occurrencesOf(blob(7)), [{ source: "repo", path: "cedar.md", first: "2026-01-01T00:00:00Z", last: "2026-02-01T00:00:00Z", deleted: 1 }]);
  assert.deepEqual(again.search("fog", { limit: 5 }).map((hit) => hit.key), [blob(7)]);
  // Read again, nothing is held twice.
  importSqlRevisionIndex(file, again);
  assert.equal(openRevisionJournal({ root }).sources()[0].occurrences, 2);
});

test("SQL is read only in the read-once admission: no other module of the server holds any", () => {
  const holding = readdirSync(source, { recursive: true }).map(String)
    .filter((file) => file.endsWith(".mjs") && !path.basename(file).startsWith("import-sql-"))
    .filter((file) => SQL.test(readFileSync(path.join(source, file), "utf8")));
  assert.deepEqual(holding, []);
});
