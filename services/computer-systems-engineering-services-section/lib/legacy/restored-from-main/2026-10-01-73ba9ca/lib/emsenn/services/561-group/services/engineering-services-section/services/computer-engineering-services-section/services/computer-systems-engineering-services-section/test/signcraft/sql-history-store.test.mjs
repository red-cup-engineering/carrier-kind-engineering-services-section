import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { cell } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/cell";
import { createHistory, historyHeads, historySize, materializeHistory, observeHistory, queryHistory } from "../../src/signcraft/history.mjs";
import { createSqlHistoryStore } from "../../src/signcraft/sql-history-store.mjs";

function database() {
  const db = new DatabaseSync(":memory:");
  let failAt = null;
  const queries = [];
  const sql = {
    exec(query, ...bindings) {
      queries.push(query);
      if (failAt && query.includes(failAt)) throw new Error("injected transaction failure");
      if (/^\s*SELECT\b/iu.test(query)) return db.prepare(query).iterate(...bindings);
      db.prepare(query).run(...bindings);
      return [];
    },
  };
  const transactionSync = (operation) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
  return {
    db,
    queries,
    sql,
    store: createSqlHistoryStore({ sql, transactionSync }),
    failOn(value) { failAt = value; },
    close() { db.close(); },
  };
}

const at = (subject, predicate, object, witness = "stable") => cell(subject, predicate, object, { for: [witness] });
function assertSameReading(left, right) {
  assert.deepEqual(queryHistory(left, {}), queryHistory(right, {}));
  assert.deepEqual(historyHeads(left), historyHeads(right));
  assert.equal(historySize(left), historySize(right));
}

test("SQLite checkpoint reload is current-state sized and ancestry stays in an append-only archive", () => {
  const fixture = database();
  try {
    assert.equal(fixture.store.load(), null);
    const base = createHistory(["location"]);
    const first = observeHistory(base, [at("alice", "location", "dock", "arrive")], { source: "arrive" });
    const full = observeHistory(first, [at("alice", "location", "inn", "move")], { source: "move" });
    const saved = fixture.store.commit(full, { tick: 8, sessions: [["session", "alice"]] });

    assert.deepEqual(saved.revisions, []);
    assert.equal(saved.checkpoint.size, 2);
    assert.deepEqual(queryHistory(saved, { subject: "alice", predicate: "location" }), queryHistory(full, { subject: "alice", predicate: "location" }));
    assertSameReading(materializeHistory(saved), full);

    fixture.queries.length = 0;
    const loaded = fixture.store.load();
    assert.equal(fixture.queries.some((query) => query === "SELECT revision_id,sequence,parts FROM signcraft_history_revisions ORDER BY sequence"), false);
    assert.deepEqual(loaded.control, { tick: 8, sessions: [["session", "alice"]] });
    assert.deepEqual(queryHistory(loaded.history, { subject: "alice", predicate: "location" }), queryHistory(full, { subject: "alice", predicate: "location" }));
    assertSameReading(materializeHistory(loaded.history), full);
    const next = observeHistory(loaded.history, [at("alice", "role", "sailor", "crew")], { source: "crew" });
    const secondSave = fixture.store.commit(next, { tick: 9, sessions: [["session", "alice"]] });
    assert.deepEqual(secondSave.revisions, []);
    assertSameReading(materializeHistory(fixture.store.load().history), next);
  } finally {
    fixture.close();
  }
});

test("large controls and revisions are chunked; failed commits leave prior checkpoint and archive intact", () => {
  const fixture = database();
  try {
    const initial = observeHistory(createHistory(), [at("note", "text", "seed")]);
    fixture.store.commit(initial, { note: "x".repeat(200_500) });
    const loaded = fixture.store.load();
    assert.equal(loaded.control.note.length, 200_500);

    const next = observeHistory(loaded.history, [at("note", "text", "y".repeat(200_500), "large")]);
    fixture.failOn("INSERT INTO signcraft_history_checkpoint_chunks");
    assert.throws(() => fixture.store.commit(next, { note: "failed" }), /injected transaction failure/);
    fixture.failOn(null);
    assert.equal(fixture.store.load().control.note.length, 200_500);
    assert.deepEqual(queryHistory(fixture.store.load().history, { subject: "note", predicate: "text" }), queryHistory(loaded.history, { subject: "note", predicate: "text" }));

    const saved = fixture.store.commit(next, { note: "y".repeat(200_500) });
    assert.equal(fixture.store.load().control.note.length, 200_500);
    assertSameReading(materializeHistory(saved), next);
    const chunkCounts = [...fixture.sql.exec("SELECT COUNT(*) AS count FROM signcraft_history_revision_chunks")];
    assert.ok(chunkCounts[0].count > 1);
  } finally {
    fixture.close();
  }
});

test("an existing SCA revision id with corrupted archive content is rejected", () => {
  const fixture = database();
  try {
    const first = observeHistory(createHistory(), [at("alice", "role", "captain", "original")]);
    fixture.store.commit(first, {});
    const revision = first.revisions[0];
    const corrupted = JSON.stringify({ ...revision, cells: [at("alice", "role", "impostor", "altered")] });
    fixture.sql.exec("UPDATE signcraft_history_revision_chunks SET payload = ? WHERE revision_id = ? AND part = 0", corrupted, revision.id);
    assert.throws(() => materializeHistory(fixture.store.load().history), /revision|content|identity|valid/iu);
    assert.deepEqual(queryHistory(fixture.store.load().history, { subject: "alice", predicate: "role" }), queryHistory(first, { subject: "alice", predicate: "role" }));
  } finally {
    fixture.close();
  }
});

test("a checkpoint from another store cannot replace this store's causal base", () => {
  const first = database();
  const second = database();
  try {
    const historyA = observeHistory(createHistory(), [at("alice", "location", "dock", "a")]);
    const historyB = observeHistory(createHistory(), [at("bob", "location", "inn", "b")]);
    first.store.commit(historyA, { owner: "first" });
    const foreignCheckpoint = second.store.commit(historyB, { owner: "second" });

    assert.throws(() => first.store.commit(foreignCheckpoint, { owner: "rejected" }), /does not extend/u);
    assert.deepEqual(first.store.load().control, { owner: "first" });
    assert.deepEqual(queryHistory(first.store.load().history, {}), queryHistory(historyA, {}));
    assert.deepEqual([...first.sql.exec("SELECT COUNT(*) AS count FROM signcraft_history_revisions")][0].count, 1);
  } finally {
    first.close();
    second.close();
  }
});
