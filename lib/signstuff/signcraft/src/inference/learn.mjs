// Raw learning: no rules are given, ever. The Duquenne–Guigues basis is
// INDUCED from witnessed incidence — the machine's learned mass — and raw
// inference is closure under that induced basis plus ΔF ranking. The
// learning curve reveals incidence in rounds, re-induces, adapts
// conductances from settlement flux, and scores held-out prediction per
// round: the class's training run, every learned implication inspectable.

import { makeContext, lawfulBasis, impClosure } from "@red-cup-engineering/metrologic/closure/formal-context";
import { makeValuation, withReading, settle, readingAt } from "./nuclei.mjs";
import { makeComplex } from "./complex.mjs";
import { continuationEnergy } from "./generate.mjs";
import { fluxFromTrace, adapt } from "./adapt.mjs";

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seeded Fisher–Yates: uniform over permutations. Array.prototype.sort with
// a random comparator is not a shuffle.
export function shuffle(items, rng) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function induceBasis(objects, attributes, pairs) {
  const ctx = makeContext(objects, attributes, pairs);
  const basis = lawfulBasis(ctx);
  return { ctx, basis };
}

function predictTop(ctx, basis, cx, settledV, g, candidates, opts) {
  let best = null;
  for (const a of candidates) {
    const dF = continuationEnergy(ctx, basis, cx, settledV, { g, attr: a }, opts);
    if (best === null || dF < best.dF) best = { a, dF };
  }
  return best?.a ?? null;
}

// One evaluation: for each held-out (g,m), is m reachable by closure under
// the induced basis from g's known attributes, or top-ranked by ΔF among
// unheld attributes? Baseline: global attribute frequency, same information.
export function evaluateInduced({ ctx, basis, cx, knownPairs, testPairs, opts = {} }) {
  let v = makeValuation();
  for (const [g, m] of knownPairs) v = withReading(v, g, m, "potential");
  const settled = settle(ctx, v, { basis, maxSteps: opts.maxSteps ?? 64 });
  const freq = new Map(ctx.M.map((m) => [m, 0]));
  for (const [, m] of knownPairs) freq.set(m, freq.get(m) + 1);
  const byFreq = [...ctx.M].sort((a, b) => freq.get(b) - freq.get(a));
  const weightedRules = opts.weightedRules ?? induceWeightedImplications(knownPairs, opts);
  const heldByObject = new Map();
  for (const [g, m] of knownPairs) {
    if (!heldByObject.has(g)) heldByObject.set(g, new Set());
    heldByObject.get(g).add(m);
  }
  let kernelHits = 0;
  let closureHits = 0;
  let baselineHits = 0;
  for (const [g, m] of testPairs) {
    const held = heldByObject.get(g) ?? new Set();
    const unheld = ctx.M.filter((a) => !["potential", "stable"].includes(readingAt(settled.v, g, a)));
    if (["potential", "stable"].includes(readingAt(settled.v, g, m))) {
      closureHits++;
      kernelHits++;
    } else {
      let top = null;
      for (const a of unheld) {
        const { score, fired } = scoreWeighted(weightedRules, held, a);
        if (fired > 0 && (top === null || score > top.score)) top = { a, score };
      }
      if (top === null) top = { a: predictTop(ctx, basis, cx, settled.v, g, unheld, opts) };
      if (top.a === m) kernelHits++;
    }
    const baseTop = byFreq.find((a) => !["potential", "stable"].includes(readingAt(settled.v, g, a)));
    if (baseTop === m) baselineHits++;
  }
  return {
    settledTrace: settled.trace,
    n: testPairs.length,
    kernelHits,
    closureHits,
    baselineHits,
    kernelAccuracy: testPairs.length ? kernelHits / testPairs.length : 0,
    baselineAccuracy: testPairs.length ? baselineHits / testPairs.length : 0,
  };
}

// The training run. Splits pairs into an initial known set, a reveal
// stream, and a fixed final test set; each round re-induces the basis from
// everything known so far, evaluates on the untouched test set, and adapts
// conductances from the round's settlement flux.
export function learningCurve({ objects, attributes, pairs, rounds = 5, testFrac = 0.2, initialFrac = 0.3, seed = 7, opts = {} }) {
  const rng = mulberry32(seed);
  const shuffled = shuffle(pairs, rng);
  const nTest = Math.max(1, Math.floor(shuffled.length * testFrac));
  const testPairs = shuffled.slice(0, nTest);
  const pool = shuffled.slice(nTest);
  const nInitial = Math.max(1, Math.floor(pool.length * initialFrac));
  let known = pool.slice(0, nInitial);
  const stream = pool.slice(nInitial);
  const perRound = Math.max(1, Math.ceil(stream.length / Math.max(1, rounds - 1)));
  let cx = makeComplex(attributes);
  const curve = [];
  for (let round = 0; round < rounds; round++) {
    const { ctx, basis } = induceBasis(objects, attributes, known);
    const evalOut = evaluateInduced({ ctx, basis, cx, knownPairs: known, testPairs, opts });
    const flux = fluxFromTrace(ctx, evalOut.settledTrace);
    const adapted = adapt(cx, flux, opts);
    cx = adapted.complex;
    curve.push({
      round,
      knownPairs: known.length,
      basisSize: basis.length,
      kernelAccuracy: evalOut.kernelAccuracy,
      closureHits: evalOut.closureHits,
      baselineAccuracy: evalOut.baselineAccuracy,
      testN: evalOut.n,
      edgesAdapted: adapted.updated.length,
    });
    if (round < rounds - 1) known = known.concat(stream.slice(round * perRound, (round + 1) * perRound));
  }
  const first = curve[0];
  const last = curve[curve.length - 1];
  return {
    curve,
    improved: last.kernelAccuracy > first.kernelAccuracy,
    beatsBaseline: last.kernelAccuracy > last.baselineAccuracy,
    finalBasisSize: last.basisSize,
  };
}

// Weighted induction: the soft learned mass. Exact DG implications are
// proof-grade but brittle — one held-out incidence is a counterexample that
// deletes the rule. Here an implication carries support and confidence
// (exceptions count against it instead of killing it — the positing move),
// premises are singletons and frequent pairs, and prediction combines every
// fired implication by noisy-OR. Each rule remains a quotable receipt.
export function induceWeightedImplications(pairs, { minSupport = 2, minConfidence = 0.55, maxRules = 4000 } = {}) {
  const byObject = new Map();
  const attrCount = new Map();
  for (const [g, m] of pairs) {
    if (!byObject.has(g)) byObject.set(g, new Set());
    byObject.get(g).add(m);
    attrCount.set(m, (attrCount.get(m) ?? 0) + 1);
  }
  const premises = [];
  for (const a of attrCount.keys()) premises.push([a]);
  const attrs = [...attrCount.keys()];
  for (let i = 0; i < attrs.length; i++) {
    for (let j = i + 1; j < attrs.length; j++) premises.push([attrs[i], attrs[j]]);
  }
  const rules = [];
  for (const from of premises) {
    let nA = 0;
    const conc = new Map();
    for (const set of byObject.values()) {
      let all = true;
      for (const p of from) if (!set.has(p)) { all = false; break; }
      if (!all) continue;
      nA++;
      for (const m of set) if (!from.includes(m)) conc.set(m, (conc.get(m) ?? 0) + 1);
    }
    if (nA < minSupport) continue;
    for (const [m, n] of conc) {
      const confidence = n / nA;
      if (confidence >= minConfidence) rules.push({ if: from, then: m, support: n, confidence });
    }
  }
  rules.sort((a, b) => b.support * b.confidence - a.support * a.confidence);
  return rules.slice(0, maxRules);
}

// Noisy-OR score per candidate attribute from every fired weighted rule.
export function scoreWeighted(rules, heldAttrs, candidate) {
  let notP = 1;
  let fired = 0;
  for (const r of rules) {
    if (r.then !== candidate) continue;
    let ok = true;
    for (const p of r.if) if (!heldAttrs.has(p)) { ok = false; break; }
    if (!ok) continue;
    fired++;
    notP *= 1 - r.confidence;
  }
  return { score: 1 - notP, fired };
}

// The learned mass, human-readable: the induced implications ranked by
// support in the corpus — the machine's knowledge, quotable line by line.
export function learnedImplications(ctx, basis, pairs) {
  const byObject = new Map();
  for (const [g, m] of pairs) {
    if (!byObject.has(g)) byObject.set(g, new Set());
    byObject.get(g).add(m);
  }
  return basis.map((imp) => {
    let support = 0;
    for (const attrs of byObject.values()) {
      let all = true;
      for (const p of imp.from) if (!attrs.has(p)) { all = false; break; }
      if (all) support++;
    }
    return { if: [...imp.from], then: [...imp.to], support };
  }).sort((a, b) => b.support - a.support);
}
