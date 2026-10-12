import assert from "node:assert/strict";
import test from "node:test";
import { cell } from "@red-cup-engineering/signcell/cell";
import { checkpointHistory, createHistory, historyChanges, historyDerivation, observeHistory, queryHistory, withFunctionalPredicates } from "../src/history.mjs";

const at = (subject, predicate, object, witness = "stable") => cell(subject, predicate, object, { for: [witness] });
const tell = (history, ...cells) => observeHistory(history, cells, { source: "test" });

test("a history's changes since an earlier one are the cells told and superseded between them", () => {
  const start = tell(createHistory(["location"]), at("alice", "location", "dock"));
  const moved = tell(start, at("alice", "location", "inn"));
  const changes = historyChanges(start, moved);
  assert.deepEqual(changes.map((c) => c.object).sort(), ["dock", "inn"]);
  assert.deepEqual(historyChanges(moved, moved), []);
  assert.deepEqual(historyChanges(start, checkpointHistory(start)), []);
});

test("histories with no recorded path between them are diffed by their cells, never missing one", () => {
  const start = tell(createHistory(["location"]), at("alice", "location", "dock"));
  const elsewhere = tell(createHistory(["location"]), at("alice", "location", "dock"), at("bob", "location", "inn"));
  assert.ok(historyChanges(start, elsewhere).some((c) => c.subject === "bob" && c.object === "inn"));
  const later = tell(start, at("bob", "location", "inn"));
  assert.deepEqual(historyChanges(start, checkpointHistory(later)).map((c) => c.subject), ["bob"]);
});

test("a change of functional schema has no change set", () => {
  const start = tell(createHistory(["location"]), at("alice", "location", "dock"));
  assert.equal(historyChanges(start, withFunctionalPredicates(start, ["location", "pose"])), null);
});

test("a derivation carries to a later history in which nothing it read changed", () => {
  let runs = 0;
  const whereIs = historyDerivation((history, subject) => {
    runs++;
    return queryHistory(history, { subject, predicate: "location" }).map((c) => c.object);
  });
  const start = tell(createHistory(["location"]), at("alice", "location", "dock"), at("bob", "location", "inn"));
  const first = whereIs(start, "alice");
  const bobMoved = tell(start, at("bob", "location", "market"));
  assert.equal(whereIs(bobMoved, "alice"), first);
  assert.equal(runs, 1);
  const aliceMoved = tell(bobMoved, at("alice", "location", "inn"));
  assert.deepEqual(whereIs(aliceMoved, "alice"), ["inn"]);
  assert.equal(runs, 2);
});

test("a re-derived reading equal to the last is the last reading, so its readers carry", () => {
  let outer = 0;
  const isHere = historyDerivation((history, subject) => queryHistory(history, { subject, predicate: "location" }).some((c) => c.object === "dock"));
  const names = historyDerivation((history, subject) => { outer++; return { subject, here: isHere(history, subject) }; });
  const start = tell(createHistory(["location", "mood"]), at("alice", "location", "dock"));
  const first = names(start, "alice");
  // alice's location cell is re-told with another witness: isHere re-derives to the same reading.
  const retold = tell(start, at("alice", "location", "dock", "again"));
  assert.equal(names(retold, "alice"), first);
  assert.equal(outer, 1);
  const left = tell(retold, at("alice", "location", "inn"));
  assert.deepEqual(names(left, "alice"), { subject: "alice", here: false });
  assert.equal(outer, 2);
});

test("a query by predicate and text object reads only the cells referring to that object", () => {
  const history = tell(createHistory(["location"]), at("alice", "location", "dock"), at("bob", "location", "inn"), at("carol", "location", "dock"));
  assert.deepEqual(queryHistory(history, { predicate: "location", object: "dock" }).map((c) => c.subject).sort(), ["alice", "carol"]);
  const moved = tell(history, at("carol", "location", "inn"));
  assert.deepEqual(queryHistory(moved, { predicate: "location", object: "dock" }).map((c) => c.subject), ["alice"]);
});
