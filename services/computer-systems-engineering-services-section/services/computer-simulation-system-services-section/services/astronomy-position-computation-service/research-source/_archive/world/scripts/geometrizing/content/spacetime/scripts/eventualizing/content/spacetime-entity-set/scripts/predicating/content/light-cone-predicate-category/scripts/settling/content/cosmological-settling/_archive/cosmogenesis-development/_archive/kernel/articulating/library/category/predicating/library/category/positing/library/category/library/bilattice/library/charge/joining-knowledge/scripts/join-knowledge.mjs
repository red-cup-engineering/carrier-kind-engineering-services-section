// join-knowledge — knowledge-order join (lub in <=_k): componentwise presence-union.
const present = (slot) => slot.length === 1;
const orSlot = (a, b) => (present(a) ? a : present(b) ? b : []);
export default function joinKnowledge({ left, right }) {
  return [orSlot(left[0], right[0]), orSlot(left[1], right[1])];
}
