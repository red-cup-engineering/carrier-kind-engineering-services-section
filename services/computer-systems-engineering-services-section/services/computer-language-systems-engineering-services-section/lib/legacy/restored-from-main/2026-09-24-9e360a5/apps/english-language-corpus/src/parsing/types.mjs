/**
 * english/types — shared structures for the dependency parser.
 *
 * A text is read as a tiered span hierarchy (document/block/sentence/clause/word),
 * then words are tagged and related by dependency-arc proposals. Every accepted
 * arc becomes a real predication `Cell` (metroplat's own `core/calculus/predicating`
 * cell structure — subject/predicate/object over opaque Tokens); the arc graph's gluing
 * is read by metroplat's own `cohomologyOfCells` (`core/closure/cohomology`, real
 * union-find connectivity + incidence-matrix cycle rank), not by a hand-rolled
 * conflict tally. A word attached to two competing heads (e.g. genuine PP-
 * attachment ambiguity) closes a cycle in that graph — H¹ > 0 finds it directly.
 */

/** A text span: a tier, its absolute byte offsets (null for synthesized rule-spans), and its text. */

/** Containment edge: child is nested inside parent in the tier hierarchy. */

/** Sequence edge: span follows prev in reading order within the same tier. */

/** The result of articulating a text: the 2-D base of containment + sequence edges. */

/** A word in a sentence, as seen during construal. */

/** A dependency arc proposal. */

/** A proposed arc with the source rule that licensed it. */

/** Intermediate result of construing a sentence: tagged words and arc proposals. */

/** Subject-verb agreement, read directly off features (not a graph fact — kept
 *  separate from the arc cohomology so a genuine agreement holding doesn't read
 *  as a spurious extra edge). */

  
  

  

  

