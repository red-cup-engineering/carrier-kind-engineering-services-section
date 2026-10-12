/**
 * writing/x402 — organizing's economic standards codec for HTTP 402 payment.
 *
 * A 402 challenge is not a new economic kernel. It is a protocol projection of
 * organizing's record-state work: a resource demands value settlement, a payment
 * authorization crosses the membrane, and the receipt records a witnessed
 * value-conserving exchange in RWIL.
 *
 * Real rail verification remains downstream. This module owns only the
 * rail-neutral organizing carrier and witness law.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { semanticHex } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

import { canonicalJson as canonical } from "@red-cup-engineering/json-services-section/canonical-json";
import { cell } from "@red-cup-engineering/eavt-services-section/ledger/cells";
import { projectStateView } from "@red-cup-engineering/eavt-services-section/ledger/state";
import { eavtRecord } from "@red-cup-engineering/eavt-services-section/row";

const jsonResource = (value, context) => {
  const resource = JSON.parse(JSON.stringify(value));
  if (resource === undefined) throw new TypeError(`${context}: not a JSON value`);
  return resource;
};

const railSchema = { enum: ["x402", "ap2", "l402"] };

export const monetaryQuantitySchema = {
  $id: "organizing/economy/value/quantity",
  title: "OrganizingValueQuantity",
  description:
    "A rail-neutral HTTP channel view of exact graded value: signed exact rational plus commodity grade.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "num", "den", "commodity"],
  properties: {
    kind: { const: "organizing.economy.value.quantity" },
    num: { type: "integer" },
    den: { type: "integer", minimum: 1 },
    commodity: { type: "string", minLength: 1 },
  },
};

export const monetaryQuantityCarrier = schemaFrom(monetaryQuantitySchema);

export const x402ChallengeSchema = {
  $id: "organizing/economy/x402/challenge",
  title: "X402Challenge",
  description:
    "HTTP 402 Payment Required challenge as an organizing-scale value-settlement request.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "id", "resource", "payee", "amount", "rails", "issuedAt"],
  properties: {
    kind: { const: "organizing.economy.x402.challenge" },
    id: { type: "string", minLength: 1 },
    resource: { type: "string", minLength: 1 },
    payee: { type: "string", minLength: 1 },
    amount: { $ref: "organizing/economy/value/quantity" },
    rails: { type: "array", items: railSchema, minItems: 1 },
    issuedAt: { type: "string", minLength: 1 },
    memo: { type: "string" },
  },
};

export const x402ChallengeCarrier = schemaFrom(x402ChallengeSchema);

export const x402PaymentSchema = {
  $id: "organizing/economy/x402/payment",
  title: "X402Payment",
  description:
    "A membrane-crossing payment authorization responding to an x402/AP2/L402 challenge.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "id", "challengeId", "resource", "payer", "payee", "amount", "rail", "authorization", "paidAt"],
  properties: {
    kind: { const: "organizing.economy.x402.payment" },
    id: { type: "string", minLength: 1 },
    challengeId: { type: "string", minLength: 1 },
    resource: { type: "string", minLength: 1 },
    payer: { type: "string", minLength: 1 },
    payee: { type: "string", minLength: 1 },
    amount: { $ref: "organizing/economy/value/quantity" },
    rail: railSchema,
    authorization: { type: "string", minLength: 1 },
    paidAt: { type: "string", minLength: 1 },
    membrane: { const: "across" },
  },
};

export const x402PaymentCarrier = schemaFrom(x402PaymentSchema);

export const x402ReceiptSchema = {
  $id: "organizing/economy/x402/receipt",
  title: "X402Receipt",
  description:
    "The witnessed RWIL settlement receipt for an HTTP 402 exchange; debit equals credit.",
  type: "object",
  additionalProperties: false,
  required: [
    "kind",
    "id",
    "challengeId",
    "paymentId",
    "resource",
    "payer",
    "payee",
    "debit",
    "credit",
    "rail",
    "settledAt",
    "valueConserved",
    "witnessLedger",
  ],
  properties: {
    kind: { const: "organizing.economy.x402.receipt" },
    id: { type: "string", minLength: 1 },
    challengeId: { type: "string", minLength: 1 },
    paymentId: { type: "string", minLength: 1 },
    resource: { type: "string", minLength: 1 },
    payer: { type: "string", minLength: 1 },
    payee: { type: "string", minLength: 1 },
    debit: { $ref: "organizing/economy/value/quantity" },
    credit: { $ref: "organizing/economy/value/quantity" },
    rail: railSchema,
    settledAt: { type: "string", minLength: 1 },
    valueConserved: { type: "boolean" },
    witnessLedger: { type: "array", items: { type: "object" }, minItems: 1 },
  },
};

export const x402ReceiptCarrier = schemaFrom(x402ReceiptSchema);

export function quantity(num, den, commodity) {
  return monetaryQuantityCarrier.assert(
    Object.freeze({
      kind: "organizing.economy.value.quantity",
      num,
      den,
      commodity,
    }),
    "organizing value quantity",
  );
}

export function valueQuantityView(num, den, commodity) {
  return quantity(num, den, commodity);
}

export function paymentFromChallenge(challenge, options) {
  x402ChallengeCarrier.assert(challenge, "x402 challenge");
  const rail = options.rail ?? challenge.rails[0] ?? "x402";
  if (!challenge.rails.includes(rail)) {
    throw new TypeError(`paymentFromChallenge: rail ${rail} is not accepted by challenge ${challenge.id}`);
  }
  return x402PaymentCarrier.assert(
    Object.freeze({
      kind: "organizing.economy.x402.payment",
      id: options.id ?? `${challenge.id}/payment`,
      challengeId: challenge.id,
      resource: challenge.resource,
      payer: options.payer,
      payee: challenge.payee,
      amount: challenge.amount,
      rail,
      authorization: options.authorization,
      paidAt: options.paidAt ?? challenge.issuedAt,
      membrane: "across",
    }),
    "x402 payment",
  );
}

function sameQuantity(left, right) {
  return left.num === right.num && left.den === right.den && left.commodity === right.commodity;
}

function assertPaymentAnswersChallenge(challenge, payment) {
  if (payment.challengeId !== challenge.id) {
    throw new TypeError("receiptFromPayment: payment does not answer the challenge");
  }
  if (payment.resource !== challenge.resource || payment.payee !== challenge.payee) {
    throw new TypeError("receiptFromPayment: payment membrane target differs from the challenge");
  }
  if (!sameQuantity(payment.amount, challenge.amount)) {
    throw new TypeError("receiptFromPayment: payment amount differs from the challenged value");
  }
}

export function valueConserved(debit, credit) {
  return debit.commodity === credit.commodity &&
    BigInt(debit.num) * BigInt(credit.den) === BigInt(credit.num) * BigInt(debit.den);
}

function receiptWitnesses(receipt) {
  const entity = ["organizing", "economy", "x402", "receipt", receipt.id];
  return Object.freeze([
    cell(entity, "kind", "organizing.economy.exchange.settlement", receipt.settledAt),
    cell(entity, "challenge", receipt.challengeId, receipt.settledAt),
    cell(entity, "payment", receipt.paymentId, receipt.settledAt),
    cell(entity, "resource", receipt.resource, receipt.settledAt),
    cell(entity, "payer", receipt.payer, receipt.settledAt),
    cell(entity, "payee", receipt.payee, receipt.settledAt),
    cell(entity, "debit", receipt.debit, receipt.settledAt),
    cell(entity, "credit", receipt.credit, receipt.settledAt),
    cell(entity, "rail", receipt.rail, receipt.settledAt),
    cell(entity, "valueConserved", receipt.valueConserved, receipt.settledAt),
  ]);
}

export function receiptFromPayment(
  challenge,
  payment,
  options = {},
) {
  x402ChallengeCarrier.assert(challenge, "x402 challenge");
  x402PaymentCarrier.assert(payment, "x402 payment");
  assertPaymentAnswersChallenge(challenge, payment);

  const debit = payment.amount;
  const credit = payment.amount;
  const settledAt = options.settledAt ?? payment.paidAt;
  const base = Object.freeze({
    kind: "organizing.economy.x402.receipt",
    id: options.id ?? `${payment.id}/receipt`,
    challengeId: challenge.id,
    paymentId: payment.id,
    resource: payment.resource,
    payer: payment.payer,
    payee: payment.payee,
    debit,
    credit,
    rail: payment.rail,
    settledAt,
    valueConserved: valueConserved(debit, credit),
  });
  return x402ReceiptCarrier.assert(
    Object.freeze({
      ...base,
      witnessLedger: receiptWitnesses(base),
    }),
    "x402 receipt",
  );
}

export function receiptLedgerState(receipt) {
  x402ReceiptCarrier.assert(receipt, "x402 receipt");
  return projectStateView(receipt.witnessLedger, new Set(["kind", "challenge", "payment", "resource", "payer", "payee", "debit", "credit", "rail", "valueConserved"]));
}

export function isWitnessedExchange(receipt) {
  const state = receiptLedgerState(receipt);
  const rows = Object.values(state);
  return rows.some((row) => row.kind === "organizing.economy.exchange.settlement" && row.valueConserved === true);
}

function witnessLogId(log) {
  return semanticHex(log).slice(0, 16);
}

function firstWitnessCoordinate(log) {
  const time = log[0]?.t;
  return typeof time === "string" && time.length > 0 ? time : new Date(0).toISOString();
}

function receiptIdFromEntity(entity) {
  if (!Array.isArray(entity)) return undefined;
  if (entity.length !== 5) return undefined;
  const [scope, economy, protocol, kind, id] = entity;
  return scope === "organizing" && economy === "economy" && protocol === "x402" && kind === "receipt" && typeof id === "string"
    ? id
    : undefined;
}

function asString(value, field) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`receiptFromWitnessLog: missing ${field}`);
  return value;
}

function asBoolean(value, field) {
  if (typeof value !== "boolean") throw new TypeError(`receiptFromWitnessLog: missing ${field}`);
  return value;
}

function asRail(value) {
  if (value === "x402" || value === "ap2" || value === "l402") return value;
  throw new TypeError("receiptFromWitnessLog: missing rail");
}

function receiptStateFromWitnessLog(log) {
  if (log.length === 0) return undefined;
  const entity = log[0].e;
  const entityKey = canonical(entity);
  if (!log.every((row) => canonical(row.e) === entityKey)) return undefined;
  const id = receiptIdFromEntity(entity);
  if (id === undefined) return undefined;
  const state = projectStateView(log, new Set(["kind", "challenge", "payment", "resource", "payer", "payee", "debit", "credit", "rail", "valueConserved"]));
  const view = state[entityKey];
  return view === undefined ? undefined : { id, view };
}

/**
 * witnessLogFromReceipt — read an x402 receipt as its ordered RWIL witness log.
 */
export function witnessLogFromReceipt(receipt) {
  const admitted = x402ReceiptCarrier.assert(receipt, "x402 receipt witness log");
  return Object.freeze(admitted.witnessLedger.map((row) => eavtRecord(row)));
}

/**
 * receiptFromWitnessLog — reconstruct or envelope an x402 receipt around a log.
 *
 * Logs produced by `receiptFromPayment` reconstruct the settlement receipt. Any
 * other ordered RWIL log is still a valid receipt wire because x402 receipts
 * carry `witnessLedger` as the protocol evidence field.
 */
export function receiptFromWitnessLog(log) {
  const witnessLedger = Object.freeze(log.map((row) => eavtRecord(row)));
  const state = receiptStateFromWitnessLog(witnessLedger);
  if (state !== undefined) {
    const { id, view } = state;
    return x402ReceiptCarrier.assert(Object.freeze({
      kind: "organizing.economy.x402.receipt",
      id,
      challengeId: asString(view.challenge, "challenge"),
      paymentId: asString(view.payment, "payment"),
      resource: asString(view.resource, "resource"),
      payer: asString(view.payer, "payer"),
      payee: asString(view.payee, "payee"),
      debit: monetaryQuantityCarrier.assert(view.debit, "receipt debit"),
      credit: monetaryQuantityCarrier.assert(view.credit, "receipt credit"),
      rail: asRail(view.rail),
      settledAt: firstWitnessCoordinate(witnessLedger),
      valueConserved: asBoolean(view.valueConserved, "valueConserved"),
      witnessLedger,
    }), "x402 receipt from witness log");
  }

  const id = `receipt-log-${witnessLogId(witnessLedger)}`;
  const amount = quantity(0, 1, "RWIL");
  return x402ReceiptCarrier.assert(Object.freeze({
    kind: "organizing.economy.x402.receipt",
    id,
    challengeId: `${id}/challenge`,
    paymentId: `${id}/payment`,
    resource: "urn:rwil:shared-log",
    payer: "did:web:dev.bare-cedar-fog.emsenn.net:agents:codex",
    payee: "did:web:dev.bare-cedar-fog.emsenn.net:agents:codex",
    debit: amount,
    credit: amount,
    rail: "x402",
    settledAt: firstWitnessCoordinate(witnessLedger),
    valueConserved: true,
    witnessLedger,
  }), "x402 receipt from witness log");
}

export const x402ReceiptLogReading = Object.freeze({
  id: "trading.x402.receipt",
  toWire: receiptFromWitnessLog,
  fromWire: witnessLogFromReceipt,
});

function admitChallenge(input, verb) {
  return x402ChallengeCarrier.assert(input, verb);
}

function admitPayment(input, verb) {
  return x402PaymentCarrier.assert(input, verb);
}

export const x402PaymentAction = operation({
  verb: "x402-pay",
  inputFormat: "json",
  outputFormat: "json",
  options: ["payer", "rail", "authorization", "paidAt", "id"],
  summary: "Project an HTTP 402 challenge to a membrane-crossing organizing payment view.",
  description:
    "Domain: organizing/economy/x402/challenge plus payer/authorization options. Codomain: organizing/economy/x402/payment. This models the payment crossing the across membrane; it does not integrate or verify a real payment rail.",
  domain: x402ChallengeCarrier,
  codomain: x402PaymentCarrier,
  run: (input, args = {}) => {
    const payer = typeof args.payer === "string" ? args.payer : "";
    const authorization = typeof args.authorization === "string" ? args.authorization : "";
    const rail = typeof args.rail === "string" ? args.rail : undefined;
    const paidAt = typeof args.paidAt === "string" ? args.paidAt : undefined;
    const id = typeof args.id === "string" ? args.id : undefined;
    const options = { payer, authorization };
    if (rail !== undefined) Object.assign(options, { rail });
    if (paidAt !== undefined) Object.assign(options, { paidAt });
    if (id !== undefined) Object.assign(options, { id });
    return jsonResource(paymentFromChallenge(admitChallenge(input, "x402-pay"), options), "x402-payment");
  },
});

export const x402ReceiptAction = operation({
  verb: "x402-receipt",
  inputFormat: "json",
  outputFormat: "json",
  options: ["payment", "settledAt", "id"],
  summary: "Settle an HTTP 402 payment to its witnessed value-conserving receipt.",
  description:
    "Domain: organizing/economy/x402/challenge plus a payment option. Codomain: organizing/economy/x402/receipt, an RWIL witness of the exchange where debit equals credit.",
  domain: x402ChallengeCarrier,
  codomain: x402ReceiptCarrier,
  run: (input, args = {}) => {
    const payment = admitPayment(args.payment, "x402-receipt payment");
    const settledAt = typeof args.settledAt === "string" ? args.settledAt : undefined;
    const id = typeof args.id === "string" ? args.id : undefined;
    const options = {};
    if (settledAt !== undefined) Object.assign(options, { settledAt });
    if (id !== undefined) Object.assign(options, { id });
    return jsonResource(receiptFromPayment(admitChallenge(input, "x402-receipt challenge"), payment, options), "x402-receipt");
  },
});

export const x402Actions = Object.freeze([x402PaymentAction, x402ReceiptAction]);
