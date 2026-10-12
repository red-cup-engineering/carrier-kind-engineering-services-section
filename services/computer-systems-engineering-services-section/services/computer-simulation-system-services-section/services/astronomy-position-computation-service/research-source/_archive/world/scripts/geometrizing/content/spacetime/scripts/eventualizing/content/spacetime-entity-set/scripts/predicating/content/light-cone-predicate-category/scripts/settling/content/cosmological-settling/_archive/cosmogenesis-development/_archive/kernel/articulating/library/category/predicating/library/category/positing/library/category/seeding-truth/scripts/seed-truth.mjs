// seed-truth — augment the scott category with a truth-monotone trace, seeded at the truth-least charge f.
//
// seed-knowledge seeds the knowledge-least valuation (BOTTOM on every cell of Φ). A `trace` is knowledge-monotone, so
// the truth pair (◇_t/□_t) cannot append to it; the bigraded category carries a SECOND family, `truth-traces`,
// truth-monotone. seed-truth adds it: one truth-trace seeded at f = [[], [mark]] (truth-bottom) on exactly the
// cells the knowledge seed already covers. Seeding f is closed-world ("false until proven") — the truth-axis
// dual of the kernel's open-world ⊥. The knowledge half is untouched. (mark is inlined like the kernel's
// BOTTOM; only ever the canonical token here.)
const MARK = { const: true };
const TRUTH_BOTTOM = [[], [MARK]];

export default function seedTruth(category) {
  const knowledgeSeed = category.traces[0].valuations[0];
  const truthSeed = {
    ...knowledgeSeed,
    "fiber-algebras": knowledgeSeed["fiber-algebras"].map((fa) => ({
      ...fa,
      assignments: fa.assignments.map(({ cell }) => ({ cell, charge: TRUTH_BOTTOM })),
    })),
  };
  return { ...category, "truth-traces": [{ valuations: [truthSeed] }] };
}
