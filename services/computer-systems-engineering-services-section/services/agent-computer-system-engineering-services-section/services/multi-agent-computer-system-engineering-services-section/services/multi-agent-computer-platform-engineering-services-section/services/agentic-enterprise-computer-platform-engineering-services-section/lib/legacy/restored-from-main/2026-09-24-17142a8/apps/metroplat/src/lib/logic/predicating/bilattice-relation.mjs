/**
 * predicating/bilattice-relation — four-valued relations as Chu-style matrices.
 *
 * The carrier, its matrix form, its transforms and its profile/extension/dual
 * readers live once, in @lenticule-science/metrologic/articulation/predicating/positing/bilattice-relation.
 * This file keeps only the play/game read a relation carrier does not itself
 * need: point truth-dominance and the undominated play frontier it derives.
 */
import { truthLeq } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { count } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";

export {
  relation,
  relationRead,
  relationReadAbsence,
  relationMatrix,
  matrixEntryReading,
  relationFromMatrix,
  isRelationCarrier as isBilatticeRelation,
  pointProfile,
  stateProfile,
  stateExtension,
  transpose,
  dual,
  settleStateProfile,
  settlePointProfile,
  checkRelationTransform,
  relationTransform,
  isRelationTransform,
  idTransform,
  composeTransforms,
  dualTransform,
} from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-relation";

/** Check whether `dominating` is at least `dominated` in the truth order for every state.
 *
 * This is the native finite play/game read over a FOUR-valued relation: points
 * are moves, strategies, actors, or positions; states are the contexts that test
 * them; each cell is the charge read in that context. A dominance witness means
 * every context preserves the truth-order inequality. An obstruction names the
 * missing point or the exact context cells where the inequality fails.
 */
export function checkPointTruthDominance(
  relation,
  dominated,
  dominating,
) {
  const failures = [];
  const dominatedPresent = relation.points.entities.some((candidate) => relation.samePoint(candidate, dominated));
  const dominatingPresent = relation.points.entities.some((candidate) => relation.samePoint(candidate, dominating));
  if (!dominatedPresent) failures.push(Object.freeze({ kind: "bilattice.relation.pointTruthDominance.domain-obstruction", role: "dominated", point: dominated }));
  if (!dominatingPresent) failures.push(Object.freeze({ kind: "bilattice.relation.pointTruthDominance.domain-obstruction", role: "dominating", point: dominating }));
  if (failures.length > 0) {
    return Object.freeze({ kind: "bilattice.relation.pointTruthDominance-obstruction", relation, dominated, dominating, failures: Object.freeze(failures), rank: count(failures) });
  }

  const cells = [];
  for (const state of relation.states.predicates) {
    const dominatedValue = relation.at(dominated, state);
    const dominatingValue = relation.at(dominating, state);
    const judgment = truthLeq(dominatedValue, dominatingValue);
    const cell = Object.freeze({
      kind: "bilattice.relation.pointTruthDominanceCell",
      state,
      dominatedValue,
      dominatingValue,
      judgment,
    });
    cells.push(cell);
    if (judgment.kind === "charge.orderLeq-obstruction") {
      failures.push(Object.freeze({ kind: "bilattice.relation.pointTruthDominance.context-obstruction", cell }));
    }
  }
  if (failures.length > 0) {
    return Object.freeze({ kind: "bilattice.relation.pointTruthDominance-obstruction", relation, dominated, dominating, failures: Object.freeze(failures), rank: count(failures) });
  }
  return Object.freeze({ kind: "bilattice.relation.pointTruthDominance:witness", relation, dominated, dominating, cells: Object.freeze(cells), rank: count(cells) });
}

/** Read the points not truth-dominated by any distinct point in the same relation. */
export function truthDominanceFrontier(
  relation,
) {
  const dominated = [];
  const frontier = relation.points.entities.filter((point) => {
    for (const candidate of relation.points.entities) {
      if (relation.samePoint(point, candidate)) continue;
      const judgment = checkPointTruthDominance(relation, point, candidate);
      if (judgment.kind === "bilattice.relation.pointTruthDominance:witness") {
        dominated.push(judgment);
        return false;
      }
    }
    return true;
  });
  return Object.freeze({
    kind: "bilattice.relation.truthDominanceFrontier",
    relation,
    points: Object.freeze({ kind: "predication.entitySet", entities: Object.freeze(frontier) }),
    dominated: Object.freeze(dominated),
    rank: count(frontier),
  });
}
