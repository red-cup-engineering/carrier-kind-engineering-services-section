// The two nuclei and the settle loop. σ closes a valuation under the
// Duquenne–Guigues basis (held premises force held conclusions, witnessed);
// Δ transfers held evidence along the Galois closure of each object's
// profile. Both are KNOWLEDGE-order closures (they only add evidence), so
// they are not the truth-order quartet of FiberAlgebra.lean (σ, Δ there are
// truth-closures toward poles; cross_order_not_knowledge_nucleus is why the
// two must never be identified). Commutation σΔ=ΔσΔ-shape is asserted
// numerically in tests. settle() iterates to the fixed point and keeps the
// books of Dynamics/Flow/FreeEnergyLyapunov.lean over ALL cells G×M:
//   deficit(v, w) = Σ kHeight(w) − kHeight(v)         (the free energy F)
//   stepFlux      = Σ kHeight gained in one step      (ledger_step)
//   flux          = commits + mints + 2·jumps          (stepFlux_decomposition)
//   F(seed)       = Σ stepFlux over the orbit          (ledger_total, ledger_closes)
// and a firing step has flux ≥ 1 (freeEnergy_strict_of_fires). The
// multi-step shape is the file's rule-orbit instance: ruleOrbit iterates an
// immediate-consequence operator stage by stage, and rule_ledger states
// deficit(seed, w) = ruleOrbitFlux N + deficit(orbit N, w) for any closed w
// above the seed — at N = steps with w the reached fixed point that is the
// `closes` check below. What does NOT transfer: fenOrbit_fixed (a pointwise
// reading closure settles in one step) — σ and Δ are not pointwise.

import { refusalNumber } from "./complex.mjs";
import { ledgerCellStep } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/flow";

import { lawfulBasis, impClosure, closeAttrs, extent, NEG, isDenied, baseAttr } from "@red-cup-engineering/metrologic/closure/formal-context";
import { isConsistentReading, knowledgeBottom, knowledgeHeight as readingKnowledgeHeight, knowledgeJoinReading, readingOfSides, samePoint, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

// The H-theorem counts the told sides of a cell's reading.
export const kHeight = readingKnowledgeHeight;


export function makeValuation() {
  return new Map(); // "g m" -> reading (knowledge family)
}

// Add evidence without changing the prior valuation.  The kernel's state
// transition boundary is this value-returning operation; callers retain the
// prior valuation for replay, comparison, or concurrent branches.
export function withReading(v, g, m, q) {
  const out = new Map(v);
  const k = g + " " + m;
  out.set(k, knowledgeJoinReading(out.get(k) ?? knowledgeBottom(), q));
  return out;
}

export function readingAt(v, g, m) {
  return v.get(g + " " + m) ?? knowledgeBottom();
}

// The objects a settlement ranges over: the context's own plus any the
// valuation reads — a new utterance is seeded as a fresh object and
// comprehended against the witnessed context it is not yet part of.
function objectsOf(ctx, v) {
  const out = new Set(ctx.G);
  for (const k of v.keys()) out.add(k.slice(0, k.indexOf(" ")));
  return out;
}

// The signed attributes an object holds: m when evidence-for is present,
// ¬m when evidence-against is — both lanes read into one closure input.
function heldSigned(v, g, M) {
  const out = new Set();
  for (const m of M) {
    const q = readingAt(v, g, m);
    const [forTold, againstTold] = sidesOfReading(q);
    if (forTold) out.add(m);
    if (againstTold) out.add(NEG + m);
  }
  return out;
}

// Tell a forced signed attribute into its lane; returns the witness or
// null when the cell already carried that evidence.
function force(out, g, a, by, law) {
  const m = baseAttr(a);
  const k = g + " " + m;
  const before = out.get(k) ?? knowledgeBottom();
  const after = knowledgeJoinReading(before, isDenied(a) ? readingOfSides("knowledge", false, true) : readingOfSides("knowledge", true, false));
  if (samePoint(before, after)) return null;
  out.set(k, after);
  return { cell: k, by, law, lane: isDenied(a) ? "neg" : "pos" };
}

// Total knowledge height over every cell of the context: Σ kHeight(v[g,m]).
export function knowledgeHeight(ctx, v) {
  let h = 0;
  for (const g of objectsOf(ctx, v)) for (const m of ctx.M) h += kHeight(readingAt(v, g, m));
  return h;
}

// One step's ledger between two valuations v ≤ₖ v2: the flux (knowledge
// height gained, summed over G×M) itemized as commits (⊥→t or ⊥→f), mints
// (t/f→⊤) and jumps (⊥→⊤, worth two). Throws if the step is not a
// knowledge climb — the flow may only add evidence.
export function stepLedger(ctx, v, v2) {
  let commits = 0;
  let mints = 0;
  let jumps = 0;
  for (const g of objectsOf(ctx, v2)) {
    for (const m of ctx.M) {
      const ha = kHeight(readingAt(v, g, m));
      const hb = kHeight(readingAt(v2, g, m));
      const step = ledgerCellStep(ha, hb);
      commits += step.commits;
      mints += step.mints;
      jumps += step.jumps;
    }
  }
  return { flux: commits + mints + 2 * jumps, commits, mints, jumps };
}

export function sigma(ctx, basis, v) {
  const out = new Map(v);
  const witnesses = [];
  for (const g of objectsOf(ctx, v)) {
    const held = heldSigned(out, g, ctx.M);
    for (const a of impClosure(basis, held)) {
      if (held.has(a)) continue;
      const w = force(out, g, a, "sigma", "dg-basis");
      if (w) witnesses.push(w);
    }
  }
  return { v: out, witnesses };
}

// Δ transfers only along a REALIZED profile: when no context object bears
// everything g holds, the Galois double prime of that set is all of ctx.A
// (ex falso) and nothing is transferred — the same guard lawfulBasis puts
// on σ, so a contradiction stays local in both nuclei.
export function delta(ctx, v) {
  const out = new Map(v);
  const witnesses = [];
  for (const g of objectsOf(ctx, v)) {
    const held = heldSigned(out, g, ctx.M);
    if (extent(ctx, held).size === 0) continue;
    for (const a of closeAttrs(ctx, held)) {
      if (held.has(a)) continue;
      const w = force(out, g, a, "delta", "galois-transfer");
      if (w) witnesses.push(w);
    }
  }
  return { v: out, witnesses };
}

function valuationEq(a, b) {
  if (a.size !== b.size) return false;
  for (const [k, q] of a) {
    const p = b.get(k);
    if (!p || !samePoint(p, q)) return false;
  }
  return true;
}

// The settlement's obstruction receipt: every contested cell (evidence on
// both lanes survived settlement — held as data, never collapsed), and,
// when a conductance complex is supplied, each contested object's refusal
// number √(E/λ₁) over its ±1 lane assignment (complex.mjs). Cells that
// settled to one lane are counted; the receipt is what comprehension ships.
export function obstructionsOf(ctx, v, cx) {
  const contested = [];
  let settledCells = 0;
  const byObject = new Map();
  for (const [k, q] of v) {
    const [g, m] = k.split(" ");
    const reading = q;
    if (!isConsistentReading(reading)) {
      contested.push({ g, m });
      if (!byObject.has(g)) byObject.set(g, {});
      byObject.get(g)[m] = 0;
    } else if (!samePoint(reading, knowledgeBottom())) {
      settledCells++;
      if (byObject.has(g) || true) {
        if (!byObject.has(g)) byObject.set(g, {});
        byObject.get(g)[m] = sidesOfReading(reading)[0] ? 1 : -1;
      }
    }
  }
  const refusals = [];
  if (cx) {
    const contestedObjects = new Set(contested.map((c) => c.g));
    for (const g of contestedObjects) refusals.push({ g, refusal: refusalNumber(cx, byObject.get(g)) });
  }
  return { settledCells, contested, refusals };
}

// The settling defect of one object's row: the signed cells one σ∘Δ pass
// would still add. It is zero exactly on a settled row (a fixed point of
// the composite) and nonzero off it — the vanishing condition Definition
// 5.6 of the Generative Sheaf Universe puts on the defect operator δ, read
// on this finite presentation (taproot math paper, Definitions 5.5–5.6).
// What is NOT realized here: δ as a K-linear map on a mode space, and its
// naturality along trace morphisms — the basis is induced from the whole
// context, so a sub-context need not commute with this defect; that is
// obligation L0's remaining half, open.
export function settlingDefect(ctx, basis, v, g) {
  const d = delta(ctx, v);
  const s = sigma(ctx, basis, d.v);
  return [...d.witnesses, ...s.witnesses]
    .filter((w) => w.cell.startsWith(g + " "))
    .map((w) => ({ m: w.cell.slice(g.length + 1), lane: w.lane, by: w.by }));
}

export function settle(ctx, v, opts = {}) {
  const basis = opts.basis ?? lawfulBasis(ctx);
  let cur = new Map(v);
  const trace = [];
  const seedHeight = knowledgeHeight(ctx, cur);
  let totalFlux = 0;
  for (let step = 0; step < (opts.maxSteps ?? 64); step++) {
    const d = delta(ctx, cur);
    const s = sigma(ctx, basis, d.v);
    const fired = d.witnesses.length + s.witnesses.length;
    const ledger = stepLedger(ctx, cur, s.v);
    if (fired > 0 && ledger.flux === 0) {
      throw new Error(`H-theorem violation at step ${step}: ${fired} firings discharged no free energy`);
    }
    if (fired === 0 && ledger.flux > 0) {
      throw new Error(`unwitnessed flux at step ${step}: ${ledger.flux} units gained with no firing`);
    }
    totalFlux += ledger.flux;
    trace.push({ step, fired, ...ledger, witnesses: [...d.witnesses, ...s.witnesses] });
    if (valuationEq(cur, s.v)) {
      const initialDeficit = knowledgeHeight(ctx, s.v) - seedHeight;
      return {
        v: s.v,
        basis,
        trace,
        steps: step + 1,
        ledger: { initialDeficit, totalFlux, closes: initialDeficit === totalFlux },
        obstructions: obstructionsOf(ctx, s.v, opts.cx),
      };
    }
    cur = s.v;
  }
  throw new Error("settle did not reach a fixed point within maxSteps");
}
