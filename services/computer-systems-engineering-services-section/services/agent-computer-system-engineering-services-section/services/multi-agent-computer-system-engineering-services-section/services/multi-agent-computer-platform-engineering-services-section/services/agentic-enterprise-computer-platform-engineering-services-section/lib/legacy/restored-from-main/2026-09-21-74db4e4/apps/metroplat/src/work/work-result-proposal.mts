import { deriveCborNi } from "@red-cup-engineering/computer-data-engine/identity";
import { contentSlug } from "../lib/addressing/slug.mts";
import { requireJsonValue, type JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { FilesystemBinding } from "../integrations/filesystem/services/read-write.mts";
import { journal, openJournal } from "../journal/index.mts";
import { claimSessionFeed, claimSessionObservation, claimSessionStatementRows } from "../claims/session.mts";
import { agencyWorkAllocationMarkerOfRow, workLedgerObligationOfRow, type AgencyWorkAllocationMarker } from "./observations.mts";
import type { ProviderDelegationAuthorization } from "./agency-work-allocation.mts";

export type SkillOutcome =
  | Readonly<{ readonly kind: "skill-result"; readonly value: unknown }>
  | Readonly<{ readonly kind: "skill-error"; readonly error: string }>;

export interface WorkResultProposal {
  readonly execution: string;
  readonly allocation: string;
  readonly intent: string;
  /** Exact structured-intent feed that carried the obligation and allocation. */
  readonly subject: string;
  readonly scope: string;
  readonly producer: { readonly id: string; readonly revision: string };
  /** Fresh governance receipt obtained at the external execution boundary. */
  readonly authorization: ProviderDelegationAuthorization;
  readonly work: string;
  readonly skill: string;
  readonly closureKind: string;
  readonly requiresCapabilities: readonly string[];
  readonly method: string;
  readonly receiverCondition: string;
  readonly result: SkillOutcome;
  readonly providerEvidence: readonly string[];
}

export interface WorkResultProposalAdmission extends WorkResultProposal {
  /** Allocation-time authorization, retained apart from fresh execution authorization. */
  readonly allocationAuthorization: ProviderDelegationAuthorization;
  readonly receipt: string;
  readonly resultIdentity: string;
}

function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : undefined;
}

function strings(value: unknown): readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.length > 0)
    ? Object.freeze([...new Set(value as string[])].sort()) : Object.freeze([]);
}

function proposalJson(proposal: WorkResultProposal, allocationAuthorization: ProviderDelegationAuthorization, result: JsonValue, resultIdentity: string) {
  return Object.freeze({
    execution: proposal.execution,
    allocation: proposal.allocation,
    intent: proposal.intent,
    subject: proposal.subject,
    scope: proposal.scope,
    producer: Object.freeze({ id: proposal.producer.id, revision: proposal.producer.revision }),
    authorization: Object.freeze({ authority: proposal.authorization.authority, revision: proposal.authorization.revision, evidence: Object.freeze([...proposal.authorization.evidence]) }),
    allocationAuthorization: Object.freeze({ authority: allocationAuthorization.authority, revision: allocationAuthorization.revision, evidence: Object.freeze([...allocationAuthorization.evidence]) }),
    work: proposal.work,
    skill: proposal.skill,
    closureKind: proposal.closureKind,
    requiresCapabilities: Object.freeze([...proposal.requiresCapabilities]),
    method: proposal.method,
    receiverCondition: proposal.receiverCondition,
    result,
    providerEvidence: Object.freeze([...proposal.providerEvidence]),
    resultIdentity,
  });
}

function proposalFromBoundary(boundary: unknown): WorkResultProposalAdmission | undefined {
  const source = record(boundary);
  if (source?.role !== "work-result-proposal") return undefined;
  const p = record(source.proposal);
  const producer = record(p?.producer);
  const result = record(p?.result);
  if (!p || !producer || !result || typeof p.execution !== "string" || typeof p.allocation !== "string" || typeof p.intent !== "string" || typeof p.subject !== "string" || typeof p.scope !== "string"
    || typeof producer.id !== "string" || typeof producer.revision !== "string" || typeof p.work !== "string" || typeof p.skill !== "string"
    || typeof p.closureKind !== "string" || typeof p.method !== "string" || typeof p.receiverCondition !== "string"
    || typeof p.resultIdentity !== "string") return undefined;
  const authorization = record(p.authorization);
  const allocationAuthorization = record(p.allocationAuthorization);
  if (authorization === undefined || typeof authorization.authority !== "string" || typeof authorization.revision !== "string" || strings(authorization.evidence).length === 0) return undefined;
  if (allocationAuthorization === undefined || typeof allocationAuthorization.authority !== "string" || typeof allocationAuthorization.revision !== "string" || strings(allocationAuthorization.evidence).length === 0) return undefined;
  const outcome = result.kind === "skill-result" ? Object.freeze({ kind: "skill-result" as const, value: result.value })
    : result.kind === "skill-error" && typeof result.error === "string" ? Object.freeze({ kind: "skill-error" as const, error: result.error }) : undefined;
  if (outcome === undefined || deriveCborNi({ value: outcome }).uri !== p.resultIdentity) return undefined;
  return Object.freeze({ execution: p.execution, allocation: p.allocation, intent: p.intent, subject: p.subject, scope: p.scope, producer: Object.freeze({ id: producer.id, revision: producer.revision }), authorization: Object.freeze({ authority: authorization.authority, revision: authorization.revision, evidence: strings(authorization.evidence) }), allocationAuthorization: Object.freeze({ authority: allocationAuthorization.authority, revision: allocationAuthorization.revision, evidence: strings(allocationAuthorization.evidence) }), work: p.work, skill: p.skill, closureKind: p.closureKind, requiresCapabilities: strings(p.requiresCapabilities), method: p.method, receiverCondition: p.receiverCondition, result: outcome, providerEvidence: strings(p.providerEvidence), receipt: "", resultIdentity: p.resultIdentity });
}

function obligationWitness(binding: FilesystemBinding, at: string, subject: string, intent: string, scope: string): string {
  const witnesses: string[] = [];
  journal.scanCausalSubject(binding.dataRoot, subject, at, undefined, (_state, row, event) => {
    const obligation = workLedgerObligationOfRow(row);
    if (obligation?.item === scope && obligation.evidence.includes(`intent:${intent}`)) witnesses.push(event.id);
    return undefined;
  });
  const witness = witnesses.sort()[0];
  if (witness === undefined) throw new TypeError(`work result proposal: scope ${scope} is not an obligation of structured intent ${intent}`);
  return witness;
}

export function currentAgencyWorkAllocation(binding: FilesystemBinding, at: string, subject: string, allocation: string, scope: string): AgencyWorkAllocationMarker {
  let found: AgencyWorkAllocationMarker | undefined;
  journal.scanCausalSubject(binding.dataRoot, subject, at, undefined, (_state, row) => {
    const marker = agencyWorkAllocationMarkerOfRow(row);
    if (marker?.scope === scope) found = marker;
    return undefined;
  });
  if (found === undefined || found.allocation !== allocation) throw new TypeError("work result proposal: allocation is changed, revoked, or not current for this scope");
  return found;
}

/** Persist a provider's outcome before any receiver recognizes it. The returned
 * receipt names this proposal row itself, never an inference or obligation event. */
export function admitWorkResultProposal(binding: FilesystemBinding, proposal: WorkResultProposal, options: { readonly at: string; readonly rootName?: string }): WorkResultProposalAdmission {
  if (!proposal.execution || !proposal.allocation || !proposal.intent || !proposal.subject || !proposal.scope || !proposal.producer.id || !proposal.producer.revision || !proposal.authorization.authority || !proposal.authorization.revision || proposal.authorization.evidence.length === 0 || !proposal.work || !proposal.skill || !proposal.method || !proposal.receiverCondition || proposal.providerEvidence.length === 0) throw new TypeError("work result proposal: complete execution, authority receipt, subject, method, receiver condition, and provider evidence are required");
  const cause = obligationWitness(binding, options.at, proposal.subject, proposal.intent, proposal.scope);
  const allocation = currentAgencyWorkAllocation(binding, options.at, proposal.subject, proposal.allocation, proposal.scope);
  if (allocation.work !== proposal.work || allocation.skill !== proposal.skill || allocation.closureKind !== proposal.closureKind || allocation.method !== proposal.method || allocation.receiverCondition !== proposal.receiverCondition) throw new TypeError("work result proposal: canonical allocation facts do not match proposal");
  if (allocation.delegation === undefined || allocation.delegation.provider !== proposal.producer.id) throw new TypeError("work result proposal: producer is not the current delegated provider");
  if (allocation.delegation.authorization.authority !== proposal.authorization.authority) throw new TypeError("work result proposal: execution authority does not bind this allocation");
  const admittedResult = requireJsonValue(proposal.result, "work result proposal result");
  const resultIdentity = deriveCborNi({ value: admittedResult }).uri;
  const observation = claimSessionObservation({
    sessionId: `work-result-proposal-${proposal.execution}`,
    transport: "claim-session", claim: Object.freeze({ cell: proposal.scope, charge: "unknown" }), session: Object.freeze({ claims: Object.freeze([]), closed: false }), judgement: Object.freeze({}), at: Object.freeze({ source: `work-result-proposal:${proposal.execution}`, item: 1 }),
    boundary: Object.freeze({ protocol: "metroplat", surface: "work-ledger", operation: "agency-work-execute", role: "work-result-proposal", proposal: proposalJson(proposal, allocation.delegation.authorization, admittedResult, resultIdentity) }),
    caller: Object.freeze({ protocol: "metroplat", session: `work-result-proposal-${proposal.execution}`, surface: "work-ledger" }),
  });
  const appended = openJournal(binding.dataRoot).appendRows(claimSessionFeed.name, claimSessionStatementRows(observation), { at: options.at, ...(options.rootName === undefined ? {} : { rootName: options.rootName }), subject: proposal.subject, caller: Object.freeze({ transport: "work-result-proposal", session: proposal.execution }), eventCauses: Object.freeze([cause]) });
  const receipt = appended.statements?.[0]?.id;
  if (receipt === undefined) throw new TypeError("work result proposal: journal did not return a receipt");
  // The journal witness id is the only receipt authority.
  return Object.freeze({ ...proposal, allocationAuthorization: allocation.delegation.authorization, requiresCapabilities: Object.freeze([...proposal.requiresCapabilities]), providerEvidence: Object.freeze([...proposal.providerEvidence]), receipt, resultIdentity });
}

/** Read one exact persisted proposal. Arbitrary causal events cannot parse as one. */
export function workResultProposalByReceipt(binding: FilesystemBinding, receipt: string): WorkResultProposalAdmission {
  let found: WorkResultProposalAdmission | undefined;
  journal.scanCausalTerritory<undefined>(binding.dataRoot, undefined, (_state, row, event) => {
    if (event.id !== receipt) return undefined;
    const value = record(row[2]);
    const parsed = proposalFromBoundary(value?.boundary);
    if (parsed !== undefined) found = Object.freeze({ ...parsed, receipt: event.id });
    return undefined;
  });
  if (found === undefined) throw new TypeError(`work discharge: result receipt ${receipt} is not a persisted result proposal`);
  return found;
}
