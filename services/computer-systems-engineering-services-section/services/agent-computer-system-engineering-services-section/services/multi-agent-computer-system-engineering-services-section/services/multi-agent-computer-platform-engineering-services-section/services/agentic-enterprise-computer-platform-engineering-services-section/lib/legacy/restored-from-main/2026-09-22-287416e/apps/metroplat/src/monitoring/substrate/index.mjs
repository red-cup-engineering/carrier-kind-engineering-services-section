/**
 * @packageDocumentation
 *
 * `src/monitoring/substrate` — the domain-neutral MAPE-K monitoring primitives.
 *
 * Every monitoring domain in this package — source-code, proof-health,
 * schema-conformance, and any future domain — is built from these three
 * families of primitives:
 *
 * ## History (`./history.mts`)
 * Temporal projection of any sequence of `EvidenceRecord`-valued observations
 * into a bounded, transition-annotated history relating consecutive stages in
 * both the Belnap knowledge order and the truth order.
 *
 * ## Valuation (`./valuation.mts`)
 * Belnap knowledge-lattice charge assignment over any network of
 * evidence-bearing nodes.  `joinChargesKnowledge` is the core join; it
 * accumulates evidence without cancellation across any number of independent
 * observations.
 *
 * ## Aggregate (`./aggregate.mts`)
 * Subsystem-level join that produces a unified, content-addressed
 * `MonitorAggregate` from any list of named `SubsystemChargeEntry` values.
 * This is the canonical Monitor (M) output format for the MAPE-K Analyze
 * phase, regardless of domain.
 */

// History
export {
  recordHistoryOfStages,
  recordKnowledgeRelation,
  recordTruthRelation,

} from "./history.mjs";

// Valuation
export {
  chargeEvidence,
  fourCensusOf,
  joinChargesKnowledge,
} from "./valuation.mjs";

// Aggregate
export {
  readMonitorAggregate,
  subsystemEntry,

} from "./aggregate.mjs";
