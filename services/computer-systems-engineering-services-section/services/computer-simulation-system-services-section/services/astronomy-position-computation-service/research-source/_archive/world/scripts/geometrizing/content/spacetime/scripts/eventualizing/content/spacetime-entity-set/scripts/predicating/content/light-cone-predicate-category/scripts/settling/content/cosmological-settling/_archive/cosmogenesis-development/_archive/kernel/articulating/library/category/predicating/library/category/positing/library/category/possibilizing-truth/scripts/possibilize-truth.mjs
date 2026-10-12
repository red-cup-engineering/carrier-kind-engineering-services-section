// possibilize-truth — the forward modal generator on the TRUTH order (◇_t), dual to possibilize-knowledge (◇_k):
// raise each cell to the truth-JOIN across the valuation's fiber-algebras. Reuses joining-truth. Acts on the
// truth-traces family (truth-monotone) the bigraded category carries alongside the kernel's knowledge traces;
// a knowledge trace could not host it (truth moves can lower knowledge). Appends the raised valuation.
import joinTruth from "../../library/bilattice/library/charge/joining-truth/scripts/join-truth.mjs";

const S = (x) => JSON.stringify(x);

export function raiseTruth(valuation) {
  const algebras = valuation["fiber-algebras"].map((fa) => {
    const byCell = new Map();
    for (const { cell, charge } of fa.assignments) {
      const k = S(cell);
      byCell.set(k, byCell.has(k) ? joinTruth({ left: byCell.get(k), right: charge }) : charge);
    }
    const seen = new Set();
    const assignments = [];
    for (const { cell } of fa.assignments) {
      const k = S(cell);
      if (seen.has(k)) continue;
      seen.add(k);
      assignments.push({ cell, charge: byCell.get(k) });
    }
    return { ...fa, assignments };
  });
  return { ...valuation, "fiber-algebras": algebras };
}

export default function possibilizeTruth(category) {
  return {
    ...category,
    "truth-traces": category["truth-traces"].map((trace) => {
      const vs = trace.valuations;
      return { ...trace, valuations: [...vs, raiseTruth(vs[vs.length - 1])] };
    }),
  };
}
