import type { AuthorityEvaluationDecision } from "@red-cup-engineering/organizing/corporate-authority";
import { deriveCborNi } from "@red-cup-engineering/computer-data-engine/identity";
import type { FilesystemBinding } from "../integrations/filesystem/services/read-write.mts";
import { openJournal } from "../journal/index.mts";
import { claimSessionFeed, claimSessionObservation, claimSessionStatementRows } from "../claims/session.mts";
import { obsticulationDischargeObservations } from "./obligations.mts";
import { workResultProposalByReceipt } from "./work-result-proposal.mts";
import {
  workDischargeAdmissionContract,
  workDischargeContract,
  type WorkDischarge,
  type WorkDischargeAdmission,
} from "./schema.mts";

export interface WorkDischargeAdmissionOptions {
  readonly at: string;
  readonly rootName?: string;
  readonly receiverAuthorization?: { readonly evaluation: AuthorityEvaluationDecision };
}

export function admitWorkDischarge(
  binding: FilesystemBinding,
  input: unknown,
  options: WorkDischargeAdmissionOptions,
): WorkDischargeAdmission {
  const discharge = workDischargeContract.assert(input, "work discharge") as WorkDischarge;
  if (options.receiverAuthorization === undefined || !options.receiverAuthorization.evaluation.allowed) throw new TypeError("work discharge: process-bound receiver authority is required");
  const proposal = workResultProposalByReceipt(binding, discharge.resultReceipt);
  if (proposal.intent !== discharge.intent || proposal.allocation !== discharge.allocation || proposal.scope !== discharge.scope || !proposal.allocation
    || proposal.method.length === 0 || proposal.receiverCondition.length === 0
    || proposal.producer.id !== discharge.producer.id || proposal.producer.revision !== discharge.producer.revision
    || deriveCborNi({ value: proposal.result }).uri !== deriveCborNi({ value: discharge.result }).uri) {
    throw new TypeError("work discharge: result receipt does not attest this exact scope, producer, and result");
  }
  const subject = proposal.subject;
  // Acceptance recognizes the immutable proposal receipt. A later revocation
  // governs a new execution, not whether this already-witnessed result was
  // lawfully produced under its then-fresh authorization.
  const cause = discharge.resultReceipt;
  const settlementToken = deriveCborNi({ value: discharge }).uri;
  if (discharge.receiver.id === discharge.producer.id) throw new TypeError("work discharge: receiver must be independent of producer");
  const receiverEvidence = discharge.receiver.evidence;
  const evaluation = options.receiverAuthorization.evaluation;
  const evidence = Object.freeze([
    `discharge:${discharge.id}`,
    `intent:${discharge.intent}`,
    `producer:${discharge.producer.id}`,
    `producer-revision:${discharge.producer.revision}`,
    `result-receipt:${discharge.resultReceipt}`,
    `receiver:${discharge.receiver.id}`,
    `receiver-authority:${options.receiverAuthorization.evaluation.kind}`,
    `receiver-authority-revision:${options.receiverAuthorization.evaluation.snapshotRevision ?? "none"}`,
    `skill-outcome:${discharge.result.kind}`,
    ...receiverEvidence, ...options.receiverAuthorization.evaluation.evidenceRefs,
  ]);
  const observations = discharge.result.kind === "skill-result"
    ? obsticulationDischargeObservations([Object.freeze({
      cell: discharge.scope,
      text: discharge.text,
      evidence: Object.freeze([...discharge.evidence, ...receiverEvidence]),
    })], {
      source: `work-discharge:${discharge.id}`,
      settlementToken,
      sessionId: `work-discharge-${discharge.id}`,
      evidence,
    })
    : Object.freeze([claimSessionObservation({
      sessionId: `work-discharge-${discharge.id}`,
      transport: "claim-session",
      claim: Object.freeze({ cell: discharge.scope, charge: "unknown" }),
      session: Object.freeze({ claims: Object.freeze([]), closed: false }),
      judgement: Object.freeze({}),
      at: Object.freeze({ source: `work-discharge:${discharge.id}`, item: 1 }),
      boundary: Object.freeze({
        protocol: "metroplat",
        surface: "work-ledger",
        operation: "work-discharge-admit",
        role: "skill-error",
        source: `work-discharge:${discharge.id}`,
        text: discharge.text,
        evidence: Object.freeze([...discharge.evidence, ...evidence, `skill-error:${discharge.result.error}`]),
      }),
      caller: Object.freeze({ protocol: "metroplat", session: `work-discharge-${discharge.id}`, surface: "work-ledger" }),
    })]);
  const receiverAuthorizationObservation = claimSessionObservation({
    sessionId: `work-discharge-${discharge.id}`, transport: "claim-session",
    claim: Object.freeze({ cell: discharge.scope, charge: "unknown" }), session: Object.freeze({ claims: Object.freeze([]), closed: false }), judgement: Object.freeze({}),
    at: Object.freeze({ source: `work-discharge:${discharge.id}`, item: 99 }),
    boundary: Object.freeze({ protocol: "metroplat", surface: "work-ledger", operation: "work-discharge-admit", role: "receiver-authorization", proposalReceipt: discharge.resultReceipt, receiver: discharge.receiver.id, evaluation }),
    caller: Object.freeze({ protocol: "metroplat", session: `work-discharge-${discharge.id}`, surface: "work-ledger" }),
  });
  const rows = [...claimSessionStatementRows(receiverAuthorizationObservation), ...observations.flatMap((observation) => claimSessionStatementRows(observation))];
  const admission = openJournal(binding.dataRoot).appendRows(claimSessionFeed.name, rows, {
    at: options.at,
    ...(options.rootName === undefined ? {} : { rootName: options.rootName }),
    subject,
    caller: Object.freeze({ transport: "work-discharge", session: discharge.id }),
    eventCauses: Object.freeze([cause]),
  });
  const result = Object.freeze({
    kind: "metroplat.work.discharge-admission" as const,
    discharge: discharge.id,
    intent: discharge.intent,
    subject,
    scope: discharge.scope,
    appended: admission.appended,
    status: admission.appended === 0 ? "already-admitted" as const : "admitted" as const,
  });
  return workDischargeAdmissionContract.assert(result, "work discharge admission") as WorkDischargeAdmission;
}
