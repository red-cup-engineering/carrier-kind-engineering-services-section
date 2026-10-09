import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const MAX_RECORDS = 256;
const MAX_STATE_AGE_MS = 300_000;
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const identifierSchema = { type: "string", minLength: 1, maxLength: 512 };
const instantSchema = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$" };
const exactScopeSchema = { type: "array", minItems: 1, maxItems: MAX_RECORDS, items: identifierSchema };

/** @type {object} */
export const authorityMembershipSchema = {
  type: "object", required: ["id", "actorId", "groupId", "standing", "effectiveFrom", "evidenceRef"], additionalProperties: false,
  properties: { id: identifierSchema, actorId: identifierSchema, groupId: identifierSchema, standing: { enum: ["verified", "unknown", "contested", "revoked"] }, effectiveFrom: instantSchema, effectiveUntil: instantSchema, evidenceRef: identifierSchema },
};
/** @type {object} */
export const authorityGrantSchema = {
  type: "object", required: ["id", "actorId", "groupId", "issuerId", "authorities", "resources", "actions", "standing", "effectiveFrom", "evidenceRef"], additionalProperties: false,
  properties: { id: identifierSchema, actorId: identifierSchema, groupId: identifierSchema, issuerId: identifierSchema, authorities: exactScopeSchema, resources: exactScopeSchema, actions: exactScopeSchema, standing: { enum: ["verified", "unknown", "contested", "revoked"] }, effectiveFrom: instantSchema, effectiveUntil: instantSchema, evidenceRef: identifierSchema, parentId: identifierSchema, fromActorId: identifierSchema },
};
/** @type {object} */
export const trustedAuthorityStateSchema = {
  $id: "governance/trusted-authority-state",
  type: "object", required: ["kind", "revision", "observedAt", "rootIssuerId", "rootOfficeId", "rootAuthorizedGroups", "memberships", "offices", "delegations"], additionalProperties: false,
  properties: { kind: { const: "governance.trusted-authority-state" }, revision: identifierSchema, observedAt: instantSchema, rootIssuerId: identifierSchema, rootOfficeId: identifierSchema, rootAuthorizedGroups: exactScopeSchema, memberships: { type: "array", maxItems: MAX_RECORDS, items: authorityMembershipSchema }, offices: { type: "array", maxItems: MAX_RECORDS, items: authorityGrantSchema }, delegations: { type: "array", maxItems: MAX_RECORDS, items: authorityGrantSchema } },
};
/** @type {object} */
export const authorityEvaluationRequestSchema = {
  $id: "governance/authority-evaluation-request", type: "object",
  required: ["kind", "actorId", "groupId", "resource", "action", "requiresAuthority", "serverNow", "maxStateAgeMs", "trustedState"], additionalProperties: false,
  properties: { kind: { const: "governance.authority-evaluation-request" }, actorId: identifierSchema, groupId: identifierSchema, resource: identifierSchema, action: identifierSchema, requiresAuthority: identifierSchema, serverNow: instantSchema, maxStateAgeMs: { type: "integer", minimum: 1, maximum: MAX_STATE_AGE_MS }, trustedState: trustedAuthorityStateSchema },
};
/** @type {object} */
export const authorityEvaluationDecisionSchema = {
  $id: "governance/authority-evaluation-decision", type: "object", required: ["kind", "allowed", "reason", "snapshotRevision", "evidenceRefs"], additionalProperties: false,
  properties: { kind: { const: "governance.authority-evaluation-decision" }, allowed: { type: "boolean" }, reason: identifierSchema, snapshotRevision: { type: ["string", "null"] }, evidenceRefs: { type: "array", items: identifierSchema } },
};

/** Structural admission only. Snapshot provenance is admitted by the effect boundary;
 * freshness, distinct identities, and grant ancestry are checked by evaluateAuthority. */
export const trustedAuthorityStateCarrier = schemaFrom(trustedAuthorityStateSchema);
export const authorityEvaluationRequestCarrier = schemaFrom(authorityEvaluationRequestSchema);
export const authorityEvaluationDecisionCarrier = schemaFrom(authorityEvaluationDecisionSchema);

function deny(reason) {
  return Object.freeze({ kind: "governance.authority-evaluation-decision", allowed: false, reason, snapshotRevision: null, evidenceRefs: Object.freeze([]) });
}
function canonicalInstant(value) {
  if (!UTC_INSTANT.test(value)) return null;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && new Date(epoch).toISOString() === value ? epoch : null;
}
function distinct(values) { return new Set(values).size === values.length; }
function validPeriod(record) {
  const start = canonicalInstant(record.effectiveFrom);
  if (start === null) return false;
  if (record.effectiveUntil === undefined) return true;
  const end = canonicalInstant(record.effectiveUntil);
  return end !== null && start < end;
}
function current(record, now) {
  const start = canonicalInstant(record.effectiveFrom);
  if (start === null || record.standing !== "verified" || start > now) return false;
  if (record.effectiveUntil === undefined) return true;
  const end = canonicalInstant(record.effectiveUntil);
  return end !== null && now < end;
}
function exactScopes(grant) {
  return distinct(grant.authorities) && distinct(grant.resources) && distinct(grant.actions)
    && !grant.authorities.includes("*") && !grant.resources.includes("*") && !grant.actions.includes("*");
}
function grantsRequest(grant, request) {
  return grant.authorities.includes(request.requiresAuthority)
    && grant.resources.includes(request.resource) && grant.actions.includes(request.action);
}
function noScopeAmplification(child, parent) {
  return child.authorities.every((value) => parent.authorities.includes(value))
    && child.resources.every((value) => parent.resources.includes(value))
    && child.actions.every((value) => parent.actions.includes(value));
}
function noTimeAmplification(child, parent) {
  const childStart = canonicalInstant(child.effectiveFrom);
  const parentStart = canonicalInstant(parent.effectiveFrom);
  if (childStart === null || parentStart === null || childStart < parentStart) return false;
  if (parent.effectiveUntil === undefined) return true;
  const parentEnd = canonicalInstant(parent.effectiveUntil);
  if (parentEnd === null || child.effectiveUntil === undefined) return false;
  const childEnd = canonicalInstant(child.effectiveUntil);
  return childEnd !== null && childEnd <= parentEnd;
}
function soundSnapshot(state, now, maxAge) {
  const observed = canonicalInstant(state.observedAt);
  if (observed === null || observed > now || now - observed > maxAge || !distinct(state.rootAuthorizedGroups)) return false;
  const records = [...state.memberships, ...state.offices, ...state.delegations];
  if (!distinct(records.map((record) => record.id)) || !state.memberships.every(validPeriod)) return false;
  if (!state.offices.every((record) => validPeriod(record) && exactScopes(record))) return false;
  if (!state.delegations.every((record) => validPeriod(record) && exactScopes(record))) return false;
  return distinct(state.memberships.map((membership) => `${membership.actorId}\u0000${membership.groupId}`));
}
function member(state, actorId, groupId, now) {
  const found = state.memberships.find((candidate) => candidate.actorId === actorId && candidate.groupId === groupId);
  return found !== undefined && current(found, now) ? found : null;
}
function rootOffice(state, request, now) {
  const office = state.offices.find((candidate) => candidate.id === state.rootOfficeId);
  if (office === undefined || office.groupId !== request.groupId || office.issuerId !== state.rootIssuerId) return null;
  return current(office, now) && grantsRequest(office, request) && member(state, office.actorId, request.groupId, now) !== null ? office : null;
}
function grantById(state, id) {
  return state.offices.find((candidate) => candidate.id === id) ?? state.delegations.find((candidate) => candidate.id === id) ?? null;
}
function ancestry(leaf, root, state, request, now) {
  const seen = new Set();
  const evidence = [];
  let child = leaf;
  for (let depth = 0; depth < MAX_RECORDS; depth += 1) {
    if (seen.has(child.id) || child.groupId !== request.groupId || child.issuerId !== state.rootIssuerId
      || !current(child, now) || !grantsRequest(child, request)) return null;
    const membership = member(state, child.actorId, request.groupId, now);
    if (membership === null) return null;
    seen.add(child.id);
    evidence.push(membership.evidenceRef, child.evidenceRef);
    if (child.id === root.id) return Object.freeze(evidence);
    if (child.parentId === undefined || child.fromActorId === undefined) return null;
    const parent = grantById(state, child.parentId);
    if (parent === null || parent.actorId !== child.fromActorId
      || !noScopeAmplification(child, parent) || !noTimeAmplification(child, parent)) return null;
    child = parent;
  }
  return null;
}

/**
 * Evaluates a supplied authority snapshot without authenticating the snapshot,
 * constituting membership, or granting authority outside its declared evidence.
 *
 * @param {unknown} input A governance authority-evaluation request carrier.
 * @returns {object} A governance authority-evaluation decision carrier.
 */
export function evaluateAuthority(input) {
  let request;
  try {
    request = authorityEvaluationRequestCarrier.assert(input, "authority-evaluation");
  } catch {
    return deny("invalid-request");
  }
  if (!Number.isInteger(request.maxStateAgeMs) || request.maxStateAgeMs < 1 || request.maxStateAgeMs > MAX_STATE_AGE_MS) return deny("invalid-request");
  const now = canonicalInstant(request.serverNow);
  if (now === null || !soundSnapshot(request.trustedState, now, request.maxStateAgeMs)) return deny("stale-or-invalid-state");
  if (!request.trustedState.rootAuthorizedGroups.includes(request.groupId)) return deny("untrusted-group");
  const root = rootOffice(request.trustedState, request, now);
  if (root === null) return deny("invalid-root-office");
  const candidates = [
    ...(request.actorId === root.actorId ? [root] : []),
    ...request.trustedState.delegations,
  ].filter((candidate) => candidate.actorId === request.actorId && candidate.groupId === request.groupId
    && candidate.issuerId === request.trustedState.rootIssuerId && current(candidate, now) && grantsRequest(candidate, request));
  const evidence = candidates.slice().sort((left, right) => left.id.localeCompare(right.id))
    .map((candidate) => ancestry(candidate, root, request.trustedState, request, now)).find((proof) => proof !== null);
  if (evidence === undefined) return deny("no-current-trusted-authority");
  return Object.freeze({ kind: "governance.authority-evaluation-decision", allowed: true, reason: "authorized", snapshotRevision: request.trustedState.revision, evidenceRefs: Object.freeze([...new Set(evidence)].sort()) });
}

/** @type {object} */
export const authorityEvaluationOperation = operation({
  verb: "evaluate-authority",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Evaluate bounded normative authority from a supplied snapshot.",
  description: "The caller remains responsible for authenticating time, snapshot provenance, and membership evidence.",
  domain: authorityEvaluationRequestCarrier,
  codomain: authorityEvaluationDecisionCarrier,
  run: (input) => jsonResource(evaluateAuthority(input), "authority-evaluation"),
});

/**
 * Specializes the governance carrier boundary for an engineering receiver.
 *
 * @param {{ requestKind: string, decisionKind: string, stateKind: string }} kinds Receiver kind strings.
 * @returns {{ requestSchema: object, decisionSchema: object, requestCarrier: object, decisionCarrier: object, evaluate: (input: unknown) => object }} A receiver-specific boundary over the common evaluator.
 */
export function specializeAuthorityEvaluation({ requestKind, decisionKind, stateKind }) {
  const stateSchema = { ...trustedAuthorityStateSchema, $id: stateKind, properties: { ...trustedAuthorityStateSchema.properties, kind: { const: stateKind } } };
  const requestSchema = { ...authorityEvaluationRequestSchema, $id: requestKind, properties: { ...authorityEvaluationRequestSchema.properties, kind: { const: requestKind }, trustedState: stateSchema } };
  const decisionSchema = { ...authorityEvaluationDecisionSchema, $id: decisionKind, properties: { ...authorityEvaluationDecisionSchema.properties, kind: { const: decisionKind } } };
  const requestCarrier = schemaFrom(requestSchema);
  const decisionCarrier = schemaFrom(decisionSchema);
  return Object.freeze({
    requestSchema,
    decisionSchema,
    requestCarrier,
    decisionCarrier,
    evaluate(input) {
      let request;
      try { request = requestCarrier.assert(input, "authority-evaluation-specialization"); } catch { return Object.freeze({ kind: decisionKind, allowed: false, reason: "invalid-request", snapshotRevision: null, evidenceRefs: Object.freeze([]) }); }
      const decision = evaluateAuthority({ ...request, kind: "governance.authority-evaluation-request", trustedState: { ...request.trustedState, kind: "governance.trusted-authority-state" } });
      return Object.freeze({ ...decision, kind: decisionKind });
    },
  });
}

/**
 * Evaluates the Organizing specialization of the governance authority model.
 *
 * The authority evaluator above is a general capability; this is Organizing's
 * own receiver over it, naming its request, decision, and state kinds.
 */
const corporateAuthorityModel = specializeAuthorityEvaluation({ requestKind: "organizing.corporate-authority-request", decisionKind: "organizing.corporate-authority-decision", stateKind: "organizing.trusted-authority-state" });

export const corporateAuthorityRequestSchema = corporateAuthorityModel.requestSchema;

export const corporateAuthorityRequestCarrier = corporateAuthorityModel.requestCarrier;

/**
 * Evaluates the Organizing specialization of the governance authority model.
 *
 * @param input An Organizing corporate-authority request carrier.
 * @returns An Organizing corporate-authority decision carrier.
 */
export function evaluateCorporateAuthority(input) {
  return corporateAuthorityModel.evaluate(input);
}

export const corporateAuthorityAction = operation({
  verb: "corporate-authority",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Evaluate corporate authority through the shared governance model.",
  description: "The service boundary supplies trusted time and snapshot provenance; this evaluator does not authenticate either.",
  domain: corporateAuthorityModel.requestCarrier,
  codomain: corporateAuthorityModel.decisionCarrier,
  run: (input) => jsonResource(evaluateCorporateAuthority(input), "corporate-authority"),
});
