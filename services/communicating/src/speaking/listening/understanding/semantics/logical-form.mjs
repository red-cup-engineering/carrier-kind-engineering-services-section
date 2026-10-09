

import { scope } from "./scope.mjs";

     

function renderNode(node) {
  switch (node.kind) {
    case "pred":
      return `${node.predicate}(${node.args.join(", ")})`;
    case "not":
      return `¬${renderNode(node.body)}`;
    case "quant": {
      const q = node.quantifier === "forall" ? "∀" : node.quantifier === "exists" ? "∃" : "ι";
      const r = renderNode(node.restrictor);
      const b = renderNode(node.body);
      return `${q}${node.variable}(${r} → ${b})`;
    }
  }
}

/** Derive logical form from a parse result. */
export function logicalForm(result) {
  const clauses = [];

  for (const w of result.words) {
    if (w.tags.includes("verb")) {
      const nsubj = result.arcs.find((a) => a.head === `word@${w.i}` && a.rel === "nsubj");
      const dobj = result.arcs.find((a) => a.head === `word@${w.i}` && a.rel === "dobj");
      const args = [];
      if (nsubj) args.push(nsubj.depText);
      if (dobj) args.push(dobj.depText);
      clauses.push({ kind: "pred", predicate: w.text.toLowerCase(), args });
    }
  }

  const scopeResult = scope(result);
  const readings = scopeResult.scopeAmbiguous ? [] : null;

  if (readings !== null && scopeResult.readings.length > 0) {
    for (const r of scopeResult.readings) {
      const baseClause = clauses[0];
      if (baseClause) {
        readings.push({
          label: r.label,
          form: baseClause,
          render: `[${r.label}] ${renderNode(baseClause)}`,
        });
      }
    }
  }

  const render = readings !== null && readings.length > 0
    ? readings.map((r) => r.render).join(" | ")
    : clauses.map(renderNode).join("; ");

  return { clauses, readings, scopeAmbiguous: scopeResult.scopeAmbiguous, render };
}
