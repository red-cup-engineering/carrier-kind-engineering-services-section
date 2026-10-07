
/**
 * codecs/text/json/webauthn — WebAuthn/passkey proof-of-possession as a
 * one-shot capability assertion ceremony.
 *
 * WebAuthn's own concepts (registration, challenge, assertion) here, over the
 * base object-capability model (`CapabilityView`) realized in `../capability`.
 * The crypto here is a structural model (deterministic digest strings), not a
 * real signature verifier — see the `reasons` properties for what each check proves.
 */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import {
  webauthnAssertionSchema,
  webauthnChallengeSchema,
  webauthnCutJudgmentSchema,
  webauthnIdentityFacetSchema,
  webauthnRegistrationSchema,
} from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability/schemas";
import { capabilityView, canInvokeCapabilityView } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";

export const webauthnAssertionContract = schemaFrom(webauthnAssertionSchema);
export const webauthnChallengeContract = schemaFrom(webauthnChallengeSchema);
export const webauthnCutJudgmentContract = schemaFrom(webauthnCutJudgmentSchema);
export const webauthnIdentityFacetContract = schemaFrom(webauthnIdentityFacetSchema);
export const webauthnRegistrationContract = schemaFrom(webauthnRegistrationSchema);

let WEBAUTHN_SEQ = 0;
function freshWebAuthnId(prefix) {
  WEBAUTHN_SEQ += 1;
  return `urn:${prefix}:${WEBAUTHN_SEQ}`;
}

function credentialHolder(credential) {
  const hash = credential.id.indexOf("#");
  return hash < 0 ? credential.id : credential.id.slice(0, hash);
}

function structuralDigest(label, ...parts) {
  return `${label}(${parts.join(" | ")})`;
}

export function webauthnGrant(credential) {
  const admitted = webauthnIdentityFacetContract.assert(credential, "WebAuthn identity facet");
  return `webauthn:${admitted.rpId}:${admitted.id}`;
}

/** Register a WebAuthn/passkey identity facet as a held capability-view locus. */
export function registerWebAuthnCredential(input, options

 = {}) {
  const credential = webauthnIdentityFacetContract.assert(input, "WebAuthn identity facet");
  const capability = capabilityView({
    id: options.id ?? freshWebAuthnId("webauthn-cap"),
    holder: options.holder ?? credentialHolder(credential),
    grants: webauthnGrant(credential),
  });
  return webauthnRegistrationContract.assert(Object.freeze({
    kind: "webauthn.registration",
    credential,
    capability,
    registered: true,
  }), "WebAuthn registration");
}

/** Issue a one-shot WebAuthn challenge against a registered credential locus. */
export function challengeWebAuthnCredential(registration, options

 = {}) {
  const admitted = webauthnRegistrationContract.assert(registration, "WebAuthn registration");
  return webauthnChallengeContract.assert(Object.freeze({
    kind: "webauthn.challenge",
    id: options.id ?? freshWebAuthnId("webauthn-challenge"),
    rpId: admitted.credential.rpId,
    credential: admitted.credential.id,
    grants: admitted.capability.grants,
    nonce: options.nonce ?? freshWebAuthnId("webauthn-nonce"),
  }), "WebAuthn challenge");
}

export function verifyWebAuthnCredential(
  registration,
  issued,
  context,
) {
  const admitted = webauthnRegistrationContract.assert(registration, "WebAuthn verification registration");
  const challenge = webauthnChallengeContract.assert(issued, "WebAuthn verification challenge");
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
  registration,
  issued,
  context,
) {
  const admitted = webauthnRegistrationContract.assert(registration, "WebAuthn assertion registration");
  const challenge = webauthnChallengeContract.assert(issued, "WebAuthn assertion challenge");
  const verdict = verifyWebAuthnCredential(admitted, challenge, context);
  const clientDataHash = structuralDigest("clientDataHash", challenge.id, challenge.nonce, challenge.rpId, challenge.grants);
  const authenticatorData = structuralDigest("authenticatorData", admitted.credential.id, admitted.credential.keyId);
  return webauthnAssertionContract.assert(Object.freeze({
    kind: "webauthn.assertion",
    credential: admitted.credential.id,
    challenge: challenge.id,
    grants: admitted.capability.grants,
    holder: admitted.capability.holder,
    clientDataHash,
    authenticatorData,
    signature: structuralDigest("signature-model", admitted.credential.publicKey, clientDataHash, authenticatorData),
    verified: verdict.verified,
    exercisable: verdict.verified,
  }), "WebAuthn assertion");
}

/** Cut a WebAuthn challenge against a credential assertion. */
export function cutWebAuthnCeremony(
  registration,
  issued,
  context,
) {
  const challenge = webauthnChallengeContract.assert(issued, "WebAuthn cut challenge");
  const assertion = assertWebAuthnCredential(registration, challenge, context);
  const verdict = verifyWebAuthnCredential(registration, challenge, context);
  return webauthnCutJudgmentContract.assert(Object.freeze({
    kind: verdict.verified ? "webauthn.cut:witness" : "webauthn.cut-obstruction",
    challenge,
    assertion,
    ok: verdict.verified,
    reasons: verdict.reasons,
    daimonLoci: Object.freeze(verdict.verified ? [Object.freeze([])] : []),
  }), "WebAuthn cut");
}

export function canAssertWebAuthnCredential(registration, context) {
  const admitted = webauthnRegistrationContract.assert(registration, "WebAuthn canAssert registration");
  return canInvokeCapabilityView(context.affordances, admitted.capability);
}

export const challenge = challengeWebAuthnCredential;
