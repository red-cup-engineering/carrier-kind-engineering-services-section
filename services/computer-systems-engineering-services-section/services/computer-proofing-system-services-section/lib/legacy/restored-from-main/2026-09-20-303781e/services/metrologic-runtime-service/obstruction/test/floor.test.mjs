// floor — tests for the bridge from the bilattice floor to the settling cohomology, and the void-dual
// read (designatedCells, settlingOf, voidCone, gradedVoid, apexVoidMatch).
//
// The headline claim floor.mjs documents is that a floor settling is always FINITE (no limit stage),
// because the floor represents only finite data — so `h1(settlingOf(category)).vanishes` must be true
// for every category. This is the JS side of Obsmetrologia/Cohomology/SettlingCohomologyH1.lean's
// `H¹ = 0 ⟺ regime ∈ {strict, scott}` (ClosureOrdinalRegime.cohomologyVanishes_iff): the floor's `settle`
// terminates by Knaster–Tarski over a bounded lattice, which is exactly the `strict` (κ < ω) regime — see
// also Obsmetrologia/Site/Sheaf.lean for the finite-regime H¹ = 0 sheaf-condition result this restates.
//
// A real defect is documented and demonstrated below, not silently patched: `gradedVoid`/`apexVoidMatch`
// (see BUG block near the bottom of this file).
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { designatedCells, settlingOf, voidCone, gradedVoid, apexVoidMatch } from "../src/floor.mjs";
import { settling, h1, classify } from "../src/settling.mjs";
import { articulate, predicate, posit, lastValuation, present, settle } from "@lenticule-science/metrologic/bilattice";

const id = () => randomBytes(3).toString("hex");
const S = (x) => JSON.stringify(x);

const category = (token = id(), claim = id()) => posit(predicate(articulate([token, claim])));

test("designatedCells: exactly the cells a valuation carries at [T,F] — positive evidence, no negative", () => {
  const cat = category();
  const v = lastValuation(cat);
  const cells = designatedCells(v);
  for (const fa of v["fiber-algebras"]) {
    for (const { cell, charge } of fa.assignments) {
      const isDesignated = cells.some((c) => S(c) === S(cell));
      assert.equal(isDesignated, S(present(charge)) === S([true, false]));
    }
  }
});

test("settlingOf: every floor settling is finite — no limit stage, regardless of the category", () => {
  const cat = category();
  const v = settlingOf(cat);
  assert.ok(v.stages.every((s) => s.limit === false), "floor settlings never carry a limit stage");
  assert.equal(classify(v).regime, "finite");
});

test("settlingOf: h1 vanishes for every floor settling (the finite-regime H¹ = 0 result)", () => {
  for (let i = 0; i < 20; i++) {
    const cat = category();
    const v = settlingOf(cat);
    assert.equal(h1(v).vanishes, true);
  }
});

test("settlingOf: the final stage's designated set equals the settled section's designated cells", () => {
  const cat = category();
  const v = settlingOf(cat);
  const last = v.stages[v.stages.length - 1].designated;
  const settled = settle(cat).sheaf.section;
  assert.deepEqual(new Set(last.map(S)), new Set(designatedCells(settled).map(S)));
});

test("settlingOf: monotone accumulation — later stages never drop a cell the earlier ones designated", () => {
  const cat = category();
  const v = settlingOf(cat);
  for (let i = 1; i < v.stages.length; i++) {
    const prevSet = new Set(v.stages[i - 1].designated.map(S));
    const curSet = new Set(v.stages[i].designated.map(S));
    assert.ok([...prevSet].every((c) => curSet.has(c)));
  }
});

test("voidCone: returns the {apex, evidence} shape from the bilattice's vanish, unrelated to any settling", () => {
  const cat = category();
  const cone = voidCone(cat);
  assert.ok(Array.isArray(cone.apex));
  assert.ok(Array.isArray(cone.evidence));
});

// ── BUG: gradedVoid / apexVoidMatch never actually read the void cone ──────────────────────────────
//
// floor.mjs documents `gradedVoid` as "the associated graded of the VOID filtration — the cells that
// LEAVE THE VOID (become designated) at each non-Scott-continuous firing," canonically isomorphic to the
// apex H¹ by "the void-cone (co)homology theorem," and `apexVoidMatch` as asserting that rank equality
// directly.
//
// But reading the implementation: `gradedVoid(v)` takes only the SETTLING `v` — it never takes, calls,
// or references `voidCone`/`vanish` at all — and its body is a byte-for-byte duplicate of `h1`'s
// generator computation (`nscFirings(v).flatMap((d) => d.added.map((cell) => ({ stage: d.stage, cell
// })))`, verbatim in both settling.mjs's h1 and floor.mjs's gradedVoid). So `gradedVoid(v).rank` IS
// `h1(v).rank`, by construction, for every settling `v` — not merely for floor settlings, and not because
// of any theorem. `apexVoidMatch(v) = (h1(v).rank === gradedVoid(v).rank)` is therefore a TAUTOLOGY: it
// compares a number to a second copy of the exact same computation, and can never be false for ANY input,
// including settlings that have nothing to do with any category's actual void cone. The claimed
// "void-cone (co)homology theorem" (apex H¹ ≅ gr(Void)) is asserted in the comment but never actually
// exercised by this code — there is no code path from a category's `voidCone`/`vanish` output into
// `gradedVoid` or `apexVoidMatch` at all.
test("BUG: gradedVoid(v) is a verbatim duplicate of h1(v)'s generator computation, not a read of the void", () => {
  const a = id(), b = id();
  const v = settling([{ designated: [a] }, { designated: [a, b], limit: true }]);
  assert.deepEqual(gradedVoid(v).lost, h1(v).generators);
  assert.equal(gradedVoid(v).rank, h1(v).rank);
});

test("BUG: apexVoidMatch is vacuously true for a settling built with NO relationship to any voidCone at all", () => {
  // gradedVoid's signature is `(v) => ...` — there is no parameter through which a category's `voidCone`
  // could even be supplied. This settling is invented from nothing; no `category`, `voidCone`, or `vanish`
  // was ever involved, and apexVoidMatch still reports a match.
  const v = settling([
    { designated: ["p"] },
    { designated: ["p", "q", "r"], limit: true },
    { designated: ["p", "q", "r", "s", "t"], limit: false },
  ]);
  assert.equal(apexVoidMatch(v), true, "true for every settling whatsoever — the check cannot fail");
});

test("BUG: apexVoidMatch cannot distinguish a real floor settling from an unrelated hand-built one", () => {
  const cat = category();
  const real = settlingOf(cat);
  const unrelated = settling([{ designated: ["z"] }, { designated: ["z", "w"], limit: true }]);
  assert.equal(apexVoidMatch(real), true);
  assert.equal(apexVoidMatch(unrelated), true);
  // both pass for the same tautological reason, not because either one's void cone was checked
});
