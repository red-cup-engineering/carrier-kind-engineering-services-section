// What a SignCraft history store promises, stated over the content kernel on every medium a port
// gives it (in-memory storage, flatfiles). The promises are stated as effects any medium shows:
// the root a store publishes and the objects it writes.
import assert from "node:assert/strict";
import test from "node:test";
import { cell } from "@red-cup-engineering/signcell/cell";
import { createHistory, historyHeads, historySize, materializeHistory, observeHistory, queryHistory, withFunctionalPredicates } from "../src/history.mjs";
import { MEDIA, overMedia } from "./_history-store-media.mjs";

const at = (subject, predicate, object, witness = "stable") => cell(subject, predicate, object, { for: [witness] });
function assertSameReading(left, right) {
  assert.deepEqual(queryHistory(left, {}), queryHistory(right, {}));
  assert.deepEqual(historyHeads(left), historyHeads(right));
  assert.equal(historySize(left), historySize(right));
}

overMedia(test, "checkpoint reload is current-state sized and ancestry stays in the archive", (medium) => {
  const store = medium.open();
  assert.equal(store.load(), null);
  const base = createHistory(["location"]);
  const first = observeHistory(base, [at("alice", "location", "dock", "arrive")], { source: "arrive" });
  const full = observeHistory(first, [at("alice", "location", "inn", "move")], { source: "move" });
  const saved = store.commit(full, { tick: 8, sessions: [["session", "alice"]] });

  assert.deepEqual(saved.revisions, []);
  assert.equal(saved.checkpoint.size, 2);
  assert.deepEqual(queryHistory(saved, { subject: "alice", predicate: "location" }), queryHistory(full, { subject: "alice", predicate: "location" }));
  assertSameReading(materializeHistory(saved), full);

  const loaded = medium.open().load();
  assert.deepEqual(loaded.control, { tick: 8, sessions: [["session", "alice"]] });
  assert.deepEqual(queryHistory(loaded.history, { subject: "alice", predicate: "location" }), queryHistory(full, { subject: "alice", predicate: "location" }));
  assertSameReading(materializeHistory(loaded.history), full);
  const next = observeHistory(loaded.history, [at("alice", "role", "sailor", "crew")], { source: "crew" });
  const secondSave = store.commit(next, { tick: 9, sessions: [["session", "alice"]] });
  assert.deepEqual(secondSave.revisions, []);
  assertSameReading(materializeHistory(store.load().history), next);
});

overMedia(test, "large controls and revisions read back whole; a failed commit leaves the prior checkpoint and archive intact", (medium) => {
  const store = medium.open();
  const initial = observeHistory(createHistory(), [at("note", "text", "seed")]);
  store.commit(initial, { note: "x".repeat(200_500) });
  const loaded = store.load();
  assert.equal(loaded.control.note.length, 200_500);

  const next = observeHistory(loaded.history, [at("note", "text", "y".repeat(200_500), "large")]);
  if (medium.failNextPublish) {
    const root = medium.root();
    medium.failNextPublish();
    assert.throws(() => store.commit(next, { note: "failed" }), /injected publication failure/);
    assert.equal(medium.root(), root);
    assert.equal(medium.open().load().control.note.length, 200_500);
    assert.deepEqual(queryHistory(medium.open().load().history, { subject: "note", predicate: "text" }), queryHistory(loaded.history, { subject: "note", predicate: "text" }));
  }
  const saved = store.commit(next, { note: "y".repeat(200_500) });
  assert.equal(medium.open().load().control.note.length, 200_500);
  assertSameReading(materializeHistory(saved), next);
  assertSameReading(materializeHistory(medium.open().load().history), next);
});

overMedia(test, "an archived revision whose content no longer matches its address is refused", (medium) => {
  const store = medium.open();
  const first = observeHistory(createHistory(), [at("alice", "role", "captain", "original")]);
  store.commit(first, {});
  const revision = first.revisions[0];
  medium.corrupt(revision.id, JSON.stringify({ subject: "signcraft.history", predicate: "revision", object: { parents: revision.parents, source: revision.source, cells: [at("alice", "role", "impostor", "altered")] } }));
  // The reading is made of the archived revisions' cells, so a corrupted revision is refused when the
  // store is read, not served beside it.
  assert.throws(() => materializeHistory(medium.open().load().history), /revision|content|identity|valid|address/iu);
});

overMedia(test, "a checkpoint from another store cannot replace this store's causal base", (medium) => {
  const store = medium.open();
  const historyA = observeHistory(createHistory(), [at("alice", "location", "dock", "a")]);
  const historyB = observeHistory(createHistory(), [at("bob", "location", "inn", "b")]);
  store.commit(historyA, { owner: "first" });
  const second = MEDIA.memory();
  const foreignCheckpoint = second.open().commit(historyB, { owner: "second" });
  const root = medium.root();
  assert.throws(() => store.commit(foreignCheckpoint, { owner: "rejected" }), /does not extend/u);
  assert.equal(medium.root(), root, "nothing is published");
  assert.deepEqual(medium.open().load().control, { owner: "first" });
  assert.deepEqual(queryHistory(medium.open().load().history, {}), queryHistory(historyA, {}));
});

overMedia(test, "a world that widens its functional predicates over observed cells still commits, and reopens with them", (medium) => {
  const store = medium.open();
  store.commit(observeHistory(createHistory(), [at("alice", "role", "anonymouse", "welcome")]), {});
  const widened = withFunctionalPredicates(store.load().history, ["role"]);
  assert.equal(widened.checkpoint, undefined, "widening over observed cells reads the whole ancestry");
  const next = observeHistory(widened, [at("alice", "role", "registered", "login")]);
  store.commit(next, { step: 2 });

  const reopened = medium.open().load().history;
  assert.deepEqual(reopened.functionalPredicates, ["role"]);
  assert.deepEqual(queryHistory(reopened, { subject: "alice", predicate: "role" }), queryHistory(next, { subject: "alice", predicate: "role" }));
  // A materialized history from elsewhere, missing this store's heads, is still no extension of it.
  const stranger = withFunctionalPredicates(observeHistory(createHistory(), [at("bob", "role", "x", "b")]), ["role"]);
  assert.throws(() => store.commit(stranger, {}), /does not extend/u);
});

/** The objects one commit of a small change writes over a world of `sailors` subjects. */
function smallCommitWrites(medium, sailors) {
  const store = medium.open();
  let history = observeHistory(createHistory(["location"]), Array.from({ length: sailors }, (_, index) => at(`sailor-${index}`, "location", "dock")));
  history = store.commit(history, { tick: 0 });
  const writes = [];
  for (let tick = 1; tick <= 3; tick += 1) {
    history = observeHistory(history, [at("sailor-7", "location", `berth-${tick}`), at(`log-${tick}`, "entry", `tick ${tick}`)]);
    const before = medium.objects();
    history = store.commit(history, { tick });
    writes.push(medium.objects() - before);
  }
  return { store, history, writes };
}

overMedia(test, "a commit writes what it admitted, not the size of the reading, and nothing when nothing changed", (medium) => {
  const { store, history, writes } = smallCommitWrites(medium, 200);
  const large = (() => { const other = MEDIA[medium.name](); try { return smallCommitWrites(other, 800).writes; } finally { other.close(); } })();
  // Four times the subjects adds only the deeper index paths a change walks, never a rewrite of them.
  for (let tick = 0; tick < writes.length; tick += 1) assert.ok(large[tick] <= writes[tick] + 12, `commit ${tick + 1}: ${large[tick]} objects over 800 sailors, ${writes[tick]} over 200`);
  const root = medium.root(), objects = medium.objects();
  assert.equal(store.commit(history, { tick: 3 }), history);
  assert.equal(medium.root(), root, "an unchanged world publishes nothing");
  assert.equal(medium.objects(), objects, "an unchanged world writes nothing");
  const loaded = medium.open().load();
  assertSameReading(loaded.history, history);
  assert.equal(loaded.history.checkpoint.id, history.checkpoint.id);
  assert.deepEqual(queryHistory(loaded.history, { subject: "sailor-7", predicate: "location" }).map((found) => found.object), ["berth-3"]);
  assert.deepEqual(loaded.control, { tick: 3 });
  assertSameReading(materializeHistory(loaded.history), materializeHistory(history));
});

overMedia(test, "content the control names by address is written once and read back only under its address", (medium) => {
  const store = medium.open();
  const game = Object.freeze({ rooms: { dock: { name: "The Dock" } }, start: "dock" });
  const id = store.retain(game);
  const written = medium.objects();
  assert.equal(store.retain(game), id);
  assert.equal(store.retain({ ...game }), id);
  assert.equal(medium.objects(), written, "retaining again writes nothing");
  assert.deepEqual(store.content(id), game);
  medium.corrupt(id, JSON.stringify({ start: "elsewhere" }));
  assert.throws(() => medium.open().content(id), /does not match its address/u);
  assert.throws(() => store.content("ni:///sha-256;absentabsentabsentabsentabsentabsentabsentabsent4"), /is not retained|invalid/u);
});

