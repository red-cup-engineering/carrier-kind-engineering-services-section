/**
 * consensus — fleet/swarm agreement as an operations approval gate.
 *
 * A great deal of operations management is multi-party sign-off: a deliverable is
 * approved when a quorum of reviewers agrees, and a single dissent must not be
 * silently averaged away. @red-cup-engineering/agentic-socialization-engine realizes this as a bilattice
 * network-sheaf over a fleet of observer charges: agreement is read off the
 * sheaf, and the obstruction to agreement is exactly the H¹ of the opposition
 * subgraph. This module binds that consensus read to a review gate — approve,
 * reject, or abstain — so a swarm of reviewers settles an operational decision
 * with contradiction surfaced, never collapsed.
 */

import {
  completeGraph,
  sheafCharges,
  type ObserverEdge,
  type SheafConsensus,
} from "@red-cup-engineering/agentic-socialization-engine";
import type { ChargeCarrier } from "@lenticule-science/metrologic/articulation/predicating/positing";
import { affirmed, denied, statusName, valued } from "../terms.mjs";

/** A reviewer's verdict on a subject. */
export type Verdict = "approve" | "reject" | "abstain";

/** One reviewer's vote. */
export interface Vote {
  readonly reviewer: string;
  readonly verdict: Verdict;
}

/** The settled outcome of an approval gate. */
export interface GateOutcome {
  readonly kind: "managing.gate.outcome";
  readonly subject: string;
  /** Coordination-free and pooled to a definite positive charge. */
  readonly approved: boolean;
  /** Either the reviewers are opposed (non-zero obstruction) or the pooled
   *  charge is a held contradiction ⊤. */
  readonly contested: boolean;
  /** The pooled charge's settled value name (potential = approve, active =
   *  reject, stable = contradiction, absurd = no evidence). */
  readonly pooledStatus: string;
  /** Count of explicit approvals. */
  readonly approvals: number;
  /** Whether the approval count meets the quorum. */
  readonly quorumMet: boolean;
  /** The underlying sheaf consensus, for audit. */
  readonly consensus: SheafConsensus;
}

function chargeOf(vote: Vote): ChargeCarrier {
  switch (vote.verdict) {
    case "approve": return affirmed("gate", "vote", vote.reviewer, "approve");
    case "reject": return denied("gate", "vote", vote.reviewer, "reject");
    case "abstain": return valued("absurd", "gate", "vote", vote.reviewer, "abstain");
  }
}

/**
 * Settle an approval gate over a fleet of reviewer votes. With no edge set given,
 * every reviewer is compared with every other (the complete graph), so any direct
 * approve/reject opposition raises the obstruction and contests the gate. The
 * gate is `approved` only when the fleet is confident (coordination-free, pooled
 * to a definite charge), the pooled charge is positive, and the approval count
 * meets `quorum`.
 */
export function approvalGate(input: {
  readonly subject: string;
  readonly votes: readonly Vote[];
  readonly quorum?: number;
  readonly edges?: readonly ObserverEdge[];
}): GateOutcome {
  const charges = input.votes.map(chargeOf);
  const edges = input.edges ?? completeGraph(charges.length);
  const consensus = sheafCharges(charges, edges);
  const pooled = consensus.componentConsensus[0]?.pooled;
  const pooledStatus = pooled === undefined ? "absurd" : statusName(pooled);
  const approvals = input.votes.filter((v) => v.verdict === "approve").length;
  const quorum = input.quorum ?? 1;
  const quorumMet = approvals >= quorum;
  const contested = !consensus.coordinationFree || pooledStatus === "stable";
  return Object.freeze({
    kind: "managing.gate.outcome" as const,
    subject: input.subject,
    approved: consensus.confident && pooledStatus === "potential" && quorumMet,
    contested,
    pooledStatus,
    approvals,
    quorumMet,
    consensus,
  });
}
