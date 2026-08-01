import assert from "node:assert/strict";
import test from "node:test";

import { checkNameRelationAdmissibility } from "../src/name-relation-admissibility-service.mjs";

// Small local builders matching punctuated-name-derivation-service's own
// encoding exactly, so these tests exercise the same term shape a real
// caller would hand this service (this package does not depend on the
// derivation package at runtime, by design — see house convention notes).
const atomTerm = (atom) => ["mark", atom];
const step = (previous, relation, atom) => ["pair", previous, ["pair", ["mark", relation], ["mark", atom]]];

test("a bare atom's term is always admitted, independent of the table", () => {
  const result = checkNameRelationAdmissibility(atomTerm("order"), []);
  assert.deepEqual(result, { admitted: true });
});

test("admits a single step that is exactly in the table", () => {
  const term = step(atomTerm("order"), "generation", "payment");
  const table = [{ from: "order", mark: ".", atom: "payment" }];
  const result = checkNameRelationAdmissibility(term, table);
  assert.deepEqual(result, { admitted: true });
});

test("refuses a single step that is not in the table", () => {
  const term = step(atomTerm("order"), "witness", "shipment");
  const result = checkNameRelationAdmissibility(term, []);
  assert.equal(result.admitted, false);
  assert.equal(result.refusedAtStep, 0);
  assert.ok(result.reason.includes("order"));
});

test("checks Adm against the exact left object at each step, not just the trailing atom (compound 'from')", () => {
  // order.payment:receipt-delay's third step has from = "order.payment:receipt", not "receipt"
  const term = step(step(step(atomTerm("order"), "generation", "payment"), "witness", "receipt"), "obstruction", "delay");
  const table = [
    { from: "order", mark: ".", atom: "payment" },
    { from: "order.payment", mark: ":", atom: "receipt" },
    // deliberately omit an entry for "order.payment:receipt" -> "delay"
  ];
  const result = checkNameRelationAdmissibility(term, table);
  assert.equal(result.admitted, false);
  assert.equal(result.refusedAtStep, 2);
});

test("refuses at the first violating step even when a later step would also be admitted", () => {
  const term = step(atomTerm("order"), "generation", "payment");
  const inner = step(term, "witness", "receipt");
  const table = [
    // step 0 (order -> order.payment) is missing; step 1 is present
    { from: "order.payment", mark: ":", atom: "receipt" },
  ];
  const result = checkNameRelationAdmissibility(inner, table);
  assert.equal(result.admitted, false);
  assert.equal(result.refusedAtStep, 0);
});

test("the same atom is admitted under one mark but refused under another (mark is part of the key)", () => {
  const table = [{ from: "order", mark: ".", atom: "payment" }];
  const generation = checkNameRelationAdmissibility(step(atomTerm("order"), "generation", "payment"), table);
  const witness = checkNameRelationAdmissibility(step(atomTerm("order"), "witness", "payment"), table);
  assert.equal(generation.admitted, true);
  assert.equal(witness.admitted, false);
});

test("an atom literally spelled 'generation' is still judged as an atom, not mistaken for the relation tag", () => {
  const term = step(atomTerm("log"), "generation", "generation");
  const table = [{ from: "log", mark: ".", atom: "generation" }];
  const result = checkNameRelationAdmissibility(term, table);
  assert.deepEqual(result, { admitted: true });
});

test("the admitted-relations table is read as plain data, never mutated or consulted globally", () => {
  const table = [{ from: "order", mark: ".", atom: "payment" }];
  const frozen = Object.freeze(table.map((entry) => Object.freeze({ ...entry })));
  assert.doesNotThrow(() => checkNameRelationAdmissibility(step(atomTerm("order"), "generation", "payment"), frozen));
});

test("throws a TypeError when the term is not a punctuated-name RMN term (e.g. an underscore-escape object slipped in by mistake)", () => {
  assert.throws(() => checkNameRelationAdmissibility({ claim: "none" }, []), TypeError);
});

test("throws a TypeError when the term is a refusal object slipped in by mistake", () => {
  assert.throws(() => checkNameRelationAdmissibility({ ok: false, rule: "Atom", position: 0, message: "x" }, []), TypeError);
});

test("throws a TypeError when the table is not an array", () => {
  assert.throws(() => checkNameRelationAdmissibility(atomTerm("order"), "not-a-table"), TypeError);
});

test("throws a TypeError when a table entry has an invalid mark", () => {
  assert.throws(() => checkNameRelationAdmissibility(atomTerm("order"), [{ from: "order", mark: "!", atom: "payment" }]), TypeError);
});

test("throws a TypeError when the term's inner shape is malformed (relation slot is not a mark)", () => {
  const malformed = ["pair", atomTerm("order"), ["pair", ["pair", ["mark", "x"], ["mark", "y"]], ["mark", "payment"]]];
  assert.throws(() => checkNameRelationAdmissibility(malformed, []), TypeError);
});

test("throws a TypeError when the term's relation mark names an unknown relation", () => {
  const malformed = step(atomTerm("order"), "sideways", "payment");
  assert.throws(() => checkNameRelationAdmissibility(malformed, []), TypeError);
});
