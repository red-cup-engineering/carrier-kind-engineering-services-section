import assert from "node:assert/strict";
import test from "node:test";

import { derivePunctuatedName } from "../src/punctuated-name-derivation-service.mjs";

// A duplicate of ast/validator.mts's `isTerm` from the metroplat RMN AST
// (.../javascript-services-section/lib/legacy/metroplat/src/lib/language/ast/validator.mts).
// This is pure structural shape-checking, not the type checker — see
// README.md's "checkTy import obstruction" for why checkTy itself is not
// imported or reimplemented here.
function isTerm(value) {
  const active = new WeakSet();
  function visit(candidate) {
    if (!Array.isArray(candidate) || active.has(candidate)) return false;
    active.add(candidate);
    const tag = candidate[0];
    let valid;
    switch (tag) {
      case "var": valid = candidate.length === 2 && Number.isInteger(candidate[1]) && candidate[1] >= 0; break;
      case "lam": case "fst": case "snd": valid = candidate.length === 2 && visit(candidate[1]); break;
      case "app": case "pair": case "coincide": valid = candidate.length === 3 && visit(candidate[1]) && visit(candidate[2]); break;
      case "cond": case "fold": valid = candidate.length === 4 && visit(candidate[1]) && visit(candidate[2]) && visit(candidate[3]); break;
      case "star": valid = candidate.length === 1; break;
      case "mark": valid = candidate.length === 2 && typeof candidate[1] === "string"; break;
      default: valid = false;
    }
    active.delete(candidate);
    return valid;
  }
  return visit(value);
}

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

test("every term produced is a structurally valid Tm (shape conformance)", () => {
  for (const name of ["order", "order.payment", "order:payment", "order-payment", "order.payment:receipt-delay"]) {
    assert.ok(isTerm(derivePunctuatedName(name)), `expected a valid Tm for ${name}`);
  }
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
