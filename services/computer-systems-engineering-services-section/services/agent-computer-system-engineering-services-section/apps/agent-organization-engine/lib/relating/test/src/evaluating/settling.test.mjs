import assert from "node:assert/strict";
import test from "node:test";

import { cellSetOf, dedupTerm, freeTerm, zeroStageOrdinalTerm } from "@red-cup-engineering/relating/evaluating/settling";
import { evaluateRunTerm } from "@red-cup-engineering/signcraft/primitives";
import { tm, validateSenTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { semanticBytes, semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";

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

test('restored builders produce admitted current SEN with stable canonical identity', () => {
  for (const term of [dedupTerm, freeTerm, zeroStageOrdinalTerm, tm.lam(cellSetOf(tm.var(0)))]) {
    assert.equal(validateSenTerm(term), term);
    const copy = structuredClone(term);
    assert.deepEqual(validateSenTerm(copy), term);
    assert.deepEqual(semanticBytes(copy), semanticBytes(term));
    assert.equal(semanticId(copy), semanticId(term));
  }
});

test('current coincidence deduplicates canonical objects while preserving typed first-seen values', () => {
  const input = [{ b: 2, a: 1 }, { a: 1, b: 2 }, 1, '1', null, false, true, [1, 2], [1, 2], null, false, 1];
  const snapshot = structuredClone(input);
  assert.deepEqual(evaluateRunTerm(dedupTerm, input), [{ a: 1, b: 2 }, 1, '1', null, false, true, [1, 2]]);
  assert.deepEqual(input, snapshot);
});

test('current free filtration retains empty and mixed entity/predicate order without changing input', () => {
  const empty = evaluateRunTerm(freeTerm, { cells: [] });
  assert.equal(empty.kind, 'predication.settlement.filtration');
  assert.equal(empty.stages.length, 1);
  assert.deepEqual(empty.stages[0].designated.cells, []);
  assert.deepEqual(empty.stages[0].designated.entities.entities, []);
  assert.deepEqual(empty.stages[0].designated.predicates.predicates, []);
  assert.equal(empty.cofinality.kind, 'predication.settling.cofinality.countable');
  const cells = [
    { subject: 'b', predicate: 'p2', object: 'a' },
    { object: 'a', predicate: 'p2', subject: 'b' },
    { subject: 'a', predicate: 'p1', object: 'c' },
    { subject: 'c', predicate: 'p2', object: 'd' },
  ];
  const snapshot = structuredClone(cells);
  const designated = evaluateRunTerm(freeTerm, { cells }).stages[0].designated;
  assert.deepEqual(designated.cells, [cells[0], cells[2], cells[3]]);
  assert.deepEqual(designated.entities.entities, ['b', 'a', 'c', 'd']);
  assert.deepEqual(designated.predicates.predicates, ['p2', 'p1']);
  assert.deepEqual(evaluateRunTerm(tm.lam(cellSetOf(tm.var(0))), cells), designated);
  assert.deepEqual(cells, snapshot);
});
