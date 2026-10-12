// necessitate-knowledge — the backward modal generator on the KNOWLEDGE order (□_k): lower each cell to the
// knowledge-MEET across the valuation's fiber-algebras. Reuses meeting-knowledge. Right adjoint of
// possibilize-knowledge. Named for its axis so neither order reads as the default; its truth-order sibling
// is necessitate-truth.
import meetKnowledge from "../../library/bilattice/library/charge/meeting-knowledge/scripts/meet-knowledge.mjs";

const S = (x) => JSON.stringify(x);

export function lowerKnowledge(valuation) {
  const algebras = valuation["fiber-algebras"].map((fa) => {
    const byCell = new Map();
    for (const { cell, charge } of fa.assignments) {
      const k = S(cell);
      byCell.set(k, byCell.has(k) ? meetKnowledge({ left: byCell.get(k), right: charge }) : charge);
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

export default function necessitateKnowledge(category) {
  return {
    ...category,
    traces: category.traces.map((trace) => {
      const vs = trace.valuations;
      return { ...trace, valuations: [...vs, lowerKnowledge(vs[vs.length - 1])] };
    }),
  };
}
