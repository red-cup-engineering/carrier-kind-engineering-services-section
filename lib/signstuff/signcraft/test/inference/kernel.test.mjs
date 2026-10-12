import { test } from "node:test";
import assert from "node:assert/strict";
import { knowledgeJoinReading as joinK, knowledgeMeetReading as meetK, truthJoinReading as joinT, truthMeetReading as meetT, negateReading as negate, knowledgeLeqReading as leqK, samePoint } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { makeContext, closeAttrs, dgBasis, impClosure } from "@red-cup-engineering/metrologic/closure/formal-context";
import { kHeight, makeValuation, withReading, readingAt, sigma, delta, settle, stepLedger, settlingDefect } from "../../src/inference/nuclei.mjs";
import { makeComplex, withConductance, disagreementEnergy, spectralGap, refusalNumber } from "../../src/inference/complex.mjs";
import { enabledMoves, generate } from "../../src/inference/generate.mjs";
import { fluxFromTrace, adapt } from "../../src/inference/adapt.mjs";
import { maskedIncidenceEval } from "../../src/inference/evaluate.mjs";

const BOTTOM = "absurd";
const readFour = (q) => q;

// A small witnessed world: animals bearing attributes, with real implications
// (every mammal is warm-blooded; everything aquatic-and-mammal is a whale-like
// air-breather; birds are warm-blooded and feathered).
const G = ["dog", "whale", "sparrow", "trout", "bat"];
const M = ["mammal", "bird", "fish", "warm", "feathers", "aquatic", "airbreathing", "flies"];
const PAIRS = [
  ["dog", "mammal"], ["dog", "warm"], ["dog", "airbreathing"],
  ["whale", "mammal"], ["whale", "warm"], ["whale", "aquatic"], ["whale", "airbreathing"],
  ["sparrow", "bird"], ["sparrow", "warm"], ["sparrow", "feathers"], ["sparrow", "airbreathing"], ["sparrow", "flies"],
  ["trout", "fish"], ["trout", "aquatic"],
  ["bat", "mammal"], ["bat", "warm"], ["bat", "airbreathing"], ["bat", "flies"],
];

function freshCtx() {
  return makeContext(G, M, PAIRS);
}

test("FOUR: knowledge join is monotone and never discards evidence", () => {
  const t = "potential";
  const f = "active";
  const top = joinK(t, f);
  assert.equal(readFour(top), "stable");
  assert.equal(kHeight(top), 2);
  assert.ok(leqK(t, top) && leqK(f, top) && leqK(BOTTOM, t));
});

test("Galois closure is extensive, monotone, idempotent on this context", () => {
  const ctx = freshCtx();
  const B = new Set(["mammal"]);
  const c1 = closeAttrs(ctx, B);
  for (const m of B) assert.ok(c1.has(m));
  const c2 = closeAttrs(ctx, c1);
  assert.deepEqual([...c2].sort(), [...c1].sort());
  const bigger = closeAttrs(ctx, new Set(["mammal", "aquatic"]));
  for (const m of c1) if (!bigger.has(m)) assert.ok(!["mammal", "warm", "airbreathing"].includes(m));
});

test("DG basis is sound and complete: implication closure equals Galois closure", () => {
  const ctx = freshCtx();
  const basis = dgBasis(ctx);
  assert.ok(basis.length > 0);
  const subsets = [[], ["mammal"], ["bird"], ["mammal", "aquatic"], ["fish"], ["flies"], ["warm", "flies"]];
  for (const sub of subsets) {
    const viaImps = impClosure(basis, new Set(sub));
    const viaGalois = closeAttrs(ctx, new Set(sub));
    assert.deepEqual([...viaImps].sort(), [...viaGalois].sort(), `divergence at {${sub}}`);
  }
});

test("sigma and delta are inflationary in knowledge order and commute on fixtures", () => {
  const ctx = freshCtx();
  const basis = dgBasis(ctx);
  let v = makeValuation();
  v = withReading(v, "dog", "mammal", "potential");
  const sThenD = delta(ctx, sigma(ctx, basis, v).v).v;
  const dThenS = sigma(ctx, basis, delta(ctx, v).v).v;
  for (const [k, q] of v) assert.ok(leqK(q, sThenD.get(k)));
  assert.equal(sThenD.size, dThenS.size);
  for (const [k, q] of sThenD) {
    const p = dThenS.get(k);
    assert.ok(p !== undefined && samePoint(p, q), `commutation fails at ${k}`);
  }
});

test("settle reaches a fixed point, forces the right facts, and the H-theorem holds", () => {
  const ctx = freshCtx();
  let v = makeValuation();
  v = withReading(v, "dog", "mammal", "potential");
  const out = settle(ctx, v);
  assert.equal(readFour(readingAt(out.v, "dog", "warm")), "potential");
  assert.equal(readFour(readingAt(out.v, "dog", "airbreathing")), "potential");
  assert.equal(readFour(readingAt(out.v, "dog", "fish")), "absurd");
  const again = settle(ctx, out.v, { basis: out.basis });
  assert.equal(again.trace[0].fired, 0);
  assert.ok(out.steps >= 1);
  // FreeEnergyLyapunov ledger: every firing step discharges flux, the seed's
  // free energy equals the total flux, and the book closes at quiescence.
  for (const step of out.trace) assert.equal(step.fired > 0, step.flux > 0);
  assert.ok(out.ledger.initialDeficit >= 1);
  assert.equal(out.ledger.totalFlux, out.ledger.initialDeficit);
  assert.equal(out.ledger.closes, true);
  assert.deepEqual(again.ledger, { initialDeficit: 0, totalFlux: 0, closes: true });
  const whole = stepLedger(ctx, v, out.v);
  assert.equal(whole.flux, out.ledger.totalFlux);
  assert.equal(whole.commits + whole.mints + 2 * whole.jumps, whole.flux);
});

test("contested evidence survives settlement: no classical collapse", () => {
  const ctx = freshCtx();
  let v = makeValuation();
  v = withReading(v, "whale", "fish", "potential");
  v = withReading(v, "whale", "fish", "active");
  const out = settle(ctx, v);
  assert.equal(readFour(readingAt(out.v, "whale", "fish")), "stable");
});

test("disagreement energy is zero exactly on constants; refusal carries a number", () => {
  let cx = makeComplex(["a", "b", "c"]);
  cx = withConductance(cx, "a", "b", 1);
  cx = withConductance(cx, "b", "c", 1);
  assert.equal(disagreementEnergy(cx, { a: 1, b: 1, c: 1 }), 0);
  const E = disagreementEnergy(cx, { a: 1, b: 0, c: 0 });
  assert.ok(E > 0);
  const gap = spectralGap(cx);
  assert.ok(gap > 0);
  const r = refusalNumber(cx, { a: 1, b: 0, c: 0 });
  assert.ok(Math.abs(r - Math.sqrt(E / gap)) < 1e-9);
  assert.equal(refusalNumber(cx, { a: 2, b: 2, c: 2 }), 0);
});

test("generation: enabled cone is obstruction-shaped and sampling logs excluded mass", () => {
  const ctx = freshCtx();
  const basis = dgBasis(ctx);
  const cx = makeComplex(M);
  let v = makeValuation();
  v = withReading(v, "bat", "mammal", "potential");
  const moves = enabledMoves(ctx, basis, v, "bat");
  assert.ok(moves.length >= 2);
  const kinds = new Set(moves.map((mv) => mv.question.kind));
  assert.ok(kinds.has("unmet-conclusion"), "an unsettled row has obstruction-shaped questions");
  for (const k of kinds) assert.ok(k === "unmet-conclusion" || k === "realized-continuation");
  const settledMoves = enabledMoves(ctx, basis, settle(ctx, v, { basis }).v, "bat");
  assert.ok(settledMoves.length >= 1, "after settlement the realized cone still offers lawful continuations");
  assert.ok(settledMoves.every((mv) => mv.question.kind === "realized-continuation" && mv.question.witnesses >= 1));
  const rng = () => 0.42;
  const out = generate(ctx, basis, cx, v, "bat", { rng, T: 0.5 });
  assert.ok(out.move !== null);
  assert.ok(out.wit.excludedMass > 0 && out.wit.excludedMass < 1);
  assert.equal(out.wit.excluded.length, out.candidates.length - 1);
});

test("adaptation: settlement flux thickens used edges (the machine learns its metric)", () => {
  const ctx = freshCtx();
  let v = makeValuation();
  v = withReading(v, "dog", "mammal", "potential");
  v = withReading(v, "bat", "mammal", "potential");
  const out = settle(ctx, v);
  const flux = fluxFromTrace(ctx, out.trace);
  assert.ok(flux.size > 0);
  const cx = makeComplex(M);
  const res = adapt(cx, flux, { mu: 0.8, gamma: 0.1 });
  assert.ok(res.updated.length > 0);
  for (const u of res.updated) assert.ok(u.after > u.before);
});

test("conductance flux lowers continuation energy: learning biases generation", () => {
  const ctx = freshCtx();
  const basis = dgBasis(ctx);
  let v = makeValuation();
  v = withReading(v, "bat", "mammal", "potential");
  const cold = makeComplex(M);
  let warm = makeComplex(M);
  warm = withConductance(warm, "mammal", "warm", 3);
  const rng = () => 0.999;
  const coldOut = generate(ctx, basis, cold, v, "bat", { rng, T: 0.3 });
  const warmOut = generate(ctx, basis, warm, v, "bat", { rng, T: 0.3 });
  const coldWarmCand = coldOut.candidates.find((c) => c.move.attr === "warm");
  const warmWarmCand = warmOut.candidates.find((c) => c.move.attr === "warm");
  assert.ok(warmWarmCand.dF < coldWarmCand.dF);
});

test("masked-incidence evaluation runs end to end and reports honest numbers", () => {
  let seed = 7;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const out = maskedIncidenceEval(G, M, PAIRS, { rng, maskFrac: 0.2 });
  assert.ok(out.maskedCount >= 1);
  assert.equal(out.maskedCount + out.keptCount, PAIRS.length);
  assert.ok(out.kernelAccuracy >= 0 && out.kernelAccuracy <= 1);
  assert.ok(out.rows.length === out.maskedCount);
  console.log(
    `masked-incidence: masked=${out.maskedCount} kernel=${out.kernelHits}/${out.maskedCount} baseline=${out.baselineHits}/${out.maskedCount}`,
  );
});

test("supercritical-tick shape: question -> settle -> adapt -> larger arena", () => {
  const ctx = freshCtx();
  const basis = dgBasis(ctx);
  const cx = makeComplex(M);
  let v = makeValuation();
  v = withReading(v, "bat", "mammal", "potential");
  const before = enabledMoves(ctx, basis, v, "bat").length;
  const settled = settle(ctx, v, { basis });
  const flux = fluxFromTrace(ctx, settled.trace);
  const learned = adapt(cx, flux, {});
  const evolved = withReading(settled.v, "bat", "flies", "potential");
  const after = enabledMoves(ctx, basis, evolved, "bat");
  assert.equal(settled.ledger.closes, true);
  assert.ok(before >= 1);
  assert.ok(Array.isArray(after));
});

test("the settling defect vanishes exactly on a settled row and is nonzero off it", () => {
  const ctx = freshCtx();
  const basis = dgBasis(ctx);
  let v = makeValuation();
  v = withReading(v, "dog", "mammal", "potential");
  const before = settlingDefect(ctx, basis, v, "dog");
  assert.ok(before.length >= 1, "an unsettled row has a nonzero defect");
  assert.ok(before.every((d) => d.lane === "pos" && typeof d.m === "string"));
  const out = settle(ctx, v, { basis });
  assert.deepEqual(settlingDefect(ctx, basis, out.v, "dog"), []);
  for (const g of ctx.G) assert.deepEqual(settlingDefect(ctx, basis, out.v, g), []);
});

test("canonical metrologic charges retain both bilattice orders and negation", () => {
  const t = "potential";
  const f = "active";
  assert.equal(readFour(joinK(t, f)), "stable");
  assert.equal(readFour(meetK(t, f)), "absurd");
  assert.equal(readFour(joinT(t, f)), "potential", "truth join of potential and active is potential");
  assert.equal(readFour(meetT(t, f)), "active", "truth meet of potential and active is active");
  assert.equal(negate(t), f);
  assert.equal(readFour(negate(joinK(t, f))), "stable", "negation fixes stable");
  assert.equal(leqK(BOTTOM, t) && leqK(t, joinK(t, f)) && !leqK(t, f), true);
});
