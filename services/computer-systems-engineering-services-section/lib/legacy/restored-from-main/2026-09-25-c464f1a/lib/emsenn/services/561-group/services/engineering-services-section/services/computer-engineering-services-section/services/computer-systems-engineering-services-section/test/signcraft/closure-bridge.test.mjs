// closure-bridge — fromBilattice: the floor's settle IS the general closure morphism at finite κ.
// Moved from metrologic's closure/test/lattices.test.mjs when the descent it bridges to moved here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { closureOrdinal } from "@lenticule-science/metrologic/closure/closure";
import { fromBilattice } from "../../src/signcraft/closure-bridge.mjs";
import { articulate, predicate, posit, settle } from "../../src/signcraft/descent.mjs";

test("fromBilattice: settledValuation equals settle(category).sheaf.section directly", () => {
  const cat = posit(predicate(articulate(["tok", "claim"])));
  const { settledValuation } = fromBilattice(cat);
  assert.deepEqual(settledValuation, settle(cat).sheaf.section);
});

test("fromBilattice: closureOrdinal reports a finite κ, and F(κ) equals settle's own fixed point", () => {
  const cat = posit(predicate(articulate(["tok", "claim"])));
  const { lattice, phi, settledValuation } = fromBilattice(cat);
  const { kappa, regime, value } = closureOrdinal(lattice, phi);
  assert.equal(regime, "finite");
  assert.ok(kappa !== null);
  assert.deepEqual(value, settledValuation);
});

test("fromBilattice: phi is one knowledge-closure round (◇_k∘□_k) — idempotent once fixed", () => {
  const cat = posit(predicate(articulate(["tok", "claim"])));
  const { lattice, phi } = fromBilattice(cat);
  const { value } = closureOrdinal(lattice, phi);
  assert.deepEqual(phi(value), value);
});
