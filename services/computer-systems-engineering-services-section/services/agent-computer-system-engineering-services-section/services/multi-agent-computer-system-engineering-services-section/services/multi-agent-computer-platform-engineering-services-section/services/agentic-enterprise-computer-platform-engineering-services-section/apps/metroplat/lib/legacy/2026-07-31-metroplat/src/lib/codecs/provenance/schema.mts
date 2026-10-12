import { schemaFrom } from "../../schema/contract.mts";

export const structuralProvenanceSignatureSchema = {
  $id: "metroplat/codecs/text/json/provenance/structural-signature",
  title: "Structural Provenance Signature",
  description: "A deterministic canonical-json commitment standing in for a Sigstore signature.",
  type: "object",
  required: ["kind", "scheme", "signer", "digest"],
  properties: {
    kind: { const: "metroplat.codecs.text.json.provenance.structural-signature" },
    scheme: { const: "sigstore.structural" },
    signer: { type: "string", minLength: 1 },
    digest: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
} as const;

export const structuralProvenanceSignatureContract = schemaFrom(structuralProvenanceSignatureSchema);

export const signedProvenanceSourceSchema = {
  $id: "metroplat/codecs/text/json/provenance/signed-source",
  title: "Signed Provenance Source",
  description: "The source payload plus its structural signature.",
  type: "object",
  required: ["kind", "source", "signature"],
  properties: {
    kind: { const: "metroplat.codecs.text.json.provenance.signed-source" },
    source: {},
    signature: { $ref: "metroplat/codecs/text/json/provenance/structural-signature" },
  },
  additionalProperties: false,
} as const;

export const signedProvenanceSourceContract = schemaFrom(signedProvenanceSourceSchema, [structuralProvenanceSignatureContract]);

export const attestationLinkSchema = {
  $id: "metroplat/codecs/text/json/provenance/attestation-link",
  title: "Statement Provenance Attestation Link",
  description: "An in-toto/SLSA link carried as one record-tier provenance statement.",
  type: "object",
  required: ["kind", "name", "subject", "predicateType", "predicate", "materials", "products", "source", "signature", "t"],
  properties: {
    kind: { const: "metroplat.codecs.text.json.provenance.attestation-link" },
    name: { type: "string", minLength: 1 },
    subject: {},
    predicateType: { type: "string", minLength: 1 },
    predicate: {},
    materials: { type: "array", items: {} },
    products: { type: "array", items: {} },
    source: {},
    signature: { $ref: "metroplat/codecs/text/json/provenance/structural-signature" },
    t: {},
  },
  additionalProperties: false,
} as const;

export const attestationLinkContract = schemaFrom(attestationLinkSchema, [structuralProvenanceSignatureContract]);

export const provenanceVerificationSchema = {
  $id: "metroplat/codecs/text/json/provenance/verification",
  title: "Statement Provenance Verification",
  description: "The fifth Datom slot for a settled provenance judgement.",
  type: "object",
  required: ["kind", "standard", "linkName", "signedSource", "verified"],
  properties: {
    kind: { const: "metroplat.codecs.text.json.provenance.verification" },
    standard: { const: "in-toto/slsa/sigstore.structural" },
    linkName: { type: "string", minLength: 1 },
    signedSource: { $ref: "metroplat/codecs/text/json/provenance/signed-source" },
    verified: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

export const provenanceVerificationContract = schemaFrom(provenanceVerificationSchema, [signedProvenanceSourceContract]);
