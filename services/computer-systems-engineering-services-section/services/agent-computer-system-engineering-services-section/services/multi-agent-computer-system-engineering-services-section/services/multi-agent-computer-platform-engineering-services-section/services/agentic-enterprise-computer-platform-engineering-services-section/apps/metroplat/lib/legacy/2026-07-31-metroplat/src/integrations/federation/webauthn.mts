
/**
 * codecs/text/json/webauthn — WebAuthn/passkey proof-of-possession as a
 * one-shot capability assertion ceremony.
 *
 * WebAuthn's own concepts (registration, challenge, assertion) here, over the
 * base object-capability model (`CapabilityView`) realized in `../capability`.
 * The crypto here is a structural model (deterministic digest strings), not a
 * real signature verifier — see the `reasons` properties for what each check proves.
 */
import { schemaFrom } from "../../lib/schema/contract.mts";
import {
  webauthnAssertionSchema,
  webauthnChallengeSchema,
  webauthnCutJudgmentSchema,
  webauthnIdentityFacetSchema,
  webauthnRegistrationSchema,
} from "../../lib/capability/schemas/index.mts";
import { capabilityView, canInvokeCapabilityView, type CapabilityView } from "../../lib/capability/index.mts";

export const webauthnAssertionContract = schemaFrom(webauthnAssertionSchema);
export const webauthnChallengeContract = schemaFrom(webauthnChallengeSchema);
export const webauthnCutJudgmentContract = schemaFrom(webauthnCutJudgmentSchema);
export const webauthnIdentityFacetContract = schemaFrom(webauthnIdentityFacetSchema);
export const webauthnRegistrationContract = schemaFrom(webauthnRegistrationSchema);

export interface WebAuthnIdentityFacet {
  readonly kind: "webauthn.identity-facet";
  readonly id: string;
  readonly rpId: string;
  readonly publicKey: string;
  readonly keyId: string;
}

export interface WebAuthnRegistration {
  readonly kind: "webauthn.registration";
  readonly credential: WebAuthnIdentityFacet;
  readonly capability: CapabilityView;
  readonly registered: boolean;
}

export interface WebAuthnChallenge {
  readonly kind: "webauthn.challenge";
  readonly id: string;
  readonly rpId: string;
  readonly credential: string;
  readonly grants: string;
  readonly nonce: string;
}

export interface WebAuthnAssertion {
  readonly kind: "webauthn.assertion";
  readonly credential: string;
  readonly challenge: string;
  readonly grants: string;
  readonly holder: string;
  readonly clientDataHash: string;
  readonly authenticatorData: string;
  readonly signature: string;
  readonly verified: boolean;
  readonly exercisable: boolean;
}

export interface WebAuthnCutJudgment {
  readonly kind: "webauthn.cut:witness" | "webauthn.cut-obstruction";
  readonly challenge: WebAuthnChallenge;
  readonly assertion: WebAuthnAssertion;
  readonly ok: boolean;
  readonly reasons: readonly string[];
  readonly daimonLoci: readonly (readonly number[])[];
}

export interface WebAuthnAssertionContext {
  readonly affordances: readonly string[];
  readonly usedChallenges?: readonly string[];
}

export interface WebAuthnAssertionVerdict {
  readonly held: boolean;
  readonly fresh: boolean;
  readonly matched: boolean;
  readonly verified: boolean;
  readonly reasons: readonly string[];
}

export interface RegisterOptions {
  readonly id?: string;
  readonly holder?: string;
}

export interface ChallengeOptions {
  readonly id?: string;
  readonly nonce?: string;
}

let WEBAUTHN_SEQ = 0;
function freshWebAuthnId(prefix: string): string {
  WEBAUTHN_SEQ += 1;
  return `urn:${prefix}:${WEBAUTHN_SEQ}`;
}

function credentialHolder(credential: WebAuthnIdentityFacet): string {
  const hash = credential.id.indexOf("#");
  return hash < 0 ? credential.id : credential.id.slice(0, hash);
}

function structuralDigest(label: string, ...parts: readonly string[]): string {
  return `${label}(${parts.join(" | ")})`;
}

export function webauthnGrant(credential: WebAuthnIdentityFacet): string {
  const admitted = webauthnIdentityFacetContract.assert(credential, "WebAuthn identity facet") as WebAuthnIdentityFacet;
  return `webauthn:${admitted.rpId}:${admitted.id}`;
}

/** Register a WebAuthn/passkey identity facet as a held capability-view locus. */
export function registerWebAuthnCredential(input: WebAuthnIdentityFacet, options: {
  readonly id?: string;
  readonly holder?: string;
} = {}): WebAuthnRegistration {
  const credential = webauthnIdentityFacetContract.assert(input, "WebAuthn identity facet") as WebAuthnIdentityFacet;
  const capability = capabilityView({
    id: options.id ?? freshWebAuthnId("webauthn-cap"),
    holder: options.holder ?? credentialHolder(credential),
    grants: webauthnGrant(credential),
  });
  return webauthnRegistrationContract.assert(Object.freeze({
    kind: "webauthn.registration" as const,
    credential,
    capability,
    registered: true,
  }), "WebAuthn registration") as WebAuthnRegistration;
}

/** Issue a one-shot WebAuthn challenge against a registered credential locus. */
export function challengeWebAuthnCredential(registration: WebAuthnRegistration, options: {
  readonly id?: string;
  readonly nonce?: string;
} = {}): WebAuthnChallenge {
  const admitted = webauthnRegistrationContract.assert(registration, "WebAuthn registration") as WebAuthnRegistration;
  return webauthnChallengeContract.assert(Object.freeze({
    kind: "webauthn.challenge" as const,
    id: options.id ?? freshWebAuthnId("webauthn-challenge"),
    rpId: admitted.credential.rpId,
    credential: admitted.credential.id,
    grants: admitted.capability.grants,
    nonce: options.nonce ?? freshWebAuthnId("webauthn-nonce"),
  }), "WebAuthn challenge") as WebAuthnChallenge;
}

export function verifyWebAuthnCredential(
  registration: WebAuthnRegistration,
  issued: WebAuthnChallenge,
  context: WebAuthnAssertionContext,
): WebAuthnAssertionVerdict {
  const admitted = webauthnRegistrationContract.assert(registration, "WebAuthn verification registration") as WebAuthnRegistration;
  const challenge = webauthnChallengeContract.assert(issued, "WebAuthn verification challenge") as WebAuthnChallenge;
  const held = canInvokeCapabilityView(context.affordances, admitted.capability);
  const fresh = !(context.usedChallenges ?? []).includes(challenge.id);
  const matched = challenge.rpId === admitted.credential.rpId
    && challenge.credential === admitted.credential.id
    && challenge.grants === admitted.capability.grants;
  return Object.freeze({
    held,
    fresh,
    matched,
    verified: held && fresh && matched,
    reasons: Object.freeze([
      ...(held ? [] : [`${admitted.capability.holder} does not currently expose ${admitted.capability.grants}`]),
      ...(fresh ? [] : [`challenge ${challenge.id} was already used`]),
      ...(matched ? [] : ["challenge does not match registration"]),
    ]),
  });
}

/** Produce the structural proof-of-possession assertion for a WebAuthn challenge. */
export function assertWebAuthnCredential(
  registration: WebAuthnRegistration,
  issued: WebAuthnChallenge,
  context: WebAuthnAssertionContext,
): WebAuthnAssertion {
  const admitted = webauthnRegistrationContract.assert(registration, "WebAuthn assertion registration") as WebAuthnRegistration;
  const challenge = webauthnChallengeContract.assert(issued, "WebAuthn assertion challenge") as WebAuthnChallenge;
  const verdict = verifyWebAuthnCredential(admitted, challenge, context);
  const clientDataHash = structuralDigest("clientDataHash", challenge.id, challenge.nonce, challenge.rpId, challenge.grants);
  const authenticatorData = structuralDigest("authenticatorData", admitted.credential.id, admitted.credential.keyId);
  return webauthnAssertionContract.assert(Object.freeze({
    kind: "webauthn.assertion" as const,
    credential: admitted.credential.id,
    challenge: challenge.id,
    grants: admitted.capability.grants,
    holder: admitted.capability.holder,
    clientDataHash,
    authenticatorData,
    signature: structuralDigest("signature-model", admitted.credential.publicKey, clientDataHash, authenticatorData),
    verified: verdict.verified,
    exercisable: verdict.verified,
  }), "WebAuthn assertion") as WebAuthnAssertion;
}

/** Cut a WebAuthn challenge against a credential assertion. */
export function cutWebAuthnCeremony(
  registration: WebAuthnRegistration,
  issued: WebAuthnChallenge,
  context: WebAuthnAssertionContext,
): WebAuthnCutJudgment {
  const challenge = webauthnChallengeContract.assert(issued, "WebAuthn cut challenge") as WebAuthnChallenge;
  const assertion = assertWebAuthnCredential(registration, challenge, context);
  const verdict = verifyWebAuthnCredential(registration, challenge, context);
  return webauthnCutJudgmentContract.assert(Object.freeze({
    kind: verdict.verified ? "webauthn.cut:witness" as const : "webauthn.cut-obstruction" as const,
    challenge,
    assertion,
    ok: verdict.verified,
    reasons: verdict.reasons,
    daimonLoci: Object.freeze(verdict.verified ? [Object.freeze([] as const)] : []),
  }), "WebAuthn cut") as WebAuthnCutJudgment;
}

export function canAssertWebAuthnCredential(registration: WebAuthnRegistration, context: Pick<WebAuthnAssertionContext, "affordances">): boolean {
  const admitted = webauthnRegistrationContract.assert(registration, "WebAuthn canAssert registration") as WebAuthnRegistration;
  return canInvokeCapabilityView(context.affordances, admitted.capability);
}

export const challenge = challengeWebAuthnCredential;
