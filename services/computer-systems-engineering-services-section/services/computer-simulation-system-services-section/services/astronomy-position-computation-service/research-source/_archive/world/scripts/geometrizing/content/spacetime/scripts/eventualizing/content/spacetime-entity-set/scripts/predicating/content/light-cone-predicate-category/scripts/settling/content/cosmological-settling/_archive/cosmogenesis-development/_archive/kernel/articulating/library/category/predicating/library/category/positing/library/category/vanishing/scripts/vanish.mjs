// vanish — the void cone, dual to settling. settle glues the DETERMINED cells into the sheaf; vanish collects
// the complement — the cells that never determine, staying ⊥ (the void apex V_∞ = ⋂_τ V_τ, the geometry of
// persistent indeterminacy). The two cones are complementary in the cell-set under cell-complementation, and
// conflate (the ⊥↔⊤ / fullness axis) WITNESSES the duality: a cell is void iff conflating its charge yields ⊤
// (conflate sends the void apex ⊥ to the fullness apex ⊤). So the void locus is read through conflate, not by
// a bespoke ⊥-test — the dual cone is literally the settled cone of the conflated section. On a fully-settled
// section (no ⊥) the void apex is empty (V_∞ = ∅); the descent seed (all BOTTOM) is entirely void.
import conflate from "../../library/bilattice/library/charge/conflating/scripts/conflate.mjs";

const isTop = (charge) => charge[0].length === 1 && charge[1].length === 1;

export default function vanish(valuation) {
  const apex = [];
  for (const fa of valuation["fiber-algebras"]) {
    for (const { cell, charge } of fa.assignments) {
      if (isTop(conflate(charge))) apex.push(cell); // conflate(⊥) = ⊤ : this cell is in the void
    }
  }
  return { apex, empty: apex.length === 0 };
}
