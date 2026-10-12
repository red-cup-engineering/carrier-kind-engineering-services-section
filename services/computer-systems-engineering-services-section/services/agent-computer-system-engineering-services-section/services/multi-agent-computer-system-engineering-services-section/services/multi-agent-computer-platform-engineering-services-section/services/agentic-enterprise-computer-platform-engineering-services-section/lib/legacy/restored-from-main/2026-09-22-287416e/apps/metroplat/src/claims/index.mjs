/**
 * @packageDocumentation
 *
 * coordination/claim-sessions — the interactive claim-session/fleet-glue
 * system: bounded sessions accumulating `{cell, charge}` claims (`session.mts`),
 * the WebSocket frame transport for them (`ws-session.mts`), a value-exclusive
 * bridge onto the same glue for plain fact claims (`fact-claims.mts`), and a
 * query-ranked context pack over already-read claim-session material
 * (`context.mts`). Work interpretations and work-ledger projections belong to
 * `src/work`, not this claim-session package.
 *
 * This package tracks what multiple agents and sessions claim and how those
 * claims glue or conflict; its filesystem-bound operation family is in
 * `service.mts`, beside the claim model it reads.
 */
export {
  claimSessionFeed,
  claimSessionStatementRows,
  claimSessionObservationOfRow,
  agentStatusReadout,
  claimSessionContinuation,
  glueClaimSessions,
  hostActClaimObservations,
  openSession,
  claim,
  judge,
  conflicts,
  sessionRegime,
  sessionJudgement,
  claimSessionObservation,
  closeSession,

} from "./session.mjs";

export {
  sampleClaimSessionObservations,

} from "./conformance-sample.mjs";

export { claimSessionOperations } from "./service.mjs";

export {
  anyFactContested,
  factValueContested,
  glueFactClaims,
  sourceReliabilityCorrelation,

} from "./fact-claims.mjs";

export {
  suitForCell,

} from "./context.mjs";
