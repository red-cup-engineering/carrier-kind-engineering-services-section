// compare-knowledge — the <=_k witness: returns right when left <=_k right (knowledge only grows); throws otherwise.
const present = (slot) => slot.length === 1;
const leq = (a, b) => (!present(a[0]) || present(b[0])) && (!present(a[1]) || present(b[1]));
export default function compareKnowledge({ left, right }) {
  if (!leq(left, right)) {
    throw new TypeError("compare-knowledge: no <=_k witness — left has knowledge not present in right");
  }
  return right;
}
