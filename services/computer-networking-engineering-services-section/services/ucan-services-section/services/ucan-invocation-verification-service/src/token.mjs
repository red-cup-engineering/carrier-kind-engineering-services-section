/**
 * ucan holds pure UCAN token, verification, revocation, and delegation-chain reads over capability views.
 * It may import values, schema, records, logic, fixpoint, math, codecs, and sibling capability modules, but it must not import contracts, rendering, search, runtime, integrations, interfaces, or apps.
 */

import { assertNonemptyString as nonempty } from "@red-cup-engineering/json-services-section/assert-nonempty-string";
import { } from "@red-cup-engineering/json-services-section";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

import { ucanRevocationSchema, ucanTokenSchema, ucanVerificationSchema } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability/schemas";
import { attenuatesGrant as grantWithin, capabilityViewContract } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";

export { capabilityViewContract, ucanTokenSchema };

export const ucanRevocationContract = schemaFrom(ucanRevocationSchema);
export const ucanTokenContract = schemaFrom(ucanTokenSchema);
export const ucanVerificationContract = schemaFrom(ucanVerificationSchema);

function ucanProofPayload(token) {
  return {
    kind: token.kind,
    id: token.id,
    issuer: token.issuer,
    audience: token.audience,
    authority: token.authority,
    issuedAt: token.issuedAt,
    ...(token.parent === undefined ? {} : { parent: token.parent }),
  };
}

function structuralUcanProof(token) {
  return `structural-ucan:${canonicalJson(ucanProofPayload(token))}`;
}

let UCAN_SEQ = 0;
function freshUcanId(authority) {
  UCAN_SEQ += 1;
  return `urn:ucan:${encodeURIComponent(authority.id)}:${UCAN_SEQ}`;
}

/** Issue a UCAN token as a portable envelope over an existing capability view. */
export function issueUcanToken(input

) {
  const authority = capabilityViewContract.assert(input.authority, "UCAN authority");
  const parent = input.parent === undefined ? undefined : ucanTokenContract.assert(input.parent, "UCAN parent");
  const unsigned = Object.freeze({
    kind: "ucan.token",
    id: input.id ?? freshUcanId(authority),
    issuer: nonempty(input.issuer, "UCAN issuer"),
    audience: authority.holder,
    authority,
    issuedAt: input.issuedAt ?? new Date(0).toISOString(),
    ...(parent === undefined ? {} : { parent: parent.id }),
  });
  return ucanTokenContract.assert(Object.freeze({
    ...unsigned,
    proof: input.proof ?? structuralUcanProof(unsigned),
  }), "UCAN token");
}

/** Recover the capability-view authority carried by a UCAN token. */
export function capabilityViewFromUcanToken(token) {
  return (ucanTokenContract.assert(token, "UCAN capability view")).authority;
}

/** Carry a capability view as a UCAN token. */
export function ucanTokenFromCapabilityView(input

) {
  return issueUcanToken(input);
}

function ucanAncestryOf(token, chain) {
  const byId = new Map(chain.map((entry) => [entry.id, entry]));
  const out = [];
  const seen = new Set();
  let cursor = token;
  while (cursor !== undefined && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    out.unshift(cursor);
    cursor = cursor.parent === undefined ? undefined : byId.get(cursor.parent);
  }
  return Object.freeze(out);
}

function ucanStepReasons(parent, child) {
  const reasons = [];
  const expectedProof = structuralUcanProof({
    kind: child.kind,
    id: child.id,
    issuer: child.issuer,
    audience: child.audience,
    authority: child.authority,
    issuedAt: child.issuedAt,
    ...(child.parent === undefined ? {} : { parent: child.parent }),
  });
  if (child.proof !== expectedProof) reasons.push(`token ${child.id} proof does not bind issuer, audience, authority, parent, and time`);
  if (child.audience !== child.authority.holder) reasons.push(`token ${child.id} audience must hold its authority`);
  if (parent === undefined) {
    if (child.issuer !== child.authority.holder) reasons.push(`root token ${child.id} issuer must hold its authority`);
    return Object.freeze(reasons);
  }
  if (child.parent !== parent.id) reasons.push(`token ${child.id} must name parent token ${parent.id}`);
  if (child.issuer !== parent.audience) reasons.push(`token ${child.id} issuer must be previous audience ${parent.audience}`);
  if (!grantWithin(parent.authority.grants, child.authority.grants)) {
    reasons.push(`token ${child.id} authority widens parent grant ${parent.authority.grants}`);
  }
  if (child.authority.parent !== parent.authority.id) {
    reasons.push(`token ${child.id} authority must name parent authority ${parent.authority.id}`);
  }
  return Object.freeze(reasons);
}

/** Verify a UCAN token chain as proof-bound, issuer-linked capability attenuation. */
export function verifyUcanToken(token, chain = []) {
  const admitted = ucanTokenContract.assert(token, "UCAN verification token");
  const checked = ucanAncestryOf(admitted, chain.map((entry) => ucanTokenContract.assert(entry, "UCAN verification chain")));
  const reasons = [];
  if (checked[checked.length - 1]?.id !== admitted.id) reasons.push(`missing target token ${admitted.id}`);
  if (admitted.parent !== undefined && !checked.some((entry) => entry.id === admitted.parent)) {
    reasons.push(`missing parent token ${admitted.parent}`);
  }
  for (const [index, current] of checked.entries()) {
    reasons.push(...ucanStepReasons(index === 0 ? undefined : checked[index - 1], current));
  }
  const ok = reasons.length === 0;
  return ucanVerificationContract.assert(Object.freeze({
    kind: ok ? "ucan.verification:witness" : "ucan.verification-obstruction",
    token: admitted,
    checked,
    ok,
    reasons: Object.freeze(reasons),
  }), "UCAN verification");
}

/** Read a UCAN revocation as a finite witness rather than deleting authority state. */
export function revokeUcan(token, by, reason, at = new Date(0).toISOString()) {
  const admitted = ucanTokenContract.assert(token, "UCAN revocation token");
  return ucanRevocationContract.assert(Object.freeze({
    kind: "ucan.revocation",
    token: admitted,
    by: nonempty(by ?? admitted.issuer, "UCAN revoker"),
    at: nonempty(at, "UCAN revocation time"),
    ...(reason === undefined ? {} : { reason: nonempty(reason, "UCAN revocation reason") }),
  }), "UCAN revocation");
}

export const capabilityFromUcan = capabilityViewFromUcanToken;
export const ucanFromCapability = ucanTokenFromCapabilityView;
export const issueUcan = issueUcanToken;
export const verifyUcan = verifyUcanToken;
