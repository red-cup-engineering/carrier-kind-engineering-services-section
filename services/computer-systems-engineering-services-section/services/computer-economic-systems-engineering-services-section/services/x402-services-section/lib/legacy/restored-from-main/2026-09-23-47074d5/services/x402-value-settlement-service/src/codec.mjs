/**
 * x402-value-settlement-service/codec — finite value challenge, payment,
 * receipt, and settlement judgment for the x402/ap2/l402 rails.
 *
 * This package owns the JSON material and logic used to book a
 * rail-neutral value settlement once the wire-protocol boundary
 * (`@red-cup-engineering/x402-services-section` and its sibling seller/
 * facilitator services here) has already admitted a payment. The law: a
 * payment answers the challenge, debit and credit conserve value, and the
 * receipt exposes the settlement as append-only statement rows instead of a
 * hidden side effect. `ledgerConserved`/`ledgerComplete` are the same
 * `GradedAdditive` conservation-law reader
 * (`@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/conservation`) used for any
 * graded-additive quantity in the house tree, not a settlement-specific
 * reimplementation.
 *
 * @packageDocumentation
 */
import { schemaFrom } from "@red-cup-engineering/computer-system-engine/contracts";
import { gradedCompleteBy, gradedConservedBy } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/conservation";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { toEavt, eavtObject } from "./eavt-tuple.mjs";

function nonempty(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`${label}: expected non-empty string`);
  return value;
}

const railSchema = { enum: ["x402", "ap2", "l402"] };
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
    kind: { const: "metroplat.witness-ledger-reference" },
    path: { type: "string", minLength: 1 },
    mediaType: { type: "string", minLength: 1 },
    rows: { type: "integer", minimum: 0 },
    malformed: { type: "integer", minimum: 0 },
  },
  additionalProperties: false,
};

export const valueQuantitySchema = {
  $id: "x402-value-settlement/quantity",
  title: "ValueSettlementQuantity",
  description: "A rail-neutral exact value quantity: signed rational amount plus commodity grade.",
  type: "object",
  required: ["kind", "num", "den", "commodity"],
  properties: {
    kind: { const: "value-settlement.quantity" },
    num: { type: "integer" },
    den: { type: "integer", minimum: 1 },
    commodity: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const x402ChallengeSchema = {
  $id: "x402-value-settlement/x402-challenge",
  title: "X402Challenge",
  description: "HTTP 402-style value-settlement challenge as admissible JSON boundary material.",
  type: "object",
  required: ["kind", "id", "resource", "payee", "amount", "rails", "issuedAt"],
  properties: {
    kind: { const: "x402.challenge" },
    id: { type: "string", minLength: 1 },
    resource: { type: "string", minLength: 1 },
    payee: { type: "string", minLength: 1 },
    amount: { $ref: "quantity" },
    rails: { type: "array", items: railSchema, minItems: 1 },
    issuedAt: { type: "string", minLength: 1 },
    memo: { type: "string" },
  },
  additionalProperties: false,
};

export const x402PaymentSchema = {
  $id: "x402-value-settlement/x402-payment",
  title: "X402Payment",
  description: "A membrane-crossing payment authorization answering an x402/AP2/L402 challenge.",
  type: "object",
  required: ["kind", "id", "challengeId", "resource", "payer", "payee", "amount", "rail", "authorization", "paidAt", "membrane"],
  properties: {
    kind: { const: "x402.payment" },
    id: { type: "string", minLength: 1 },
    challengeId: { type: "string", minLength: 1 },
    resource: { type: "string", minLength: 1 },
    payer: { type: "string", minLength: 1 },
    payee: { type: "string", minLength: 1 },
    amount: { $ref: "quantity" },
    rail: railSchema,
    authorization: { type: "string", minLength: 1 },
    paidAt: { type: "string", minLength: 1 },
    membrane: { const: "across" },
  },
  additionalProperties: false,
};

export const x402ReceiptSchema = {
  $id: "x402-value-settlement/x402-receipt",
  title: "X402Receipt",
  description: "A recorded value-settlement receipt: debit equals credit and the boundary event is logged as EAVT rows.",
  type: "object",
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
  ],
  properties: {
    kind: { const: "x402.receipt" },
    id: { type: "string", minLength: 1 },
    challengeId: { type: "string", minLength: 1 },
    paymentId: { type: "string", minLength: 1 },
    resource: { type: "string", minLength: 1 },
    payer: { type: "string", minLength: 1 },
    payee: { type: "string", minLength: 1 },
    debit: { $ref: "quantity" },
    credit: { $ref: "quantity" },
    rail: railSchema,
    settledAt: { type: "string", minLength: 1 },
    valueConserved: { type: "boolean" },
    statementLog: {
      type: "array",
      minItems: 1,
      items: eavtTupleSchema,
    },
    statementLogReference: statementLogReferenceSchema,
  },
  additionalProperties: false,
};

export const x402PaymentJudgmentSchema = {
  $id: "x402-value-settlement/x402-settlement-judgment",
  title: "X402PaymentJudgment",
  description: "Witness or obstruction for an x402 value-settlement receipt.",
  type: "object",
  required: ["kind", "challenge", "payment", "receipt", "ok", "reasons"],
  properties: {
    kind: { enum: ["x402.settlement:witness", "x402.settlement-obstruction"] },
    challenge: { $ref: "x402-challenge" },
    payment: { $ref: "x402-payment" },
    receipt: { $ref: "x402-receipt" },
    ok: { type: "boolean" },
    reasons: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};

export const webSubPublicationSchema = {
  $id: "x402-value-settlement/websub-publication",
  title: "WebSubPublication",
  description: "A WebSub-style publication face over the same append-only EAVT settlement rows.",
  type: "object",
  required: ["kind", "topic", "hub", "self", "contentType", "updates", "eventIds"],
  properties: {
    kind: { const: "websub.publication" },
    topic: { type: "string", minLength: 1 },
    hub: { type: "string", minLength: 1 },
    self: { type: "string", minLength: 1 },
    contentType: { const: "application/eavt+jsonl; charset=utf-8" },
    updates: { type: "array", items: eavtTupleSchema },
    eventIds: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};

export const valueConflictSchema = {
  type: "object",
  required: ["attribute", "sources", "values"],
  properties: {
    attribute: jsonValueSchema,
    sources: { type: "array", items: jsonValueSchema, minItems: 2 },
    values: { type: "array", items: jsonValueSchema, minItems: 2 },
  },
  additionalProperties: false,
};

export const eavtCohomologyReadoutSchema = {
  type: "object",
  required: ["source", "stages", "duplicates", "conflicts", "coordinationCost", "cohomology", "orderRecorded", "valueConserved"],
  properties: {
    source: { const: "eavt" },
    stages: { type: "array", items: { type: "string", minLength: 1 } },
    duplicates: { type: "array", items: { type: "string", minLength: 1 } },
    conflicts: { type: "array", items: valueConflictSchema },
    coordinationCost: { type: "integer", minimum: 0 },
    cohomology: {
      type: "object",
      required: ["degree", "rank", "vanishes"],
      properties: {
        degree: { const: 1 },
        rank: { type: "integer", minimum: 0 },
        vanishes: { type: "boolean" },
      },
      additionalProperties: false,
    },
    orderRecorded: { type: "boolean" },
    valueConserved: { type: "boolean" },
  },
  additionalProperties: false,
};

export const thermodynamicLedgerMapSchema = {
  type: "object",
  required: ["source", "landauerBits", "coordinationCost", "landauerFree", "receiptDischarge", "balanced", "physicalScaleBoundary"],
  properties: {
    source: { const: "coordinationCohomology.landauerEntropy" },
    landauerBits: { type: "integer", minimum: 0 },
    coordinationCost: { type: "integer", minimum: 0 },
    landauerFree: { type: "boolean" },
    receiptDischarge: { type: "integer", minimum: 0 },
    balanced: { type: "boolean" },
    physicalScaleBoundary: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const valueSettlementLogSchema = {
  $id: "x402-value-settlement/witnessed-settlement-log",
  title: "ValueSettlementLog",
  description: "A durable settlement-log reading over EAVT rows, WebSub publication, AP2/x402 receipts, and coordination-cost residue.",
  type: "object",
  required: ["kind", "rows", "rowIds", "receipts", "ap2Receipts", "settlement", "thermodynamics", "missing", "ok"],
  properties: {
    kind: { const: "metroplat.witnessed-settlement-log" },
    rows: { type: "array", items: eavtTupleSchema },
    rowIds: { type: "array", items: { type: "string", minLength: 1 } },
    publication: { $ref: "websub-publication" },
    receipts: { type: "array", items: { $ref: "x402-receipt" } },
    ap2Receipts: { type: "array", items: { type: "string", minLength: 1 } },
    settlement: eavtCohomologyReadoutSchema,
    thermodynamics: thermodynamicLedgerMapSchema,
    missing: { type: "array", items: { type: "string", minLength: 1 } },
    ok: { type: "boolean" },
  },
  additionalProperties: false,
};

export const valueQuantityContract = schemaFrom(valueQuantitySchema);
export const x402ChallengeContract = schemaFrom(x402ChallengeSchema, [valueQuantityContract]);
export const x402PaymentContract = schemaFrom(x402PaymentSchema, [valueQuantityContract]);
export const x402ReceiptContract = schemaFrom(x402ReceiptSchema, [valueQuantityContract]);
// x402PaymentJudgmentSchema references the challenge/payment/receipt
// schemas by $ref (never by embedding their raw schema literal — a nested
// $id resolves relative to its embedding document, not its own declared
// address, so an embedded copy corrupts its own descendants' $refs).
// valueQuantityContract is listed directly since none of the three schema
// $refs pull it in as a compiled dependency of their own $ref (only their
// contracts' `.references` do, transitively).
export const x402PaymentJudgmentContract = schemaFrom(x402PaymentJudgmentSchema, [
  valueQuantityContract,
  x402ChallengeContract,
  x402PaymentContract,
  x402ReceiptContract,
]);
export const webSubPublicationContract = schemaFrom(webSubPublicationSchema);
export const valueSettlementLogContract = schemaFrom(valueSettlementLogSchema, [
  valueQuantityContract,
  x402ReceiptContract,
  webSubPublicationContract,
]);

function rail(value) {
  if (value !== "x402" && value !== "ap2" && value !== "l402") throw new TypeError(`x402 rail: unsupported rail ${String(value)}`);
  return value;
}

function rails(values) {
  const out = [];
  for (const value of values) {
    const admitted = rail(value);
    if (!out.includes(admitted)) out.push(admitted);
  }
  if (out.length === 0) throw new TypeError("x402 rails: expected at least one accepted rail");
  return Object.freeze(out);
}

/** Admit an exact rail-neutral value quantity. */
export function valueQuantity(num, den, commodity) {
  return valueQuantityContract.assert(Object.freeze({
    kind: "value-settlement.quantity",
    num,
    den,
    commodity: nonempty(commodity, "commodity"),
  }), "value settlement quantity");
}

/** Alias for callers reading value quantity as a boundary view. */
export const valueQuantityView = valueQuantity;

/** Admit an HTTP 402-style challenge boundary. */
export function x402Challenge(input) {
  return x402ChallengeContract.assert(Object.freeze({
    kind: "x402.challenge",
    id: nonempty(input.id, "challenge id"),
    resource: nonempty(input.resource, "challenge resource"),
    payee: nonempty(input.payee, "challenge payee"),
    amount: valueQuantityContract.assert(input.amount, "challenge amount"),
    rails: rails(input.rails),
    issuedAt: nonempty(input.issuedAt, "challenge issuedAt"),
    ...(input.memo === undefined ? {} : { memo: input.memo }),
  }), "x402 challenge");
}

/** Construct the payment authorization that crosses the membrane in response to a challenge. */
export function paymentFromChallenge(challenge, options) {
  const admitted = x402ChallengeContract.assert(challenge, "x402 challenge");
  const selectedRail = rail(options.rail ?? admitted.rails[0] ?? "x402");
  if (!admitted.rails.includes(selectedRail)) throw new TypeError(`paymentFromChallenge: rail ${selectedRail} is not accepted by challenge ${admitted.id}`);
  return x402PaymentContract.assert(Object.freeze({
    kind: "x402.payment",
    id: options.id ?? `${admitted.id}/payment`,
    challengeId: admitted.id,
    resource: admitted.resource,
    payer: nonempty(options.payer, "payment payer"),
    payee: admitted.payee,
    amount: admitted.amount,
    rail: selectedRail,
    authorization: nonempty(options.authorization, "payment authorization"),
    paidAt: options.paidAt ?? admitted.issuedAt,
    membrane: "across",
  }), "x402 payment");
}

function sameQuantity(left, right) {
  return left.commodity === right.commodity &&
    BigInt(left.num) * BigInt(right.den) === BigInt(right.num) * BigInt(left.den);
}

function paymentChallengeReasons(challenge, payment) {
  const reasons = [];
  if (payment.challengeId !== challenge.id) reasons.push("payment must answer the challenge");
  if (payment.resource !== challenge.resource) reasons.push("payment resource must match challenge resource");
  if (payment.payee !== challenge.payee) reasons.push("payment payee must match challenge payee");
  if (!challenge.rails.includes(payment.rail)) reasons.push("payment rail must be accepted by the challenge");
  if (!sameQuantity(payment.amount, challenge.amount)) reasons.push("payment amount must match challenged amount");
  return Object.freeze(reasons);
}

function addQuantity(left, right) {
  if (left.commodity !== right.commodity) {
    throw new TypeError(`value quantity add: commodities differ (${left.commodity} vs ${right.commodity})`);
  }
  const num = BigInt(left.num) * BigInt(right.den) + BigInt(right.num) * BigInt(left.den);
  const den = BigInt(left.den) * BigInt(right.den);
  return valueQuantity(Number(num), Number(den), left.commodity);
}

/** `ValueQuantity` as a `GradedAdditive`: the grade (sector) is the commodity
 *  — you can't net a USD debit against a BTC credit any more than physics
 *  nets charge against baryon number, and `commodity` is exactly that kind
 *  of superselection label. Exact BigInt cross-multiplication throughout,
 *  matching `sameQuantity`'s existing exactness discipline. */
const valueQuantityAdditive = Object.freeze({
  gradeOf: (quantity) => quantity.commodity,
  add: addQuantity,
  isZero: (quantity) => quantity.num === 0,
  negate: (quantity) => valueQuantity(-quantity.num, quantity.den, quantity.commodity),
});

function signedAmount(entry) {
  return entry.sign === "debit" ? valueQuantityAdditive.negate(entry.quantity) : entry.quantity;
}

/**
 * Whether a whole ledger of signed debit/credit legs conserves value per
 * commodity (sector) — generalizing the single-pair `valueConserved` check
 * (now a thin special case of this) to any number of legs, via the
 * `GradedAdditive` abstraction (built for physical conservation laws graded
 * by sector).
 * @param {readonly {quantity: object, sign: "debit"|"credit"}[]} entries
 */
export function ledgerConserved(entries) {
  return gradedConservedBy(entries.map(signedAmount), valueQuantityAdditive);
}

/**
 * Infer the one missing leg's signed quantity that would make a ledger
 * conserve (residual confined to one commodity) — the completion half of
 * `ledgerConserved`: "here are N-1 legs of a settlement, what must the last
 * one be." The inferred amount's sign says which side it belongs on
 * (positive = credit-shaped, negative = debit-shaped).
 */
export function ledgerComplete(known) {
  return gradedCompleteBy(known.map(signedAmount), valueQuantityAdditive);
}

/** True when debit and credit name the same exact value quantity — the
 *  degenerate one-debit/one-credit case of `ledgerConserved`. */
export function valueConserved(debit, credit) {
  const d = valueQuantityContract.assert(debit, "settlement debit");
  const c = valueQuantityContract.assert(credit, "settlement credit");
  return ledgerConserved([
    { quantity: d, sign: "debit" },
    { quantity: c, sign: "credit" },
  ]).conserved;
}

function receiptStatementRows(receipt) {
  const e = Object.freeze(["metroplat", "value-settlement", "x402", "receipt", receipt.id]);
  const t = receipt.settledAt;
  return Object.freeze([
    toEavt({ e, a: "kind", v: "x402.settlement", t }),
    toEavt({ e, a: "challenge", v: receipt.challengeId, t }),
    toEavt({ e, a: "payment", v: receipt.paymentId, t }),
    toEavt({ e, a: "resource", v: receipt.resource, t }),
    toEavt({ e, a: "payer", v: receipt.payer, t }),
    toEavt({ e, a: "payee", v: receipt.payee, t }),
    toEavt({ e, a: "debit", v: receipt.debit, t }),
    toEavt({ e, a: "credit", v: receipt.credit, t }),
    toEavt({ e, a: "rail", v: receipt.rail, t }),
    toEavt({ e, a: "valueConserved", v: receipt.valueConserved, t }),
  ]);
}

function receiptIdFromRows(rows, fallback) {
  const first = rows[0];
  if (first === undefined) return fallback;
  const entity = eavtObject(first).e;
  if (Array.isArray(entity)) {
    const candidate = entity.at(-1);
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate;
  }
  return fallback;
}

/** Admit a receipt boundary: the statement material is either embedded rows or a durable ledger reference, never neither or both. */
export function admitX402Receipt(value, context = "x402 receipt") {
  const admitted = x402ReceiptContract.assert(value, context);
  const hasLedger = admitted.statementLog !== undefined;
  const hasReference = admitted.statementLogReference !== undefined;
  if (hasLedger === hasReference) {
    throw new TypeError(`${context}: expected exactly one of statementLog or statementLogReference`);
  }
  return admitted;
}

/** Build the recorded receipt for a payment that answers a challenge. */
export function receiptFromPayment(challenge, payment, options = {}) {
  const c = x402ChallengeContract.assert(challenge, "x402 challenge");
  const p = x402PaymentContract.assert(payment, "x402 payment");
  const paymentReasons = paymentChallengeReasons(c, p);
  if (paymentReasons.length > 0) throw new TypeError(`receiptFromPayment: ${paymentReasons.join("; ")}`);
  const settledAt = options.settledAt ?? p.paidAt;
  const base = Object.freeze({
    kind: "x402.receipt",
    id: options.id ?? `${p.id}/receipt`,
    challengeId: c.id,
    paymentId: p.id,
    resource: p.resource,
    payer: p.payer,
    payee: p.payee,
    debit: p.amount,
    credit: p.amount,
    rail: p.rail,
    settledAt,
    valueConserved: valueConserved(p.amount, p.amount),
  });
  return admitX402Receipt(Object.freeze({
    ...base,
    statementLog: receiptStatementRows(base),
  }), "x402 receipt");
}

/** Extract the append-only statement rows exposed by a receipt. */
export function statementLogFromReceipt(receipt) {
  const admitted = admitX402Receipt(receipt, "x402 receipt");
  if (admitted.statementLog === undefined) throw new TypeError("statementLogFromReceipt: receipt carries a statementLogReference, not embedded statement rows");
  return Object.freeze(admitted.statementLog.map(toEavt));
}

/**
 * @typedef {{push(row: unknown): void, read(): object}} X402ReceiptStatementCollector
 */

/** @returns {X402ReceiptStatementCollector} */
export function x402ReceiptStatementCollector() {
  const state = {};
  let first;
  let rows = 0;
  const push = (eavt) => {
    first ??= eavt;
    rows += 1;
    const row = eavtObject(eavt);
    if (typeof row.a === "string") state[row.a] = row.v;
  };
  return Object.freeze({
    push,
    read: () => {
      const debit = valueQuantityContract.assert(state.debit, "receipt log debit");
      const credit = valueQuantityContract.assert(state.credit, "receipt log credit");
      const fallbackId = typeof state.payment === "string" ? `${state.payment}/receipt` : "receipt-from-log";
      return Object.freeze({
        kind: "x402.receipt",
        id: receiptIdFromRows(first === undefined ? [] : [first], fallbackId),
        challengeId: nonempty(String(state.challenge ?? ""), "receipt log challenge"),
        paymentId: nonempty(String(state.payment ?? ""), "receipt log payment"),
        resource: nonempty(String(state.resource ?? ""), "receipt log resource"),
        payer: nonempty(String(state.payer ?? ""), "receipt log payer"),
        payee: nonempty(String(state.payee ?? ""), "receipt log payee"),
        debit,
        credit,
        rail: rail(state.rail),
        settledAt: nonempty(String(first === undefined ? "" : eavtObject(first).t), "receipt log settledAt"),
        valueConserved: state.valueConserved === true && valueConserved(debit, credit),
        statementRows: rows,
      });
    },
  });
}

/** Read statement rows back into a receipt-shaped state object when all required settlement cells are present. */
export function receiptFromStatementLog(rows) {
  const collector = x402ReceiptStatementCollector();
  for (const row of rows) collector.push(row);
  const { statementRows: _statementRows, ...receipt } = collector.read();
  return Object.freeze(receipt);
}

/** Decide whether the receipt is a valid exchange over its own exposed ledger rows. */
export function isCompleteExchange(receipt) {
  const r = admitX402Receipt(receipt, "x402 receipt");
  const attrs = new Set(statementLogFromReceipt(r).map((row) => eavtObject(row).a));
  return r.valueConserved === true &&
    valueConserved(r.debit, r.credit) &&
    attrs.has("challenge") &&
    attrs.has("payment") &&
    attrs.has("valueConserved");
}

/** Verify challenge, payment, receipt, conservation, and statement exposure as one settlement judgment. */
export function verifyX402Payment(challenge, payment, receipt) {
  const c = x402ChallengeContract.assert(challenge, "x402 challenge");
  const p = x402PaymentContract.assert(payment, "x402 payment");
  const r = admitX402Receipt(receipt, "x402 receipt");
  const reasons = [...paymentChallengeReasons(c, p)];
  if (r.challengeId !== c.id) reasons.push("receipt challenge id must match challenge");
  if (r.paymentId !== p.id) reasons.push("receipt payment id must match payment");
  if (r.resource !== p.resource || r.payer !== p.payer || r.payee !== p.payee) reasons.push("receipt boundary parties must match payment");
  if (!valueConserved(r.debit, r.credit) || !r.valueConserved) reasons.push("receipt debit and credit must conserve value");
  if (!isCompleteExchange(r)) reasons.push("receipt must expose challenge, payment, and value-conserved statement rows");
  const ok = reasons.length === 0;
  return x402PaymentJudgmentContract.assert(Object.freeze({
    kind: ok ? "x402.settlement:witness" : "x402.settlement-obstruction",
    challenge: c,
    payment: p,
    receipt: r,
    ok,
    reasons: Object.freeze(reasons),
  }), "x402 settlement judgment");
}

/** Deterministic structural receipt id over the canonical settlement material. */
export function x402ReceiptFingerprint(receipt) {
  return `structural:${canonicalJson(requireJsonValue(receipt, "x402 receipt"))}`;
}
