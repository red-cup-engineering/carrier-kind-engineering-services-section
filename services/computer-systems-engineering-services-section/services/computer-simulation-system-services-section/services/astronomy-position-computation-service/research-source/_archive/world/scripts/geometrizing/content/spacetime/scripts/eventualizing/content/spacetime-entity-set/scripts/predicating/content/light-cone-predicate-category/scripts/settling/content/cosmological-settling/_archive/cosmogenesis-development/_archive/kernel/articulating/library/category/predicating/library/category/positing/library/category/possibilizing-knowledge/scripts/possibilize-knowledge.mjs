// possibilize-knowledge — the forward modal generator on the KNOWLEDGE order (◇_k): raise each cell to the
// knowledge-JOIN across the valuation's fiber-algebras. Reuses joining-knowledge. Appends the raised
// valuation (trace stays knowledge-monotone). Named for its axis so neither order reads as the default;
// its truth-order sibling is possibilize-truth.
import joinKnowledge from "../../library/bilattice/library/charge/joining-knowledge/scripts/join-knowledge.mjs";

const S = (x) => JSON.stringify(x);

export function raiseKnowledge(valuation) {
  const algebras = valuation["fiber-algebras"].map((fa) => {
    const byCell = new Map();
    for (const { cell, charge } of fa.assignments) {
      const k = S(cell);
      byCell.set(k, byCell.has(k) ? joinKnowledge({ left: byCell.get(k), right: charge }) : charge);
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

export default function possibilizeKnowledge(category) {
  return {
    ...category,
    traces: category.traces.map((trace) => {
      const vs = trace.valuations;
      return { ...trace, valuations: [...vs, raiseKnowledge(vs[vs.length - 1])] };
    }),
  };
}
