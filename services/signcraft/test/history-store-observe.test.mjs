// The history kernel's bounded reads, over every medium a port gives it (in-memory storage,
// flatfiles): observe appends exactly the revision observeHistory would, and readSubject,
// readPredicate and subjects read only what they name. The specification is the one
// sql-history-observe.test.mjs carries (from bare-cedar-fog's SignStuff copy) for a SQL store's
// indexes; here it is met by the kernel every port shares.
import assert from "node:assert/strict";
import test from "node:test";
import { cell } from "@red-cup-engineering/signcell/cell";
import { semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { createHistory, historyHeads, historySection, historySize, materializeHistory, observeHistory, queryHistory } from "../src/history.mjs";
import { MEDIA, overMedia } from "./_history-store-media.mjs";

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

overMedia(test, "store.observe is observeHistory: same revisions, heads, reading; point reads agree with historySection", (medium) => {
  const seeds = medium.name === "memory" ? 25 : 6;
  for (let seed = 1; seed <= seeds; seed += 1) {
    const random = rng(seed);
    const own = MEDIA[medium.name]();
    try {
      const store = own.open();
      let reference = createHistory(FUNCTIONAL);
      for (let step = 0; step < 30; step += 1) {
        const batch = batchOf(random);
        const revision = store.observe(batch, { source: `s${step % 3}`, functionalPredicates: FUNCTIONAL });
        const whole = observeHistory(reference, batch, { source: `s${step % 3}` });
        if (revision === null) {
          assert.deepEqual(readings(whole), readings(reference), "a dropped batch changes no reading");
          continue;
        }
        assert.deepEqual(revision.parents, historyHeads(reference));
        const next = observeHistory(reference, revision.cells, { source: `s${step % 3}` });
        assert.equal(next.revisions.at(-1).id, revision.id);
        assert.deepEqual(readings(next), readings(whole), "dropping repeated cells changes no reading");
        reference = next;
      }
      // The same history committed whole to a second store reads, loads and names its checkpoint alike.
      const first = MEDIA.memory();
      first.open().commit(reference, {});
      const loaded = own.open().load();
      const expected = first.open().load();
      assert.deepEqual(materializeHistory(loaded.history).revisions.map(({ id }) => id), reference.revisions.map(({ id }) => id));
      assert.deepEqual(historyHeads(loaded.history), historyHeads(reference));
      assert.deepEqual(loaded.history.checkpoint.heads, expected.history.checkpoint.heads);
      assert.deepEqual(loaded.history.checkpoint.cells, expected.history.checkpoint.cells);
      assert.equal(loaded.history.checkpoint.size, historySize(reference));
      assert.equal(loaded.history.checkpoint.id, expected.history.checkpoint.id);
      assert.deepEqual(readings(loaded.history), readings(reference));
      assert.deepEqual(materializeHistory(loaded.history).revisions, reference.revisions);
      const committed = first.open();
      for (const subject of SUBJECTS) {
        assert.deepEqual(store.readSubject(subject), historySection(reference, subject), `${subject} (seed ${seed})`);
        assert.deepEqual(committed.readSubject(subject), historySection(reference, subject));
      }
      for (const predicate of PREDICATES) {
        assert.deepEqual(pairs([...store.readPredicate(predicate)]), pairs(queryHistory(reference, { predicate }).map((value) => ({ subject: value.subject, cell: value }))));
        assert.deepEqual(pairs([...committed.readPredicate(predicate)]), pairs([...store.readPredicate(predicate)]));
      }
      assert.deepEqual([...store.readPredicate("absent")], []);
    } finally { own.close(); }
  }
});

overMedia(test, "subjects iterates by name with prefix, limit and after", (medium) => {
  const store = medium.open();
  assert.deepEqual([...store.subjects()], [], "an empty store holds no subjects");
  store.observe([...SUBJECTS.map((subject) => cell(subject, "n:one", "x", { for: ["w"] })), cell({ place: "dock" }, "n:one", "x", { for: ["w"] })], { functionalPredicates: FUNCTIONAL });
  assert.deepEqual([...store.subjects()], [{ place: "dock" }, ...[...SUBJECTS].sort()], "a subject that is not text is named after a NUL, so sorts first");
  assert.deepEqual([...store.subjects({ prefix: "kx-" })], ["kx-1", "kx-10", "kx-2"]);
  assert.deepEqual([...store.subjects({ prefix: "kx-", limit: 2 })], ["kx-1", "kx-10"]);
  assert.deepEqual([...store.subjects({ prefix: "kx-", after: "kx-10" })], ["kx-2"]);
  assert.deepEqual([...store.subjects({ after: "kx-2" })], ["ünï"]);
  assert.deepEqual([...store.subjects({ prefix: "zz" })], []);
  assert.deepEqual([...store.subjects({ limit: 0 })], []);
});

overMedia(test, "an unchanged batch writes nothing; a functional change supersedes; a repeat with new evidence is kept", (medium) => {
  const store = medium.open();
  const a = cell("m", "f:one", "x", { for: ["w1"] });
  assert.ok(store.observe([a], { functionalPredicates: FUNCTIONAL }));
  const root = medium.root(), objects = medium.objects();
  assert.equal(store.observe([a], { functionalPredicates: FUNCTIONAL }), null);
  assert.equal(medium.root(), root, "nothing is published");
  assert.equal(medium.objects(), objects, "nothing is written");
  assert.ok(store.observe([cell("m", "f:one", "x", { for: ["w2"] })]));
  assert.equal(store.readSubject("m", { raw: true }).length, 1);
  assert.ok(store.observe([cell("m", "f:one", "y", { for: ["w2"] })]));
  assert.deepEqual(store.readSubject("m").map(({ object }) => object), ["y"]);
  assert.ok(store.observe([cell("m", "n:one", "p", { for: ["w"] })]));
  assert.equal(store.observe([cell("m", "n:one", "p", { for: ["w"] })]), null, "an accumulating cell already held is dropped");
  assert.deepEqual([...store.readPredicate("f:one")].map(({ cell: value }) => value.object), ["y"]);
});

overMedia(test, "observe folds a commit's log first, interoperates with commit, and widening is refused over held cells", (medium) => {
  const store = medium.open();
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
  assert.deepEqual(readings(medium.open().load().history), readings(again), "a reopened store reads the same");
  assert.deepEqual(store.readSubject("c").map(({ object }) => object), ["v"]);
  assert.throws(() => store.observe([cell("d", "n:two", "v", { for: ["w"] })], { functionalPredicates: ["n:one"] }), /archived history/);
  assert.ok(store.observe([cell("d", "n:two", "v", { for: ["w"] })], { functionalPredicates: ["n:two"] }));
});

test("a store whose frontier predates the indexes is indexed once, on its first bounded read", () => {
  const medium = MEDIA.memory();
  const store = medium.open();
  let history = createHistory(FUNCTIONAL);
  history = observeHistory(history, [cell("a", "f:one", "x", { for: ["w"] }), cell("b", "n:one", "p", { for: ["w"] })]);
  store.commit(history, {});
  // The frontier as a store wrote it before it kept name and predicate indexes.
  const { names: _names, predicates: _predicates, ...earlier } = JSON.parse(medium.storage.read(medium.root()));
  const earlierId = semanticId(earlier);
  medium.storage.putAbsent(earlierId, JSON.stringify(earlier));
  medium.storage.publish(medium.root(), earlierId);
  const reopened = medium.open();
  assert.deepEqual([...reopened.readPredicate("f:one")].map(({ subject }) => subject), ["a"]);
  assert.notEqual(medium.root(), earlierId, "the indexes are published");
  const indexed = medium.root();
  assert.deepEqual([...reopened.subjects()], ["a", "b"]);
  assert.equal(medium.root(), indexed, "and built once");
  assert.deepEqual(readings(reopened.load().history), readings(history));
});
