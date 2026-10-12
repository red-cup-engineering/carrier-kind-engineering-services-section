// seed-knowledge — the knowledge-least seed of the scott category: BOTTOM = [[], []] on every cell of
// Phi = E x Pi x E (one fiber-algebra A_p per predicate), derived from the fiber's own cell-set. Seeding ⊥ is
// open-world ("unknown until asserted") — the knowledge-axis dual of seed-truth's closed-world f. posit calls
// this to build its initial knowledge-monotone trace; the truth dual seed-truth adds the truth-trace later.
// (BOTTOM is inlined like the kernel's other charge constants.)
const BOTTOM = [[], []];

export default function seedKnowledge(fiber) {
  const entitySet = fiber["entity-set"];
  const entities = entitySet.entities;
  const predicates = fiber["cell-set"]["predicate-set"].predicates;
  return predicates.map((predicate) => ({
    "entity-set": entitySet,
    assignments: entities.flatMap((subject) => entities.map((object) =>
      ({ cell: { subject, predicate, object }, charge: BOTTOM }))),
    predicate,
  }));
}
