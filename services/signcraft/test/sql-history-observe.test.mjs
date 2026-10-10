// Carried from bare-cedar-fog's SignStuff copy of signcraft (2026-10-10), where it already failed:
// it specifies store.observe, store.subjects and subject indexes, which no SQL store in the estate
// implements yet (neither this owner's sql-history-store nor the copy's content port). Each case is
// declared todo so it runs and reports without gating; implementing them turns these back to test().
import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { cell } from "@red-cup-engineering/signcell/cell";
import { checkpointHistory, createHistory, historyHeads, historySection, historySize, materializeHistory, observeHistory, queryHistory } from "../src/history.mjs";
import { createSqlHistoryStore } from "../src/sql-history-store.mjs";

function database(db = new DatabaseSync(":memory:"), options = {}) {
  const sql = {
    exec(query, ...bindings) {
      if (/^\s*SELECT\b/iu.test(query)) return db.prepare(query).iterate(...bindings);
      db.prepare(query).run(...bindings);
      return [];
    },
  };
  const transactionSync = (operation) => {
    db.exec("BEGIN IMMEDIATE");
    try { const result = operation(); db.exec("COMMIT"); return result; } catch (error) { db.exec("ROLLBACK"); throw error; }
  };
  return { db, sql, transactionSync, store: createSqlHistoryStore({ sql, transactionSync, ...options }) };
}

const rng = (seed) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
const pick = (random, items) => items[Math.floor(random() * items.length)];
const FUNCTIONAL = ["f:one", "f:two"];
const PREDICATES = [...FUNCTIONAL, "n:one", "n:two"];
const SUBJECTS = ["alice", "bob", "carol", "kx-1", "kx-2", "kx-10", "ünï", "d"];
const batchOf = (random) => {
  const cells = [];
  for (let n = 1 + Math.floor(random() * 6); n > 0; n -= 1) {
    cells.push(cell(pick(random, SUBJECTS), pick(random, PREDICATES), pick(random, ["x", "y", 3, { k: 1 }]), { for: [pick(random, ["w1", "w2"])] }));
  }
  return cells;
};
const readings = (history) => queryHistory(history, {});
const pairs = (items) => items.map(({ subject, cell: value }) => JSON.stringify([subject, value])).sort();

test.todo("store.observe is observeHistory: same revisions, heads, reading; point reads agree with historySection", () => {
  for (let seed = 1; seed <= 25; seed += 1) {
    const random = rng(seed);
    const { store } = database();
    let reference = createHistory(FUNCTIONAL);
    let nulls = 0;
    for (let step = 0; step < 30; step += 1) {
      const batch = batchOf(random);
      const revision = store.observe(batch, { source: `s${step % 3}`, functionalPredicates: FUNCTIONAL });
      const whole = observeHistory(reference, batch, { source: `s${step % 3}` });
      if (revision === null) {
        nulls += 1;
        assert.deepEqual(readings(whole), readings(reference), "a dropped batch changes no reading");
        continue;
      }
      assert.deepEqual(revision.parents, historyHeads(reference));
      const next = observeHistory(reference, revision.cells, { source: `s${step % 3}` });
      assert.equal(next.revisions.at(-1).id, revision.id);
      assert.deepEqual(readings(next), readings(whole), "dropping repeated cells changes no reading");
      reference = next;
    }
    const first = database();
    const committed = first.store.commit(reference, {});
    const loaded = store.load();
    const expected = first.store.load();
    assert.deepEqual(materializeHistory(loaded.history).revisions.map(({ id }) => id), reference.revisions.map(({ id }) => id));
    assert.deepEqual(historyHeads(loaded.history), historyHeads(reference));
    assert.deepEqual(loaded.history.checkpoint.heads, expected.history.checkpoint.heads);
    assert.deepEqual(loaded.history.checkpoint.cells, expected.history.checkpoint.cells);
    assert.equal(loaded.history.checkpoint.size, historySize(reference));
    assert.equal(loaded.history.checkpoint.id, expected.history.checkpoint.id);
    assert.deepEqual(readings(loaded.history), readings(reference));
    assert.deepEqual(materializeHistory(loaded.history).revisions, reference.revisions);
    assert.ok(committed);
    for (const subject of SUBJECTS) {
      assert.deepEqual(store.readSubject(subject), historySection(reference, subject), `${subject} (seed ${seed})`);
      assert.deepEqual(first.store.readSubject(subject), historySection(reference, subject));
    }
    for (const predicate of PREDICATES) {
      assert.deepEqual(pairs([...store.readPredicate(predicate)]), pairs(queryHistory(reference, { predicate }).map((value) => ({ subject: value.subject, cell: value }))));
      assert.deepEqual(pairs([...first.store.readPredicate(predicate)]), pairs([...store.readPredicate(predicate)]));
    }
    assert.deepEqual([...store.readPredicate("absent")], []);
    assert.ok(nulls >= 0);
  }
});

test.todo("subjects iterates by name with prefix, limit and after", () => {
  const { store } = database();
  store.observe(SUBJECTS.map((subject) => cell(subject, "n:one", "x", { for: ["w"] })), { functionalPredicates: FUNCTIONAL });
  const all = [...store.subjects()];
  assert.deepEqual(all, [...SUBJECTS].sort());
  assert.deepEqual([...store.subjects({ prefix: "kx-" })], ["kx-1", "kx-10", "kx-2"]);
  assert.deepEqual([...store.subjects({ prefix: "kx-", limit: 2 })], ["kx-1", "kx-10"]);
  assert.deepEqual([...store.subjects({ prefix: "kx-", after: "kx-10" })], ["kx-2"]);
  assert.deepEqual([...store.subjects({ limit: 0 })], []);
});

test.todo("an unchanged batch writes nothing; a functional change supersedes; a repeat with new evidence is kept", () => {
  const { store, db } = database();
  const a = cell("m", "f:one", "x", { for: ["w1"] });
  assert.ok(store.observe([a], { functionalPredicates: FUNCTIONAL }));
  const rows = () => db.prepare("SELECT count(*) AS n FROM signcraft_history_log").get().n;
  assert.equal(store.observe([a], { functionalPredicates: FUNCTIONAL }), null);
  assert.equal(rows(), 1);
  assert.ok(store.observe([cell("m", "f:one", "x", { for: ["w2"] })]));
  assert.equal(store.readSubject("m", { raw: true }).length, 1);
  assert.ok(store.observe([cell("m", "f:one", "y", { for: ["w2"] })]));
  assert.deepEqual(store.readSubject("m").map(({ object }) => object), ["y"]);
  assert.equal(rows(), 3);
});

test.todo("observe folds a commit's log first, interoperates with commit, and widening is refused over held cells", () => {
  const { store } = database();
  let history = createHistory(FUNCTIONAL);
  history = observeHistory(history, [cell("a", "f:one", "x", { for: ["w"] }), cell("a", "n:one", "p", { for: ["w"] })]);
  store.commit(history, { tick: 1 });
  history = observeHistory(store.load().history, [cell("a", "f:one", "y", { for: ["w"] })]);
  store.commit(history, { tick: 2 });
  const revision = store.observe([cell("b", "f:one", "z", { for: ["w"] }), cell("a", "n:one", "q", { for: ["w"] })]);
  assert.deepEqual(revision.parents, historyHeads(history));
  const mirror = observeHistory(history, revision.cells);
  assert.deepEqual(readings(store.load().history), readings(mirror));
  assert.deepEqual(store.load().control, { tick: 2 });
  const again = observeHistory(store.load().history, [cell("c", "f:two", "v", { for: ["w"] })]);
  store.commit(again, { tick: 3 });
  assert.deepEqual(readings(store.load().history), readings(again));
  assert.deepEqual(store.readSubject("c").map(({ object }) => object), ["v"]);
  assert.throws(() => store.observe([cell("d", "n:two", "v", { for: ["w"] })], { functionalPredicates: ["n:one"] }), /archived history/);
  assert.ok(store.observe([cell("d", "n:two", "v", { for: ["w"] })], { functionalPredicates: ["n:two"] }));
});

test.todo("a store made before the indexes existed is indexed once on open", () => {
  const fixture = database();
  let history = createHistory(FUNCTIONAL);
  history = observeHistory(history, [cell("a", "f:one", "x", { for: ["w"] }), cell("b", "n:one", "p", { for: ["w"] })]);
  fixture.store.commit(history, {});
  for (const table of ["signcraft_history_terms", "signcraft_history_predicates", "signcraft_history_subject_names", "signcraft_history_index_state"]) fixture.db.exec(`DROP TABLE ${table}`);
  const reopened = createSqlHistoryStore({ sql: fixture.sql, transactionSync: fixture.transactionSync });
  assert.deepEqual([...reopened.readPredicate("f:one")].map(({ subject }) => subject), ["a"]);
  assert.deepEqual([...reopened.subjects()], ["a", "b"]);
});
