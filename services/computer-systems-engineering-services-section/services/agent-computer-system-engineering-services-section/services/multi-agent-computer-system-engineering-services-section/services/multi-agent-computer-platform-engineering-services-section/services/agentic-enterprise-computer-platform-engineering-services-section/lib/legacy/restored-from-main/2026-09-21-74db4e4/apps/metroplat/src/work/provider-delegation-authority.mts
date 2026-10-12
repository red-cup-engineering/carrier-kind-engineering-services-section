/** Journal-backed source boundary for a bounded provider delegation.
 *
 * The source records are evidence; authorization is decided only by the
 * governance evaluator over their projected trusted state. */
import { evaluateAuthority, trustedAuthorityStateCarrier, type AuthorityEvaluationDecision, type AuthorityGrant, type AuthorityMembership, type TrustedAuthorityState } from "@red-cup-engineering/organizing/corporate-authority";
import { deriveCborNi } from "@red-cup-engineering/computer-data-engine/identity";
import { readFileSync } from "node:fs";
import { requireJsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { FilesystemBinding } from "../integrations/filesystem/services/read-write.mts";
import { claimSessionFeed, claimSessionObservation, claimSessionStatementRows } from "../claims/session.mts";
import { journal, openJournal } from "../journal/index.mts";
import type { AuthorizeProviderDelegation, ProviderDelegationRequest } from "./agency-work-allocation.mts";

export interface AuthoritySource {
  readonly id: string;
  readonly role: "founder-appointment" | "ceo-provider-delegation";
  readonly locator: string;
  readonly content: string;
  readonly contentIdentity: string;
}
export interface AuthoritySourceState {
  readonly revision: string;
  readonly rootIssuerId: string;
  readonly rootOfficeId: string;
  readonly rootAuthorizedGroups: readonly string[];
  readonly memberships: readonly AuthorityMembership[];
  readonly office: AuthorityGrant;
  readonly delegation?: AuthorityGrant;
}
export interface ProviderDelegationAuthoritySource {
  readonly source: AuthoritySource;
  readonly state: AuthoritySourceState;
}

/**
 * The startup operator selects these receipts outside a request payload.  A
 * journal row is only evidence of what was observed; it becomes an authority
 * input only when this exact receipt is pinned in the process configuration.
 */
export interface ProviderDelegationAuthorityAnchor {
  readonly rootReceipt: string;
  readonly delegationReceipts: readonly string[];
}

/** Read the immutable-at-startup receipt selection controlled by the service
 * operator. This is intentionally a file path from process configuration, not
 * an allocation, RPC, MCP, or inference payload. */
export function providerDelegationAuthorityAnchorFromFile(path: string): ProviderDelegationAuthorityAnchor {
  let value: unknown;
  try { value = JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { throw new TypeError(`provider delegation authority: cannot read startup anchor ${path}: ${error instanceof Error ? error.message : String(error)}`); }
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("provider delegation authority: startup anchor must be an object");
  const record = value as Readonly<Record<string, unknown>>;
  const rootReceipt = record.rootReceipt;
  const delegationReceipts = record.delegationReceipts;
  if (typeof rootReceipt !== "string" || rootReceipt.length === 0 || !Array.isArray(delegationReceipts)
    || delegationReceipts.length === 0 || delegationReceipts.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    throw new TypeError("provider delegation authority: startup anchor requires rootReceipt and delegationReceipts");
  }
  return Object.freeze({ rootReceipt, delegationReceipts: Object.freeze([...delegationReceipts] as string[]) });
}

function sourceOf(value: unknown): ProviderDelegationAuthoritySource | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const valueRecord = value as Readonly<Record<string, unknown>>;
  const source = valueRecord.source;
  const state = valueRecord.state;
  if (source === null || typeof source !== "object" || Array.isArray(source) || state === null || typeof state !== "object" || Array.isArray(state)) return undefined;
  const s = source as Readonly<Record<string, unknown>>;
  const t = state as Readonly<Record<string, unknown>>;
  if ((s.role !== "founder-appointment" && s.role !== "ceo-provider-delegation") || typeof s.id !== "string" || typeof s.locator !== "string" || typeof s.content !== "string" || typeof s.contentIdentity !== "string"
    || typeof t.revision !== "string" || typeof t.rootIssuerId !== "string" || typeof t.rootOfficeId !== "string" || !Array.isArray(t.rootAuthorizedGroups) || !Array.isArray(t.memberships) || t.office === null || typeof t.office !== "object") return undefined;
  if (deriveCborNi({ value: s.content }).uri !== s.contentIdentity) return undefined;
  return value as ProviderDelegationAuthoritySource;
}

/** Admit an authenticated source record. This does not call a source trusted:
 * it records content identity and the source's exact grant material for the
 * independent governance evaluator. */
export function admitProviderDelegationAuthoritySource(binding: FilesystemBinding, input: ProviderDelegationAuthoritySource, at: string): string {
  const admitted = sourceOf(input);
  if (admitted === undefined) throw new TypeError("provider delegation authority: invalid or altered source");
  const source = requireJsonValue(admitted, "provider delegation authority source");
  const observation = claimSessionObservation({
    sessionId: `provider-delegation-authority-${admitted.source.id}`, transport: "claim-session",
    claim: Object.freeze({ cell: `authority-source:${admitted.source.id}`, charge: "unknown" }),
    session: Object.freeze({ claims: Object.freeze([]), closed: false }), judgement: Object.freeze({}),
    at: Object.freeze({ source: admitted.source.locator, item: 1 }),
    boundary: Object.freeze({ protocol: "metroplat", surface: "work-ledger", operation: "provider-delegation-authority-admit", role: "provider-delegation-authority-source", source }),
    caller: Object.freeze({ transport: "provider-delegation-authority", session: admitted.source.id }),
  });
  const append = openJournal(binding.dataRoot).appendRows(claimSessionFeed.name, claimSessionStatementRows(observation), { at, subject: "provider-delegation-authority", caller: Object.freeze({ transport: "provider-delegation-authority", session: admitted.source.id }) });
  const receipt = append.statements?.[0]?.id;
  if (receipt === undefined) throw new TypeError("provider delegation authority: journal did not return a source receipt");
  return receipt;
}

function sourceAtReceipt(binding: FilesystemBinding, receipt: string): ProviderDelegationAuthoritySource {
  let found: ProviderDelegationAuthoritySource | undefined;
  journal.scanCausalTerritory<undefined>(binding.dataRoot, undefined, (_state, row, event) => {
    if (event.id !== receipt) return undefined;
    const value = row[2] as Readonly<Record<string, unknown>>;
    const boundary = value?.boundary as Readonly<Record<string, unknown>> | undefined;
    const source = boundary?.role === "provider-delegation-authority-source" ? sourceOf(boundary.source) : undefined;
    if (source !== undefined) found = source;
    return undefined;
  });
  if (found === undefined) throw new TypeError(`provider delegation authority: pinned receipt ${receipt} is not an admitted authority source`);
  return found;
}

function pinnedState(binding: FilesystemBinding, anchor: ProviderDelegationAuthorityAnchor, at: string): TrustedAuthorityState {
  if (!anchor.rootReceipt || anchor.delegationReceipts.length === 0 || anchor.delegationReceipts.some((receipt) => !receipt)) {
    throw new TypeError("provider delegation authority: startup anchor needs one root receipt and bounded delegation receipts");
  }
  if (new Set(anchor.delegationReceipts).size !== anchor.delegationReceipts.length) {
    throw new TypeError("provider delegation authority: startup anchor repeats a delegation receipt");
  }
  const founder = sourceAtReceipt(binding, anchor.rootReceipt);
  if (founder.source.role !== "founder-appointment") throw new TypeError("provider delegation authority: pinned root is not a Founder appointment");
  const children = anchor.delegationReceipts.map((receipt) => sourceAtReceipt(binding, receipt));
  if (children.some((child) => child.source.role !== "ceo-provider-delegation" || child.state.delegation === undefined)) {
    throw new TypeError("provider delegation authority: pinned child is not a CEO provider delegation");
  }
  if (children.some((child) => child.state.rootIssuerId !== founder.state.rootIssuerId || child.state.rootOfficeId !== founder.state.rootOfficeId || child.state.revision !== founder.state.revision)) {
    throw new TypeError("provider delegation authority: pinned child does not belong to the pinned Founder snapshot");
  }
  const delegations = children.map((child) => child.state.delegation!);
  if (delegations.some((grant) => grant.parentId !== founder.state.office.id || grant.fromActorId !== founder.state.office.actorId)) {
    throw new TypeError("provider delegation authority: pinned provider delegation is not a child of the pinned CEO grant");
  }
  return trustedAuthorityStateCarrier.assert(Object.freeze({
    kind: "governance.trusted-authority-state" as const,
    revision: founder.state.revision,
    observedAt: at,
    rootIssuerId: founder.state.rootIssuerId,
    rootOfficeId: founder.state.rootOfficeId,
    rootAuthorizedGroups: founder.state.rootAuthorizedGroups,
    memberships: founder.state.memberships,
    offices: Object.freeze([founder.state.office]),
    delegations: Object.freeze(delegations),
  }), "provider-delegation-authority pinned state") as TrustedAuthorityState;
}

/** Produce the runtime adapter from the operator-pinned authority snapshot. */
export function journalProviderDelegationAuthorizer(binding: FilesystemBinding, anchor: ProviderDelegationAuthorityAnchor): AuthorizeProviderDelegation {
  return (request: ProviderDelegationRequest) => {
    const state = pinnedState(binding, anchor, request.at);
    const grant = state.delegations.find((candidate) => candidate.id === request.authority && candidate.actorId === request.provider && candidate.fromActorId === request.holder);
    if (grant === undefined) throw new TypeError("provider delegation authority: no matching CEO bounded grant");
    const decisions = request.operations.map((operation) => evaluateAuthority({ kind: "governance.authority-evaluation-request", actorId: request.provider, groupId: grant.groupId, resource: request.scope, action: operation, requiresAuthority: operation, serverNow: request.at, maxStateAgeMs: 300000, trustedState: state }));
    if (decisions.some((decision) => !decision.allowed)) throw new TypeError("provider delegation authority: current grant is refused");
    return Object.freeze({ authority: grant.id, revision: state.revision, evidence: Object.freeze([...new Set(decisions.flatMap((decision) => decision.evidenceRefs))].sort()) });
  };
}

/** Evaluate the independently authenticated process subject for accepting one
 * exact work result. The caller cannot supply or replace this identity. */
export function journalWorkDischargeReceiverAuthorizer(binding: FilesystemBinding, anchor: ProviderDelegationAuthorityAnchor) {
  return (request: { readonly receiver: string; readonly scope: string; readonly operation: string; readonly at: string }): Readonly<{ readonly evaluation: AuthorityEvaluationDecision }> => {
    const state = pinnedState(binding, anchor, request.at);
    const decisions = state.rootAuthorizedGroups.map((groupId) => evaluateAuthority({
      kind: "governance.authority-evaluation-request", actorId: request.receiver, groupId,
      resource: request.scope, action: request.operation, requiresAuthority: request.operation,
      serverNow: request.at, maxStateAgeMs: 300000, trustedState: state,
    }));
    const accepted = decisions.filter((decision) => decision.allowed);
    if (accepted.length === 0) throw new TypeError("work discharge: authenticated receiver is not authorized for this acceptance");
    return Object.freeze({ evaluation: accepted[0]! });
  };
}
