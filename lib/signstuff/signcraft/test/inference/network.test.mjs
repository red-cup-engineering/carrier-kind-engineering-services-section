import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { makeRel, compose, relLeq, nucleus } from "../../src/inference/algebra.mjs";
import { forward, relEq, trainTwoLayer } from "../../src/inference/network.mjs";
import { shuffle, induceWeightedImplications, scoreWeighted } from "../../src/inference/learn.mjs";

const PEOPLE = ["ada", "ben", "cara", "dan", "eve", "fay", "gus", "hal"];

function parentRel() {
  return makeRel(PEOPLE, PEOPLE, [
    ["ada", "cara"], ["ben", "cara"],
    ["ada", "dan"], ["ben", "dan"],
    ["cara", "eve"], ["cara", "fay"],
    ["dan", "gus"],
    ["eve", "hal"],
  ]);
}

test("forward runs a relation through a stack, applying activations where given", () => {
  const A = parentRel();
  const step = (R) => {
    for (const k1 of [...R.pos]) {
      const [a, b] = k1.split(" ");
      for (const k2 of [...R.pos]) {
        const [b2, c] = k2.split(" ");
        if (b2 === b) R.pos.add(a + " " + c);
      }
    }
  };
  const layers = [
    { W: A },
    { W: A, activation: (R) => nucleus(R, step) },
  ];
  const acts = forward(A, layers);
  assert.equal(acts.length, 3);
  const rawStage2 = compose(acts[1], A);
  assert.ok(relLeq(rawStage2, acts[2]), "nucleus activation must be extensive over its raw composition");
});

test("2-layer training recovers the great-grandparent step exactly from (parent, great-grandparent)", () => {
  const A = parentRel();
  const grandparent = compose(A, A);
  const greatGrandparent = compose(A, grandparent);
  const { W1, W2, iters, converged } = trainTwoLayer(A, greatGrandparent, { maxIters: 16 });
  assert.ok(converged, `alternating residuation failed to reach a fixed point in ${iters} iterations`);
  assert.ok(iters <= 16, "convergence bound exceeded");
  const Y = compose(compose(A, W1), W2);
  assert.ok(relEq(Y, greatGrandparent), "trained 2-layer stack does not reproduce great-grandparent exactly");
});

test("training is monotone-bounded: alternating residuation never exceeds the iteration cap without reporting it", () => {
  const n = 40;
  const nodes = Array.from({ length: n }, (_, i) => `n${i}`);
  const chain = makeRel(nodes, nodes, nodes.slice(0, -1).map((x, i) => [x, `n${i + 1}`]));
  const four = compose(compose(chain, chain), compose(chain, chain));
  const { W1, W2, iters, converged } = trainTwoLayer(chain, four, { maxIters: 16 });
  assert.ok(converged, `did not converge in ${iters} iterations`);
  const Y = compose(compose(chain, W1), W2);
  assert.ok(relEq(Y, four), "chain composition mismatch after training");
});

test("an input column no training row bore contributes nothing at test time (no vacuous truth)", () => {
  const X = makeRel(["r1", "r2"], ["a", "b", "unseen"], [["r1", "a"], ["r2", "b"]]);
  const Y = makeRel(["r1", "r2"], ["y1", "y2"], [["r1", "y1"], ["r2", "y2"]]);
  const { W1, W2, converged } = trainTwoLayer(X, Y);
  assert.ok(converged);
  for (const k of [...W1.pos, ...W1.neg]) assert.notEqual(k.split(" ")[0], "unseen", "unseen column must carry no weight");
  const probe = makeRel(["p"], ["a", "b", "unseen"], [["p", "unseen"]]);
  const out = compose(compose(probe, W1), W2);
  assert.equal(out.pos.size + out.neg.size, 0, "an unseen input must abstain, not assert every output");
  const known = makeRel(["q"], ["a", "b", "unseen"], [["q", "a"]]);
  assert.ok(compose(compose(known, W1), W2).pos.has("q y1"));
});

// Real run: the org's own package/attribute graph (layer:X, scope:Y as
// input, deps:Z as target), a fixture projected from the jsnode graph
// server on 2026-09-02 (1169 packages, 532 attributes, 4753 pairs). The
// layer: attribute is constant across every package, so the only input
// signal is scope:. The test REPORTS the held-out numbers and asserts no
// win — the fixture's recorded result is a loss (net 0/114 vs baseline
// 37/114): exact residuation learns only universal laws ("every package
// in scope s depends on d"), none holds in this graph, so the stack
// abstains on every held-out row; the frequency baseline guesses.
const CORPUS_PATH = new URL("./fixtures/package-graph.json", import.meta.url).pathname;
const corpusPresent = fs.existsSync(CORPUS_PATH);

test(
  "real run: learn layer/scope -> deps structure from the package graph, report held-out accuracy vs frequency baseline",
  { skip: corpusPresent ? false : "package-graph.json corpus not present at " + CORPUS_PATH },
  () => {
    const { objects, attributes, pairs } = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8"));
    const byObj = new Map();
    for (const [o, a] of pairs) {
      if (!byObj.has(o)) byObj.set(o, new Set());
      byObj.get(o).add(a);
    }
    // An attribute every object bears (or none does) carries no signal;
    // drop it before training and say so.
    const bearers = new Map(attributes.map((a) => [a, 0]));
    for (const [, a] of pairs) bearers.set(a, bearers.get(a) + 1);
    const informative = (a) => bearers.get(a) > 0 && bearers.get(a) < objects.length;
    const inputAttrs = attributes.filter((a) => (a.startsWith("layer:") || a.startsWith("scope:")) && informative(a));
    const dropped = attributes.filter((a) => (a.startsWith("layer:") || a.startsWith("scope:")) && !informative(a));
    const outputAttrs = attributes.filter((a) => a.startsWith("deps:"));
    console.log(`package-graph inputs: ${inputAttrs.length} informative (${inputAttrs.join(", ")}); dropped zero-variance: ${dropped.join(", ") || "none"}; outputs: ${outputAttrs.length}`);
    const withDeps = objects.filter((o) => [...(byObj.get(o) ?? [])].some((a) => a.startsWith("deps:")));

    // Deterministic 80/20 split, mirrors learn.mjs's mulberry32 convention.
    let seed = 11;
    const rng = () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const shuffled = shuffle(withDeps, rng);
    const nTest = Math.floor(shuffled.length * 0.2);
    const testRows = shuffled.slice(0, nTest);
    const trainRows = shuffled.slice(nTest);

    const relFor = (rows, cols) => {
      const pairsFor = [];
      for (const r of rows) for (const a of byObj.get(r) ?? []) if (cols.includes(a)) pairsFor.push([r, a]);
      return makeRel(rows, cols, pairsFor);
    };
    const Xtrain = relFor(trainRows, inputAttrs);
    const Ytrain = relFor(trainRows, outputAttrs);

    const t0 = process.hrtime.bigint();
    const { W1, W2, iters, converged } = trainTwoLayer(Xtrain, Ytrain, { maxIters: 16 });
    const trainMs = Number(process.hrtime.bigint() - t0) / 1e6;
    assert.ok(converged, `did not converge in ${iters} iterations on the real corpus`);

    const Xtest = relFor(testRows, inputAttrs);
    const Ypred = compose(compose(Xtest, W1), W2);

    const freq = new Map(outputAttrs.map((a) => [a, 0]));
    for (const k of Ytrain.pos) freq.set(k.split(" ")[1], freq.get(k.split(" ")[1]) + 1);
    const topFreqDep = [...outputAttrs].sort((a, b) => freq.get(b) - freq.get(a))[0];

    let evaluated = 0, netHits = 0, baseHits = 0;
    for (const r of testRows) {
      const actual = [...(byObj.get(r) ?? [])].filter((a) => a.startsWith("deps:"));
      if (actual.length === 0) continue;
      evaluated++;
      if (actual.some((a) => Ypred.pos.has(r + " " + a))) netHits++;
      if (actual.includes(topFreqDep)) baseHits++;
    }
    // The soft lane on the same split: charged implications (support and
    // confidence, noisy-OR) from scope to deps, reported beside the exact stack.
    const trainPairs = [];
    for (const r of trainRows) for (const a of byObj.get(r) ?? []) trainPairs.push([r, a]);
    const rules = induceWeightedImplications(trainPairs, { minSupport: 2, minConfidence: 0.2, maxRules: 20000 })
      .filter((rule) => rule.if.every((p) => inputAttrs.includes(p)) && rule.then.startsWith("deps:"));
    let chargedHits = 0;
    for (const r of testRows) {
      const held = new Set([...(byObj.get(r) ?? [])].filter((a) => inputAttrs.includes(a)));
      const actual = new Set([...(byObj.get(r) ?? [])].filter((a) => a.startsWith("deps:")));
      if (actual.size === 0) continue;
      let best = null;
      for (const a of outputAttrs) {
        const { score, fired } = scoreWeighted(rules, held, a);
        if (fired > 0 && (best === null || score > best.score)) best = { a, score };
      }
      if (best && actual.has(best.a)) chargedHits++;
    }
    const netAccuracy = evaluated ? netHits / evaluated : 0;
    const baselineAccuracy = evaluated ? baseHits / evaluated : 0;
    console.log(
      `package-graph real run: train=${trainRows.length} test=${testRows.length} evaluated=${evaluated} ` +
      `iters=${iters} trainMs=${trainMs.toFixed(1)} net ${netHits}/${evaluated}=${netAccuracy.toFixed(3)} ` +
      `vs baseline ${baseHits}/${evaluated}=${baselineAccuracy.toFixed(3)} (top dep: ${topFreqDep}); ` +
      `charged lane ${chargedHits}/${evaluated}=${(evaluated ? chargedHits / evaluated : 0).toFixed(3)} with ${rules.length} rules`
    );
    assert.ok(evaluated > 0, "no held-out object carried a deps attribute to evaluate against");
    assert.ok(netAccuracy >= 0 && netAccuracy <= 1 && baselineAccuracy >= 0 && baselineAccuracy <= 1);
  }
);
