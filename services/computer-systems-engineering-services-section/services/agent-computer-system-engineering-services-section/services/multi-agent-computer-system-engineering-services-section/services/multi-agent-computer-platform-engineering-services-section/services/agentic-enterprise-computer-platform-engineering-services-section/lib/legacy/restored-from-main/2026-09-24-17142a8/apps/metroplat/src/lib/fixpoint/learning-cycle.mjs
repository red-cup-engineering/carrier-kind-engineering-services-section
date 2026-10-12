/**
 * settling/learning-cycle — observed learning-cycle reads over closure traces.
 *
 * The content-side learning notes read learning as iteration of a monotone,
 * inflationary closure operator: the learner ascends until a fixed point, so a
 * genuine return to an earlier non-fixed state is not a cycle but an
 * obstruction to that learning reading.
 *
 * This module keeps the Node claim smaller and executable. It does not prove an
 * arbitrary JavaScript endomorphism monotone or inflationary. It reads a
 * `ClosureCarrier` already produced by the closure workbench and reports what
 * the recorded finite orbit shows: consecutive ascent, absence or presence of a
 * nontrivial return, the bounded stabilization judgment, and a learning-depth
 * read when the closure search found a regime.
 *
 * The stronger learning-cycle theorem lives in the content and Lean closure
 * ordinal material. This module is the package's executable read: it inspects
 * a finite set, it does not certify arbitrary closure operators.
 *
 * @example
 * ```ts
 * const closed = closeOrdinalProcess(process);
 * const cycle = learningCycleOfClosureCarrier(closed);
 *
 * cycle.ascent.kind; // "learning.cycle.observedAscent:witness"
 * cycle.nontrivialReturn.kind; // "learning.cycle.nontrivialReturn:witness"
 * ```
 *
 * @packageDocumentation
 */

/** A consecutive ascent comparison in an observed closure orbit. */

/** Witness that every recorded successor step ascends in the supplied lattice. */

/** Obstruction: one recorded successor step descends or becomes unordered. */

/** Judgment for whether the recorded orbit ascends stepwise. */

/** A later observed point equal to an earlier observed point. */

/** Witness that the recorded orbit has no nontrivial return. */
export const observedLearningNoNontrivialReturnWitnessSchema = {
  $id: "metroplat/closure/learning-cycle/observed-learning-no-nontrivial-return-witness",
  type: "object",
  required: ["kind", "inspectedPoints"],
  properties: {
    kind: { const: "learning.cycle.nontrivialReturn:witness" },
    inspectedPoints: { type: "number" },
  },
  additionalProperties: false,
  title: "ObservedLearningNoNontrivialReturnWitness",
  description: "The recorded finite orbit shows no nontrivial return to an earlier point.",
};

/** Obstruction: the recorded orbit returns to an earlier point before closure. */

/** Judgment for whether the recorded orbit contains a nontrivial return. */

/** The learning-cycle read of one closure result's recorded orbit. */
