// descent — integration tests on RANDOM real utterances run through the actual pipeline. Asserts the properties
// that must hold for any utterance (it measures potential, the cones bracket, evidence is preserved, the contract
// on malformed input) — not a hand-built section asserting a chosen output.
//
// Ported from @561/development.active.math-kernel's tests/descent.mjs (10 checks), retargeted at
// @lenticule-science/metrologic/bilattice's named exports and reshaped into discrete node:test cases. The math is unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { articulate, predicate, posit, settle } from "../src/descent.mjs";
import { brim, adjudicate, presume } from "../src/cone.mjs";
import { vanish } from "../src/void.mjs";
import { meetKnowledge as meetK, leqKnowledge as leqK } from "../src/charge.mjs";
import mkUtterance, { id, charge } from "./_construct-utterance.mjs";

const V = (c) => `${+c.value[0]}${+c.value[1]}`;
const S = (x) => JSON.stringify(x);
const leqT = (a, b) => (!a.value[0] || b.value[0]) && (!b.value[1] || a.value[1]); // truth order: pos up, neg down
const ch = (section) => section["fiber-algebras"][0].assignments[0].charge;
const seedCharge = (cat) => cat.traces[0].valuations[0]["fiber-algebras"][0].assignments[0].charge;

const runs = Array.from({ length: 40 }, () => { const u = mkUtterance(); return { u, cat: posit(predicate(articulate(u))) }; });

test("descent: a fresh cell measures POTENTIAL [T,F], witnessed by its given token", () => {
  assert.ok(runs.every(({ u, cat }) => {
    const c = seedCharge(cat);
    return V(c) === "10" && S(c.evidence[0][0]) === S(u[0]) && c.evidence[1].length === 0;
  }));
});
test("descent: settle (knowledge-LFP) = potential", () => {
  assert.ok(runs.every(({ cat }) => V(ch(settle(cat).sheaf.section)) === "10"));
});
test("descent: brim (knowledge-GFP) = stable", () => {
  assert.ok(runs.every(({ cat }) => V(ch(brim(cat).cone.section)) === "11"));
});
test("descent: settle ≤_k brim — the cones bracket every cell", () => {
  assert.ok(runs.every(({ cat }) => leqK(ch(settle(cat).sheaf.section), ch(brim(cat).cone.section))));
});
test("descent: adjudicate ≤_t presume — the truth cones bracket", () => {
  assert.ok(runs.every(({ cat }) => leqT(ch(adjudicate(cat).verdict.section), ch(presume(cat).presumption.section))));
});
test("descent: vanish is non-empty — the slack between the cones is the void cone", () => {
  assert.ok(runs.every(({ cat }) => vanish(cat).apex.length > 0));
});
test("descent: vanish carries the evidence interval (least/greatest), never bare", () => {
  assert.ok(runs.every(({ cat }) => {
    const v = vanish(cat);
    return v.evidence.length > 0 && "least" in v.evidence[0] && "greatest" in v.evidence[0];
  }));
});
test("descent: settle preserves the token-evidence on the knowledge bit", () => {
  assert.ok(runs.every(({ cat }) => ch(settle(cat).sheaf.section).evidence[0].length === 1));
});

// contract: an utterance gives both sides; missing a side is malformed and errors.
test("descent: articulate throws on the empty utterance and on a half utterance", () => {
  assert.throws(() => articulate([]));
  assert.throws(() => articulate([id()]));
});

// absurd is REACHED, never seeded: the meet of potential and active (opposite bits) is absurd.
test("descent: meet(potential, active) = absurd — reached by the meet, not stamped", () => {
  const m = meetK({ left: charge("t"), right: charge("f") }); // potential ∧ active
  assert.equal(V(m), "00");
});
