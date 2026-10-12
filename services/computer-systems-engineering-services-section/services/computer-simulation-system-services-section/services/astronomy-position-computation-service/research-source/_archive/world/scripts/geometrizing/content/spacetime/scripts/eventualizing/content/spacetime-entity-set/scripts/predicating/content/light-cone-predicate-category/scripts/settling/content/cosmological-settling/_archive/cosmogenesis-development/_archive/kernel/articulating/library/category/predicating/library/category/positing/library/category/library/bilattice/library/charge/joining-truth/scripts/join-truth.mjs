// join-truth — truth-order join (lub in <=_t): positive presence-union, negative presence-intersection.
const present = (slot) => slot.length === 1;
const orSlot = (a, b) => (present(a) ? a : present(b) ? b : []);
const andSlot = (a, b) => (present(a) && present(b) ? a : []);
export default function joinTruth({ left, right }) {
  return [orSlot(left[0], right[0]), andSlot(left[1], right[1])];
}
