// tabulate — lay a charged section out as its evidence matrix: the Chu space over {+, -}.
//
// A charge is an evidence pair (pos, neg) ∈ {0,1}²; a section assigns one to each cell of Φ. Tabulating it
// is forming the presence matrix — rows = cells, columns = the two evidence sides {positive, negative},
// entries = whether that side's evidence is present. That table IS a Chu space (the matrix r : A × X → 2 is
// the uncurried valuation v : A → 2^X), and FOUR ≅ Chu(2,0) (Jakl 2025): bilattice-valued predication is a
// model of multiplicative linear logic. This is the structural on-ramp — the full and faithful embeddings of
// Top / Pos / Vect into Chu(2), the "shadows" (category theory, topology, algebra as one structure), read off
// this table downstream (the mld library), not in the kernel.
const present = (slot) => (slot.length === 1 ? 1 : 0);

export default function tabulate(valuation) {
  const points = [];
  for (const fa of valuation["fiber-algebras"]) {
    for (const { cell, charge } of fa.assignments) {
      points.push({ cell, row: [present(charge[0]), present(charge[1])] });
    }
  }
  return { states: ["positive", "negative"], points };
}
