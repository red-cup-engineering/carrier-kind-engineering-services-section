/**
 * SignGraph — paths: cells composed across shared entities.
 *
 * Read as an edge s →[p]→ o, a cell composes with any cell starting where it
 * ends: (a, p, b) · (b, q, c) = (a, [p, q], c), the composite labelled by the
 * predicate sequence it traversed. `compose` is one round of that (the
 * multiplication of the path monad), keeping the generators; `atomic` keeps
 * only the uncomposed edges (its unit, which forgets composites and so is not
 * injective); the residue of a round is the label sequences no single
 * predicate names — the part of a path that does not saturate back into a cell.
 */
import { coincides } from "@red-cup-engineering/signcell/cell";

const labels = (edge) => (Array.isArray(edge.predicate) ? edge.predicate : [edge.predicate]);

/** One round of composition: every edge, plus each composite of two distinct edges meeting at an entity. */
export function compose(edges) {
  const composites = [];
  edges.forEach((left, i) => edges.forEach((right, j) => {
    if (i !== j && coincides(left.object, right.subject)) composites.push(Object.freeze({ subject: left.subject, predicate: Object.freeze([...labels(left), ...labels(right)]), object: right.object }));
  }));
  return Object.freeze([...edges, ...composites]);
}

/** The atomic (single-predicate) edges of a path list. */
export const atomic = (edges) => Object.freeze(edges.filter((edge) => labels(edge).length === 1));

/** Compose once, then reopen to atoms; the residue is each composite's label sequence. */
export function composeAndReopen(edges) {
  const composed = compose(edges);
  return Object.freeze({ composed, reopened: atomic(composed), residue: Object.freeze(composed.filter((edge) => labels(edge).length > 1).map(labels)) });
}
