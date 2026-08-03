import assert from "node:assert/strict";
import test from "node:test";

import { isTerm } from "@red-cup-engineering/relation-model-notation";
import { checkTy, inferTy, isClosed } from "@red-cup-engineering/relation-model-notation-typing";
import {
  derivePunctuatedName,
  inferSemioticResourceNameType,
  readSemioticResourceName,
  renderSemioticResourceName,
} from "../src/punctuated-name-derivation-service.mjs";

// A term built purely from `mark`/`pair` has no redex under the eval/index.mts
// reduction rules (step(mark) = [] always; step(pair) only reduces if a
// child does) — this walks the tree and confirms only those two tags occur,
// which is the structural evidence that no reduction is even possible.
function usesOnlyMarkAndPair(term) {
  if (!Array.isArray(term)) return false;
  if (term[0] === "mark") return typeof term[1] === "string";
  if (term[0] === "pair") return usesOnlyMarkAndPair(term[1]) && usesOnlyMarkAndPair(term[2]);
  return false;
}

test("a bare atom denotes mark(atom)", () => {
  const term = derivePunctuatedName("order");
  assert.deepEqual(term, ["mark", "order"]);
});

test("A.B denotes pair(mark(A), pair(mark(generation), mark(B)))", () => {
  const term = derivePunctuatedName("order.payment");
  assert.deepEqual(term, ["pair", ["mark", "order"], ["pair", ["mark", "generation"], ["mark", "payment"]]]);
});

test("A:B denotes a witness step", () => {
  const term = derivePunctuatedName("order:shipment");
  assert.deepEqual(term, ["pair", ["mark", "order"], ["pair", ["mark", "witness"], ["mark", "shipment"]]]);
});

test("A-B denotes an obstruction step", () => {
  const term = derivePunctuatedName("order-inventory");
  assert.deepEqual(term, ["pair", ["mark", "order"], ["pair", ["mark", "obstruction"], ["mark", "inventory"]]]);
});

test("the paper's own worked example nests left to right in exactly the order its prose gives", () => {
  // order --g--> order.payment --w--> order.payment:receipt --o--> order.payment:receipt-delay
  const term = derivePunctuatedName("order.payment:receipt-delay");
  assert.deepEqual(term, [
    "pair",
    ["pair",
      ["pair", ["mark", "order"], ["pair", ["mark", "generation"], ["mark", "payment"]]],
      ["pair", ["mark", "witness"], ["mark", "receipt"]]],
    ["pair", ["mark", "obstruction"], ["mark", "delay"]],
  ]);
});

test("dash never absorbs into a following identifier as one atom", () => {
  const term = derivePunctuatedName("order.payment:receipt-delay");
  const lastAtomMark = term[2][2];
  assert.deepEqual(lastAtomMark, ["mark", "delay"]);
});

test("order.payment, order:payment, and order-payment are three distinct terms (corollary of §6)", () => {
  const dot = derivePunctuatedName("order.payment");
  const colon = derivePunctuatedName("order:payment");
  const dash = derivePunctuatedName("order-payment");
  assert.equal(dot[2][1][1], "generation");
  assert.equal(colon[2][1][1], "witness");
  assert.equal(dash[2][1][1], "obstruction");
});

test("relation and atom are disambiguated by tree position, not by string content: an atom literally spelled 'generation' does not collide with the relation tag", () => {
  const term = derivePunctuatedName("log.generation");
  assert.deepEqual(term, ["pair", ["mark", "log"], ["pair", ["mark", "generation"], ["mark", "generation"]]]);
  // Position, not content, tells them apart: term[2][1] is the relation slot, term[2][2] is the atom slot.
  assert.equal(term[2][1][0], "mark");
  assert.equal(term[2][2][0], "mark");
});

test("every term produced is admitted and closed by the current RMN grammar", () => {
  for (const name of ["order", "order.payment", "order:payment", "order-payment", "order.payment:receipt-delay"]) {
    const term = derivePunctuatedName(name);
    const semanticType = inferTy([], term);
    assert.equal(isTerm(term), true, `expected a valid split RMN Tm for ${name}`);
    assert.equal(isClosed(term), true, `expected a closed split RMN Tm for ${name}`);
    assert.notEqual(semanticType, null, `expected an inferable split RMN Tm for ${name}`);
    assert.equal(checkTy([], term, semanticType), true, `expected a typed split RMN Tm for ${name}`);
  }
});

test("the split RMN typer derives the path claim's exact base/product type", () => {
  assert.deepEqual(inferSemioticResourceNameType(derivePunctuatedName("order")), ["base"]);
  assert.deepEqual(
    inferSemioticResourceNameType(derivePunctuatedName("order.payment")),
    ["prod", ["base"], ["prod", ["base"], ["base"]]],
  );
  assert.deepEqual(
    inferSemioticResourceNameType(derivePunctuatedName("order.payment:receipt")),
    ["prod",
      ["prod", ["base"], ["prod", ["base"], ["base"]]],
      ["prod", ["base"], ["base"]]],
  );
});

test("every term produced uses only mark/pair, so it has no redex and is already its own normal form", () => {
  for (const name of ["order", "order.payment", "order.payment:receipt-delay"]) {
    assert.ok(usesOnlyMarkAndPair(derivePunctuatedName(name)), `expected only mark/pair tags for ${name}`);
  }
});

test("deriving the same name twice yields byte-identical (deepEqual) terms", () => {
  const first = derivePunctuatedName("order.payment:receipt-delay");
  const second = derivePunctuatedName("order.payment:receipt-delay");
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test("SRN rendering is the checked inverse of reading on the conformant path domain", () => {
  for (const name of [
    "order",
    "order.payment",
    "order:payment",
    "order-payment",
    "order.payment:receipt-delay",
    "log.generation",
  ]) {
    const term = readSemioticResourceName(name);
    assert.equal(renderSemioticResourceName(term), name);
    assert.deepEqual(readSemioticResourceName(renderSemioticResourceName(term)), term);
  }
});

test("SRN rendering refuses general RMN and atom marks that cannot round trip", () => {
  assert.throws(() => renderSemioticResourceName(["star"]), /path sublanguage/u);
  assert.throws(() => renderSemioticResourceName(["mark", "order.payment"]), /ASCII alphanumeric/u);
  assert.throws(
    () => renderSemioticResourceName(["pair", ["mark", "order"], ["pair", ["mark", "sideways"], ["mark", "payment"]]]),
    /unknown SRN relation/u,
  );
});

test("a name containing an underscore returns {claim: none}, not a term or a refusal", () => {
  const derivation = derivePunctuatedName("order_id");
  assert.deepEqual(derivation, { claim: "none" });
});

test("an underscore anywhere escapes the whole name, even alongside otherwise-conformant punctuation", () => {
  const derivation = derivePunctuatedName("order_id.payment");
  assert.deepEqual(derivation, { claim: "none" });
});

test("refuses an empty name", () => {
  const derivation = derivePunctuatedName("");
  assert.equal(derivation.ok, false);
  assert.equal(derivation.rule, "Atom");
});

test("refuses a name starting with an operator", () => {
  const derivation = derivePunctuatedName(".order");
  assert.equal(derivation.ok, false);
  assert.equal(derivation.rule, "Atom");
  assert.equal(derivation.position, 0);
});

test("refuses two operators in a row (empty atom between them)", () => {
  const derivation = derivePunctuatedName("order..payment");
  assert.equal(derivation.ok, false);
  assert.equal(derivation.rule, "Atom");
});

test("refuses a trailing operator with nothing after it", () => {
  const derivation = derivePunctuatedName("order.payment.");
  assert.equal(derivation.ok, false);
  assert.equal(derivation.rule, "Atom");
});

test("refuses a character that is neither an atom character nor one of the three marks", () => {
  const derivation = derivePunctuatedName("order payment");
  assert.equal(derivation.ok, false);
  assert.equal(derivation.rule, "Expr");
});

test("refuses a non-string input", () => {
  const derivation = derivePunctuatedName(42);
  assert.equal(derivation.ok, false);
  assert.equal(derivation.rule, "namestring");
});
