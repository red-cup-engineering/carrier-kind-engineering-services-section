/** RPC evidence admitted before and after governed execution. */
import type { JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { RpcInvocation } from "./invocation.mts";
import type { AuthorizationDecision, CoordinationDecision, ExecutionReceipt } from "./receipt.mts";
import type { ArtifactSource } from "../lib/identity/index.mts";

export type RpcEvidence =
  | Readonly<{ kind: "metroplat.rpc.attempt"; invocation: RpcInvocation; at: string }>
  | Readonly<{ kind: "metroplat.rpc.decision"; invocation: string; decision: AuthorizationDecision; at: string }>
  | Readonly<{ kind: "metroplat.rpc.coordination"; invocation: string; decision: CoordinationDecision; at: string }>
  | Readonly<{ kind: "metroplat.rpc.outcome"; invocation: string; receipt: ExecutionReceipt; at: string }>;

export interface RpcEvidenceReceipt {
  readonly kind: "metroplat.rpc.evidence-receipt";
  readonly id: string;
  readonly evidence: RpcEvidence["kind"];
  readonly eventIds: readonly string[];
  readonly material?: JsonValue;
}

/**
 * Required write port. Dispatch has no execution mode without it.
 *
 * @metroplatSubject rpc
 */
export interface RpcWitness {
  readonly admit: (evidence: RpcEvidence, artifacts?: readonly ArtifactSource[]) => RpcEvidenceReceipt;
  /** Current durable causal frontier for one invocation, after its latest admission. */
  readonly causalHead: (invocation: string) => readonly string[];
}
