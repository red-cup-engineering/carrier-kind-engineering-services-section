import { readingFamilies } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const didContext = "https://www.w3.org/ns/did/v1";
const jsonValueSchema = {};
const eavtTupleSchema = {
  type: "array",
  minItems: 4,
  maxItems: 4,
  items: jsonValueSchema,
};
const statementLogReferenceSchema = {
  type: "object",
  required: ["kind", "path", "mediaType", "rows"],
  properties: {
    // Frozen legacy wire discriminant; the source concept is a journal reference.
    kind: { const: "metroplat.witness-log-reference" },
    path: { type: "string", minLength: 1 },
    mediaType: { type: "string", minLength: 1 },
    rows: { type: "integer", minimum: 0 },
    malformed: { type: "integer", minimum: 0 },
  },
  additionalProperties: false,
};

export const verificationMethodSchema = {
  type: "object",
  required: ["id", "type", "controller"],
  properties: {
    id: { type: "string", minLength: 1 },
    type: { type: "string", minLength: 1 },
    controller: { type: "string", minLength: 1 },
    publicKeyPem: { type: "string" },
  },
  additionalProperties: true,
};

export const serviceSchema = {
  type: "object",
  required: ["id", "type", "serviceEndpoint"],
  properties: {
    id: { type: "string", minLength: 1 },
    type: { type: "string", minLength: 1 },
    serviceEndpoint: { type: "string", minLength: 1 },
  },
  additionalProperties: true,
};

export const credentialSubjectSchema = {
  type: "object",
  required: ["id", "claim"],
  properties: {
    id: { type: "string", minLength: 1 },
    claim: { type: "string", minLength: 1 },
    capability: { type: "string" },
    grants: { type: "string" },
    statementLog: { type: "array", items: eavtTupleSchema },
    statementLogReference: statementLogReferenceSchema,
  },
  additionalProperties: true,
};

export const proofSchema = {
  type: "object",
  required: ["type", "created", "verificationMethod", "signatureValue"],
  properties: {
    type: { const: "RsaSignature2018" },
    created: { type: "string", minLength: 1 },
    verificationMethod: { type: "string", minLength: 1 },
    signatureValue: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const identityRootSchema = {
  $id: "metroplat/codecs/text/json/identity/root",
  title: "IdentityRoot",
  description: "The single root record from which did:web, VC-subject, and key-bound identity facets are read.",
  type: "object",
  required: ["kind", "identity", "base", "publicKeyPem", "keyId", "epoch", "revoked"],
  properties: {
    kind: { const: "identity.root" },
    identity: { type: "string", minLength: 1 },
    base: { type: "string" },
    publicKeyPem: { type: "string" },
    keyId: { type: "string", minLength: 1 },
    epoch: { type: "integer", minimum: 0 },
    revoked: { type: "boolean" },
  },
  additionalProperties: false,
};

export const didDocumentSchema = {
  $id: "metroplat/codecs/text/json/identity/did-document",
  title: "DIDDocument",
  description: "A DID Core document admitted as a portable identity boundary.",
  type: "object",
  required: ["@context", "id"],
  properties: {
    "@context": { anyOf: [{ const: didContext }, { type: "array", items: { type: "string" } }] },
    id: { type: "string", minLength: 1 },
    alsoKnownAs: { type: "array", items: { type: "string", minLength: 1 } },
    verificationMethod: { type: "array", items: verificationMethodSchema },
    service: { type: "array", items: serviceSchema },
  },
  additionalProperties: false,
};

export const verifiableCredentialSchema = {
  $id: "metroplat/codecs/text/json/identity/verifiable-credential",
  title: "VerifiableCredential",
  description: "A W3C Verifiable Credential read as a valued claim with RSA provenance.",
  type: "object",
  required: ["@context", "type", "issuer", "issuanceDate", "credentialSubject", "reading"],
  properties: {
    "@context": { anyOf: [{ type: "array", items: { type: "string" } }, { type: "string" }] },
    id: { type: "string" },
    type: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
    issuer: { type: "string", minLength: 1 },
    issuanceDate: { type: "string", minLength: 1 },
    credentialSubject: credentialSubjectSchema,
    reading: { enum: readingFamilies.knowledge },
    proof: proofSchema,
  },
  additionalProperties: false,
};

export const credentialVerificationJudgmentSchema = {
  $id: "metroplat/codecs/text/json/identity/credential-verification",
  title: "CredentialVerificationJudgment",
  description: "Witness or obstruction for a Verifiable Credential proof over a valued claim.",
  type: "object",
  required: ["kind", "credential", "ok", "reasons"],
  properties: {
    kind: { enum: ["identity.credential-verification:witness", "identity.credential-verification-obstruction"] },
    credential: verifiableCredentialSchema,
    ok: { type: "boolean" },
    reasons: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};
