import assert from "node:assert/strict";
import test from "node:test";

import { cellSetOf, dedupTerm, freeTerm } from "@red-cup-engineering/relating/evaluating/settling";
import { evaluateRunTerm } from "@red-cup-engineering/signcraft/primitives";

test("dedupTerm removes coincidence-duplicates while preserving first-seen order", () => {
  assert.deepEqual(evaluateRunTerm(dedupTerm, ["a", "b", "a", "c", "b", "d"]), ["a", "b", "c", "d"]);
  assert.deepEqual(evaluateRunTerm(dedupTerm, []), []);
  assert.deepEqual(evaluateRunTerm(dedupTerm, ["only"]), ["only"]);
});

test("cellSetOf dedupes cells and derives order-preserving entity/predicate sets", () => {
  assert.equal(typeof cellSetOf, "function");
  const cells = [
    { subject: "a", predicate: "p1", object: "b" },
    { subject: "b", predicate: "p2", object: "c" },
    { subject: "a", predicate: "p1", object: "b" },
  ];
  const filtration = evaluateRunTerm(freeTerm, { cells });
  const designated = filtration.stages[0].designated;
  assert.deepEqual(designated.cells, [
    { subject: "a", predicate: "p1", object: "b" },
    { subject: "b", predicate: "p2", object: "c" },
  ]);
  assert.deepEqual(designated.entities.entities, ["a", "b", "c"]);
  assert.deepEqual(designated.predicates.predicates, ["p1", "p2"]);
});
