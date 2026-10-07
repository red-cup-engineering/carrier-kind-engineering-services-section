// The machine's state from a witnessed trace: the kernel's context built
// from EAVT rows through @red-cup-engineering/eavt's own strata (stratifyEavtEvidence:
// saturate = Fix σ, then transfer = Fix Δ; machine spec §1.5, identification
// 1 — rows are trace steps, the two strata are the two nuclei's fixed sets).
// Objects are entities; attributes are `predicate=object` cells; a settled
// cell's evidence-for is incidence, its evidence-against is a denial row;
// retraction tombstones and converse pairs are eavt's law, never redone
// here. Each entity's asserted / saturated / settled strata stay readable
// so a reading never stores its stratum as a field.

import { stratifyEavtEvidence } from "@red-cup-engineering/eavt";
import { makeContext } from "@red-cup-engineering/metrologic/closure/formal-context";
import { makeValuation, withReading } from "./nuclei.mjs";

export const CELL = "=";

export function cellAttr(predicate, object) {
  return `${predicate}${CELL}${object}`;
}

export function contextFromTrace(rows, opts = {}) {
  const entities = [...new Set(rows.filter((r) => r.a !== "has-converse").map((r) => r.e))];
  const strata = new Map();
  const attrs = new Set();
  const pairs = [];
  const denials = [];
  const witnesses = new Map();
  for (const e of entities) {
    const s = stratifyEavtEvidence({ ...opts, subject: e, rows });
    strata.set(e, s);
    for (const cell of s.settled.fiber) {
      const a = cellAttr(cell.predicate, cell.object);
      attrs.add(a);
      if (cell.value.pos) pairs.push([e, a]);
      if (cell.value.neg) denials.push([e, a]);
      witnesses.set(e + " " + a, cell.value.evidence);
    }
  }
  const ctx = makeContext(entities, [...attrs], pairs, denials);
  let v = makeValuation();
  for (const [g, m] of pairs) v = withReading(v, g, m, "potential");
  for (const [g, m] of denials) v = withReading(v, g, m, "active");
  return { ctx, v, strata, witnesses };
}
