// compare — the truth–knowledge coherence: split a section into its consistent and paraconsistent parts.
//
// The two modal diamonds disagree exactly at ⊤. A t/f disagreement is ⊤ to knowledge (◇_k = join-knowledge)
// but t to truth (◇_t = join-truth), so the naive cross-axis commutation ◇_k ∘ ◇_t = ◇_t ∘ ◇_k FAILS (t ≠ ⊤).
// What is coherent is the decomposition F^(k) ≅ F^(t) ⊕ F^(⊤): every section splits into a CONSISTENT part
// (cells valued ⊥, t, or f) and a PARACONSISTENT part (cells valued ⊤ — the inconsistency locus, the
// "told both" overdetermined evidence). On a consistent section F^(⊤) = ∅, and there the knowledge- and
// truth-cohomologies coincide (the real strict-commutation — a cohomological statement that READS OFF this
// split; it lives in the cohomology library, not the kernel). This morphism is the structural coherence the
// two modal pairs generate, the truth-axis analogue of commutate.

const isTop = (charge) => charge[0].length === 1 && charge[1].length === 1;

const keep = (valuation, pred) => ({
  ...valuation,
  "fiber-algebras": valuation["fiber-algebras"].map((fa) => ({
    ...fa,
    assignments: fa.assignments.filter(({ charge }) => pred(charge)),
  })),
});

export default function compare(valuation) {
  return {
    consistent: keep(valuation, (c) => !isTop(c)), // F^(t): the ⊥/t/f cells
    paraconsistent: keep(valuation, isTop),        // F^(⊤): the ⊤ cells, the inconsistency locus
  };
}
