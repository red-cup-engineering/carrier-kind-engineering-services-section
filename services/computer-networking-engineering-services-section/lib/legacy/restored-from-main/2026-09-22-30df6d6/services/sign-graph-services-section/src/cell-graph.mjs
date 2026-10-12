/**
 * cell-graph — SignCell's cells organized as a Chu space.
 *
 * Points are cells (and the things they are addressed by); states are
 * observations (attributes, queries, indexes) over them, each a named,
 * total evaluator `(cell) => ChargeValue`. The organization is metrologic's
 * generic Chu-relation math (`bilattice-relation`), applied over
 * SignCell's `cellCoincides` as point sameness and observation-name
 * equality as state sameness. Chu morphisms between two organizations
 * (a forward map on cells, a backward map on observation names) are
 * `checkRelationTransform`/`relationTransform`, unchanged from metrologic;
 * this module supplies only the cell-shaped points and named-observation
 * states they organize.
 */
import { relationMatrix, relationFromMatrix, transpose, dual, checkRelationTransform, relationTransform, composeTransforms, dualTransform, } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-relation";
import { cellCoincides } from "@red-cup-engineering/sign-cell/predication";

const sameObservation = (left, right) => left === right;

/** Build the Chu-space relation of a cell set under a list of named observations. */
export function cellGraph(cells, observations, options = {}) {
  const points = Object.freeze({ kind: "predication.entitySet", entities: [...cells] });
  const states = Object.freeze({ kind: "predication.predicateSet", predicates: observations.map((o) => o.name) });
  const entries = [];
  for (const cell of cells) {
    for (const observation of observations) {
      entries.push([cell, observation.name, observation.evaluate(cell)]);
    }
  }
  const matrix = relationMatrix(points, states, entries, { samePoint: cellCoincides, sameState: sameObservation });
  return relationFromMatrix(matrix, { absent: options.absent, samePoint: cellCoincides, sameState: sameObservation });
}

export { transpose, dual, checkRelationTransform, relationTransform, composeTransforms, dualTransform };
