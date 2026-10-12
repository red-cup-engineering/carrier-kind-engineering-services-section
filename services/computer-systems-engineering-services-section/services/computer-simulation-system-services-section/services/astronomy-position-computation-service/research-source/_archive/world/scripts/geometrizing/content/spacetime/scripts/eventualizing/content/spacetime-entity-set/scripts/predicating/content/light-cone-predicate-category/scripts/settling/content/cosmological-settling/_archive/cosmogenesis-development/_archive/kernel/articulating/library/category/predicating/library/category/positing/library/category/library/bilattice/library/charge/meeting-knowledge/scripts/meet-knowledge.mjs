// meet-knowledge — knowledge-order meet (glb in <=_k): componentwise presence-intersection.
const present = (slot) => slot.length === 1;
const andSlot = (a, b) => (present(a) && present(b) ? a : []);
export default function meetKnowledge({ left, right }) {
  return [andSlot(left[0], right[0]), andSlot(left[1], right[1])];
}
