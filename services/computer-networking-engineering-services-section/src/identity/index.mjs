/**
 * identity holds pure DID document, Verifiable Credential, identity-root, and HTTP-signature capability reads.
 * It may import values, schema, records, logic, fixpoint, math, codecs, and sibling capability modules, but it must not import contracts, rendering, search, runtime, integrations, interfaces, or apps.
 */

import { assertNonemptyString as nonempty } from "@red-cup-engineering/json-services-section/assert-nonempty-string";
import { createSign, createVerify } from "node:crypto";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { claim, mark } from "@red-cup-engineering/signcell/utterance";

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

import {
  credentialSubjectSchema,
  credentialVerificationJudgmentSchema,
  didDocumentSchema,
  identityRootSchema,
  proofSchema,
  serviceSchema,
  verificationMethodSchema,
  verifiableCredentialSchema,
} from "./schema.mjs";
import { eavtRecord, toEavt, foldJson, unfoldJson } from "@red-cup-engineering/eavt/row";
import { sha256 } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/hash";

export {
  credentialSubjectSchema,
  credentialVerificationJudgmentSchema,
  didDocumentSchema,
  identityRootSchema,
  proofSchema,
  serviceSchema,
  verificationMethodSchema,
  verifiableCredentialSchema,
} from "./schema.mjs";

export const identityRootContract = schemaFrom(identityRootSchema);
export const didDocumentContract = schemaFrom(didDocumentSchema);
export const verifiableCredentialContract = schemaFrom(verifiableCredentialSchema);
export const credentialVerificationJudgmentContract = schemaFrom(credentialVerificationJudgmentSchema);

export const DID_CONTEXT = "https://www.w3.org/ns/did/v1";
export const VC_CONTEXT = Object.freeze(["https://www.w3.org/2018/credentials/v1", DID_CONTEXT]);

const IS_HTTPS = /^https:\/\//iu;
const SIGNED_FIELDS = Object.freeze(["issuer", "subject", "claim", "reading", "date"]);

function handleSlug(identity) {
  return identity.trim().toLowerCase().replace(/[^a-z0-9]+/giu, "-").replace(/^-+|-+$/gu, "") || "agent";
}

function actorIri(identity, base) {
  if (IS_HTTPS.test(identity)) return identity;
  const root = base.replace(/\/+$/gu, "");
  return `${root}/${handleSlug(identity)}`;
}

/** Derive the key id that stamps key-bound identity facets for one rotation epoch. */
export function identityKeyId(publicKeyPem, epoch) {
  const digest = sha256Hex(`${epoch}\n${publicKeyPem}`).slice(0, 32);
  return `keys-${epoch}-${digest}`;
}

/** Admit the single identity root from which protocol facets are projected. */
export function identityRoot(input

) {
  const publicKeyPem = input.publicKeyPem ?? "";
  const epoch = input.epoch ?? 0;
  return identityRootContract.assert(Object.freeze({
    kind: "identity.root",
    identity: nonempty(input.identity, "identity"),
    base: (input.base ?? "").replace(/\/+$/gu, ""),
    publicKeyPem,
    keyId: identityKeyId(publicKeyPem, epoch),
    epoch,
    revoked: input.revoked ?? false,
  }), "identity root");
}

/** Rotate the root key by increasing the epoch and recomputing the key-bound facet id. */
export function rotateIdentity(root, publicKeyPem) {
  const admitted = identityRootContract.assert(root, "identity root");
  return identityRoot({
    identity: admitted.identity,
    base: admitted.base,
    publicKeyPem,
    epoch: admitted.epoch + 1,
    revoked: admitted.revoked,
  });
}

/** Revoke the root; all live facet verification should fail against a revoked root. */
export function revokeIdentity(root) {
  const admitted = identityRootContract.assert(root, "identity root");
  return identityRootContract.assert(Object.freeze({ ...admitted, revoked: true }), "revoked identity root");
}

/** Convert an https IRI into a did:web identifier. */
export function didOfIri(iri) {
  if (!IS_HTTPS.test(iri)) throw new TypeError(`did:web requires an https IRI, got ${JSON.stringify(iri)}`);
  const url = new URL(iri);
  const host = url.host.replace(/:/gu, "%3A");
  const segments = url.pathname.split("/").filter((segment) => segment.length > 0).map((segment) => encodeURIComponent(segment));
  return ["did:web", host, ...segments].join(":");
}

/** Convert a did:web identifier into its DID-document resolution URL. */
export function iriOfDid(did) {
  const [scheme, method, host, ...segments] = did.split(":");
  if (scheme !== "did" || method !== "web" || host === undefined) throw new TypeError(`not a did:web identifier: ${JSON.stringify(did)}`);
  const decodedHost = host.replace(/%3A/giu, ":");
  const path = segments.length === 0 ? "/.well-known/did.json" : `/${segments.map(decodeURIComponent).join("/")}/did.json`;
  return `https://${decodedHost}${path}`;
}

/** Recover the actor IRI reread by a did:web identifier. */
export function actorIdFromDid(did) {
  const [scheme, method, host, ...segments] = did.split(":");
  if (scheme !== "did" || method !== "web" || host === undefined) throw new TypeError(`not a did:web identifier: ${JSON.stringify(did)}`);
  const decodedHost = host.replace(/%3A/giu, ":");
  const path = segments.length === 0 ? "" : `/${segments.map(decodeURIComponent).join("/")}`;
  return `https://${decodedHost}${path}`;
}

/** Project an identity root directly to its did:web facet. */
export function didFacet(root) {
  const admitted = identityRootContract.assert(root, "identity root");
  const id = actorIri(admitted.identity, admitted.base);
  return didDocumentContract.assert(Object.freeze({
    "@context": DID_CONTEXT,
    id: didOfIri(id),
    alsoKnownAs: Object.freeze([id]),
    ...(admitted.publicKeyPem === "" ? {} : {
      verificationMethod: Object.freeze([Object.freeze({
        id: `${didOfIri(id)}#${admitted.keyId}`,
        type: "RsaVerificationKey2018",
        controller: didOfIri(id),
        publicKeyPem: admitted.publicKeyPem,
      })]),
    }),
  }), "identity did facet");
}

/** The VC subject id for an identity root. */
export function vcSubjectFacet(root) {
  const admitted = identityRootContract.assert(root, "identity root");
  return didOfIri(actorIri(admitted.identity, admitted.base));
}

function claimText(value) {
  return typeof value === "string" ? value : String(value.mark.value);
}

function credentialSigningFields(credential) {
  return Object.freeze({
    issuer: credential.issuer,
    subject: credential.credentialSubject.id,
    claim: credential.credentialSubject.claim,
    reading: credential.reading,
    date: credential.issuanceDate,
  });
}

function signingPayload(credential) {
  const fields = credentialSigningFields(credential);
  return SIGNED_FIELDS.map((field) => `${field}: ${fields[field]}`).join("\n");
}

function signCredentialPayload(credential, privateKeyPem) {
  return createSign("RSA-SHA256").update(signingPayload(credential)).end().sign(privateKeyPem, "base64");
}

function verifyCredentialPayload(credential, publicKeyPem) {
  const proof = credential.proof;
  if (proof === undefined || proof.signatureValue.trim() === "") return false;
  return createVerify("RSA-SHA256").update(signingPayload(credential)).end().verify(publicKeyPem, proof.signatureValue, "base64");
}

/** Issue a Verifiable Credential as a signed valued claim. */
export function issueCredential(
  issuerDid,
  subjectId,
  subjectClaim,
  reading,
  privateKeyPem,
  options = {},
) {
  const issuanceDate = options.issuanceDate ?? new Date(0).toISOString();
  const unsigned = verifiableCredentialContract.assert(Object.freeze({
    "@context": Object.freeze([...VC_CONTEXT]),
    ...(options.id === undefined ? {} : { id: options.id }),
    type: Object.freeze(["VerifiableCredential", ...(options.types ?? [])]),
    issuer: nonempty(issuerDid, "credential issuer"),
    issuanceDate,
    credentialSubject: Object.freeze({
      id: nonempty(subjectId, "credential subject"),
      claim: nonempty(claimText(subjectClaim), "credential claim"),
    }),
    reading,
  }), "unsigned credential");
  return verifiableCredentialContract.assert(Object.freeze({
    ...unsigned,
    proof: Object.freeze({
      type: "RsaSignature2018",
      created: issuanceDate,
      verificationMethod: `${issuerDid}#keys-1`,
      signatureValue: signCredentialPayload(unsigned, privateKeyPem),
    }),
  }), "signed credential");
}

/** Verify a credential proof and return a witness/obstruction judgment. */
export function verifyCredential(credential, publicKeyPem) {
  const admitted = verifiableCredentialContract.assert(credential, "verifiable credential");
  const reasons = [];
  if (admitted.proof === undefined) reasons.push("credential must carry a proof");
  if (admitted.proof !== undefined && admitted.proof.verificationMethod !== `${admitted.issuer}#keys-1`) reasons.push("proof verification method must be rooted at issuer");
  if (!verifyCredentialPayload(admitted, publicKeyPem)) reasons.push("credential signature must verify over issuer, subject, claim, reading, and date");
  const ok = reasons.length === 0;
  return credentialVerificationJudgmentContract.assert(Object.freeze({
    kind: ok ? "identity.credential-verification:witness" : "identity.credential-verification-obstruction",
    credential: admitted,
    ok,
    reasons: Object.freeze(reasons),
  }), "credential verification judgment");
}

/** Read the credential subject claim back as the base Claim object. */
export function claimOfCredential(credential) {
  const admitted = verifiableCredentialContract.assert(credential, "verifiable credential");
  return claim(mark(admitted.credentialSubject.claim));
}

function firstStatementCoordinate(log) {
  const first = log[0];
  const time = first === undefined ? undefined : eavtRecord(first).t;
  return typeof time === "string" && time.length > 0 ? time : new Date(0).toISOString();
}

/** Wrap an ordered statement log as a reversible Verifiable Credential envelope. */
export function credentialFromStatements(log, options = {}) {
  const statementLog = Object.freeze(log.map(toEavt));
  return verifiableCredentialContract.assert(Object.freeze({
    "@context": Object.freeze([...VC_CONTEXT]),
    ...(options.id === undefined ? {} : { id: options.id }),
    type: Object.freeze(["VerifiableCredential", "EAVTLogCredential"]),
    issuer: options.issuer ?? "did:web:example.test:agents:codex",
    issuanceDate: options.issuanceDate ?? firstStatementCoordinate(statementLog),
    credentialSubject: Object.freeze({
      id: options.subject ?? "urn:eavt:shared-log",
      claim: options.claim ?? "carries-eavt-witness-log",
      statementLog,
    }),
    reading: options.reading ?? "unknown",
  }), "credential from statement log");
}

/** Wrap a durable statement log reference as a Verifiable Credential record without embedding the source rows. */
export function credentialFromStatementReference(reference, options = {}) {
  return verifiableCredentialContract.assert(Object.freeze({
    "@context": Object.freeze([...VC_CONTEXT]),
    ...(options.id === undefined ? {} : { id: options.id }),
    type: Object.freeze(["VerifiableCredential", "EAVTLogCredential"]),
    issuer: options.issuer ?? "did:web:example.test:agents:codex",
    issuanceDate: options.issuanceDate ?? new Date(0).toISOString(),
    credentialSubject: Object.freeze({
      id: options.subject ?? "urn:eavt:shared-log",
      claim: options.claim ?? "carries-eavt-witness-log",
      statementLogReference: reference,
    }),
    reading: options.reading ?? "unknown",
  }), "credential from statement log reference");
}

/** Recover a credential's embedded statement log, or fail when the credential only names a durable source ledger. */
export function statementsFromCredential(credential) {
  const admitted = verifiableCredentialContract.assert(credential, "credential witness");
  const embedded = admitted.credentialSubject.statementLog;
  if (embedded !== undefined) return Object.freeze(embedded.map(toEavt));
  const reference = admitted.credentialSubject.statementLogReference;
  if (reference !== undefined) {
    throw new TypeError(`statementsFromCredential: credential carries a statementLogReference at ${reference.path}, not embedded statement rows`);
  }
  return Object.freeze(unfoldJson(admitted, {
    base: `urn:eavt:metroplat:identity:credential:${admitted.id ?? `${admitted.issuer}:${admitted.credentialSubject.id}:${admitted.issuanceDate}`}`,
    t: admitted.issuanceDate,
  }));
}

/** Rebuild a credential envelope from rows produced by `statementsFromCredential`. */
export function credentialEnvelopeFromStatementLog(log) {
  return verifiableCredentialContract.assert(foldJson(log), "credential envelope statement log");
}

// ── S2S HTTP Signatures (draft-cavage): the delivery-authentication facet the
// WMAP frontier note names as absent ("HTTP-signature verification has no codec
// home yet"). Reuses this codec's own RSA-SHA256 signing/verification and its
// `keyId` derivation — a delivery signature is the same identity-root key
// material read through the request-signing facet, not a second key system. ──

const DEFAULT_SIGNED_HEADERS = Object.freeze(["(request-target)", "host", "date", "digest"]);

/** The `Digest` header value for a request/delivery body: `SHA-256=<base64>`,
 *  binding a signed POST to the exact bytes it carries. */
export function httpDigest(body) {
  return `SHA-256=${sha256(body).toString("base64")}`;
}

/** Build the draft-cavage signing string over `(request-target)` plus the named headers. */
export function httpSignatureString(
  method,
  path,
  headers,
  signedHeaders = DEFAULT_SIGNED_HEADERS,
) {
  return signedHeaders
    .map((name) => (name === "(request-target)" ? `(request-target): ${method.toLowerCase()} ${path}` : `${name}: ${headers[name.toLowerCase()] ?? ""}`))
    .join("\n");
}

/** Parse a `Signature` header into its `keyId`/`headers`/`signature` fields. */
export function parseHttpSignatureHeader(header) {
  const out = {};
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    out[key] = part.slice(eq + 1).trim().replace(/^"|"$/gu, "");
  }
  return Object.freeze(out);
}

/**
 * Sign an outbound S2S delivery request as `keyId` with `privateKeyPem`
 * (RSA-SHA256), returning the `Signature` header value naming the covered
 * headers. The caller sets it alongside the headers it signed.
 */
export function signHttpRequest(
  method,
  path,
  headers,
  keyId,
  privateKeyPem,
  signedHeaders = DEFAULT_SIGNED_HEADERS,
) {
  const signature = createSign("RSA-SHA256").update(httpSignatureString(method, path, headers, signedHeaders)).sign(privateKeyPem, "base64");
  return `keyId="${keyId}",algorithm="rsa-sha256",headers="${signedHeaders.join(" ")}",signature="${signature}"`;
}

/**
 * Verify an inbound S2S delivery's `Signature` header against the sender
 * actor's published `publicKeyPem`. The caller must additionally confirm the
 * `keyId` belongs to the claimed actor and that `date`/`digest` are fresh
 * (the replay window is a transport concern, not this codec's).
 */
export function verifyHttpSignature(
  method,
  path,
  headers,
  signatureHeader,
  publicKeyPem,
) {
  const fields = parseHttpSignatureHeader(signatureHeader);
  const signedHeaders = (fields["headers"] ?? "(request-target) host date").split(" ");
  const signature = fields["signature"];
  if (signature === undefined || signature === "") return false;
  try {
    return createVerify("RSA-SHA256").update(httpSignatureString(method, path, headers, signedHeaders)).verify(publicKeyPem, signature, "base64");
  } catch {
    return false;
  }
}

/** Issue a credential whose subject is a package-owned object capability. */
export function issueCapabilityCredential(
  issuerDid,
  capability,
  privateKeyPem,
  options = {},
) {
  const grant = `${capability.resource}:${capability.actions.join(",")}`;
  const credential = issueCredential(
    issuerDid,
    capability.holder,
    grant,
    "unknown",
    privateKeyPem,
    { ...options, types: Object.freeze(["CapabilityCredential", ...(options.types ?? [])]) },
  );
  return verifiableCredentialContract.assert(Object.freeze({
    ...credential,
    credentialSubject: Object.freeze({
      ...credential.credentialSubject,
      capability: capability.resource,
      grants: grant,
    }),
  }), "capability credential");
}
