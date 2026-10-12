import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRunTerm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/eval";
import { chuDualTerm, chuLookupTerm, chuDualInvolutionTerm } from "../src/chu-term.mjs";

const space = Object.freeze({
  pts: ["a", "b"],
  sts: ["x"],
  r: [
    { pt: "a", st: "x", reading: "active" },
    { pt: "b", st: "x", reading: "potential" },
  ],
});

test("chuDualTerm: swaps pts/sts and negates every reading", () => {
  const dual = evaluateRunTerm(chuDualTerm, space);
  assert.deepEqual(dual.pts, ["x"]);
  assert.deepEqual(dual.sts, ["a", "b"]);
  assert.deepEqual(dual.r, [
    { reading: "potential", pt: "x", st: "a" },
    { reading: "active", pt: "x", st: "b" },
  ]);
});

test("chuLookupTerm: reads the matrix at (pt, st), absurd when absent", () => {
  assert.equal(evaluateRunTerm(chuLookupTerm, { space, pt: "a", st: "x" }), "active");
  assert.equal(evaluateRunTerm(chuLookupTerm, { space, pt: "a", st: "y" }), "absurd");
});

test("chuDualInvolutionTerm: dual(dual(space)) = space", () => {
  assert.equal(evaluateRunTerm(chuDualInvolutionTerm, space), true);
});
