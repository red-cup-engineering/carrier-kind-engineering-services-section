// Generation: descent in the enabled cone. Candidates are the unmet
// conclusions of basis implications whose premises the object already holds
// (obstruction-shaped questions), scored by the continuation energy
// ΔF = α·opened − β·closed + T·ΔE (machine spec §2), drawn Gibbs-style at
// witnessed temperature: every draw logs the excluded probability mass as a
// wit record. Sampling is priced, never silent.
//
// The three terms, each read off the machine's own state, never postulated
// as a score:
//   opened(m,P)  the unsettled reading the move introduces — adjoin m on the
//                object and close its row under the basis and the Galois
//                transfer; every cell that changed contributes its
//                knowledge-height deficit (2 − kHeight), and a cell driven
//                contested contributes 2 (a conflict is maximally
//                unsettled in the truth order though full in knowledge).
//   closed(m,P)  the open questions of Q(P) the move answers: the enabled
//                moves before minus the enabled moves after.
//   ΔE(m,P)      the change of the conductance complex's disagreement
//                energy xᵀLx when the object's held indicator gains m
//                (spec §1.5.2, the quadratic-form reading of δ with δ the
//                weighted Laplacian). Because L is a graph Laplacian this
//                is Σ_j D[m,j]·(1 − 2·x_j): edges from m to held
//                attributes lower it, edges to unheld ones raise it — the
//                spec's "flux along activated edges" is its held half.
// Locality (spec L2): the terms read one object's row, the basis, and m's
// conductance row — never another object, never the whole complex. The
// basis scan is the one cost not bounded by the pore; that is stated, not
// hidden.

import { readingAt, kHeight } from "./nuclei.mjs";
import { drawFiniteBoltzmann } from "@red-cup-engineering/metrologic/number/finite-law";
import { impClosure, closeAttrs, extent, NEG, isDenied, baseAttr } from "@red-cup-engineering/metrologic/closure/formal-context";
import { isConsistentReading, knowledgeJoinReading, readingOfSides, samePoint, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const hasTruth = (q) => sidesOfReading(q)[0];
const hasFalsity = (q) => sidesOfReading(q)[1];
/** The point told for only, and the point told against only. */
const toldFor = readingOfSides("knowledge", true, false);
const toldAgainst = readingOfSides("knowledge", false, true);

// The enabled cone of an object: (1) unmet conclusions of basis
// implications whose premises it holds — the obstruction-shaped questions
// settlement will answer; and (2) realized continuations — attributes it
// does not yet hold that some witnessed object bearing everything it holds
// does bear, so adjoining one keeps the profile realized (a proper
// sub-concept). After settlement (1) is empty by construction; (2) is the
// generative cone proper: every lawful next saturation the corpus has
// witnessed, each carrying its witness count as evidence.
export function enabledMoves(ctx, basis, v, g) {
  const held = new Set();
  const denied = new Set();
  for (const m of ctx.M) {
    const q = readingAt(v, g, m);
    if (hasTruth(q)) held.add(m);
    if (hasFalsity(q)) denied.add(m);
  }
  const moves = [];
  const seen = new Set();
  for (const imp of basis) {
    let premisesHeld = true;
    for (const m of imp.from) if (!held.has(m)) { premisesHeld = false; break; }
    if (!premisesHeld) continue;
    for (const a of imp.to) {
      const m = baseAttr(a);
      if (isDenied(a) || held.has(m) || seen.has(m)) continue;
      seen.add(m);
      moves.push({ g, attr: m, question: { kind: "unmet-conclusion", locus: g, prerequisites: [...imp.from] } });
    }
  }
  const signed = new Set([...held, ...[...denied].map((m) => NEG + m)]);
  const bearers = extent(ctx, signed);
  if (bearers.size > 0) {
    for (const m of ctx.M) {
      if (held.has(m) || denied.has(m) || seen.has(m)) continue;
      let witnesses = 0;
      for (const o of bearers) if (ctx.I.has(o + "\0" + m)) witnesses++;
      if (witnesses === 0) continue;
      seen.add(m);
      moves.push({ g, attr: m, question: { kind: "realized-continuation", locus: g, prerequisites: [...held], witnesses } });
    }
  }
  return moves;
}

// The object's row after adjoining a reading and closing it locally: one
// pass of σ (basis closure of the signed held set) then Δ (Galois transfer
// along a realized profile), on this object only. Returns the row as a
// Map attr -> reading and the cells that changed.
function adjoinAndCloseRow(ctx, basis, v, g, attr, q) {
  const row = new Map();
  for (const m of ctx.M) row.set(m, readingAt(v, g, m));
  const changed = new Set();
  const put = (m, next) => {
    const before = row.get(m);
    const after = knowledgeJoinReading(before, next);
    if (!samePoint(after, before)) { row.set(m, after); changed.add(m); }
  };
  put(attr, q);
  const signed = () => {
    const out = new Set();
    for (const [m, c] of row) { if (hasTruth(c)) out.add(m); if (hasFalsity(c)) out.add(NEG + m); }
    return out;
  };
  for (const a of impClosure(basis, signed())) put(baseAttr(a), isDenied(a) ? toldAgainst : toldFor);
  const held = signed();
  if (extent(ctx, held).size > 0) {
    for (const a of closeAttrs(ctx, held)) put(baseAttr(a), isDenied(a) ? toldAgainst : toldFor);
  }
  return { row, changed };
}

export function opened(ctx, basis, v, move) {
  const { row, changed } = adjoinAndCloseRow(ctx, basis, v, move.g, move.attr, toldFor);
  let total = 0;
  for (const m of changed) {
    const c = row.get(m);
    total += !isConsistentReading(c) ? 2 : 2 - kHeight(c);
  }
  return total;
}

export function closed(ctx, basis, v, move) {
  const before = enabledMoves(ctx, basis, v, move.g).length;
  const { row } = adjoinAndCloseRow(ctx, basis, v, move.g, move.attr, toldFor);
  const v2 = new Map(v);
  for (const [m, c] of row) v2.set(move.g + " " + m, c);
  const after = enabledMoves(ctx, basis, v2, move.g).length;
  return Math.max(0, before - after);
}

// ΔE = xᵀLx(after) − xᵀLx(before) with x the object's held indicator gaining
// move.attr; for the weighted graph Laplacian this collapses to the edges
// incident to the new attribute: Σ_j D[attr,j]·(1 − 2·x_j).
export function disagreementEnergyChange(ctx, cx, v, move) {
  const i = cx.index.get(move.attr);
  if (i === undefined) return 0;
  let dE = 0;
  for (const m of ctx.M) {
    if (m === move.attr) continue;
    const j = cx.index.get(m);
    if (j === undefined) continue;
    const x = hasTruth(readingAt(v, move.g, m)) ? 1 : 0;
    dE += cx.D[i][j] * (1 - 2 * x);
  }
  return dE;
}

export function continuationEnergy(ctx, basis, cx, v, move, opts = {}) {
  const alpha = opts.alpha ?? 1;
  const beta = opts.beta ?? 1;
  const T = opts.T ?? 0.5;
  if (![alpha, beta, T].every(value => typeof value === "number" &&
    Number.isFinite(value) && value >= 0))
    throw new RangeError("generation requires finite nonnegative alpha, beta and temperature");
  const dF = alpha * opened(ctx, basis, v, move) -
    beta * closed(ctx, basis, v, move) +
    T * disagreementEnergyChange(ctx, cx, v, move);
  if (!Number.isFinite(dF))
    throw new RangeError("generation continuation energy left the finite numerical carrier");
  return dF;
}

export function generate(ctx, basis, cx, v, g, opts = {}) {
  const T = opts.T ?? 0.5;
  if (typeof opts.rng !== "function")
    throw new Error("generate requires an injected rng capability");
  if (typeof T !== "number" || !Number.isFinite(T) || T < 0)
    throw new RangeError("generate requires a finite nonnegative temperature");
  const moves = enabledMoves(ctx, basis, v, g);
  if (moves.length === 0) return { move: null, wit: null, candidates: [] };
  const scored = moves.map(move => ({
    move, dF: continuationEnergy(ctx, basis, cx, v, move, opts),
  }));
  // The probability law is *upstream mathematical code*. The old local
  // exp(-E/T) normalization could underflow all weights to zero and emit NaN,
  // or silently select a zero-mass candidate on an invalid random variate.
  const drawn = drawFiniteBoltzmann({
    energies: scored.map(candidate => candidate.dF),
    temperature: T, rng: opts.rng,
  });
  const { index, probabilities, variate, chosenProbability } = drawn;
  const wit = {
    kind: "witnessed-sample",
    chosen: scored[index].move.attr,
    temperature: T,
    // These are recomputable numerical facts about this chosen continuation,
    // not authentication of a SignChain witness or a theorem about the world.
    variate, chosenProbability,
    excludedMass: 1 - chosenProbability,
    excluded: scored.map((candidate, i) => ({
      attr: candidate.move.attr, p: probabilities[i], dF: candidate.dF,
    })).filter((_, i) => i !== index),
  };
  return { move: scored[index].move, dF: scored[index].dF, wit, candidates: scored };
}
