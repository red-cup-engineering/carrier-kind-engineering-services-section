/**
 * Object-capability, authority, and principal-decision algebra.
 * Office-bound grants are organizing's authority; workspace-locus claims are the
 * code-development engine's agent coordination; both consume this algebra.
 */

import { assertNonemptyString as nonempty } from "@red-cup-engineering/json-services-section/assert-nonempty-string";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { canonicalJson } from "@red-cup-engineering/json-services-section";

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

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
  principalAssertionSchema,
  principalStandingSchema,
} from "./schemas.mjs";
import { knowledgeJoinReading, readingAs, readingOfSides } from "@red-cup-engineering/computer-data-services-section/four";

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
} from "./captp/schema.mjs";


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
  principalAssertionSchema,
  principalStandingSchema,
  ucanRevocationSchema,
  ucanTokenSchema,
  ucanVerificationSchema,
  wasiCutJudgmentSchema,
  wasiInvocationSchema,
  wasiPreopenSchema,
} from "./schemas.mjs";

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
export const principalAssertionContract = schemaFrom(principalAssertionSchema);
export const principalStandingContract = schemaFrom(principalStandingSchema);

function unique(values, label) {
  const out = [];
  for (const value of values) {
    const normalized = nonempty(value, label);
    if (!out.includes(normalized)) out.push(normalized);
  }
  if (out.length === 0) throw new TypeError(`${label}: expected at least one value`);
  return Object.freeze(out);
}

function resourceWithin(parent, child) {
  return child === parent || child.startsWith(`${parent}/`);
}

function subset(parent, child) {
  return child.every((value) => parent.includes(value));
}

function grantWithin(parent, child) {
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
function freshCapabilityViewId(holder, grants) {
  CAPABILITY_VIEW_SEQ += 1;
  return `urn:cap:${encodeURIComponent(holder)}:${encodeURIComponent(grants)}:${CAPABILITY_VIEW_SEQ}`;
}

function objectCapabilityGrant(capability, action) {
  const cap = objectCapabilityContract.assert(capability, "object capability grant");
  const selected = action ?? cap.actions[0];
  return capabilityGrant(cap.resource, selected);
}

/** Canonical capability question shared by appraisal and capability evidence. */
export function capabilityGrant(resource, action) {
  const admittedResource = nonempty(resource, "capability grant resource");
  return action === undefined ? admittedResource : `${admittedResource}#${nonempty(action, "capability grant action")}`;
}

/** The sub-resource of `resource` a locus names (`infograph/duty/<scope>`): within `resource`, so
 *  a grant on `resource` covers it, while a grant attenuated to it covers nothing else. */
export function locusResource(resource, locus, value) {
  return `${nonempty(resource, "locus resource")}/${nonempty(locus, "locus")}/${encodeURIComponent(nonempty(value, "locus value"))}`;
}

/** Admit an object capability. */
export function objectCapability(input

) {
  return objectCapabilityContract.assert(Object.freeze({
    kind: "capability.object",
    holder: nonempty(input.holder, "capability holder"),
    resource: nonempty(input.resource, "capability resource"),
    actions: unique(input.actions, "capability action"),
    caveats: Object.freeze([...(input.caveats ?? [])].map((caveat) => nonempty(caveat, "capability caveat"))),
  }), "object capability");
}

/** Project a held grant as a locus-shaped capability view. */
export function capabilityView(input

) {
  return capabilityViewContract.assert(Object.freeze({
    kind: "capability.view",
    id: input.id ?? freshCapabilityViewId(input.holder, input.grants),
    grants: nonempty(input.grants, "capability view grant"),
    holder: nonempty(input.holder, "capability view holder"),
    ...(input.parent === undefined ? {} : { parent: nonempty(input.parent, "capability view parent") }),
  }), "capability view");
}

/** Project the object-capability contract into a locus-shaped capability view. */
export function capabilityViewFromObjectCapability(capability, action, id) {
  const cap = objectCapabilityContract.assert(capability, "object capability view");
  return capabilityView({
    holder: cap.holder,
    grants: objectCapabilityGrant(cap, action),
    id: id ?? `urn:cap-view:${encodeURIComponent(cap.holder)}:${encodeURIComponent(objectCapabilityGrant(cap, action))}`,
  });
}

/** Attenuate an OCap view by narrowing its grant/locus and preserving provenance. */
export function attenuateCapabilityView(parent, grants, id) {
  const p = capabilityViewContract.assert(parent, "parent capability view");
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
export function delegateCapabilityView(parent, holder, id) {
  const p = capabilityViewContract.assert(parent, "delegated capability view");
  return capabilityView({
    holder,
    grants: p.grants,
    ...(id === undefined ? {} : { id }),
    parent: p.id,
  });
}

/** Check the OCap view soundness gate against the holder's actual affordances. */
export function canInvokeCapabilityView(affordances, view) {
  const admitted = capabilityViewContract.assert(view, "capability view invocation");
  return affordances.includes(admitted.grants);
}

/** Older OCap grant surface, realized as the shared capability-view contract. */
export function grantCapabilityView(holder, grants, id) {
  return capabilityView({
    holder,
    grants,
    ...(id === undefined ? {} : { id }),
  });
}

/** Older OCap attenuation surface, realized as a capability-view parent/child reading. */

/** Older OCap delegation surface, realized as name-passing over the same grant. */

function capabilityInteraction(input

) {
  const capability = capabilityViewContract.assert(input.capability, "capability interaction view");
  return capabilityInteractionContract.assert(Object.freeze({
    kind: "capability.interaction",
    action: input.action,
    capability,
    ...(input.actor === undefined ? {} : { actor: nonempty(input.actor, "capability interaction actor") }),
    ...(input.target === undefined ? {} : { target: nonempty(input.target, "capability interaction target") }),
    ok: input.ok,
    reasons: Object.freeze([...(input.reasons ?? [])].map((reason) => nonempty(reason, "capability interaction reason"))),
  }), "capability interaction");
}

/** Read a capability view as an invocation interaction against an actor's affordances. */
export function invokeCapabilityView(view, affordances) {
  const admitted = capabilityViewContract.assert(view, "capability invoke view");
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
export function revokeCapabilityView(view, by) {
  const admitted = capabilityViewContract.assert(view, "capability revoke view");
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
export function interactCapabilityView(view, affordances) {
  return invokeCapabilityView(view, affordances);
}

export function exchange(transfers) {
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

const readingOf = (positive, negative) => readingOfSides("extremal", positive, negative);

export function capabilityRef(holder, grants) {
  return `capability:${encodeURIComponent(nonempty(holder, "capability ref holder"))}:${encodeURIComponent(nonempty(grants, "capability ref grant"))}`;
}

export function capabilityValue(input

) {
  return capabilityView(input);
}

const admittedAssertions = new WeakSet();
/** Admit a capability assertion against its contract, once: where it is made or first read. The
 *  contract is flat strings, so a frozen assertion that passed it cannot stop passing, and standing
 *  queries over admitted (frozen) assertions do not re-validate them. */
export function admitCapabilityAssertion(assertion, context) {
  if (admittedAssertions.has(assertion)) return assertion;
  capabilityAssertionContract.assert(assertion, context);
  if (Object.isFrozen(assertion)) admittedAssertions.add(assertion);
  return assertion;
}

function capabilityAssertion(input) {
  return admitCapabilityAssertion(Object.freeze({
    kind: "capability.assertion",
    assertion: input.assertion,
    issuer: nonempty(input.issuer, "capability assertion issuer"),
    holder: nonempty(input.holder, "capability assertion holder"),
    grants: nonempty(input.grants, "capability assertion grant"),
    at: nonempty(input.at, "capability assertion time"),
    ...(input.parent === undefined ? {} : { parent: nonempty(input.parent, "capability assertion parent") }),
    ...(input.accountable === undefined ? {} : { accountable: nonempty(input.accountable, "capability assertion accountable") }),
    ...(input.allocation === undefined ? {} : { allocation: nonempty(input.allocation, "capability assertion allocation") }),
  }), "capability assertion");
}

export function grantAssertion(issuer, holder, grants, at) {
  return capabilityAssertion({ assertion: "grant", issuer, holder, grants, at });
}

export function revokeAssertion(issuer, holder, grants, at) {
  return capabilityAssertion({ assertion: "revoke", issuer, holder, grants, at });
}

export function attenuateAssertion(parent, holder, grants, at) {
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

export function delegateAssertion(parent, holder, at, allocation) {
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

export function presentCapability(issuer, holder, grants, at) {
  return capabilityAssertion({ assertion: "present", issuer, holder, grants, at });
}

/** The holder a grant to everyone names: a liberty every subject holds, revocable per holder. */
export const PUBLIC_HOLDER = "*";

export function can(assertions, holder, grants) {
  const admittedHolder = nonempty(holder, "capability standing holder");
  const admittedGrant = nonempty(grants, "capability standing grant");
  const relevant = assertions
    .map((assertion) => admitCapabilityAssertion(assertion, "capability standing assertion"))
    .filter((assertion) => (assertion.holder === admittedHolder || assertion.holder === PUBLIC_HOLDER) && grantWithin(assertion.grants, admittedGrant));
  const granting = relevant.filter((assertion) => assertion.assertion === "grant" || assertion.assertion === "attenuate" || assertion.assertion === "delegate" || assertion.assertion === "present");
  const granted = granting.length > 0;
  // A revocation to this holder withdraws even a public liberty; a public revocation withdraws it from all.
  const revoked = relevant.some((assertion) => assertion.assertion === "revoke");
  return capabilityStandingContract.assert(Object.freeze({
    kind: "capability.standing",
    holder: admittedHolder,
    grants: admittedGrant,
    value: readingOf(granted, revoked),
    granted,
    revoked,
    present: relevant.length > 0,
    issuers: Object.freeze([...new Set(granting.map((assertion) => assertion.issuer).filter((issuer) => typeof issuer === "string" && issuer !== ""))].sort()),
  }), "capability standing");
}

export const present = can;

function principalAssertion(input) {
  return principalAssertionContract.assert(Object.freeze({
    kind: "capability.principal-assertion",
    assertion: input.assertion,
    issuer: nonempty(input.issuer, "principal assertion issuer"),
    principal: nonempty(input.principal, "principal assertion principal"),
    ...(input.as === undefined ? {} : { as: nonempty(input.as, "principal recognized-as") }),
    ...(input.proof === undefined ? {} : { proof: nonempty(input.proof, "principal assertion proof") }),
    at: nonempty(input.at, "principal assertion time"),
  }), "principal assertion");
}

export function recognize(issuer, principal, as, at) {
  return principalAssertion({ assertion: "recognize", issuer, principal, as, at });
}

export function dispute(issuer, principal, as, at) {
  return principalAssertion({ assertion: "dispute", issuer, principal, as, at });
}

export function attest(issuer, principal, proof, at) {
  return principalAssertion({ assertion: "attest", issuer, principal, proof, at });
}

export function authenticated(issuer, principal, proof, at) {
  return principalAssertion({ assertion: "authenticate", issuer, principal, proof, at });
}

export function whois(assertions, principal) {
  const admitted = nonempty(principal, "principal standing principal");
  const rows = assertions
    .map((assertion) => principalAssertionContract.assert(assertion, "principal standing assertion"))
    .filter((assertion) => assertion.principal === admitted);
  const recognizedAs = Object.freeze(rows.filter((row) => row.assertion === "recognize" && row.as !== undefined).map((row) => row.as));
  const disputed = Object.freeze(rows.filter((row) => row.assertion === "dispute" && row.as !== undefined).map((row) => row.as));
  const attestations = Object.freeze(rows.filter((row) => row.assertion === "attest" || row.assertion === "authenticate").map((row) => row.proof ?? row.issuer));
  const positive = recognizedAs.length > 0 || attestations.length > 0;
  const negative = disputed.length > 0;
  return principalStandingContract.assert(Object.freeze({
    kind: "capability.principal-standing",
    principal: admitted,
    value: readingOf(positive, negative),
    recognizedAs,
    disputed,
    attestations,
    settled: positive && !negative,
  }), "principal standing");
}

export function decayStanding(assertions, principal, now, halfLifeMs = 86_400_000) {
  const base = whois(assertions, principal);
  const newest = assertions
    .filter((assertion) => assertion.principal === principal && assertion.assertion === "authenticate")
    .map((assertion) => Date.parse(assertion.at))
    .filter((time) => Number.isFinite(time))
    .sort((left, right) => right - left)[0];
  const current = Date.parse(now);
  const freshness = newest === undefined || !Number.isFinite(current)
    ? "withheld"
    : current - newest <= halfLifeMs
      ? "fresh"
      : "stale";
  return principalStandingContract.assert(Object.freeze({
    ...base,
    freshness,
  }), "decayed principal standing");
}

function authorityAssertion(input) {
  return authorityAssertionContract.assert(Object.freeze({
    kind: "capability.authority-assertion",
    assertion: input.assertion,
    issuer: nonempty(input.issuer, "authority assertion issuer"),
    principal: nonempty(input.principal, "authority assertion principal"),
    action: nonempty(input.action, "authority assertion action"),
    at: nonempty(input.at, "authority assertion time"),
  }), "authority assertion");
}

export function recognizesAuthority(issuer, principal, action, at) {
  return authorityAssertion({ assertion: "recognizes", issuer, principal, action, at });
}

export function withholdsAuthority(issuer, principal, action, at) {
  return authorityAssertion({ assertion: "withholds", issuer, principal, action, at });
}

export function may(authorityAssertions, capabilityAssertions, principal, action) {
  const admittedPrincipal = nonempty(principal, "authority decision principal");
  const admittedAction = nonempty(action, "authority decision action");
  const rows = authorityAssertions
    .map((assertion) => authorityAssertionContract.assert(assertion, "authority decision assertion"))
    .filter((assertion) => assertion.principal === admittedPrincipal && assertion.action === admittedAction);
  const recognized = rows.some((row) => row.assertion === "recognizes");
  const withheld = rows.some((row) => row.assertion === "withholds");
  const capability = can(capabilityAssertions, admittedPrincipal, admittedAction);
  const positive = recognized || capability.granted;
  const negative = withheld || capability.revoked;
  return authorityDecisionContract.assert(Object.freeze({
    kind: "capability.authority-decision",
    principal: admittedPrincipal,
    action: admittedAction,
    value: readingOf(positive, negative),
    recognized,
    withheld,
    capability,
  }), "authority decision");
}

/** Test whether one capability view attenuates another by grant and provenance. */
export function attenuatesCapability(parent, child) {
  const p = capabilityViewContract.assert(parent, "parent capability view");
  const c = capabilityViewContract.assert(child, "child capability view");
  return grantWithin(p.grants, c.grants) && (c.parent === undefined || c.parent === p.id);
}

/** True when the child capability preserves or narrows the parent authority. */
export function attenuates(parent, child) {
  const p = objectCapabilityContract.assert(parent, "parent capability");
  const c = objectCapabilityContract.assert(child, "child capability");
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
export function capabilityInteractionToEavt(interaction, at) {
  const admitted = capabilityInteractionContract.assert(interaction, "capability interaction EAVT");
  const entity = admitted.target ?? admitted.actor ?? admitted.capability.id;
  const value = Object.freeze({
    ok: admitted.ok,
    reasons: admitted.reasons,
    capability: admitted.capability.id,
    grants: admitted.capability.grants,
    ...(admitted.actor === undefined ? {} : { actor: admitted.actor }),
  });
  return [entity, `capability.${admitted.action}`, requireJsonValue(value, "capability interaction EAVT value"), nonempty(at, "capability interaction EAVT time")];
}

/** Build a UCAN-shaped delegation from a parent capability to an audience. */
export function capabilityDelegation(input

) {
  const parent = objectCapabilityContract.assert(input.parent, "delegation parent");
  const child = objectCapability({
    holder: input.audience,
    resource: input.resource ?? parent.resource,
    actions: input.actions ?? parent.actions,
    caveats: Object.freeze([...parent.caveats, ...(input.caveats ?? [])]),
  });
  return capabilityDelegationContract.assert(Object.freeze({
    kind: "capability.delegation",
    issuer: nonempty(input.issuer, "delegation issuer"),
    audience: nonempty(input.audience, "delegation audience"),
    parent,
    child,
    proof: input.proof ?? `structural:${canonicalJson({ issuer: input.issuer, audience: input.audience, child })}`,
  }), "capability delegation");
}

/** Verify the finite attenuation law of a UCAN-shaped delegation. */
export function verifyCapabilityDelegation(value) {
  const delegation = capabilityDelegationContract.assert(value, "capability delegation");
  const reasons = [];
  if (delegation.issuer !== delegation.parent.holder) reasons.push("issuer must hold the parent capability");
  if (delegation.audience !== delegation.child.holder) reasons.push("audience must hold the child capability");
  if (!resourceWithin(delegation.parent.resource, delegation.child.resource)) reasons.push("child resource must be equal to or below parent resource");
  if (!subset(delegation.parent.actions, delegation.child.actions)) reasons.push("child actions must be a subset of parent actions");
  if (!subset(delegation.child.caveats, delegation.parent.caveats)) reasons.push("child caveats must include parent caveats");
  const ok = reasons.length === 0;
  return capabilityDelegationJudgmentContract.assert(Object.freeze({
    kind: ok ? "capability.delegation:witness" : "capability.delegation-obstruction",
    delegation,
    ok,
    reasons: Object.freeze(reasons),
  }), "capability delegation judgment");
}

/** Check whether a capability authorizes an invocation. */
export function canInvoke(capability, invocation) {
  const cap = objectCapabilityContract.assert(capability, "invocation capability");
  const inv = capabilityInvocationContract.assert(invocation, "capability invocation");
  const reasons = [];
  if (inv.actor !== cap.holder) reasons.push("actor must hold the capability");
  if (!resourceWithin(cap.resource, inv.resource)) reasons.push("invocation resource must be equal to or below capability resource");
  if (!cap.actions.includes(inv.action)) reasons.push("invocation action must be allowed by capability");
  const ok = reasons.length === 0;
  return capabilityInvocationJudgmentContract.assert(Object.freeze({
    kind: ok ? "capability.invocation:witness" : "capability.invocation-obstruction",
    capability: cap,
    invocation: inv,
    ok,
    reasons: Object.freeze(reasons),
  }), "capability invocation judgment");
}

