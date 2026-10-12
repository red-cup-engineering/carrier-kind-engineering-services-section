// aggregate — the evidence-aggregation join: a knowledge-join that COMBINES witnesses instead of discarding
// them. This is where evidence goes THICK. join-knowledge unions slot-presence and keeps one mark arbitrarily;
// aggregate unions presence and CONJOINS the marks — Curry–Howard: evidence for p from two sources is their
// conjunction, a term of the product type. When both inputs witness the same slot with different terms, the
// marks combine as { allOf: [w1, w2] } — itself a valid token (a JSON Schema 2020-12 document), so the slot
// stays a singleton and the charge stays a charge. On THIN charges (identical trivial marks) this is exactly
// join-knowledge, so thin evidence is the degenerate case of thick. This is the first-class form of folding's
// per-(e,a) "directed supremum of evidence". Identity element: BOTTOM = [[], []]; ⋁ over many witnessed
// charges = reduce(aggregate, BOTTOM).
const S = (x) => JSON.stringify(x);

// combine two slots: union of presence, conjunction (allOf) of distinct witnesses.
const combine = (a, b) => {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  return S(a[0]) === S(b[0]) ? a : [{ allOf: [a[0], b[0]] }];
};

export default function aggregate({ left, right }) {
  return [combine(left[0], right[0]), combine(left[1], right[1])];
}
