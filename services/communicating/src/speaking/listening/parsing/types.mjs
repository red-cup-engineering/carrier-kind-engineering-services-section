

/** A text span: a tier, its absolute byte offsets (null for synthesized rule-spans), and its text.
 * `numeric` is set true on a "word" tier span whose text is a recognized numeric token
 * (a comma-grouped or decimal number, optionally currency-prefixed or percent-suffixed —
 * see `tokenize`); absent on every other span. */

/** Containment edge: child is nested inside parent in the tier hierarchy. */

/** Sequence edge: span follows prev in reading order within the same tier. */

/** The result of articulating a text: the 2-D base of containment + sequence edges. */

/** A word in a sentence, as seen during construal. */

/** A dependency arc proposal (before settling). */

/** A kernel cell entry: one (subject, predicate[, object]) triple with its initial reading. */

/** A specialization edge on predicates: source ⊢ target (readings propagate upward). */

/** A question posed about a word: what predicate is being asked, on what surface text. */

/** Intermediate result of construing a sentence. */

/** The settled descent API: read readings by address. Unmentioned cells return ⊥. */

/** A text-bearing span used by the attribution reading. Unlike `Span`, it is
 * not restricted to the tier hierarchy — it may combine several words'
 * ranges (a multi-word speaker phrase, a matched marker, a quote) into one
 * absolute-offset range over the document text. */

/** One attribution reading: a reported content clause or quotation, its
 * speaker, and the cue that licensed the reading. */

/** Per-sentence modality reading: hedge, future-marking, and auxiliary
 * surface tokens found in the sentence, in reading order. */

