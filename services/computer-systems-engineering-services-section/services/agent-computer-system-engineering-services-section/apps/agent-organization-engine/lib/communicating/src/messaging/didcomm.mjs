/**
 * messaging/didcomm — DIDComm v2 as communicating's encrypted across-channel.
 *
 * A DIDComm message is one membrane utterance sealed to DIDs: sender DID is the
 * utterance token, plaintext body is the claim, and the message `type` is the
 * speech-act force. The sealed JWM reads at private visibility (FOUR bottom,
 * `absurd`) until opened by the recipient's channel key.
 */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { createCipheriv, createDecipheriv } from "node:crypto";
import { sha256 } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/hash";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

import { parse as parseJson, requireJsonValue } from "@red-cup-engineering/json-services-section";
import { canonicalJson as canonical } from "@red-cup-engineering/json-services-section/canonical-json";
import { mark, utterance } from "@red-cup-engineering/signcell/utterance";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/** DIDComm v2 JSON-LD context, embedded literally so this codec adds no deps. */
export const DIDCOMM_CONTEXT = "https://didcomm.org/messaging/2.0";

/** DID Core context used by the DID endpoints the sealed message names. */
export const DID_CONTEXT = "https://www.w3.org/ns/did/v1";

/** JWM/JWE protected-header media type for encrypted DIDComm messages. */
export const DIDCOMM_ENCRYPTED_TYP = "application/didcomm-encrypted+json";

/** The JWM algorithms this dependency-free value layer realizes. */
export const DIDCOMM_JWM_ALG = "dir";
export const DIDCOMM_JWM_ENC = "A256GCM";

/** FOUR bottom on the knowledge/reach order: direct/private visibility. */
export const DIDCOMM_PRIVATE_VISIBILITY = "absurd";

export const didcommPlaintextMessageSchema = {
  $id: "communicating/messaging/didcomm/plaintext-message",
  title: "DIDCommPlaintextMessage",
  description:
    "A DIDComm v2 plaintext message: one communicating membrane utterance before sealing. `from` is the sender DID token, `body` is the plaintext claim, and `type` is the illocutionary force.",
  type: "object",
  required: ["@context", "id", "type", "from", "to", "body"],
  additionalProperties: false,
  properties: {
    "@context": {
      type: "array",
      items: { type: "string" },
      minItems: 2,
    },
    id: { type: "string" },
    type: { enum: ["assertive", "directive", "commissive", "expressive", "declaration"] },
    from: { type: "string", pattern: "^did:" },
    to: { type: "array", items: { type: "string", pattern: "^did:" }, minItems: 1 },
    body: { type: "string" },
    created_time: { type: "integer" },
    truth_reading: { enum: ["absurd", "potential", "active", "stable"] },
  },
};

export const didcommPlaintextMessageCarrier = schemaFrom(didcommPlaintextMessageSchema);

const recipientHeaderSchema = {
  type: "object",
  required: ["kid"],
  additionalProperties: false,
  properties: {
    kid: { type: "string" },
  },
};

const recipientSchema = {
  type: "object",
  required: ["header", "encrypted_key"],
  additionalProperties: false,
  properties: {
    header: recipientHeaderSchema,
    encrypted_key: { type: "string" },
  },
};

export const didcommSealedMessageSchema = {
  $id: "communicating/messaging/didcomm/sealed-message",
  title: "DIDCommSealedMessage",
  description:
    "A DIDComm v2 encrypted JWM envelope. The ciphertext carries one plaintext DIDComm utterance and reads at private visibility (`absurd`, FOUR bottom) until decrypted.",
  type: "object",
  required: ["protected", "recipients", "iv", "ciphertext", "tag"],
  additionalProperties: false,
  properties: {
    protected: { type: "string" },
    recipients: { type: "array", items: recipientSchema, minItems: 1 },
    iv: { type: "string" },
    ciphertext: { type: "string" },
    tag: { type: "string" },
  },
};

export const didcommSealedMessageCarrier = schemaFrom(didcommSealedMessageSchema);

function keyBytes(key) {
  const bytes = typeof key === "string" ? Buffer.from(key, "utf8") : Buffer.from(key);
  return bytes.length === 32 ? bytes : sha256(bytes);
}

function base64url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

function unbase64url(text) {
  return Buffer.from(text, "base64url");
}

function assertDid(value, context) {
  if (!value.startsWith("did:")) throw new TypeError(`${context}: expected a DID, got ${JSON.stringify(value)}`);
}

function plaintextBytes(message) {
  return Buffer.from(canonical(jsonResource(message, "didcomm plaintext")), "utf8");
}

function protectedHeader(senderDid) {
  return Object.freeze({
    typ: DIDCOMM_ENCRYPTED_TYP,
    alg: DIDCOMM_JWM_ALG,
    enc: DIDCOMM_JWM_ENC,
    skid: senderDid,
    cty: "application/json",
  });
}

function readProtectedHeader(sealed) {
  const header = parseJson(unbase64url(sealed.protected).toString("utf8"));
  if (header === null || typeof header !== "object" || Array.isArray(header)) {
    throw new TypeError("openDidcommMessage: protected header is not a JSON object");
  }
  return header;
}

/** Read a membrane utterance as a DIDComm plaintext message before encryption. */
export function didcommMessageFromUtterance(
  carrier,
  recipientDid,
  force,
  options = {},
) {
  const senderDid = String(carrier.token.mark.value);
  const body = String(carrier.claim.mark.value);
  assertDid(senderDid, "didcommMessageFromUtterance sender");
  assertDid(recipientDid, "didcommMessageFromUtterance recipient");
  return Object.freeze({
    "@context": [DIDCOMM_CONTEXT, DID_CONTEXT],
    id: options.id ?? `urn:uuid:${sha256Hex(`${senderDid}\0${recipientDid}\0${force}\0${body}`)}`,
    type: force,
    from: senderDid,
    to: [recipientDid],
    body,
    ...(options.createdTime === undefined ? {} : { created_time: options.createdTime }),
    ...(options.truthReading === undefined ? {} : { truth_reading: options.truthReading }),
  });
}

/** Read a DIDComm plaintext message back as its communicating membrane utterance. */
export function utteranceFromDIDCommMessage(message) {
  return utterance(mark(message.from), mark(message.body));
}

/**
 * sealDIDCommMessage — encrypt one plaintext DIDComm message as a JWM JSON
 * serialization. The message type is preserved exactly as the illocutionary force.
 * `options.iv` is required, no random-fallback default: randomness is a value the caller can
 * pass (data/records/house-architecture-norms.json, "hull-never-imports-kernel"), and every
 * caller here already supplies its own iv, generated at the true kernel edge.
 */
export function sealDIDCommMessage(
  message,
  channelKey,
  options,
) {
  didcommPlaintextMessageCarrier.assert(message, "sealDIDCommMessage plaintext");
  const header = protectedHeader(message.from);
  const protectedBytes = base64url(canonical(header));
  const iv = Buffer.from(options.iv);
  if (iv.length !== 12) throw new TypeError("sealDIDCommMessage: iv must be 12 bytes for A256GCM");
  const cipher = createCipheriv("aes-256-gcm", keyBytes(channelKey), iv);
  cipher.setAAD(Buffer.from(protectedBytes, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintextBytes(message)), cipher.final()]);
  const tag = cipher.getAuthTag();
  const recipientDid = message.to[0];
  const sealed = Object.freeze({
    protected: protectedBytes,
    recipients: Object.freeze([
      Object.freeze({
        header: Object.freeze({ kid: options.keyId ?? `${recipientDid}#didcomm-1` }),
        encrypted_key: "",
      }),
    ]),
    iv: base64url(iv),
    ciphertext: base64url(ciphertext),
    tag: base64url(tag),
  });
  return didcommSealedMessageCarrier.assert(sealed, "sealDIDCommMessage sealed");
}

/** Convenience bridge: utterance -> plaintext DIDComm -> sealed JWM. */
export function sealDIDCommUtterance(
  carrier,
  recipientDid,
  force,
  channelKey,
  options = {},
) {
  return sealDIDCommMessage(didcommMessageFromUtterance(carrier, recipientDid, force, options), channelKey, options);
}

/** Decrypt a sealed DIDComm JWM back to the plaintext message carrier. */
export function openDIDCommMessage(sealed, channelKey) {
  didcommSealedMessageCarrier.assert(sealed, "openDIDCommMessage sealed");
  const header = readProtectedHeader(sealed);
  if (header["typ"] !== DIDCOMM_ENCRYPTED_TYP || header["alg"] !== DIDCOMM_JWM_ALG || header["enc"] !== DIDCOMM_JWM_ENC) {
    throw new TypeError("openDIDCommMessage: unsupported protected header");
  }
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(channelKey), unbase64url(sealed.iv));
  decipher.setAAD(Buffer.from(sealed.protected, "utf8"));
  decipher.setAuthTag(unbase64url(sealed.tag));
  const plaintext = Buffer.concat([decipher.update(unbase64url(sealed.ciphertext)), decipher.final()]).toString("utf8");
  const value = requireJsonValue(parseJson(plaintext), "openDIDCommMessage plaintext");
  const message = didcommPlaintextMessageCarrier.assert(value, "openDIDCommMessage plaintext");
  if (message.from !== header["skid"]) throw new TypeError("openDIDCommMessage: sender DID does not match protected header");
  return Object.freeze(message);
}

/** Decrypt a sealed DIDComm JWM directly to its membrane utterance view. */
export function openDIDCommUtterance(sealed, channelKey) {
  return utteranceFromDIDCommMessage(openDIDCommMessage(sealed, channelKey));
}

/** A sealed DIDComm message reads at private visibility: FOUR bottom on reach. */
export function didcommVisibility(_sealed) {
  return DIDCOMM_PRIVATE_VISIBILITY;
}
