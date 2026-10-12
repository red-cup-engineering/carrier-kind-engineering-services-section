/**
 * The mathematical Settlement structure.
 *
 * A Settlement is an ordinal-indexed filtration of settling stages, each with
 * its designated cells, together with its declared cofinality. Its associated
 * readouts—increments, limit stages, non-Scott firings, first cohomology,
 * graded gap, closure invariant, and classification—are constituents and
 * invariants of this one structure.
 */

import { relativeCellComplement } from "../articulation/predicating/positing/settling/cell-set.mjs";
import { countableSettlingCofinality } from "../articulation/predicating/positing/settling/index.mjs";

export const countableSettlingCofinalitySchemaContractSchema = {
  $id: "metroplat/closure/object/countable-settling-cofinality",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.settling.cofinality.countable" } },
  additionalProperties: false,
};

export const uncountableSettlingCofinalitySchemaContractSchema = {
  $id: "metroplat/closure/object/uncountable-settling-cofinality",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.settling.cofinality.uncountable" } },
  additionalProperties: false,
};

/** The complete mathematical Settlement structure. */

/** Construct a Settlement while enforcing initiality and monotonicity. */
export function settlementFiltration(
  stages,
  cofinality = countableSettlingCofinality,
) {
  if (stages.length === 0) throw new TypeError("settlementFiltration: need at least one stage");
  if (stages[0].shape.kind !== "predication.settling.stage.initial") throw new TypeError("settlementFiltration: stage 0 must be initial");
  const normalized = [];
  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index];
    const designated = stage.designated.cells;
    if (index > 0) {
      const previous = stages[index - 1].designated.cells.cells;
      if (relativeCellComplement(previous, designated.cells).length > 0) throw new TypeError(`settlementFiltration: stage ${index} drops cells`);
    }
    normalized.push(Object.freeze({
      kind: "predication.settling.stage",
      ordinal: stage.ordinal,
      shape: stage.shape,
      designated,
    }));
  }
  return Object.freeze({
    kind: "predication.settlement.filtration",
    stages: Object.freeze(normalized),
    cofinality,
  });
}
