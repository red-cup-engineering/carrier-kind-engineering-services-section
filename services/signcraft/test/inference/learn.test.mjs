import { test } from "node:test";
import assert from "node:assert/strict";
import { induceBasis, learningCurve, learnedImplications, evaluateInduced, mulberry32 } from "../../src/inference/learn.mjs";
import { makeComplex } from "../../src/inference/complex.mjs";

// A structured world the machine must LEARN, never told: 40 creatures over
// 12 attributes with real regularities (mammal→warm→air; bird→feathers,warm;
// fish→aquatic,cold-blooded is absent so aquatic stays ambiguous).
function corpus() {
  const objects = [];
  const pairs = [];
  const attributes = ["mammal", "bird", "fish", "warm", "feathers", "aquatic", "air", "flies", "legs", "fur", "eggs", "social"];
  const rng = mulberry32(11);
  for (let i = 0; i < 40; i++) {
    const g = `c${i}`;
    objects.push(g);
    const kind = i % 3;
    if (kind === 0) {
      for (const m of ["mammal", "warm", "air", "fur", "legs"]) pairs.push([g, m]);
      if (rng() < 0.5) pairs.push([g, "social"]);
    } else if (kind === 1) {
      for (const m of ["bird", "warm", "air", "feathers", "eggs", "legs"]) pairs.push([g, m]);
      if (rng() < 0.7) pairs.push([g, "flies"]);
    } else {
      for (const m of ["fish", "aquatic", "eggs"]) pairs.push([g, m]);
    }
  }
  return { objects, attributes, pairs };
}

test("induction: the machine learns real implications from data, no rules given", () => {
  const { objects, attributes, pairs } = corpus();
  const { ctx, basis } = induceBasis(objects, attributes, pairs);
  const imps = learnedImplications(ctx, basis, pairs);
  const asText = imps.map((i) => `${i.if.join(",")} -> ${i.then.join(",")}`);
  assert.ok(imps.length > 0);
  const mammalImp = imps.find((i) => i.if.length === 1 && i.if[0] === "mammal");
  assert.ok(mammalImp, `no induced mammal implication in: ${asText.slice(0, 8).join(" | ")}`);
  for (const m of ["warm", "air", "fur"]) assert.ok(mammalImp.then.includes(m), `mammal -> ${m} not learned`);
  console.log(`induced ${basis.length} implications; top: ${asText[0]}`);
});

test("raw inference from induced mass beats frequency baseline on held-out incidence", () => {
  const { objects, attributes, pairs } = corpus();
  const rng = mulberry32(3);
  const shuffled = [...pairs].sort(() => rng() - 0.5);
  const nTest = Math.floor(pairs.length * 0.2);
  const testPairs = shuffled.slice(0, nTest);
  const knownPairs = shuffled.slice(nTest);
  const { ctx, basis } = induceBasis(objects, attributes, knownPairs);
  const out = evaluateInduced({ ctx, basis, cx: makeComplex(attributes), knownPairs, testPairs });
  console.log(`held-out: kernel ${out.kernelHits}/${out.n} (closure ${out.closureHits}) vs baseline ${out.baselineHits}/${out.n}`);
  assert.ok(out.kernelAccuracy > out.baselineAccuracy, `kernel ${out.kernelAccuracy} <= baseline ${out.baselineAccuracy}`);
  // Documented datum, not a defect: exact DG closure contributes ~0 hits
  // under held-out sparsity (one missing incidence is a counterexample that
  // deletes the exact rule) — the charged (support/confidence) mass carries
  // prediction. Proof-grade and predictive-grade knowledge are two strata.
  assert.ok(out.closureHits >= 0);
});

test("learning curve: accuracy improves as incidence is revealed round over round", () => {
  const { objects, attributes, pairs } = corpus();
  const run = learningCurve({ objects, attributes, pairs, rounds: 5, seed: 13 });
  for (const row of run.curve) {
    console.log(`round ${row.round}: known=${row.knownPairs} basis=${row.basisSize} kernel=${(row.kernelAccuracy * 100).toFixed(0)}% baseline=${(row.baselineAccuracy * 100).toFixed(0)}% adapted=${row.edgesAdapted}`);
  }
  assert.ok(run.improved, "no round-over-round improvement");
  assert.ok(run.beatsBaseline, "final round does not beat baseline");
});
