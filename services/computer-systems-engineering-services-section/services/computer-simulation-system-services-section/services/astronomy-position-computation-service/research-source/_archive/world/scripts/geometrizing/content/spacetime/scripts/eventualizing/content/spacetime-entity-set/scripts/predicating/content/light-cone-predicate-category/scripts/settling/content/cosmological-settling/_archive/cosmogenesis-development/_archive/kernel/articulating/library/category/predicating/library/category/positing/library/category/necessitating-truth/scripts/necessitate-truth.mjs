// necessitate-truth — the backward modal generator on the TRUTH order (□_t), dual to necessitate-knowledge (□_k):
// lower each cell to the truth-MEET across the valuation's fiber-algebras. Reuses meeting-truth. Right adjoint
// of possibilize-truth (◇_t ⊣ □_t). Acts on the truth-traces family. Appends the lowered valuation.
import meetTruth from "../../library/bilattice/library/charge/meeting-truth/scripts/meet-truth.mjs";

const S = (x) => JSON.stringify(x);

export function lowerTruth(valuation) {
  const algebras = valuation["fiber-algebras"].map((fa) => {
    const byCell = new Map();
    for (const { cell, charge } of fa.assignments) {
      const k = S(cell);
      byCell.set(k, byCell.has(k) ? meetTruth({ left: byCell.get(k), right: charge }) : charge);
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

export default function necessitateTruth(category) {
  return {
    ...category,
    "truth-traces": category["truth-traces"].map((trace) => {
      const vs = trace.valuations;
      return { ...trace, valuations: [...vs, lowerTruth(vs[vs.length - 1])] };
    }),
  };
}
