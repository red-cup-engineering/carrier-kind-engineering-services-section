/**
 * identity holds pure DID document, Verifiable Credential, identity-root, and HTTP-signature capability reads.
 * It may import values, schema, records, logic, fixpoint, math, codecs, and sibling capability modules, but it must not import contracts, rendering, search, runtime, integrations, interfaces, or apps.
 */
import { createHash, createSign, createVerify } from "node:crypto";
import { sha256Hex } from "../../identity/index.mts";
import { claim, mark, type Claim } from "../../records/utterance/utterance.mts";

import { eavtObject, foldJson, toEavt, unfoldJson, type EAVT } from "../../codecs/json/jsonl/eavt/index.mts";
import { schemaFrom } from "../../schema/contract.mts";
import type { FromSchema } from "../../schema/contract.mts";
import {
  credentialSubjectSchema,
  credentialVerificationJudgmentSchema,
  didDocumentSchema,
  identityRootSchema,
  proofSchema,
  serviceSchema,
  verificationMethodSchema,
  verifiableCredentialSchema,
} from "./schema.mts";
import type { ChargeValueName } from "../../values/index.mts";

export {
  credentialSubjectSchema,
  credentialVerificationJudgmentSchema,
  didDocumentSchema,
  identityRootSchema,
  proofSchema,
  serviceSchema,
  verificationMethodSchema,
  verifiableCredentialSchema,
} from "./schema.mts";

export const identityRootContract = schemaFrom(identityRootSchema);
export const didDocumentContract = schemaFrom(didDocumentSchema);
export const verifiableCredentialContract = schemaFrom(verifiableCredentialSchema);
export const credentialVerificationJudgmentContract = schemaFrom(credentialVerificationJudgmentSchema);

export const DID_CONTEXT = "https://www.w3.org/ns/did/v1" as const;
export const VC_CONTEXT = Object.freeze(["https://www.w3.org/2018/credentials/v1", DID_CONTEXT] as const);

export type IdentityCharge = ChargeValueName;

export type IdentityRoot = FromSchema<typeof identityRootSchema>;

export type DIDVerificationMethod = FromSchema<typeof verificationMethodSchema> & {
  readonly [key: string]: unknown;
};

export type DIDService = FromSchema<typeof serviceSchema> & {
  readonly [key: string]: unknown;
};

export type DIDDocument = FromSchema<typeof didDocumentSchema> & {
  readonly "@context": typeof DID_CONTEXT | readonly string[];
  readonly verificationMethod?: readonly DIDVerificationMethod[];
  readonly service?: readonly DIDService[];
};

export type CredentialProof = FromSchema<typeof proofSchema>;

export type CredentialSubject = FromSchema<typeof credentialSubjectSchema> & {
  readonly statementLog?: readonly EAVT[];
  readonly statementLogReference?: StatementLogReference;
  readonly [key: string]: unknown;
};

export type StatementLogReference = Readonly<{
  readonly kind: "metroplat.witness-log-reference";
  readonly path: string;
  readonly mediaType: string;
  readonly rows: number;
  readonly malformed?: number;
}>;

export type VerifiableCredential = FromSchema<typeof verifiableCredentialSchema> & {
  readonly credentialSubject: CredentialSubject;
  readonly charge: IdentityCharge;
  readonly proof?: CredentialProof;
};

export type CredentialVerificationJudgment = FromSchema<typeof credentialVerificationJudgmentSchema> & {
  readonly credential: VerifiableCredential;
};

export interface CredentialOptions {
  readonly id?: string;
  readonly types?: readonly string[];
  /** Issuance instant supplied by a caller or service boundary; defaults to the deterministic epoch. */
  readonly issuanceDate?: string;
}

export interface CredentialStatementOptions {
  readonly id?: string;
  readonly issuer?: string;
  readonly subject?: string;
  readonly claim?: string;
  readonly charge?: IdentityCharge;
  readonly issuanceDate?: string;
}

const IS_HTTPS = /^https:\/\//iu;
const SIGNED_FIELDS = Object.freeze(["issuer", "subject", "claim", "charge", "date"] as const);

function nonempty(value: string, label: string): string {
  if (value.trim().length === 0) throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

function handleSlug(identity: string): string {
  return identity.trim().toLowerCase().replace(/[^a-z0-9]+/giu, "-").replace(/^-+|-+$/gu, "") || "agent";
}

function actorIri(identity: string, base: string): string {
  if (IS_HTTPS.test(identity)) return identity;
  const root = base.replace(/\/+$/gu, "");
  return `${root}/${handleSlug(identity)}`;
}

/** Derive the key id that stamps key-bound identity facets for one rotation epoch. */
export function identityKeyId(publicKeyPem: string, epoch: number): string {
  const digest = sha256Hex(`${epoch}\n${publicKeyPem}`).slice(0, 32);
  return `keys-${epoch}-${digest}`;
}

/** Admit the single identity root from which protocol facets are projected. */
export function identityRoot(input: {
  readonly identity: string;
  readonly base?: string;
  readonly publicKeyPem?: string;
  readonly epoch?: number;
  readonly revoked?: boolean;
}): IdentityRoot {
  const publicKeyPem = input.publicKeyPem ?? "";
  const epoch = input.epoch ?? 0;
  return identityRootContract.assert(Object.freeze({
    kind: "identity.root" as const,
    identity: nonempty(input.identity, "identity"),
    base: (input.base ?? "").replace(/\/+$/gu, ""),
    publicKeyPem,
    keyId: identityKeyId(publicKeyPem, epoch),
    epoch,
    revoked: input.revoked ?? false,
  }), "identity root") as IdentityRoot;
}

/** Rotate the root key by increasing the epoch and recomputing the key-bound facet id. */
export function rotateIdentity(root: IdentityRoot, publicKeyPem: string): IdentityRoot {
  const admitted = identityRootContract.assert(root, "identity root") as IdentityRoot;
  return identityRoot({
    identity: admitted.identity,
    base: admitted.base,
    publicKeyPem,
    epoch: admitted.epoch + 1,
    revoked: admitted.revoked,
  });
}

/** Revoke the root; all live facet verification should fail against a revoked root. */
export function revokeIdentity(root: IdentityRoot): IdentityRoot {
  const admitted = identityRootContract.assert(root, "identity root") as IdentityRoot;
  return identityRootContract.assert(Object.freeze({ ...admitted, revoked: true }), "revoked identity root") as IdentityRoot;
}

/** Convert an https IRI into a did:web identifier. */
export function didOfIri(iri: string): string {
  if (!IS_HTTPS.test(iri)) throw new TypeError(`did:web requires an https IRI, got ${JSON.stringify(iri)}`);
  const url = new URL(iri);
  const host = url.host.replace(/:/gu, "%3A");
  const segments = url.pathname.split("/").filter((segment) => segment.length > 0).map((segment) => encodeURIComponent(segment));
  return ["did:web", host, ...segments].join(":");
}

/** Convert a did:web identifier into its DID-document resolution URL. */
export function iriOfDid(did: string): string {
  const [scheme, method, host, ...segments] = did.split(":");
  if (scheme !== "did" || method !== "web" || host === undefined) throw new TypeError(`not a did:web identifier: ${JSON.stringify(did)}`);
  const decodedHost = host.replace(/%3A/giu, ":");
  const path = segments.length === 0 ? "/.well-known/did.json" : `/${segments.map(decodeURIComponent).join("/")}/did.json`;
  return `https://${decodedHost}${path}`;
}

/** Recover the actor IRI reread by a did:web identifier. */
export function actorIdFromDid(did: string): string {
  const [scheme, method, host, ...segments] = did.split(":");
  if (scheme !== "did" || method !== "web" || host === undefined) throw new TypeError(`not a did:web identifier: ${JSON.stringify(did)}`);
  const decodedHost = host.replace(/%3A/giu, ":");
  const path = segments.length === 0 ? "" : `/${segments.map(decodeURIComponent).join("/")}`;
  return `https://${decodedHost}${path}`;
}

/** Project an identity root directly to its did:web facet. */
export function didFacet(root: IdentityRoot): DIDDocument {
  const admitted = identityRootContract.assert(root, "identity root") as IdentityRoot;
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
  }), "identity did facet") as DIDDocument;
}

/** The VC subject id for an identity root. */
export function vcSubjectFacet(root: IdentityRoot): string {
  const admitted = identityRootContract.assert(root, "identity root") as IdentityRoot;
  return didOfIri(actorIri(admitted.identity, admitted.base));
}

function claimText(value: string | Claim): string {
  return typeof value === "string" ? value : String(value.mark.value);
}

function credentialSigningFields(credential: VerifiableCredential): Readonly<Record<typeof SIGNED_FIELDS[number], string>> {
  return Object.freeze({
    issuer: credential.issuer,
    subject: credential.credentialSubject.id,
    claim: credential.credentialSubject.claim,
    charge: credential.charge,
    date: credential.issuanceDate,
  });
}

function signingPayload(credential: VerifiableCredential): string {
  const fields = credentialSigningFields(credential);
  return SIGNED_FIELDS.map((field) => `${field}: ${fields[field]}`).join("\n");
}

function signCredentialPayload(credential: VerifiableCredential, privateKeyPem: string): string {
  return createSign("RSA-SHA256").update(signingPayload(credential)).end().sign(privateKeyPem, "base64");
}

function verifyCredentialPayload(credential: VerifiableCredential, publicKeyPem: string): boolean {
  const proof = credential.proof;
  if (proof === undefined || proof.signatureValue.trim() === "") return false;
  return createVerify("RSA-SHA256").update(signingPayload(credential)).end().verify(publicKeyPem, proof.signatureValue, "base64");
}

/** Issue a Verifiable Credential as a signed charged claim. */
export function issueCredential(
  issuerDid: string,
  subjectId: string,
  subjectClaim: string | Claim,
  charge: IdentityCharge,
  privateKeyPem: string,
  options: CredentialOptions = {},
): VerifiableCredential {
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
    charge,
  }), "unsigned credential") as VerifiableCredential;
  return verifiableCredentialContract.assert(Object.freeze({
    ...unsigned,
    proof: Object.freeze({
      type: "RsaSignature2018" as const,
      created: issuanceDate,
      verificationMethod: `${issuerDid}#keys-1`,
      signatureValue: signCredentialPayload(unsigned, privateKeyPem),
    }),
  }), "signed credential") as VerifiableCredential;
}

/** Verify a credential proof and return a witness/obstruction judgment. */
export function verifyCredential(credential: VerifiableCredential, publicKeyPem: string): CredentialVerificationJudgment {
  const admitted = verifiableCredentialContract.assert(credential, "verifiable credential") as VerifiableCredential;
  const reasons: string[] = [];
  if (admitted.proof === undefined) reasons.push("credential must carry a proof");
  if (admitted.proof !== undefined && admitted.proof.verificationMethod !== `${admitted.issuer}#keys-1`) reasons.push("proof verification method must be rooted at issuer");
  if (!verifyCredentialPayload(admitted, publicKeyPem)) reasons.push("credential signature must verify over issuer, subject, claim, charge, and date");
  const ok = reasons.length === 0;
  return credentialVerificationJudgmentContract.assert(Object.freeze({
    kind: ok ? "identity.credential-verification:witness" as const : "identity.credential-verification-obstruction" as const,
    credential: admitted,
    ok,
    reasons: Object.freeze(reasons),
  }), "credential verification judgment") as CredentialVerificationJudgment;
}

/** Read the credential subject claim back as the base Claim object. */
export function claimOfCredential(credential: VerifiableCredential): Claim {
  const admitted = verifiableCredentialContract.assert(credential, "verifiable credential") as VerifiableCredential;
  return claim(mark(admitted.credentialSubject.claim));
}

function firstStatementCoordinate(log: readonly EAVT[]): string {
  const first = log[0];
  const time = first === undefined ? undefined : eavtObject(first).t;
  return typeof time === "string" && time.length > 0 ? time : new Date(0).toISOString();
}

/** Wrap an ordered statement log as a reversible Verifiable Credential envelope. */
export function credentialFromStatements(log: readonly EAVT[], options: CredentialStatementOptions = {}): VerifiableCredential {
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
    charge: options.charge ?? "unknown",
  }), "credential from statement log") as VerifiableCredential;
}

/** Wrap a durable statement log reference as a Verifiable Credential record without embedding the source rows. */
export function credentialFromStatementReference(reference: StatementLogReference, options: CredentialStatementOptions = {}): VerifiableCredential {
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
    charge: options.charge ?? "unknown",
  }), "credential from statement log reference") as VerifiableCredential;
}

/** Recover a credential's embedded statement log, or fail when the credential only names a durable source ledger. */
export function statementsFromCredential(credential: VerifiableCredential): readonly EAVT[] {
  const admitted = verifiableCredentialContract.assert(credential, "credential witness") as VerifiableCredential;
  const embedded = admitted.credentialSubject.statementLog;
  if (embedded !== undefined) return Object.freeze(embedded.map(toEavt));
  const reference = admitted.credentialSubject.statementLogReference;
  if (reference !== undefined) {
    throw new TypeError(`statementsFromCredential: credential carries a statementLogReference at ${reference.path}, not embedded statement rows`);
  }
  return Object.freeze(unfoldJson(admitted as unknown as Parameters<typeof unfoldJson>[0], {
    base: `urn:eavt:metroplat:identity:credential:${admitted.id ?? `${admitted.issuer}:${admitted.credentialSubject.id}:${admitted.issuanceDate}`}`,
    t: admitted.issuanceDate,
  }));
}

/** Rebuild a credential envelope from rows produced by `statementsFromCredential`. */
export function credentialEnvelopeFromStatementLog(log: readonly EAVT[]): VerifiableCredential {
  return verifiableCredentialContract.assert(foldJson(log), "credential envelope statement log") as VerifiableCredential;
}

// ── S2S HTTP Signatures (draft-cavage): the delivery-authentication facet the
// WMAP frontier note names as absent ("HTTP-signature verification has no codec
// home yet"). Reuses this codec's own RSA-SHA256 signing/verification and its
// `keyId` derivation — a delivery signature is the same identity-root key
// material read through the request-signing facet, not a second key system. ──

const DEFAULT_SIGNED_HEADERS = Object.freeze(["(request-target)", "host", "date", "digest"] as const);

/** The `Digest` header value for a request/delivery body: `SHA-256=<base64>`,
 *  binding a signed POST to the exact bytes it carries. */
export function httpDigest(body: string): string {
  return `SHA-256=${createHash("sha256").update(body).digest("base64")}`;
}

/** Build the draft-cavage signing string over `(request-target)` plus the named headers. */
export function httpSignatureString(
  method: string,
  path: string,
  headers: Readonly<Record<string, string>>,
  signedHeaders: readonly string[] = DEFAULT_SIGNED_HEADERS,
): string {
  return signedHeaders
    .map((name) => (name === "(request-target)" ? `(request-target): ${method.toLowerCase()} ${path}` : `${name}: ${headers[name.toLowerCase()] ?? ""}`))
    .join("\n");
}

/** Parse a `Signature` header into its `keyId`/`headers`/`signature` fields. */
export function parseHttpSignatureHeader(header: string): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
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
  method: string,
  path: string,
  headers: Readonly<Record<string, string>>,
  keyId: string,
  privateKeyPem: string,
  signedHeaders: readonly string[] = DEFAULT_SIGNED_HEADERS,
): string {
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
  method: string,
  path: string,
  headers: Readonly<Record<string, string>>,
  signatureHeader: string,
  publicKeyPem: string,
): boolean {
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
  issuerDid: string,
  capability: { readonly holder: string; readonly resource: string; readonly actions: readonly string[] },
  privateKeyPem: string,
  options: CredentialOptions = {},
): VerifiableCredential {
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
  }), "capability credential") as VerifiableCredential;
}
