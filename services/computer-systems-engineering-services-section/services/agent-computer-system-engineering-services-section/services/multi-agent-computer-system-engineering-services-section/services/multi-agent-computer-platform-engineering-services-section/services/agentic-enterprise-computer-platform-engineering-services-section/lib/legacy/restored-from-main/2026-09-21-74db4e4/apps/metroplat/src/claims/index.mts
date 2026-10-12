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
  type AgentStatusReadout,
  type AgentStatusReadRequest,
  type AgentStatusReadiness,
  type Claim,
  type ClaimSessionObservationInput,
  type ClaimSessionContinuation,
  type ClaimSessionContinuationItem,
  type ClaimSessionObservation,
  type ClaimSessionObservationBundle,
  type GluedClaimSessions,
  type HostActClaim,
  type HostActClaimFoldInput,
  type Session,
} from "./session.mts";

export {
  sampleClaimSessionObservations,
  type ClaimSessionObservationSample,
  type ClaimSessionObservationSampleOptions,
  type SessionTranscriptDiscovery,
  type SessionTranscriptMatch,
} from "./conformance-sample.mts";

export { claimSessionOperations } from "./service.mts";

export {
  anyFactContested,
  factValueContested,
  glueFactClaims,
  sourceReliabilityCorrelation,
  type FactClaim,
  type ReliabilityStance,
  type SourceReliabilityCorrelation,
} from "./fact-claims.mts";

export {
  suitForCell,
  type Suit,
  type SuitInput,
  type SuitOptions,
  type SuitOmission,
  type SuitQuery,
  type SuitSection,
} from "./context.mts";
