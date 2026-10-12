// cohere — the transfinite coherence (Beck-Chevalley). saturated = the relational cell-set; residue = the
// value-free fiber over the composition-closed (transitively closed specialization) base posit consumes.
const S = (x) => JSON.stringify(x);

function closeSpecialization(specialization) {
  const edges = specialization.map((e) => [e.source, e.target]);
  const has = (a, b) => edges.some(([s, t]) => S(s) === S(a) && S(t) === S(b));
  let changed = true;
  while (changed) {
    changed = false;
    for (const [a, b] of [...edges]) for (const [c, d] of [...edges]) {
      if (S(b) === S(c) && S(a) !== S(d) && !has(a, d)) { edges.push([a, d]); changed = true; }
    }
  }
  return edges.map(([source, target]) => ({ source, target }));
}
const closeBase = (base) => ({ ...base, specialization: closeSpecialization(base.specialization) });

export default function cohere(category) {
  const fiber = category.fiber;
  return {
    saturated: category["cell-set"],
    residue: { "cell-set": fiber["cell-set"], base: closeBase(fiber.base), "entity-set": fiber["entity-set"] },
  };
}
