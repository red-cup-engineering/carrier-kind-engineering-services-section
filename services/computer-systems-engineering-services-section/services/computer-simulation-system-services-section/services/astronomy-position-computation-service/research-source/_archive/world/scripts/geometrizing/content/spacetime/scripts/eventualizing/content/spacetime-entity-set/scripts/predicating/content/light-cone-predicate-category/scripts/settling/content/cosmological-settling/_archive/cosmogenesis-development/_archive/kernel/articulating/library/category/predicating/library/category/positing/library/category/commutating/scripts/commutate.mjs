// commutate — the scott-continuous coherence (diamond.box = box.diamond, invertible). saturated = the
// presheaf (value-saturated substrate); residue = the traces (the unsaturated gluing) settle consumes.
export default function commutate(category) {
  return { saturated: category.presheaf, residue: category.traces };
}
