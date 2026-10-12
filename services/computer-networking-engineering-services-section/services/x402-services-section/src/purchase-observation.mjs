/**
 * Read the native HTTP buyer's observations. A facilitator's report and an
 * observed response are distinct facts; neither is customer acceptance or an
 * independent chain assay. No payment or receipt is synthesized here.
 */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { sha256Bytes } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/portable-sha256";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";

export const x402PurchaseObservationCarrier = schemaFrom({
  $id: "x402/purchase-observation",
  type: "object", required: ["type", "customer", "request", "requirement", "status"],
  properties: {
    type: { const: "X402HttpPurchaseReceipt" },
    customer: { type: "string", pattern: "^eip155:[1-9][0-9]*:0x[0-9a-fA-F]{40}$" },
    request: { type: "object", required: ["url", "method", "bodySha256"],
      properties: { url: { type: "string" }, method: { enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] },
        bodySha256: { type: "string", pattern: "^[a-f0-9]{64}$" } } },
    requirement: { type: "object", required: ["scheme", "network", "asset", "payTo", "amount"],
      properties: { scheme: { const: "exact" }, network: { type: "string", pattern: "^eip155:[1-9][0-9]*$" },
        asset: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" },
        payTo: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" },
        amount: { type: "string", pattern: "^[1-9][0-9]*$" } } },
    status: { type: "integer", minimum: 100, maximum: 599 },
    settlement: { type: "object" }, delivery: { type: "object" },
  },
});

export function readX402Purchase(value, { challenge, payment } = {}) {
  const reasons = [];
  if (!x402PurchaseObservationCarrier.validate(value)) {
    return Object.freeze({ evidence: "unrecognized", settlementReported: false, responseObserved: false,
      acceptance: "unobserved", reasons: Object.freeze(["not a native x402 HTTP purchase observation"]) });
  }
  const { requirement: required, settlement, customer, request, delivery } = value;
  const address = customer.slice(customer.lastIndexOf(":") + 1).toLowerCase();
  if (!customer.startsWith(required.network + ":")) reasons.push("customer network differs from the accepted requirement");
  if (settlement?.success !== true) reasons.push("no successful facilitator settlement report");
  if (settlement?.network !== required.network) reasons.push("reported settlement network differs from the accepted requirement");
  if (!/^0x[0-9a-fA-F]{64}$/.test(settlement?.transaction ?? "")) reasons.push("reported settlement has no transaction coordinate");
  if (settlement?.payer !== undefined && (typeof settlement.payer !== "string" || settlement.payer.toLowerCase() !== address)) reasons.push("reported payer differs from the customer");
  if (settlement?.amount !== undefined && settlement.amount !== required.amount) reasons.push("reported amount differs from the accepted requirement");
  if (challenge !== undefined) {
    if (challenge?.x402Version !== 2 || challenge.resource?.url !== request.url
      || !Array.isArray(challenge.accepts) || !challenge.accepts.some(option => canonicalJson(option) === canonicalJson(required))) {
      reasons.push("purchase does not answer the native challenge");
    }
  }
  if (payment !== undefined && (payment?.x402Version !== 2 || canonicalJson(payment.accepted ?? null) !== canonicalJson(required))) {
    reasons.push("signed payment does not carry the accepted requirement");
  }
  let responseObserved = false;
  if (delivery?.status === value.status && delivery?.encoding === "base64"
    && Number.isSafeInteger(delivery.bytes) && delivery.bytes >= 0 && delivery.bytes <= 64 * 1024 * 1024
    && typeof delivery.body === "string" && delivery.body.length <= 4 * Math.ceil(delivery.bytes / 3)
    && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(delivery.body)) {
    const bytes = Uint8Array.from(atob(delivery.body), character => character.charCodeAt(0));
    responseObserved = bytes.byteLength === delivery.bytes && sha256Bytes(bytes) === delivery.sha256;
  }
  return Object.freeze({
    evidence: "facilitator-reported", settlementReported: reasons.length === 0,
    responseObserved, acceptance: "unobserved", reasons: Object.freeze(reasons),
  });
}

/** A whole observation in the payer's journal; cells cannot invent a receipt. */
export function purchaseObservationRow(observation, recordedAt) {
  const admitted = x402PurchaseObservationCarrier.assert(observation, "native purchase observation");
  if (typeof recordedAt !== "string" || !Number.isFinite(Date.parse(recordedAt))) throw new TypeError("purchase observation requires a recorded UTC coordinate");
  return Object.freeze([admitted.customer, "x402.http-purchase.observed", admitted, recordedAt]);
}

/** Recover exactly one recorded purchase. Historical synthetic cells remain claims. */
export function purchaseObservationCollector() {
  let observation;
  let count = 0;
  return Object.freeze({
    push(row) {
      if (!Array.isArray(row) || row.length !== 4) throw new TypeError("purchase journal requires an EAVT tuple");
      if (row[1] !== "x402.http-purchase.observed") return;
      const value = x402PurchaseObservationCarrier.assert(row[2], "recorded purchase observation");
      if (row[0] !== value.customer) throw new TypeError("purchase journal customer differs from the recorded payer");
      observation = value;
      count += 1;
    },
    read() {
      if (count !== 1) throw new TypeError(`purchase journal requires exactly one observation, found ${count}`);
      return observation;
    },
  });
}
