/**
 * ucan holds pure UCAN token, verification, revocation, and delegation-chain reads over capability views.
 * It may import values, schema, records, logic, fixpoint, math, codecs, and sibling capability modules, but it must not import contracts, rendering, search, runtime, integrations, interfaces, or apps.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import { assertNonemptyString as nonempty } from "../../strings.mts";
import { type JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { canonicalBytes } from "../../identity/index.mts";
import { schemaFrom } from "@red-cup-engineering/computer-data-engine/contracts";

import { ucanRevocationSchema, ucanTokenSchema, ucanVerificationSchema } from "../schemas/index.mts";
import { attenuatesGrant as grantWithin, capabilityViewContract, type CapabilityView } from "../index.mts";

export { capabilityViewContract, ucanTokenSchema };

export const ucanRevocationContract = schemaFrom(ucanRevocationSchema);
export const ucanTokenContract = schemaFrom(ucanTokenSchema);
export const ucanVerificationContract = schemaFrom(ucanVerificationSchema);

export type UcanToken = FromJsonSchema<typeof ucanTokenSchema> & {
  readonly authority: CapabilityView;
};

export type UcanVerification = FromJsonSchema<typeof ucanVerificationSchema> & {
  readonly token: UcanToken;
  readonly checked: readonly UcanToken[];
};

export type UcanRevocation = FromJsonSchema<typeof ucanRevocationSchema> & {
  readonly token: UcanToken;
};

function ucanProofPayload(token: Omit<UcanToken, "proof">): JsonValue {
  return {
    kind: token.kind,
    id: token.id,
    issuer: token.issuer,
    audience: token.audience,
    authority: token.authority as unknown as JsonValue,
    issuedAt: token.issuedAt,
    ...(token.parent === undefined ? {} : { parent: token.parent }),
  };
}

function structuralUcanProof(token: Omit<UcanToken, "proof">): string {
  return `structural-ucan:${canonicalBytes(ucanProofPayload(token))}`;
}

let UCAN_SEQ = 0;
function freshUcanId(authority: CapabilityView): string {
  UCAN_SEQ += 1;
  return `urn:ucan:${encodeURIComponent(authority.id)}:${UCAN_SEQ}`;
}

/** Issue a UCAN token as a portable envelope over an existing capability view. */
export function issueUcanToken(input: {
  readonly issuer: string;
  readonly authority: CapabilityView;
  readonly id?: string;
  readonly parent?: UcanToken;
  readonly issuedAt?: string;
  readonly proof?: string;
}): UcanToken {
  const authority = capabilityViewContract.assert(input.authority, "UCAN authority") as CapabilityView;
  const parent = input.parent === undefined ? undefined : ucanTokenContract.assert(input.parent, "UCAN parent") as UcanToken;
  const unsigned = Object.freeze({
    kind: "ucan.token" as const,
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
  }), "UCAN token") as UcanToken;
}

/** Recover the capability-view authority carried by a UCAN token. */
export function capabilityViewFromUcanToken(token: UcanToken): CapabilityView {
  return (ucanTokenContract.assert(token, "UCAN capability view") as UcanToken).authority;
}

/** Carry a capability view as a UCAN token. */
export function ucanTokenFromCapabilityView(input: {
  readonly issuer: string;
  readonly authority: CapabilityView;
  readonly id?: string;
  readonly parent?: UcanToken;
  readonly issuedAt?: string;
  readonly proof?: string;
}): UcanToken {
  return issueUcanToken(input);
}

function ucanAncestryOf(token: UcanToken, chain: readonly UcanToken[]): readonly UcanToken[] {
  const byId = new Map(chain.map((entry) => [entry.id, entry]));
  const out: UcanToken[] = [];
  const seen = new Set<string>();
  let cursor: UcanToken | undefined = token;
  while (cursor !== undefined && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    out.unshift(cursor);
    cursor = cursor.parent === undefined ? undefined : byId.get(cursor.parent);
  }
  return Object.freeze(out);
}

function ucanStepReasons(parent: UcanToken | undefined, child: UcanToken): readonly string[] {
  const reasons: string[] = [];
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
export function verifyUcanToken(token: UcanToken, chain: readonly UcanToken[] = []): UcanVerification {
  const admitted = ucanTokenContract.assert(token, "UCAN verification token") as UcanToken;
  const checked = ucanAncestryOf(admitted, chain.map((entry) => ucanTokenContract.assert(entry, "UCAN verification chain") as UcanToken));
  const reasons: string[] = [];
  if (checked[checked.length - 1]?.id !== admitted.id) reasons.push(`missing target token ${admitted.id}`);
  if (admitted.parent !== undefined && !checked.some((entry) => entry.id === admitted.parent)) {
    reasons.push(`missing parent token ${admitted.parent}`);
  }
  for (const [index, current] of checked.entries()) {
    reasons.push(...ucanStepReasons(index === 0 ? undefined : checked[index - 1], current));
  }
  const ok = reasons.length === 0;
  return ucanVerificationContract.assert(Object.freeze({
    kind: ok ? "ucan.verification:witness" as const : "ucan.verification-obstruction" as const,
    token: admitted,
    checked,
    ok,
    reasons: Object.freeze(reasons),
  }), "UCAN verification") as UcanVerification;
}

/** Read a UCAN revocation as a finite witness rather than deleting authority state. */
export function revokeUcan(token: UcanToken, by?: string, reason?: string, at = new Date(0).toISOString()): UcanRevocation {
  const admitted = ucanTokenContract.assert(token, "UCAN revocation token") as UcanToken;
  return ucanRevocationContract.assert(Object.freeze({
    kind: "ucan.revocation" as const,
    token: admitted,
    by: nonempty(by ?? admitted.issuer, "UCAN revoker"),
    at: nonempty(at, "UCAN revocation time"),
    ...(reason === undefined ? {} : { reason: nonempty(reason, "UCAN revocation reason") }),
  }), "UCAN revocation") as UcanRevocation;
}

export const capabilityFromUcan = capabilityViewFromUcanToken;
export const ucanFromCapability = ucanTokenFromCapabilityView;
export const issueUcan = issueUcanToken;
export const verifyUcan = verifyUcanToken;
