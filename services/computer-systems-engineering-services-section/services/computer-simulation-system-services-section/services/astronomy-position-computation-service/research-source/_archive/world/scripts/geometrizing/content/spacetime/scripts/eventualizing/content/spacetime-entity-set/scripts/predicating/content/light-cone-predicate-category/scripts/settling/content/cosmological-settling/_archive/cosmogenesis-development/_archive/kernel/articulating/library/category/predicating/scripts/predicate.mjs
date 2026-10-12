// predicate — the transfinite generator. Consumes twistor's residue (the concept) as the predicate
// dimension Pi and the saturated object as the entity dimension E; emits the cell-set Phi = E x Pi x E and
// the value-free fiber over it.
import twistor from "../../twistoring/scripts/twistor.mjs";

const initialPredicateCategory = (predicateSet) => ({
  objects: predicateSet, specialization: [], converse: [], "subject-projection": [], "object-projection": [],
});

export default function predicate(category) {
  const { saturated, residue } = twistor(category.potential);
  const [[object]] = saturated[1];
  const [concept] = residue;
  const entitySet = { entities: [object] };
  const predicateSet = { predicates: [concept] };
  const cellSet = { "entity-set": entitySet, "predicate-set": predicateSet };
  return {
    "cell-set": cellSet,
    fiber: { "cell-set": cellSet, base: initialPredicateCategory(predicateSet), "entity-set": entitySet },
  };
}
