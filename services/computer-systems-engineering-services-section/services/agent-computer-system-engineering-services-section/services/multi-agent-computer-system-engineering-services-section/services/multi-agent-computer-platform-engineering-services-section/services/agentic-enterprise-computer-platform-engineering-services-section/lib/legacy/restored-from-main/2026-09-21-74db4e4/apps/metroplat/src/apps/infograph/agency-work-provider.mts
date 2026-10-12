/** Bind a ready canonical duty to the existing witnessed agent-worker loop. */
import { runAgentWorker, type AgentWorkerOptions } from "../../integrations/agent-worker/index.mts";
import type { ProjectedSurface } from "../../presentation/surface.mts";
import type { AgentWorkDispatchItem } from "../../work/dispatch.mts";

export interface AgencyWorkProviderOptions extends Omit<AgentWorkerOptions, "cell"> {
  readonly surface: ProjectedSurface;
  readonly provider: string;
}

export async function executeAgencyWorkProvider(item: AgentWorkDispatchItem, options: AgencyWorkProviderOptions) {
  const producer = Object.freeze({ id: options.workerId, revision: `${options.provider}:${options.model}` });
  const delegation = item.delegation;
  if (delegation === undefined || delegation.provider !== options.workerId) return Object.freeze({ producer, execution: `refused:${item.scope}`, result: Object.freeze({ kind: "skill-error" as const, error: "provider is not the current allocated delegate" }), providerEvidence: Object.freeze([`allocation-holder:${item.agent}`, `allocation-provider:${delegation?.provider ?? "none"}`]) });
  if (item.intent === undefined || item.work === undefined || item.skill === undefined || item.closureKind === undefined || item.method === undefined || item.receiverCondition === undefined || item.text === undefined) {
    return Object.freeze({ producer, execution: `refused:${item.scope}`, result: Object.freeze({ kind: "skill-error" as const, error: "ready allocation lacks canonical proposal context" }), providerEvidence: Object.freeze([`allocation-scope:${item.scope}`]) });
  }
  const allowedOperationRefs = delegation.operations;
  const delegatedOperations = allowedOperationRefs.map((ref) => options.surface.operations.find((operation) => operation.ref === ref));
  if (delegatedOperations.some((operation) => operation === undefined)) return Object.freeze({ producer, execution: `refused:${item.scope}`, result: Object.freeze({ kind: "skill-error" as const, error: "delegated operation is unavailable on this surface" }), providerEvidence: Object.freeze(allowedOperationRefs.map((ref) => `delegated-operation:${ref}`)) });
  if (delegatedOperations.some((operation) => !delegation.effects.includes(operation!.effects.class))) return Object.freeze({ producer, execution: `refused:${item.scope}`, result: Object.freeze({ kind: "skill-error" as const, error: "delegated operation effect exceeds allocation" }), providerEvidence: Object.freeze(allowedOperationRefs.map((ref) => `delegated-operation:${ref}`)) });
  const run = await runAgentWorker(options.surface, {
    ...options,
    cell: item.scope,
    allowedOperationRefs,
    allowNoToolCompletion: true,
    allocationContext: Object.freeze({ method: item.method, receiverCondition: item.receiverCondition, workText: item.text, ...(item.source === undefined ? {} : { source: item.source }) }),
  });
  if (run.kind !== "metroplat.agent-worker.run") return Object.freeze({ producer, execution: `refused:${item.scope}`, result: Object.freeze({ kind: "skill-error" as const, error: `provider execution refused: ${run.kind}` }), providerEvidence: "evidence" in run ? run.evidence : Object.freeze([`worker-run:${run.kind}`]) });
  const executed = run.turns.flatMap((turn) => turn.executions.filter((receipt) => receipt.ok));
  const terminal = run.turns.at(-1);
  if (terminal === undefined || terminal.assistantMessage.content === null) return Object.freeze({ producer, execution: terminal?.inferenceResult ?? `refused:${item.scope}`, result: Object.freeze({ kind: "skill-error" as const, error: "provider did not produce a terminal textual outcome" }), providerEvidence: terminal === undefined ? Object.freeze([`worker-run:${run.kind}`]) : Object.freeze([terminal.inferenceResult, ...terminal.inferenceEvidence]) });
  return Object.freeze({
    producer,
    execution: terminal.inferenceResult,
    result: Object.freeze({ kind: "skill-result" as const, value: Object.freeze({ output: terminal.assistantMessage.content, invocationReceipts: Object.freeze(executed.map((receipt) => receipt.id)) }) }),
    providerEvidence: Object.freeze([terminal.inferenceResult, ...terminal.inferenceEvidence, ...executed.map((receipt) => receipt.id)]),
  });
}
