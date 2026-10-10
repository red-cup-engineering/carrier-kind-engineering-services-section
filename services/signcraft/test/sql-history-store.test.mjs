import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { cell } from "@red-cup-engineering/signcell/cell";
import { checkpointHistory, createHistory, historyHeads, historySize, materializeHistory, observeHistory, queryHistory, withFunctionalPredicates } from "../src/history.mjs";
import { createSqlHistoryStore } from "../src/sql-history-store.mjs";

function database(options = {}) {
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
    transactionSync,
    store: createSqlHistoryStore({ sql, transactionSync, ...options }),
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

test("a world that widens its functional predicates over observed cells still commits, and reopens with them", () => {
  const fixture = database();
  try {
    fixture.store.commit(observeHistory(createHistory(), [at("alice", "role", "anonymouse", "welcome")]), {});
    const widened = withFunctionalPredicates(fixture.store.load().history, ["role"]);
    assert.equal(widened.checkpoint, undefined, "widening over observed cells reads the whole ancestry");
    const next = observeHistory(widened, [at("alice", "role", "registered", "login")]);
    fixture.store.commit(next, { step: 2 });

    const reopened = fixture.store.load().history;
    assert.deepEqual(reopened.functionalPredicates, ["role"]);
    assert.deepEqual(queryHistory(reopened, { subject: "alice", predicate: "role" }), queryHistory(next, { subject: "alice", predicate: "role" }));
    // A materialized history from elsewhere, missing this store's heads, is still no extension of it.
    const stranger = withFunctionalPredicates(observeHistory(createHistory(), [at("bob", "role", "x", "b")]), ["role"]);
    assert.throws(() => fixture.store.commit(stranger, {}), /does not extend/u);
  } finally {
    fixture.close();
  }
});
