import test from "node:test";
import assert from "node:assert/strict";
import {
  analysis, bottom, chargeValue, chu, cohomologyTerms, coordinationCohomology,
  evaluateRunTerm, geometry, lambek, negateValue, sofic, valueOf,
} from "../src/index.mjs";

test("FOUR remains paraconsistent and negation is involutive", () => {
  for (const name of ["absurd", "potential", "active", "stable"]) {
    assert.equal(negateValue(negateValue(chargeValue(name))).name, name);
  }
  assert.equal(valueOf(bottom).name, "absurd");
});

test("finite Chu dual is a legacy-name-aware involution carried by split SEN", () => {
  const space = { pts: ["a"], sts: ["x"], r: [{ pt: "a", st: "x", charge: "active" }] };
  assert.deepEqual(evaluateRunTerm(chu.dual, space), { pts: ["x"], r: [{ charge: "potential", pt: "x", st: "a" }], sts: ["a"] });
  assert.equal(evaluateRunTerm(chu.dualInvolution, space), true);
});

test("cohomology term catalog normalizes named witness fields", () => {
  assert.deepEqual(evaluateRunTerm(cohomologyTerms.rankVanishing, { rank: 0, kind: "witness", ignored: true }), { kind: "witness", rank: 0 });
});

test("Lambek, sofic, coordination-cohomology, analysis, and temporal geometry laws are live", () => {
  assert.equal(typeof lambek.finiteLambekAlgebraSystem, "function");
  assert.equal(typeof sofic.finiteLocalRuleReceipt, "function");
  assert.equal(typeof coordinationCohomology.h1Rank, "function");
  assert.equal(typeof analysis.relationGraphOfCells, "function");
  assert.equal(typeof geometry.firingEvent, "function");
  assert.equal(typeof geometry.causalOrderOfFiringEvents, "function");
});
