// Exchangeability, grounded in the stable @red-cup-engineering/metrologic morphisms. Condensing emits the cell-set
// Φ = E × Π × E; collapsing (posit) builds the cells by ranging over the entity-set as a SET. So the
// quantum cell-set is invariant under permuting the entities — they enter unordered. That is de
// Finetti's exchangeability, read off the real morphism rather than asserted.

import { posit } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/descent";

const S = JSON.stringify;

const category = (entities, modes) => ({
  fiber: {
    "cell-set": { "entity-set": { entities }, "predicate-set": { predicates: modes } },
    base: { objects: { predicates: modes }, specialization: [], converse: [], "subject-projection": [], "object-projection": [] },
    "entity-set": { entities },
  },
});

// The set of cells condensing/collapsing build over `entities` and `modes` (sorted → order-free).
export const cellSet = (entities, modes) =>
  posit(category(entities, modes)).presheaf.fibers
    .flatMap((f) => f.assignments.map((a) => S(a.cell)))
    .sort();

export const permutations = (arr) =>
  arr.length <= 1
    ? [arr]
    : arr.flatMap((x, i) =>
        permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((rest) => [x, ...rest]));

// Exchangeable: the cell-set is the same for every ordering of the entities.
export const isExchangeable = (entities, modes) => {
  const base = S(cellSet(entities, modes));
  return permutations(entities).every((p) => S(cellSet(p, modes)) === base);
};
