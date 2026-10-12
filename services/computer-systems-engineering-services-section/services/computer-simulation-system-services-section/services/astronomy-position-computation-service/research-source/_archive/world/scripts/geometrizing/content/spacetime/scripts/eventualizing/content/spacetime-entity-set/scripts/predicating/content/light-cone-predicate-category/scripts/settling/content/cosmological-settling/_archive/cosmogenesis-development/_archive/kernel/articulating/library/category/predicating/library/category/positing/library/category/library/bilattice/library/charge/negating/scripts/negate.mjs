// negate — the bilattice involution: swap the positive and negative slots (reverses truth, preserves knowledge).
export default function negate(charge) {
  return [charge[1], charge[0]];
}
