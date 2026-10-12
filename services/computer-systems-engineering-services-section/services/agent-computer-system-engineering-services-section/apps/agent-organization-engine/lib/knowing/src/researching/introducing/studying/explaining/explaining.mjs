/**
 * explaining — AgentSite → Explanation: a leaf under studying.
 *
 * Third derivative (a leaf). Explaining reads the studied site's settling trace as
 * a PROOF: an ordered chain of derivation steps, each referencing one settling
 * increment (the stage shape it fired at, the cells it added). It does not advance
 * the agency chain; it witnesses that the settlement was reached step by step. The
 * codomain holds the live AgentSite (the trace is never discarded).
 */

/** One derivation step: a settling increment read as a proof step. */

/** The derivation carrier: the studied trace read as a proof. */

/** explain : KnowingTrace → Explanation. */
export function explaining(trace) {
  const derivation = trace.trace.map((increment) =>
    Object.freeze({
      kind: "knowing.derivation-step",
      stage: increment.source.shape.kind,
      addedCells: increment.added.cells.length,
      increment,
    }),
  );
  return Object.freeze({ kind: "knowing.explanation", trace, derivation: Object.freeze(derivation) });
}
