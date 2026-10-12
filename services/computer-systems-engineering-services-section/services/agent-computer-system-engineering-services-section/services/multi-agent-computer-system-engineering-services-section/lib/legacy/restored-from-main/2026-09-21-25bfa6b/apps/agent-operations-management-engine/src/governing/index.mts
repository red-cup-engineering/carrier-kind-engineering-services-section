/**
 * @red-cup-engineering/agent-operations-management-engine/governing — fleet/swarm governance of operations.
 *
 * Multi-party approval gates settled on the animating bilattice network-sheaf:
 * agreement is read off the sheaf and contradiction is surfaced, not averaged.
 */

export { approvalGate } from "./consensus.mjs";
export type { Verdict, Vote, GateOutcome } from "./consensus.mjs";

export { heldOpinions, opinion, opinionFiber } from "./opinion.mjs";
export type {
  OpinionFiber,
  OpinionKind,
  OpinionRecord,
  OpinionSeverity,
  OpinionStance,
  OpinionStatus,
} from "./opinion.mjs";
