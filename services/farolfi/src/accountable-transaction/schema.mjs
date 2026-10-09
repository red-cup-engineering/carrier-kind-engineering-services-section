import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { readingFamilies } from "@red-cup-engineering/computer-data-services-section/four";

const looseObject = { type: "object", additionalProperties: true };
const looseArray = { type: "array", items: {} };

export const transactionAttestationSchema = {
  $id: "metroplat/codecs/text/json/accountable-transaction/attestation",
  title: "AccountableTransactionAttestation",
  description: "A provenance attestation over one accountable transaction statement row.",
  type: "object",
  required: ["kind", "subject", "signer", "signedAt", "datom", "signature"],
  properties: {
    kind: { const: "accountable-transaction.attestation" },
    subject: { type: "string", minLength: 1 },
    signer: { type: "string", minLength: 1 },
    signedAt: { type: "string", minLength: 1 },
    datom: { type: "array", minItems: 5, maxItems: 5, items: {} },
    signature: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const accountableTransactionSchema = {
  $id: "metroplat/codecs/text/json/accountable-transaction/witness",
  title: "AccountableTransaction",
  description: "One accountable agentic transaction: capability authority, invocation, value settlement, and provenance attestation.",
  type: "object",
  required: ["kind", "id", "recordedAt", "affordances", "capability", "invocation", "settlement"],
  properties: {
    kind: { const: "accountable-transaction.witness" },
    id: { type: "string", minLength: 1 },
    recordedAt: { type: "string", minLength: 1 },
    affordances: { type: "array", items: { type: "string", minLength: 1 } },
    capability: looseObject,
    authorization: {
      type: "object",
      required: ["kind", "token"],
      properties: {
        kind: { enum: ["ucan", "capability"] },
        token: looseObject,
      },
      additionalProperties: false,
    },
    invocation: looseObject,
    protocolInvocation: {
      type: "object",
      required: ["kind", "capability"],
      properties: {
        kind: { const: "accountable-transaction.protocol-invocation" },
        capability: looseObject,
        captp: looseObject,
        wasi: looseObject,
      },
      additionalProperties: false,
    },
    settlement: {
      type: "object",
      required: ["kind", "challenge", "paymentClaimed"],
      properties: {
        kind: { const: "accountable-transaction.settlement" },
        challenge: looseObject,
        payment: looseObject,
        receipt: looseObject,
        paymentClaimed: { type: "boolean" },
      },
      additionalProperties: false,
    },
    provenance: {
      type: "object",
      required: ["kind"],
      properties: {
        kind: { const: "accountable-transaction.provenance" },
        attestation: transactionAttestationSchema,
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

export const accountabilityReportSchema = {
  $id: "metroplat/codecs/text/json/accountable-transaction/report",
  title: "AccountabilityReport",
  description: "Decidable report for whether one transaction is authorized, paid, attested, and coherent over one canonical statement.",
  type: "object",
  required: ["kind", "query", "statement", "authorized", "paid", "attested", "accountable", "legs", "disputed", "coherent"],
  properties: {
    kind: { const: "accountable-transaction.report" },
    query: { const: "authorized and paid and attested" },
    statement: { type: "array", minItems: 4, maxItems: 4, items: {} },
    authorized: { type: "boolean" },
    paid: { type: "boolean" },
    attested: { type: "boolean" },
    accountable: { type: "boolean" },
    coherent: { type: "boolean" },
    legs: {
      type: "object",
      required: ["authorized", "paid", "attested"],
      properties: {
        authorized: { enum: readingFamilies.knowledge },
        paid: { enum: readingFamilies.knowledge },
        attested: { enum: readingFamilies.knowledge },
      },
      additionalProperties: false,
    },
    disputed: { type: "array", items: { type: "string", minLength: 1 } },
    coherence: { type: "array", items: looseObject },
  },
  additionalProperties: false,
};

export const transactionFacetWireSchema = {
  $id: "metroplat/codecs/text/json/accountable-transaction/facet-wire",
  title: "AccountableTransactionFacetWire",
  description: "One projected transaction facet read from the same accountable statement row.",
  type: "object",
  required: ["kind", "transaction", "facet"],
  properties: {
    kind: { enum: ["accountable-transaction.authorization", "accountable-transaction.capability-invoke", "accountable-transaction.captp-delivery", "accountable-transaction.wasi-invocation", "accountable-transaction.x402-receipt", "accountable-transaction.attestation"] },
    transaction: accountableTransactionSchema,
    facet: looseObject,
  },
  additionalProperties: false,
};

export const transactionAttestationContract = schemaFrom(transactionAttestationSchema);
export const accountableTransactionContract = schemaFrom(accountableTransactionSchema);
export const accountabilityReportContract = schemaFrom(accountabilityReportSchema);
export const transactionFacetWireContract = schemaFrom(transactionFacetWireSchema);
