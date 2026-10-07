// types.ts — language-editing/koine vocabulary.
// A Rule is a predicate on text; its evidence is bilattice:
//   t — compliant (finding is positive)
//   f — violation (finding is negative)
//   ⊤ — conflict (two rules disagree; route to human)
//   ⊥ — unsure (re-check at a finer tier)

/** A linting rule: a predicate over a text span. */

/** Optional context a rule may inspect. */

/** A single finding produced by a rule run. */

/** A cell in the detection result: one finding with its source span offset resolved. */

/** The full detection result for a piece of text. */

/** A predicate-specialization edge: source findings propagate to target. */

/** A rendered diagnostic: what a consumer sees. */

/** Document-level verdict. */

