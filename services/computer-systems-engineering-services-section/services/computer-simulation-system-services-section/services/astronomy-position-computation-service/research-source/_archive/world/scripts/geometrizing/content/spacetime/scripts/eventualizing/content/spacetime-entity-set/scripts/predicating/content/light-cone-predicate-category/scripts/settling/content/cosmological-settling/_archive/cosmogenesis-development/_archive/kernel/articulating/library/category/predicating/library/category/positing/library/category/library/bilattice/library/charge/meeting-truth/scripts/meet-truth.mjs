// meet-truth — truth-order meet (glb in <=_t): positive presence-intersection, negative presence-union.
const present = (slot) => slot.length === 1;
const orSlot = (a, b) => (present(a) ? a : present(b) ? b : []);
const andSlot = (a, b) => (present(a) && present(b) ? a : []);
export default function meetTruth({ left, right }) {
  return [andSlot(left[0], right[0]), orSlot(left[1], right[1])];
}
