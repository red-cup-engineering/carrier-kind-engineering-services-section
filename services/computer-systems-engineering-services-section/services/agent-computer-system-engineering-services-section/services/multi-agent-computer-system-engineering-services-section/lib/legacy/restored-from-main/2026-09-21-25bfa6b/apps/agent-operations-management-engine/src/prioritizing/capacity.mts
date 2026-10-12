/**
 * capacity - capacity-bounded selection of work into a sprint or cycle.
 *
 * Sprint planning specializes computing's exact linear-budget allocator: a
 * candidate task supplies the JSON action (its key), cost (estimate), and merit
 * (priority score in fixed-point micro-units); computing owns the allocation
 * run and this module only provides the management-shaped adapter.
 */

import { actedOf, decide, type DecisionRequest, type DecisionRun } from "@red-cup-engineering/agentic-computation-engine";
import { affirmed, statusName } from "../terms.mjs";

/** A candidate task for capacity selection. */
export interface Candidate {
  readonly key: string;
  /** Effort the task draws from capacity (same unit as `capacity`). */
  readonly estimate: number;
  /** Priority score / merit (higher is selected first per unit cost). */
  readonly score: number;
}

export type { DecisionRequest, DecisionRun };

/** Fixed-point scale (micro-units) for converting fractional scores to exact integer merit. */
const MERIT_SCALE = 1_000_000;

function toMerit(score: number): string {
  return BigInt(Math.round(score * MERIT_SCALE)).toString();
}

/** Build the linear-budget proposals for a set of candidates. */
export function proposalsOf(candidates: readonly Candidate[]): DecisionRequest["proposals"] {
  return candidates.map((candidate) => {
    const justification = affirmed("capacity", "candidate", candidate.key);
    return Object.freeze({
      id: candidate.key,
      action: candidate.key,
      cost: BigInt(Math.max(0, Math.round(candidate.estimate))).toString(),
      merit: toMerit(candidate.score),
      justification: Object.freeze({
        kind: "managing.capacity.justification" as const,
        status: statusName(justification),
      }),
    });
  });
}

/** Select candidates into a capacity. `resource` names the capacity unit. */
export function selectIntoCapacity(
  candidates: readonly Candidate[],
  capacity: number,
  resource = "capacity",
): DecisionRun {
  return decide({
    kind: "computing.decision-request" as const,
    resource,
    available: BigInt(Math.max(0, Math.round(capacity))).toString(),
    proposals: proposalsOf(candidates),
  });
}

/** The selected task keys from a capacity run, in allocation order. */
export function selectedKeys(run: DecisionRun): readonly string[] {
  return actedOf(run)
    .map((decision) => decision.action)
    .filter((action): action is string => typeof action === "string");
}
