/**
 * Object-capability, authority, and principal-decision algebra.
 * Work, office, and governance readings are owned by `src/work`; capability
 * policy consumes them for office-gated grants and workspace-locus readings.
 */
import { requireJsonValue, type JsonValue } from "../codecs/json/core.mts";
import { canonicalBytes } from "../identity/index.mts";
import type { EAVT } from "../codecs/json/jsonl/eavt/index.mts";
import {
  chargeValue,
  chargeValueName,
  chargeValueOfSides,
  joinKnowledgeValue,
  type ChargeValueName,
} from "../values/index.mts";
import { schemaFrom } from "../schema/contract.mts";
import type { FromSchema } from "../schema/contract.mts";
import {
  governance,
  officesHeldAtDignitas,
  type Governance,
  type JuralClaimRow,
  type JuralRelation,
} from "../../work/model.mts";
import {
  attenuatedAuthorityCutSchema,
  authorityAssertionSchema,
  authorityCutFaceSchema,
  authorityCutRequestSchema,
  authorityDecisionSchema,
  capabilityAssertionSchema,
  capabilityViewSchema,
  capabilityDelegationSchema,
  capabilityDelegationJudgmentSchema,
  capabilityInteractionSchema,
  capabilityInvocationSchema,
  capabilityInvocationJudgmentSchema,
  capabilityStandingSchema,
  objectCapabilitySchema,
  oauthDelegatedAccessSchema,
  officeBoundGrantJudgmentSchema,
  officeEligibilityDecisionSchema,
  officeEligibilityRequestSchema,
  principalAssertionSchema,
  principalStandingSchema,
  workLocusClaimSchema,
  workLocusConflictSchema,
  workLocusGovernanceReadingSchema,
} from "./schemas/index.mts";

export {
  captpAuthorityGraphSchema,
  captpCausalCutSchema,
  captpCausalFrontierSchema,
  captpDeliverySchema,
  captpDescriptorSchema,
  captpHandoffTableSchema,
  captpPipelineJudgmentSchema,
  captpSessionTranscriptSchema,
  captpSturdyRefSchema,
  captpTransportProjectionSchema,
  captpTurnTraceSchema,
  captpVatTableSchema,
  captpStatementRowSchema,
} from "./captp/schema.mts";

export * from "./claims.mts";

export {
  a2aAgentCardSchema,
  a2aTaskSchema,
  attenuatedAuthorityCutSchema,
  authorityAssertionSchema,
  authorityDecisionSchema,
  capabilityAssertionSchema,
  capabilityViewSchema,
  capabilityDelegationSchema,
  capabilityDelegationJudgmentSchema,
  capabilityInteractionSchema,
  capabilityInvocationSchema,
  capabilityInvocationJudgmentSchema,
  capabilityStandingSchema,
  macaroonCaveatSchema,
  macaroonDischargeSchema,
  macaroonInvocationJudgmentSchema,
  macaroonTokenSchema,
  objectCapabilitySchema,
  oauthDelegatedAccessSchema,
  officeBoundGrantJudgmentSchema,
  officeEligibilityDecisionSchema,
  officeEligibilityRequestSchema,
  principalAssertionSchema,
  principalStandingSchema,
  ucanRevocationSchema,
  ucanTokenSchema,
  ucanVerificationSchema,
  wasiCutJudgmentSchema,
  wasiInvocationSchema,
  wasiPreopenSchema,
  workLocusClaimSchema,
  workLocusConflictSchema,
  workLocusGovernanceReadingSchema,
} from "./schemas/index.mts";

/** Schema contracts built here, at the point of use, from the schemas above — not a
 *  separately hand-maintained artifact (see AGENTS.md: schema is the one
 *  authored fact; whatever needs a schema contract uses it right where
 *  it's needed). */
export const attenuatedAuthorityCutContract = schemaFrom(attenuatedAuthorityCutSchema);
export const authorityAssertionContract = schemaFrom(authorityAssertionSchema);
export const authorityDecisionContract = schemaFrom(authorityDecisionSchema);
export const capabilityAssertionContract = schemaFrom(capabilityAssertionSchema);
export const capabilityViewContract = schemaFrom(capabilityViewSchema);
export const capabilityDelegationContract = schemaFrom(capabilityDelegationSchema);
export const capabilityDelegationJudgmentContract = schemaFrom(capabilityDelegationJudgmentSchema);
export const capabilityInteractionContract = schemaFrom(capabilityInteractionSchema);
export const capabilityInvocationContract = schemaFrom(capabilityInvocationSchema);
export const capabilityInvocationJudgmentContract = schemaFrom(capabilityInvocationJudgmentSchema);
export const capabilityStandingContract = schemaFrom(capabilityStandingSchema);
export const objectCapabilityContract = schemaFrom(objectCapabilitySchema);
export const oauthDelegatedAccessContract = schemaFrom(oauthDelegatedAccessSchema);
export const officeBoundGrantJudgmentContract = schemaFrom(officeBoundGrantJudgmentSchema);
export const officeEligibilityDecisionContract = schemaFrom(officeEligibilityDecisionSchema);
export const officeEligibilityRequestContract = schemaFrom(officeEligibilityRequestSchema);
export const principalAssertionContract = schemaFrom(principalAssertionSchema);
export const principalStandingContract = schemaFrom(principalStandingSchema);
export const workLocusClaimContract = schemaFrom(workLocusClaimSchema);
export const workLocusConflictContract = schemaFrom(workLocusConflictSchema);
export const workLocusGovernanceReadingContract = schemaFrom(workLocusGovernanceReadingSchema);

export type ObjectCapability = FromSchema<typeof objectCapabilitySchema>;

export type CapabilityView = FromSchema<typeof capabilityViewSchema>;

export type CapabilityDelegation = FromSchema<typeof capabilityDelegationSchema> & {
  readonly parent: ObjectCapability;
  readonly child: ObjectCapability;
};

export type CapabilityDelegationJudgment = FromSchema<typeof capabilityDelegationJudgmentSchema> & {
  readonly delegation: CapabilityDelegation;
};

export type CapabilityInvocation = FromSchema<typeof capabilityInvocationSchema> & {
  readonly input: JsonValue;
};

export type CapabilityInteraction = FromSchema<typeof capabilityInteractionSchema> & {
  readonly capability: CapabilityView;
};

export type CapabilityInvocationJudgment = FromSchema<typeof capabilityInvocationJudgmentSchema> & {
  readonly capability: ObjectCapability;
  readonly invocation: CapabilityInvocation;
};

export type OfficeEligibilityGap = "none" | "capability" | "authority" | "both";

export type OfficeEligibilityRequest = FromSchema<typeof officeEligibilityRequestSchema>;

export type OfficeEligibilityDecision = FromSchema<typeof officeEligibilityDecisionSchema>;

export type OfficeBoundGrantJudgment = FromSchema<typeof officeBoundGrantJudgmentSchema> & {
  readonly request: OfficeEligibilityRequest;
  readonly decision: OfficeEligibilityDecision;
  readonly capability?: CapabilityView;
};

export interface CapabilityTransfer {
  readonly capability: CapabilityView;
  readonly to: string;
}

export type WorkLocusClaim = FromSchema<typeof workLocusClaimSchema> & {
  readonly capability: CapabilityView;
};

export type WorkLocusConflict = FromSchema<typeof workLocusConflictSchema> & {
  readonly left: WorkLocusClaim;
  readonly right: WorkLocusClaim;
};

export type WorkLocusGovernanceReading = FromSchema<typeof workLocusGovernanceReadingSchema> & {
  readonly activeClaims: readonly WorkLocusClaim[];
  readonly conflicts: readonly WorkLocusConflict[];
  /** The real Hohfeldian/Hodge-backed governance discipline reading over the same
   *  claims, read as jural relations (`juralRelationsOfWorkLocusClaims` below). Work-locus
   *  claims are consensual resource occupancy, never a power hierarchy, so `discipline`
   *  reads `consensus` whenever claims exist and `ungoverned` when none do — no `power`-kind
   *  relation is ever produced here, by construction. */
  readonly governance: Governance;
};

export interface WorkLocusGovernanceOptions {
  readonly at?: string;
}

export type CapabilityCharge = ChargeValueName;

export interface CapabilityAllocation {
  readonly id: string;
  readonly accountable: string;
}

/** @metroplatSubject capability */
export type CapabilityAssertion = FromSchema<typeof capabilityAssertionSchema>;

export type CapabilityStanding = FromSchema<typeof capabilityStandingSchema> & {
  readonly value: CapabilityCharge;
};

export interface PrincipalInput {
  readonly principal: string;
  readonly as?: string;
}

export type PrincipalAssertion = FromSchema<typeof principalAssertionSchema>;

export type PrincipalStanding = FromSchema<typeof principalStandingSchema> & {
  readonly value: CapabilityCharge;
};

export type AuthorityAssertion = FromSchema<typeof authorityAssertionSchema>;

export type AuthorityDecision = FromSchema<typeof authorityDecisionSchema> & {
  readonly value: CapabilityCharge;
  readonly capability: CapabilityStanding;
};

export type OAuthDelegatedAccess = FromSchema<typeof oauthDelegatedAccessSchema>;

export interface CodexPluginAffordance {
  readonly kind: "authority.codex-plugin-affordance";
  readonly plugin: string;
  readonly manifest: string;
  readonly affordances: readonly string[];
  readonly enabled: boolean;
  readonly evidence?: readonly string[];
}

export type AuthorityCutFaceKind = "capability" | "openai-tool" | "mcp-catalog-transport" | "oauth-delegation" | "codex-plugin";
export type AuthorityCutStatus = "admitted" | "blocked" | "discharged";

export type AuthorityCutRequest = FromSchema<typeof authorityCutRequestSchema>;

export type AuthorityCutFace = FromSchema<typeof authorityCutFaceSchema> & {
  readonly kind: AuthorityCutFaceKind;
  readonly status: AuthorityCutStatus;
  readonly material: JsonValue;
};

export type AttenuatedAuthorityCut = FromSchema<typeof attenuatedAuthorityCutSchema> & {
  readonly request: AuthorityCutRequest;
  readonly faces: readonly AuthorityCutFace[];
};

function nonempty(value: string, label: string): string {
  if (value.trim().length === 0) throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

function unique(values: readonly string[], label: string): readonly string[] {
  const out: string[] = [];
  for (const value of values) {
    const normalized = nonempty(value, label);
    if (!out.includes(normalized)) out.push(normalized);
  }
  if (out.length === 0) throw new TypeError(`${label}: expected at least one value`);
  return Object.freeze(out);
}

function resourceWithin(parent: string, child: string): boolean {
  return child === parent || child.startsWith(`${parent}/`);
}

function subset(parent: readonly string[], child: readonly string[]): boolean {
  return child.every((value) => parent.includes(value));
}

function grantWithin(parent: string, child: string): boolean {
  if (parent === child || parent === "*") return true;
  if (parent.endsWith("*")) return child.startsWith(parent.slice(0, -1));
  const parentHash = parent.lastIndexOf("#");
  const childHash = child.lastIndexOf("#");
  if (parentHash > 0 && childHash > 0 && parent.slice(parentHash + 1) === child.slice(childHash + 1)) {
    return resourceWithin(parent.slice(0, parentHash), child.slice(0, childHash));
  }
  return resourceWithin(parent, child) || child.startsWith(`${parent}:`) || child.startsWith(`${parent}#`);
}

export const attenuatesGrant = grantWithin;

let CAPABILITY_VIEW_SEQ = 0;
function freshCapabilityViewId(holder: string, grants: string): string {
  CAPABILITY_VIEW_SEQ += 1;
  return `urn:cap:${encodeURIComponent(holder)}:${encodeURIComponent(grants)}:${CAPABILITY_VIEW_SEQ}`;
}

function objectCapabilityGrant(capability: ObjectCapability, action?: string): string {
  const cap = objectCapabilityContract.assert(capability, "object capability grant") as ObjectCapability;
  const selected = action ?? cap.actions[0];
  return capabilityGrant(cap.resource, selected);
}

/** Canonical capability question shared by appraisal and capability evidence. */
export function capabilityGrant(resource: string, action?: string): string {
  const admittedResource = nonempty(resource, "capability grant resource");
  return action === undefined ? admittedResource : `${admittedResource}#${nonempty(action, "capability grant action")}`;
}

/** Admit an object capability. */
export function objectCapability(input: {
  readonly holder: string;
  readonly resource: string;
  readonly actions: readonly string[];
  readonly caveats?: readonly string[];
}): ObjectCapability {
  return objectCapabilityContract.assert(Object.freeze({
    kind: "capability.object" as const,
    holder: nonempty(input.holder, "capability holder"),
    resource: nonempty(input.resource, "capability resource"),
    actions: unique(input.actions, "capability action"),
    caveats: Object.freeze([...(input.caveats ?? [])].map((caveat) => nonempty(caveat, "capability caveat"))),
  }), "object capability") as ObjectCapability;
}

/** Project a held grant as a locus-shaped capability view. */
export function capabilityView(input: {
  readonly holder: string;
  readonly grants: string;
  readonly id?: string;
  readonly parent?: string;
}): CapabilityView {
  return capabilityViewContract.assert(Object.freeze({
    kind: "capability.view" as const,
    id: input.id ?? freshCapabilityViewId(input.holder, input.grants),
    grants: nonempty(input.grants, "capability view grant"),
    holder: nonempty(input.holder, "capability view holder"),
    ...(input.parent === undefined ? {} : { parent: nonempty(input.parent, "capability view parent") }),
  }), "capability view") as CapabilityView;
}

/** Project the object-capability contract into a locus-shaped capability view. */
export function capabilityViewFromObjectCapability(capability: ObjectCapability, action?: string, id?: string): CapabilityView {
  const cap = objectCapabilityContract.assert(capability, "object capability view") as ObjectCapability;
  return capabilityView({
    holder: cap.holder,
    grants: objectCapabilityGrant(cap, action),
    id: id ?? `urn:cap-view:${encodeURIComponent(cap.holder)}:${encodeURIComponent(objectCapabilityGrant(cap, action))}`,
  });
}

/** Attenuate an OCap view by narrowing its grant/locus and preserving provenance. */
export function attenuateCapabilityView(parent: CapabilityView, grants: string, id?: string): CapabilityView {
  const p = capabilityViewContract.assert(parent, "parent capability view") as CapabilityView;
  const childGrant = nonempty(grants, "child capability view grant");
  if (!grantWithin(p.grants, childGrant)) throw new TypeError(`attenuateCapabilityView: ${childGrant} widens ${p.grants}`);
  return capabilityView({
    holder: p.holder,
    grants: childGrant,
    ...(id === undefined ? {} : { id }),
    parent: p.id,
  });
}

/** Name-passing delegation of an OCap view to another holder. */
export function delegateCapabilityView(parent: CapabilityView, holder: string, id?: string): CapabilityView {
  const p = capabilityViewContract.assert(parent, "delegated capability view") as CapabilityView;
  return capabilityView({
    holder,
    grants: p.grants,
    ...(id === undefined ? {} : { id }),
    parent: p.id,
  });
}

/** Check the OCap view soundness gate against the holder's actual affordances. */
export function canInvokeCapabilityView(affordances: readonly string[], view: CapabilityView): boolean {
  const admitted = capabilityViewContract.assert(view, "capability view invocation") as CapabilityView;
  return affordances.includes(admitted.grants);
}

/** Older OCap grant surface, realized as the shared capability-view contract. */
export function grantCapabilityView(holder: string, grants: string, id?: string): CapabilityView {
  return capabilityView({
    holder,
    grants,
    ...(id === undefined ? {} : { id }),
  });
}

/** Older OCap attenuation surface, realized as a capability-view parent/child reading. */

/** Older OCap delegation surface, realized as name-passing over the same grant. */

function capabilityInteraction(input: {
  readonly action: CapabilityInteraction["action"];
  readonly capability: CapabilityView;
  readonly actor?: string;
  readonly target?: string;
  readonly ok: boolean;
  readonly reasons?: readonly string[];
}): CapabilityInteraction {
  const capability = capabilityViewContract.assert(input.capability, "capability interaction view") as CapabilityView;
  return capabilityInteractionContract.assert(Object.freeze({
    kind: "capability.interaction" as const,
    action: input.action,
    capability,
    ...(input.actor === undefined ? {} : { actor: nonempty(input.actor, "capability interaction actor") }),
    ...(input.target === undefined ? {} : { target: nonempty(input.target, "capability interaction target") }),
    ok: input.ok,
    reasons: Object.freeze([...(input.reasons ?? [])].map((reason) => nonempty(reason, "capability interaction reason"))),
  }), "capability interaction") as CapabilityInteraction;
}

/** Read a capability view as an invocation interaction against an actor's affordances. */
export function invokeCapabilityView(view: CapabilityView, affordances: readonly string[]): CapabilityInteraction {
  const admitted = capabilityViewContract.assert(view, "capability invoke view") as CapabilityView;
  const ok = canInvokeCapabilityView(affordances, admitted);
  return capabilityInteraction({
    action: "invoke",
    capability: admitted,
    actor: admitted.holder,
    target: admitted.grants,
    ok,
    reasons: ok ? [] : [`${admitted.holder} does not currently expose ${admitted.grants}`],
  });
}

/** Alias retained for old OCapPub callers; returns an invocation interaction reading. */

/** Read revocation as a protocol event over the capability-view contract. */
export function revokeCapabilityView(view: CapabilityView, by?: string): CapabilityInteraction {
  const admitted = capabilityViewContract.assert(view, "capability revoke view") as CapabilityView;
  return capabilityInteraction({
    action: "revoke",
    capability: admitted,
    actor: by ?? admitted.holder,
    target: admitted.id,
    ok: true,
  });
}

/** @deprecated Use {@link invokeCapabilityView}; retained for 0.x source compatibility. */
export const invoke = invokeCapabilityView;

/** @deprecated Use {@link revokeCapabilityView}; retained for 0.x source compatibility. */
export const revoke = revokeCapabilityView;

/** Alias retained for old OCapPub callers; returns a revocation interaction reading. */

/** Build the old interact shape as an MetroPlat capability interaction witness/obstruction. */
export function interactCapabilityView(view: CapabilityView, affordances: readonly string[]): CapabilityInteraction {
  return invokeCapabilityView(view, affordances);
}


function eligibilityGap(missingCapabilities: readonly string[], missingAuthorities: readonly string[]): OfficeEligibilityGap {
  const capabilityOk = missingCapabilities.length === 0;
  const authorityOk = missingAuthorities.length === 0;
  if (capabilityOk && authorityOk) return "none";
  if (!capabilityOk && !authorityOk) return "both";
  return capabilityOk ? "authority" : "capability";
}

export function officeEligibility(input: Omit<OfficeEligibilityRequest, "kind"> | OfficeEligibilityRequest): OfficeEligibilityDecision {
  const request = officeEligibilityRequestContract.assert(Object.freeze({
    ...input,
    kind: "capability.office-eligibility-request" as const,
    capabilities: Object.freeze([...input.capabilities].map((value) => nonempty(value, "office capability"))),
    officeAuthorities: Object.freeze([...input.officeAuthorities].map((value) => nonempty(value, "office authority"))),
    requiresCapabilities: Object.freeze([...input.requiresCapabilities].map((value) => nonempty(value, "required capability"))),
    requiresAuthorities: Object.freeze([...input.requiresAuthorities].map((value) => nonempty(value, "required authority"))),
  }), "office eligibility request") as OfficeEligibilityRequest;
  const capabilities = new Set(request.capabilities);
  const authorities = new Set(request.officeAuthorities);
  const missingCapabilities = Object.freeze(request.requiresCapabilities.filter((required) => !capabilities.has(required)));
  const missingAuthorities = Object.freeze(request.requiresAuthorities.filter((required) => !authorities.has(required)));
  const eligible = missingCapabilities.length === 0 && missingAuthorities.length === 0;
  return officeEligibilityDecisionContract.assert(Object.freeze({
    kind: "capability.office-eligibility-decision" as const,
    eligible,
    status: eligible ? "held" as const : "denied" as const,
    gap: eligibilityGap(missingCapabilities, missingAuthorities),
    missingCapabilities,
    missingAuthorities,
  }), "office eligibility decision") as OfficeEligibilityDecision;
}

export const officeEligibilityTerm = Object.freeze({
  kind: "capability.office-eligibility.term",
  domain: "capability.office-eligibility-request",
  codomain: "capability.office-eligibility-decision",
  projection: "missing required capabilities and authorities determine eligible/status/gap",
} as const);

export function grantByOffice(
  request: Omit<OfficeEligibilityRequest, "kind"> | OfficeEligibilityRequest,
  holder: string,
  grants: string,
  id?: string,
): OfficeBoundGrantJudgment {
  const decision = officeEligibility(request);
  const admittedHolder = nonempty(holder, "office grant holder");
  const admittedGrants = nonempty(grants, "office grant");
  const capability = decision.eligible ? grantCapabilityView(admittedHolder, admittedGrants, id) : undefined;
  return officeBoundGrantJudgmentContract.assert(Object.freeze({
    kind: decision.eligible ? "capability.office-bound-grant:witness" as const : "capability.office-bound-grant-obstruction" as const,
    request: officeEligibilityRequestContract.assert({ ...request, kind: "capability.office-eligibility-request" }, "office grant request") as OfficeEligibilityRequest,
    decision,
    holder: admittedHolder,
    grants: admittedGrants,
    ...(capability === undefined ? {} : { capability }),
    ok: decision.eligible,
  }), "office-bound capability grant") as OfficeBoundGrantJudgment;
}

export function admitOfficeEligibilityRequest(input: JsonValue, verb = "officeEligibility"): OfficeEligibilityRequest {
  return officeEligibilityRequestContract.assert(input, `${verb}: office eligibility request`) as OfficeEligibilityRequest;
}

/** `officeEligibility`, with `officeAuthorities` read off REAL dignitas-settled offices
 *  (`officesHeldAtDignitas`, above) rather than supplied by
 *  the caller. `officeEligibility` alone lets any caller assert whatever authorities they
 *  like; this is the actual binding — an agent's officeAuthorities are exactly the offices
 *  its admitted claim-session rows settle to dignitas (recognition ∧ induction, the double
 *  settlement `invest` already performs), never a caller's say-so. */
export function officeEligibilityOfIncumbent(
  rows: readonly JuralClaimRow[],
  agent: string,
  request: Pick<OfficeEligibilityRequest, "capabilities" | "requiresCapabilities" | "requiresAuthorities">,
): OfficeEligibilityDecision {
  return officeEligibility({ ...request, officeAuthorities: officesHeldAtDignitas(rows, agent) });
}

/** `grantByOffice`, gated by the SAME real dignitas-held offices as
 *  {@link officeEligibilityOfIncumbent} — the capability grant an agent may exercise by
 *  virtue of an office it actually holds, not one it merely names. */
export function grantByOfficeOfIncumbent(
  rows: readonly JuralClaimRow[],
  agent: string,
  request: Pick<OfficeEligibilityRequest, "capabilities" | "requiresCapabilities" | "requiresAuthorities">,
  grants: string,
  id?: string,
): OfficeBoundGrantJudgment {
  return grantByOffice({ ...request, officeAuthorities: officesHeldAtDignitas(rows, agent) }, agent, grants, id);
}

export function exchange(transfers: readonly CapabilityTransfer[]): readonly { readonly capability: CapabilityView; readonly activity: CapabilityInteraction }[] {
  return Object.freeze(transfers.map((transfer) => {
    const capability = delegateCapabilityView(transfer.capability, nonempty(transfer.to, "capability transfer recipient"));
    return Object.freeze({
      capability,
      activity: capabilityInteraction({
        action: "delegate",
        capability,
        actor: transfer.capability.holder,
        target: transfer.to,
        ok: true,
      }),
    });
  }));
}

function normalizedWorkPath(path: string): string {
  const admitted = nonempty(path, "work-locus path");
  return admitted === "." ? admitted : admitted.replace(/\/+$/u, "");
}

function pathOverlaps(left: string, right: string): boolean {
  return left === right || left === "." || right === "." || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function compareWorkLocusEvents(
  left: { readonly claim: WorkLocusClaim; readonly index: number },
  right: { readonly claim: WorkLocusClaim; readonly index: number },
): number {
  const leftTime = Date.parse(left.claim.at);
  const rightTime = Date.parse(right.claim.at);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return leftTime - rightTime;
  const text = left.claim.at.localeCompare(right.claim.at);
  return text === 0 ? left.index - right.index : text;
}

function workLocusExpired(claim: WorkLocusClaim, at: string | undefined): boolean {
  if (at === undefined || claim.expiresAt === undefined) return false;
  const expiry = Date.parse(claim.expiresAt);
  const observed = Date.parse(at);
  if (Number.isFinite(expiry) && Number.isFinite(observed)) return expiry <= observed;
  return claim.expiresAt <= at;
}

export function activeWorkLocusClaims(
  claims: readonly WorkLocusClaim[],
  options: WorkLocusGovernanceOptions = {},
): readonly WorkLocusClaim[] {
  const active = new Map<string, WorkLocusClaim>();
  const admitted = claims
    .map((claim, index) => ({
      claim: workLocusClaimContract.assert(claim, "active work-locus claim") as WorkLocusClaim,
      index,
    }))
    .sort(compareWorkLocusEvents);
  for (const { claim } of admitted) {
    if (claim.action === "release") {
      active.delete(claim.claimId);
      continue;
    }
    if (workLocusExpired(claim, options.at)) {
      active.delete(claim.claimId);
      continue;
    }
    active.set(claim.claimId, claim);
  }
  return Object.freeze([...active.values()]);
}

export function workLocusCapability(claim: Pick<WorkLocusClaim, "claimId" | "session" | "harness" | "paths">): CapabilityView {
  const paths = unique(claim.paths.map(normalizedWorkPath), "work-locus path");
  return capabilityView({
    id: `urn:work-locus:${encodeURIComponent(nonempty(claim.claimId, "work-locus claim id"))}`,
    holder: `${nonempty(claim.harness, "work-locus harness")}:${nonempty(claim.session, "work-locus session")}`,
    grants: `workspace:${paths.join("|")}`,
  });
}

export function workLocusClaim(input: {
  readonly action?: "claim" | "release";
  readonly claimId: string;
  readonly session: string;
  readonly harness: string;
  readonly paths: readonly string[];
  readonly reason?: string;
  readonly at: string;
  readonly expiresAt?: string;
}): WorkLocusClaim {
  const base = {
    kind: "capability.work-locus.claim" as const,
    action: input.action ?? "claim" as const,
    claimId: nonempty(input.claimId, "work-locus claim id"),
    session: nonempty(input.session, "work-locus session"),
    harness: nonempty(input.harness, "work-locus harness"),
    paths: unique(input.paths.map(normalizedWorkPath), "work-locus path"),
    ...(input.reason === undefined ? {} : { reason: nonempty(input.reason, "work-locus reason") }),
    at: nonempty(input.at, "work-locus claim time"),
    ...(input.expiresAt === undefined ? {} : { expiresAt: nonempty(input.expiresAt, "work-locus expiry") }),
  };
  return workLocusClaimContract.assert(Object.freeze({
    ...base,
    capability: workLocusCapability(base),
  }), "work-locus claim") as WorkLocusClaim;
}

export function workLocusConflicts(
  claims: readonly WorkLocusClaim[],
  options: WorkLocusGovernanceOptions = {},
): readonly WorkLocusConflict[] {
  const active = activeWorkLocusClaims(claims, options);
  const conflicts: WorkLocusConflict[] = [];
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const left = active[i]!;
      const right = active[j]!;
      if (left.session === right.session && left.harness === right.harness) continue;
      for (const leftPath of left.paths) {
        for (const rightPath of right.paths) {
          if (!pathOverlaps(leftPath, rightPath)) continue;
          conflicts.push(workLocusConflictContract.assert(Object.freeze({
            kind: "capability.work-locus.conflict" as const,
            path: leftPath.length <= rightPath.length ? leftPath : rightPath,
            left,
            right,
            severity: leftPath === rightPath ? "shared" as const : "overlap" as const,
          }), "work-locus conflict") as WorkLocusConflict);
        }
      }
    }
  }
  return Object.freeze(conflicts);
}

/** Read every claim/release (not just the active subset) as one `claim`-kind jural
 *  relation per (session, path): active = the claiming session, passive = the harness
 *  mediating the resource, scope = the path, standing = `held` for a claim, `denied`
 *  for a release. Never a `power`/`duty` relation — work-locus claiming is
 *  consensual resource occupancy among peer sessions, not an authority hierarchy. */
function juralRelationsOfWorkLocusClaims(claims: readonly WorkLocusClaim[]): readonly JuralRelation[] {
  const relations: JuralRelation[] = [];
  for (const entry of claims) {
    for (const path of entry.paths) {
      relations.push(Object.freeze({
        kind: "claim" as const,
        active: entry.session,
        passive: entry.harness,
        scope: path,
        standing: (entry.action === "claim" ? "held" : "denied") as ChargeValueName,
      }));
    }
  }
  return Object.freeze(relations);
}

export function workLocusGovernanceReading(
  claims: readonly WorkLocusClaim[],
  options: WorkLocusGovernanceOptions = {},
): WorkLocusGovernanceReading {
  const activeClaims = activeWorkLocusClaims(claims, options);
  const conflicts = workLocusConflicts(activeClaims, options);
  return workLocusGovernanceReadingContract.assert(Object.freeze({
    kind: "capability.work-locus.governance-reading" as const,
    activeClaims,
    conflicts,
    summary: Object.freeze({
      monotone: true,
      coordination: conflicts.length === 0 ? "coordination-free" as const : "consensus-required" as const,
      contested: conflicts.length,
      assignments: activeClaims.length,
    }),
    claim: conflicts.length === 0
      ? "Active work-locus capabilities are disjoint for this reading."
      : "Overlapping work-locus capabilities are preserved as coordination evidence.",
    governance: governance(juralRelationsOfWorkLocusClaims(claims)),
  }), "work-locus governance reading") as WorkLocusGovernanceReading;
}

function chargeOf(positive: boolean, negative: boolean): CapabilityCharge {
  return chargeValueName(chargeValueOfSides(positive ? "present" : "absent", negative ? "present" : "absent"));
}

export function capabilityRef(holder: string, grants: string): string {
  return `capability:${encodeURIComponent(nonempty(holder, "capability ref holder"))}:${encodeURIComponent(nonempty(grants, "capability ref grant"))}`;
}

export function capabilityValue(input: {
  readonly holder: string;
  readonly grants: string;
  readonly id?: string;
  readonly parent?: string;
}): CapabilityView {
  return capabilityView(input);
}

function capabilityAssertion(input: Omit<CapabilityAssertion, "kind">): CapabilityAssertion {
  return capabilityAssertionContract.assert(Object.freeze({
    kind: "capability.assertion" as const,
    assertion: input.assertion,
    issuer: nonempty(input.issuer, "capability assertion issuer"),
    holder: nonempty(input.holder, "capability assertion holder"),
    grants: nonempty(input.grants, "capability assertion grant"),
    at: nonempty(input.at, "capability assertion time"),
    ...(input.parent === undefined ? {} : { parent: nonempty(input.parent, "capability assertion parent") }),
    ...(input.accountable === undefined ? {} : { accountable: nonempty(input.accountable, "capability assertion accountable") }),
    ...(input.allocation === undefined ? {} : { allocation: nonempty(input.allocation, "capability assertion allocation") }),
  }), "capability assertion") as CapabilityAssertion;
}

export function grantAssertion(issuer: string, holder: string, grants: string, at: string): CapabilityAssertion {
  return capabilityAssertion({ assertion: "grant", issuer, holder, grants, at });
}

export function revokeAssertion(issuer: string, holder: string, grants: string, at: string): CapabilityAssertion {
  return capabilityAssertion({ assertion: "revoke", issuer, holder, grants, at });
}

export function attenuateAssertion(parent: CapabilityAssertion | CapabilityView, holder: string, grants: string, at: string): CapabilityAssertion {
  const parentGrant = parent.grants;
  const parentIssuer = parent.kind === "capability.assertion" ? parent.issuer : parent.holder;
  if (!grantWithin(parentGrant, grants)) throw new TypeError(`attenuateAssertion: ${grants} widens ${parentGrant}`);
  return capabilityAssertion({
    assertion: "attenuate",
    issuer: parentIssuer,
    holder,
    grants,
    at,
    parent: "id" in parent ? parent.id : capabilityRef(parent.holder, parent.grants),
  });
}

export function delegateAssertion(parent: CapabilityAssertion | CapabilityView, holder: string, at: string, allocation?: CapabilityAllocation): CapabilityAssertion {
  const issuer = parent.holder;
  const grants = parent.grants;
  return capabilityAssertion({
    assertion: "delegate",
    issuer,
    holder,
    grants,
    at,
    parent: "id" in parent ? parent.id : capabilityRef(parent.holder, parent.grants),
    ...(allocation === undefined ? {} : { accountable: allocation.accountable, allocation: allocation.id }),
  });
}

export function presentCapability(issuer: string, holder: string, grants: string, at: string): CapabilityAssertion {
  return capabilityAssertion({ assertion: "present", issuer, holder, grants, at });
}

export function can(assertions: readonly CapabilityAssertion[], holder: string, grants: string): CapabilityStanding {
  const admittedHolder = nonempty(holder, "capability standing holder");
  const admittedGrant = nonempty(grants, "capability standing grant");
  const relevant = assertions
    .map((assertion) => capabilityAssertionContract.assert(assertion, "capability standing assertion") as CapabilityAssertion)
    .filter((assertion) => assertion.holder === admittedHolder && grantWithin(assertion.grants, admittedGrant));
  const granted = relevant.some((assertion) => assertion.assertion === "grant" || assertion.assertion === "attenuate" || assertion.assertion === "delegate" || assertion.assertion === "present");
  const revoked = relevant.some((assertion) => assertion.assertion === "revoke");
  return capabilityStandingContract.assert(Object.freeze({
    kind: "capability.standing" as const,
    holder: admittedHolder,
    grants: admittedGrant,
    value: chargeOf(granted, revoked),
    granted,
    revoked,
    present: relevant.length > 0,
  }), "capability standing") as CapabilityStanding;
}

export const present = can;

function principalAssertion(input: Omit<PrincipalAssertion, "kind">): PrincipalAssertion {
  return principalAssertionContract.assert(Object.freeze({
    kind: "capability.principal-assertion" as const,
    assertion: input.assertion,
    issuer: nonempty(input.issuer, "principal assertion issuer"),
    principal: nonempty(input.principal, "principal assertion principal"),
    ...(input.as === undefined ? {} : { as: nonempty(input.as, "principal recognized-as") }),
    ...(input.proof === undefined ? {} : { proof: nonempty(input.proof, "principal assertion proof") }),
    at: nonempty(input.at, "principal assertion time"),
  }), "principal assertion") as PrincipalAssertion;
}

export function recognize(issuer: string, principal: string, as: string, at: string): PrincipalAssertion {
  return principalAssertion({ assertion: "recognize", issuer, principal, as, at });
}

export function dispute(issuer: string, principal: string, as: string, at: string): PrincipalAssertion {
  return principalAssertion({ assertion: "dispute", issuer, principal, as, at });
}

export function attest(issuer: string, principal: string, proof: string, at: string): PrincipalAssertion {
  return principalAssertion({ assertion: "attest", issuer, principal, proof, at });
}

export function authenticated(issuer: string, principal: string, proof: string, at: string): PrincipalAssertion {
  return principalAssertion({ assertion: "authenticate", issuer, principal, proof, at });
}

export function whois(assertions: readonly PrincipalAssertion[], principal: string): PrincipalStanding {
  const admitted = nonempty(principal, "principal standing principal");
  const rows = assertions
    .map((assertion) => principalAssertionContract.assert(assertion, "principal standing assertion") as PrincipalAssertion)
    .filter((assertion) => assertion.principal === admitted);
  const recognizedAs = Object.freeze(rows.filter((row) => row.assertion === "recognize" && row.as !== undefined).map((row) => row.as!));
  const disputed = Object.freeze(rows.filter((row) => row.assertion === "dispute" && row.as !== undefined).map((row) => row.as!));
  const attestations = Object.freeze(rows.filter((row) => row.assertion === "attest" || row.assertion === "authenticate").map((row) => row.proof ?? row.issuer));
  const positive = recognizedAs.length > 0 || attestations.length > 0;
  const negative = disputed.length > 0;
  return principalStandingContract.assert(Object.freeze({
    kind: "capability.principal-standing" as const,
    principal: admitted,
    value: chargeOf(positive, negative),
    recognizedAs,
    disputed,
    attestations,
    settled: positive && !negative,
  }), "principal standing") as PrincipalStanding;
}

export function decayStanding(assertions: readonly PrincipalAssertion[], principal: string, now: string, halfLifeMs = 86_400_000): PrincipalStanding {
  const base = whois(assertions, principal);
  const newest = assertions
    .filter((assertion) => assertion.principal === principal && assertion.assertion === "authenticate")
    .map((assertion) => Date.parse(assertion.at))
    .filter((time) => Number.isFinite(time))
    .sort((left, right) => right - left)[0];
  const current = Date.parse(now);
  const freshness = newest === undefined || !Number.isFinite(current)
    ? "withheld" as const
    : current - newest <= halfLifeMs
      ? "fresh" as const
      : "stale" as const;
  return principalStandingContract.assert(Object.freeze({
    ...base,
    freshness,
  }), "decayed principal standing") as PrincipalStanding;
}

function authorityAssertion(input: Omit<AuthorityAssertion, "kind">): AuthorityAssertion {
  return authorityAssertionContract.assert(Object.freeze({
    kind: "capability.authority-assertion" as const,
    assertion: input.assertion,
    issuer: nonempty(input.issuer, "authority assertion issuer"),
    principal: nonempty(input.principal, "authority assertion principal"),
    action: nonempty(input.action, "authority assertion action"),
    at: nonempty(input.at, "authority assertion time"),
  }), "authority assertion") as AuthorityAssertion;
}

export function recognizesAuthority(issuer: string, principal: string, action: string, at: string): AuthorityAssertion {
  return authorityAssertion({ assertion: "recognizes", issuer, principal, action, at });
}

export function withholdsAuthority(issuer: string, principal: string, action: string, at: string): AuthorityAssertion {
  return authorityAssertion({ assertion: "withholds", issuer, principal, action, at });
}

export function may(authorityAssertions: readonly AuthorityAssertion[], capabilityAssertions: readonly CapabilityAssertion[], principal: string, action: string): AuthorityDecision {
  const admittedPrincipal = nonempty(principal, "authority decision principal");
  const admittedAction = nonempty(action, "authority decision action");
  const rows = authorityAssertions
    .map((assertion) => authorityAssertionContract.assert(assertion, "authority decision assertion") as AuthorityAssertion)
    .filter((assertion) => assertion.principal === admittedPrincipal && assertion.action === admittedAction);
  const recognized = rows.some((row) => row.assertion === "recognizes");
  const withheld = rows.some((row) => row.assertion === "withholds");
  const capability = can(capabilityAssertions, admittedPrincipal, admittedAction);
  const positive = recognized || capability.granted;
  const negative = withheld || capability.revoked;
  return authorityDecisionContract.assert(Object.freeze({
    kind: "capability.authority-decision" as const,
    principal: admittedPrincipal,
    action: admittedAction,
    value: chargeOf(positive, negative),
    recognized,
    withheld,
    capability,
  }), "authority decision") as AuthorityDecision;
}

/** Test whether one capability view attenuates another by grant and provenance. */
export function attenuatesCapability(parent: CapabilityView, child: CapabilityView): boolean {
  const p = capabilityViewContract.assert(parent, "parent capability view") as CapabilityView;
  const c = capabilityViewContract.assert(child, "child capability view") as CapabilityView;
  return grantWithin(p.grants, c.grants) && (c.parent === undefined || c.parent === p.id);
}

/** True when the child capability preserves or narrows the parent authority. */
export function attenuates(parent: ObjectCapability, child: ObjectCapability): boolean {
  const p = objectCapabilityContract.assert(parent, "parent capability") as ObjectCapability;
  const c = objectCapabilityContract.assert(child, "child capability") as ObjectCapability;
  return resourceWithin(p.resource, c.resource)
    && subset(p.actions, c.actions)
    && subset(c.caveats, p.caveats);
}

/**
 * Bridge any object-capability interaction (grant/delegate/invoke/revoke,
 * produced by `invokeCapabilityView`, `revokeCapabilityView`,
 * `interactCapabilityView`, or a protocol's own `canInvoke`-derived judgment)
 * into a real `EAVT` tuple. Every capability protocol in this module
 * (CapTP, UCAN, Macaroons, WASI, WebAuthn, A2A) ultimately produces or checks
 * a `CapabilityInteraction`-shaped outcome, so witnessing at this one seam
 * covers all of them without touching each protocol's own logic.
 */
export function capabilityInteractionToEavt(interaction: CapabilityInteraction, at: string): EAVT {
  const admitted = capabilityInteractionContract.assert(interaction, "capability interaction EAVT") as CapabilityInteraction;
  const entity = admitted.target ?? admitted.actor ?? admitted.capability.id;
  const value: JsonValue = Object.freeze({
    ok: admitted.ok,
    reasons: admitted.reasons,
    capability: admitted.capability.id,
    grants: admitted.capability.grants,
    ...(admitted.actor === undefined ? {} : { actor: admitted.actor }),
  });
  return [entity, `capability.${admitted.action}`, requireJsonValue(value, "capability interaction EAVT value"), nonempty(at, "capability interaction EAVT time")];
}

/** Build a UCAN-shaped delegation from a parent capability to an audience. */
export function capabilityDelegation(input: {
  readonly issuer: string;
  readonly audience: string;
  readonly parent: ObjectCapability;
  readonly resource?: string;
  readonly actions?: readonly string[];
  readonly caveats?: readonly string[];
  readonly proof?: string;
}): CapabilityDelegation {
  const parent = objectCapabilityContract.assert(input.parent, "delegation parent") as ObjectCapability;
  const child = objectCapability({
    holder: input.audience,
    resource: input.resource ?? parent.resource,
    actions: input.actions ?? parent.actions,
    caveats: Object.freeze([...parent.caveats, ...(input.caveats ?? [])]),
  });
  return capabilityDelegationContract.assert(Object.freeze({
    kind: "capability.delegation" as const,
    issuer: nonempty(input.issuer, "delegation issuer"),
    audience: nonempty(input.audience, "delegation audience"),
    parent,
    child,
    proof: input.proof ?? `structural:${canonicalBytes({ issuer: input.issuer, audience: input.audience, child } as unknown as JsonValue)}`,
  }), "capability delegation") as CapabilityDelegation;
}

/** Verify the finite attenuation law of a UCAN-shaped delegation. */
export function verifyCapabilityDelegation(value: CapabilityDelegation): CapabilityDelegationJudgment {
  const delegation = capabilityDelegationContract.assert(value, "capability delegation") as CapabilityDelegation;
  const reasons: string[] = [];
  if (delegation.issuer !== delegation.parent.holder) reasons.push("issuer must hold the parent capability");
  if (delegation.audience !== delegation.child.holder) reasons.push("audience must hold the child capability");
  if (!resourceWithin(delegation.parent.resource, delegation.child.resource)) reasons.push("child resource must be equal to or below parent resource");
  if (!subset(delegation.parent.actions, delegation.child.actions)) reasons.push("child actions must be a subset of parent actions");
  if (!subset(delegation.child.caveats, delegation.parent.caveats)) reasons.push("child caveats must include parent caveats");
  const ok = reasons.length === 0;
  return capabilityDelegationJudgmentContract.assert(Object.freeze({
    kind: ok ? "capability.delegation:witness" as const : "capability.delegation-obstruction" as const,
    delegation,
    ok,
    reasons: Object.freeze(reasons),
  }), "capability delegation judgment") as CapabilityDelegationJudgment;
}

/** Check whether a capability authorizes an invocation. */
export function canInvoke(capability: ObjectCapability, invocation: CapabilityInvocation): CapabilityInvocationJudgment {
  const cap = objectCapabilityContract.assert(capability, "invocation capability") as ObjectCapability;
  const inv = capabilityInvocationContract.assert(invocation, "capability invocation") as CapabilityInvocation;
  const reasons: string[] = [];
  if (inv.actor !== cap.holder) reasons.push("actor must hold the capability");
  if (!resourceWithin(cap.resource, inv.resource)) reasons.push("invocation resource must be equal to or below capability resource");
  if (!cap.actions.includes(inv.action)) reasons.push("invocation action must be allowed by capability");
  const ok = reasons.length === 0;
  return capabilityInvocationJudgmentContract.assert(Object.freeze({
    kind: ok ? "capability.invocation:witness" as const : "capability.invocation-obstruction" as const,
    capability: cap,
    invocation: inv,
    ok,
    reasons: Object.freeze(reasons),
  }), "capability invocation judgment") as CapabilityInvocationJudgment;
}
