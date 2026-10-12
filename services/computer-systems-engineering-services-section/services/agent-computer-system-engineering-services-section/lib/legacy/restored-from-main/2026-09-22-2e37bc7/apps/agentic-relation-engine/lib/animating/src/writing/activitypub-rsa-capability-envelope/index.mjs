/**
 * Historical ActivityPub RSA capability envelope.
 *
 * This is an application-specific carrier signed with the repository's HTTP
 * Signature primitive. It is not UCAN and confers no UCAN conformance result.
 */
import { carrierFrom } from "@red-cup-engineering/relating";

const rsaProofSchema = { type: "object", additionalProperties: false,
  required: ["type", "created", "verificationMethod", "signatureValue"],
  properties: { type: { const: "RsaSignature2018" }, created: { type: "string" },
    verificationMethod: { type: "string" }, signatureValue: { type: "string" } } };
const capabilitySchema = { type: "object", additionalProperties: false,
  required: ["@context", "id", "type", "grants", "holder"], properties: {
    "@context": { const: "https://www.w3.org/ns/activitystreams" }, id: { type: "string" },
    type: { const: "Capability" }, grants: { type: "string" }, holder: { type: "string" },
    parent: { type: "string" } } };

export const activityPubRsaCapabilityEnvelopeSchema = {
  $id: "animating/writing/activitypub-rsa-capability-envelope",
  title: "ActivityPubRsaCapabilityEnvelope",
  description: "Application-specific RSA-signed envelope for an ActivityStreams Capability; explicitly not UCAN.",
  type: "object", additionalProperties: false,
  required: ["id", "type", "issuer", "audience", "authority", "proof"], properties: {
    id: { type: "string" }, type: { const: "ActivityPubRsaCapabilityEnvelope" }, issuer: { type: "string" },
    audience: { type: "string" }, authority: capabilitySchema, parent: { type: "string" }, proof: rsaProofSchema,
  },
};

export const activityPubRsaCapabilityEnvelopeCarrier = carrierFrom(activityPubRsaCapabilityEnvelopeSchema);

export function activityPubRsaEnvelopeFromCapability(
  issuer,
  authority,
  options,
) {
  return { id: options.id, type: "ActivityPubRsaCapabilityEnvelope", issuer,
    audience: authority.holder, authority,
    ...(options.parent === undefined ? {} : { parent: options.parent.id }) };
}

export function capabilityFromActivityPubRsaEnvelope(envelope) {
  return envelope.authority;
}
