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

test("large controls and revisions are chunked; failed commits leave prior checkpoint and archive intact", () => {
  const fixture = database();
  try {
    const initial = observeHistory(createHistory(), [at("note", "text", "seed")]);
    fixture.store.commit(initial, { note: "x".repeat(200_500) });
    const loaded = fixture.store.load();
    assert.equal(loaded.control.note.length, 200_500);

    const next = observeHistory(loaded.history, [at("note", "text", "y".repeat(200_500), "large")]);
    fixture.failOn("INSERT INTO signcraft_history_log");
    assert.throws(() => fixture.store.commit(next, { note: "failed" }), /injected transaction failure/);
    fixture.failOn(null);
    assert.equal(fixture.store.load().control.note.length, 200_500);
    assert.deepEqual(queryHistory(fixture.store.load().history, { subject: "note", predicate: "text" }), queryHistory(loaded.history, { subject: "note", predicate: "text" }));

    const saved = fixture.store.commit(next, { note: "y".repeat(200_500) });
    assert.equal(fixture.store.load().control.note.length, 200_500);
    assertSameReading(materializeHistory(saved), next);
    const chunkCounts = [...fixture.sql.exec("SELECT COUNT(*) AS count FROM signcraft_history_log WHERE sequence = 1")];
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
    const corrupted = JSON.stringify([{ ...revision, cells: [at("alice", "role", "impostor", "altered")] }]);
    fixture.sql.exec("UPDATE signcraft_history_log SET payload = ? WHERE sequence = 0 AND part = 0", corrupted);
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
    assert.deepEqual([...first.sql.exec("SELECT COUNT(*) AS count FROM signcraft_history_log")][0].count, 1);
  } finally {
    first.close();
    second.close();
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

test("a commit appends one log row and its control, and writes nothing when nothing changed", () => {
  const fixture = database();
  try {
    let history = observeHistory(createHistory(["location"]), Array.from({ length: 200 }, (_, index) => at(`sailor-${index}`, "location", "dock")));
    history = fixture.store.commit(history, { tick: 0 });
    for (let tick = 1; tick <= 3; tick += 1) {
      history = observeHistory(history, [at("sailor-7", "location", `berth-${tick}`), at(`log-${tick}`, "entry", `tick ${tick}`)]);
      fixture.queries.length = 0;
      history = fixture.store.commit(history, { tick });
      const writes = fixture.queries.filter((query) => /^\s*(INSERT|UPDATE|DELETE)/u.test(query));
      assert.deepEqual(writes.map((query) => query.split(" ").slice(0, 3).join(" ")), ["INSERT INTO signcraft_history_log", "UPDATE signcraft_history_control_chunks SET"]);
    }
    fixture.queries.length = 0;
    assert.equal(fixture.store.commit(history, { tick: 3 }), history);
    assert.ok(!fixture.queries.some((query) => /^\s*(INSERT|UPDATE|DELETE)/u.test(query)), "an unchanged world writes nothing");
    const loaded = fixture.store.load();
    assertSameReading(loaded.history, history);
    assert.equal(loaded.history.checkpoint.id, history.checkpoint.id);
    assert.deepEqual(queryHistory(loaded.history, { subject: "sailor-7", predicate: "location" }).map((found) => found.object), ["berth-3"]);
    assert.deepEqual(loaded.control, { tick: 3 });
    assertSameReading(materializeHistory(loaded.history), materializeHistory(history));
  } finally {
    fixture.close();
  }
});

test("compaction rewrites only the subjects the log touched, however large the reading", () => {
  const fixture = database({ compactRevisions: 3 });
  try {
    let history = observeHistory(createHistory(["location"]), Array.from({ length: 200 }, (_, index) => at(`sailor-${index}`, "location", "dock")));
    history = fixture.store.commit(history, { tick: 0 });
    const rewrites = [];
    for (let tick = 1; tick <= 4; tick += 1) {
      history = observeHistory(history, [at("sailor-7", "location", `berth-${tick}`), at(`log-${tick}`, "entry", `tick ${tick}`)]);
      fixture.queries.length = 0;
      history = fixture.store.commit(history, { tick });
      rewrites.push(fixture.queries.filter((query) => /^(INSERT INTO|UPDATE) signcraft_history_reading_chunks/u.test(query)).length);
    }
    assert.deepEqual(rewrites, [0, 0, 0, 5], "the moved sailor and four log entries, once, not the other 199 sailors");
    assert.equal([...fixture.sql.exec("SELECT log_from FROM signcraft_history_frontier")][0].log_from, 5);
    const loaded = createSqlHistoryStore({ sql: fixture.sql, transactionSync: fixture.transactionSync }).load();
    assertSameReading(loaded.history, history);
    assert.deepEqual(loaded.control, { tick: 4 });
    assertSameReading(materializeHistory(loaded.history), materializeHistory(history));
  } finally {
    fixture.close();
  }
});

test("a log that does not reach the checkpoint it recorded is refused on load", () => {
  const fixture = database();
  try {
    const first = fixture.store.commit(observeHistory(createHistory(), [at("alice", "role", "captain")]), {});
    fixture.store.commit(observeHistory(first, [at("alice", "role", "mate")]), {});
    fixture.sql.exec("UPDATE signcraft_history_log SET checkpoint_id = ? WHERE sequence = 1", first.checkpoint.id);
    assert.throws(() => fixture.store.load(), /does not reach/u);
  } finally {
    fixture.close();
  }
});

test("a reading whose rows lost or reordered an observation is refused on load", () => {
  const fixture = database();
  try {
    fixture.store.commit(observeHistory(createHistory(), [at("alice", "role", "captain"), at("bob", "role", "mate")]), {});
    fixture.sql.exec("UPDATE signcraft_history_reading SET sequence = 10 - sequence");
    assert.throws(() => fixture.store.load(), /content address/u);
  } finally {
    fixture.close();
  }
});

test("a journal holding its whole checkpoint as one value is moved into subject rows once", () => {
  const fixture = database();
  try {
    const history = observeHistory(observeHistory(createHistory(["location"]), [at("alice", "location", "dock")]), [at("alice", "location", "inn"), at("bob", "role", "mate")]);
    const checkpointed = checkpointHistory(history);
    const { sql } = fixture;
    // The journal as it stood before subject rows: a state row and one chunked checkpoint.
    sql.exec("DROP TABLE signcraft_history_frontier");
    sql.exec("CREATE TABLE signcraft_history_state (id INTEGER PRIMARY KEY CHECK (id = 1), checkpoint_id TEXT NOT NULL, checkpoint_parts INTEGER NOT NULL, control_parts INTEGER NOT NULL, next_sequence INTEGER NOT NULL)");
    sql.exec("CREATE TABLE signcraft_history_checkpoint_chunks (id INTEGER NOT NULL, part INTEGER NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (id, part))");
    sql.exec("INSERT INTO signcraft_history_checkpoint_chunks (id,part,payload) VALUES (1,0,?)", JSON.stringify(checkpointed));
    sql.exec("INSERT INTO signcraft_history_control_chunks (id,part,payload) VALUES (1,0,?)", JSON.stringify({ tick: 4 }));
    history.revisions.forEach((revision, sequence) => {
      sql.exec("INSERT INTO signcraft_history_revisions (revision_id,sequence,parts) VALUES (?,?,1)", revision.id, sequence);
      sql.exec("INSERT INTO signcraft_history_revision_chunks (revision_id,part,payload) VALUES (?,0,?)", revision.id, JSON.stringify(revision));
    });
    sql.exec("INSERT INTO signcraft_history_state (id,checkpoint_id,checkpoint_parts,control_parts,next_sequence) VALUES (1,?,1,1,?)", checkpointed.checkpoint.id, history.revisions.length);

    const store = createSqlHistoryStore({ sql, transactionSync: fixture.transactionSync });
    const tables = [...sql.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'signcraft_history_%' ORDER BY name")].map(({ name }) => name);
    assert.ok(!tables.includes("signcraft_history_state") && !tables.includes("signcraft_history_checkpoint_chunks"));
    const loaded = store.load();
    assert.equal(loaded.history.checkpoint.id, checkpointed.checkpoint.id);
    assert.deepEqual(loaded.control, { tick: 4 });
    assertSameReading(materializeHistory(loaded.history), history);
    const next = observeHistory(loaded.history, [at("bob", "location", "deck")]);
    store.commit(next, { tick: 5 });
    assertSameReading(materializeHistory(createSqlHistoryStore({ sql, transactionSync: fixture.transactionSync }).load().history), next);
  } finally {
    fixture.close();
  }
});

test("content the control names by address is written once and read back only under its address", () => {
  const fixture = database();
  try {
    const game = Object.freeze({ rooms: { dock: { name: "The Dock" } }, start: "dock" });
    const id = fixture.store.retain(game);
    const written = fixture.queries.length;
    assert.equal(fixture.store.retain(game), id);
    assert.equal(fixture.store.retain({ ...game }), id);
    assert.ok(!fixture.queries.slice(written).some((query) => /^\s*INSERT/iu.test(query)), "retaining again writes nothing");
    assert.deepEqual(fixture.store.content(id), game);
    fixture.sql.exec("UPDATE signcraft_history_content_chunks SET payload = ? WHERE id = ?", JSON.stringify({ start: "elsewhere" }), id);
    assert.throws(() => createSqlHistoryStore({ sql: fixture.sql, transactionSync: fixture.transactionSync }).content(id), /does not match its address/u);
    assert.throws(() => fixture.store.content("ni:///sha-256;absent"), /is not retained/u);
  } finally {
    fixture.close();
  }
});

test("a journal written before the log reads from an empty one and logs from then on", () => {
  const fixture = database();
  try {
    const saved = fixture.store.commit(observeHistory(createHistory(["location"]), [at("alice", "location", "dock")]), { tick: 1 });
    const { sql } = fixture;
    // The frontier as it stood before the log: no log_from column, every revision in the revisions table.
    sql.exec("ALTER TABLE signcraft_history_frontier DROP COLUMN log_from");
    for (const { revisions } of [...sql.exec("SELECT payload AS revisions FROM signcraft_history_log")].map((row) => ({ revisions: JSON.parse(row.revisions) }))) {
      revisions.forEach((revision, sequence) => {
        sql.exec("INSERT INTO signcraft_history_revisions (revision_id,sequence,parts) VALUES (?,?,1)", revision.id, sequence);
        sql.exec("INSERT INTO signcraft_history_revision_chunks (revision_id,part,payload) VALUES (?,0,?)", revision.id, JSON.stringify(revision));
      });
    }
    sql.exec("DELETE FROM signcraft_history_log");
    const store = createSqlHistoryStore({ sql, transactionSync: fixture.transactionSync });
    const loaded = store.load();
    assert.equal(loaded.history.checkpoint.id, saved.checkpoint.id);
    const next = store.commit(observeHistory(loaded.history, [at("alice", "location", "inn")]), { tick: 2 });
    const reopened = createSqlHistoryStore({ sql, transactionSync: fixture.transactionSync }).load();
    assert.equal(reopened.history.checkpoint.id, next.checkpoint.id);
    assert.deepEqual(queryHistory(materializeHistory(reopened.history), { subject: "alice", predicate: "location" }).map((found) => found.object), ["inn"]);
  } finally {
    fixture.close();
  }
});
