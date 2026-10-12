/**
 * integrations/x402/codec — finite value challenge, payment, receipt, and settlement judgment.
 *
 * This integration owns the JSON material and logic used by the x402 value-settlement
 * protocol instrument. Rail verification remains outside MetroPlat; the
 * package law is that a payment answers the challenge, debit and credit conserve
 * value, and the receipt exposes the settlement as statement rows instead of a
 * hidden side effect. `ledgerConserved`/`ledgerComplete` are the same
 * `GradedAdditive` conservation-law reader (`core/closure/analysis/conservation.mjs`)
 * used for any graded-additive quantity, not a settlement-specific reimplementation.
 *
 * @packageDocumentation
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-type-engine/types";
import { assertNonemptyString as nonempty } from "../../lib/strings.mts";
import { schemaFrom } from "@red-cup-engineering/feltos/schema/contract";
import { canonicalBytes } from "../../lib/identity/index.mts";

import { requireJsonValue, type JsonValue } from "../../lib/codecs/json/core.mts";
import { eavtObject, toEavt, type EAVT } from "../../lib/codecs/json/jsonl/eavt/index.mts";
import {
  gradedCompleteBy,
  gradedConservedBy,
  type GradedAdditive,
  type GradedCompletionBy,
} from "@red-cup-engineering/feltos/math/physics/conservation";

const railSchema = { enum: ["x402", "ap2", "l402"] } as const;
const jsonValueSchema = {};
const eavtTupleSchema = {
  type: "array",
  minItems: 4,
  maxItems: 4,
  items: jsonValueSchema,
} as const;

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
} as const;

export const valueQuantitySchema = {
  $id: "metroplat/integrations/x402/quantity",
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
} as const;

export const x402ChallengeSchema = {
  $id: "metroplat/integrations/x402/x402-challenge",
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
} as const;

export const x402PaymentSchema = {
  $id: "metroplat/integrations/x402/x402-payment",
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
} as const;

export const x402ReceiptSchema = {
  $id: "metroplat/integrations/x402/x402-receipt",
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
} as const;

export const x402PaymentJudgmentSchema = {
  $id: "metroplat/integrations/x402/x402-settlement-judgment",
  title: "X402PaymentJudgment",
  description: "Witness or obstruction for an x402 value-settlement receipt.",
  type: "object",
  required: ["kind", "challenge", "payment", "receipt", "ok", "reasons"],
  properties: {
    kind: { enum: ["x402.settlement:witness", "x402.settlement-obstruction"] },
    challenge: x402ChallengeSchema,
    payment: x402PaymentSchema,
    receipt: x402ReceiptSchema,
    ok: { type: "boolean" },
    reasons: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
} as const;

export const webSubPublicationSchema = {
  $id: "metroplat/integrations/x402/websub-publication",
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
} as const;

const valueConflictSchema = {
  type: "object",
  required: ["attribute", "sources", "values"],
  properties: {
    attribute: jsonValueSchema,
    sources: { type: "array", items: jsonValueSchema, minItems: 2 },
    values: { type: "array", items: jsonValueSchema, minItems: 2 },
  },
  additionalProperties: false,
} as const;

const eavtCohomologyReadoutSchema = {
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
} as const;

const thermodynamicLedgerMapSchema = {
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
} as const;

export const valueSettlementLogSchema = {
  $id: "metroplat/integrations/x402/witnessed-settlement-log",
  title: "ValueSettlementLog",
  description: "A durable settlement-log reading over EAVT rows, WebSub publication, AP2/x402 receipts, and coordination-cost residue.",
  type: "object",
  required: ["kind", "rows", "rowIds", "receipts", "ap2Receipts", "settlement", "thermodynamics", "missing", "ok"],
  properties: {
    kind: { const: "metroplat.witnessed-settlement-log" },
    rows: { type: "array", items: eavtTupleSchema },
    rowIds: { type: "array", items: { type: "string", minLength: 1 } },
    publication: webSubPublicationSchema,
    receipts: { type: "array", items: x402ReceiptSchema },
    ap2Receipts: { type: "array", items: { type: "string", minLength: 1 } },
    settlement: eavtCohomologyReadoutSchema,
    thermodynamics: thermodynamicLedgerMapSchema,
    missing: { type: "array", items: { type: "string", minLength: 1 } },
    ok: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

export const valueQuantityContract = schemaFrom(valueQuantitySchema);
export const x402ChallengeContract = schemaFrom(x402ChallengeSchema, [valueQuantityContract]);
export const x402PaymentContract = schemaFrom(x402PaymentSchema, [valueQuantityContract]);
export const x402ReceiptContract = schemaFrom(x402ReceiptSchema, [valueQuantityContract]);
export const x402PaymentJudgmentContract = schemaFrom(x402PaymentJudgmentSchema, [
  x402ChallengeContract,
  x402PaymentContract,
  x402ReceiptContract,
]);
export const webSubPublicationContract = schemaFrom(webSubPublicationSchema);
export const valueSettlementLogContract = schemaFrom(valueSettlementLogSchema, [x402ReceiptContract]);

export type X402Rail = "x402" | "ap2" | "l402";

export type ValueQuantity = FromJsonSchema<typeof valueQuantitySchema>;

export type X402Challenge = FromJsonSchema<typeof x402ChallengeSchema> & {
  readonly amount: ValueQuantity;
};

export type X402Payment = FromJsonSchema<typeof x402PaymentSchema> & {
  readonly amount: ValueQuantity;
};

export type X402Receipt = FromJsonSchema<typeof x402ReceiptSchema> & {
  readonly debit: ValueQuantity;
  readonly credit: ValueQuantity;
  readonly statementLog?: readonly EAVT[];
  readonly statementLogReference?: X402ReceiptStatementLogReference;
};

export type X402ReceiptStatementLogReference = Readonly<{
  readonly kind: "metroplat.witness-ledger-reference";
  readonly path: string;
  readonly mediaType: string;
  readonly rows: number;
  readonly malformed?: number;
}>;

export type X402ReceiptCore = Omit<X402Receipt, "statementLog" | "statementLogReference">;

export type X402PaymentJudgment = FromJsonSchema<typeof x402PaymentJudgmentSchema> & {
  readonly challenge: X402Challenge;
  readonly payment: X402Payment;
  readonly receipt: X402Receipt;
};

export type WebSubPublication = FromJsonSchema<typeof webSubPublicationSchema> & {
  readonly updates: readonly EAVT[];
};

/** A real cross-writer disagreement: the same attribute (`A` — the fact being
 *  asserted; EAVT's own doctrine reads `E = caller, A = morphism, V = return
 *  value`) reported with different values by different callers. `sources[i]`
 *  wrote `values[i]`. Not grouped by entity or time — a settlement reconciles
 *  everything admitted together, the same way `glueClaimSessions` does. */
export type ValueConflict = FromJsonSchema<typeof valueConflictSchema> & {
  readonly attribute: JsonValue;
  readonly sources: readonly JsonValue[];
  readonly values: readonly JsonValue[];
};

export type EavtCohomologyReadout = FromJsonSchema<typeof eavtCohomologyReadoutSchema> & {
  readonly conflicts: readonly ValueConflict[];
};

export type ThermodynamicLedgerMap = FromJsonSchema<typeof thermodynamicLedgerMapSchema>;

export type ValueSettlementLog = FromJsonSchema<typeof valueSettlementLogSchema> & {
  readonly rows: readonly EAVT[];
  readonly publication?: WebSubPublication;
  readonly receipts: readonly X402Receipt[];
  readonly settlement: EavtCohomologyReadout;
  readonly thermodynamics: ThermodynamicLedgerMap;
};


function rail(value: X402Rail): X402Rail {
  if (value !== "x402" && value !== "ap2" && value !== "l402") throw new TypeError(`x402 rail: unsupported rail ${String(value)}`);
  return value;
}

function rails(values: readonly X402Rail[]): readonly X402Rail[] {
  const out: X402Rail[] = [];
  for (const value of values) {
    const admitted = rail(value);
    if (!out.includes(admitted)) out.push(admitted);
  }
  if (out.length === 0) throw new TypeError("x402 rails: expected at least one accepted rail");
  return Object.freeze(out);
}

/** Admit an exact rail-neutral value quantity. */
export function valueQuantity(num: number, den: number, commodity: string): ValueQuantity {
  return valueQuantityContract.assert(Object.freeze({
    kind: "value-settlement.quantity" as const,
    num,
    den,
    commodity: nonempty(commodity, "commodity"),
  }), "value settlement quantity") as ValueQuantity;
}

/** Alias for callers reading value quantity as a boundary view. */
export const valueQuantityView = valueQuantity;

/** Admit an HTTP 402-style challenge boundary. */
export function x402Challenge(input: {
  readonly id: string;
  readonly resource: string;
  readonly payee: string;
  readonly amount: ValueQuantity;
  readonly rails: readonly X402Rail[];
  readonly issuedAt: string;
  readonly memo?: string;
}): X402Challenge {
  return x402ChallengeContract.assert(Object.freeze({
    kind: "x402.challenge" as const,
    id: nonempty(input.id, "challenge id"),
    resource: nonempty(input.resource, "challenge resource"),
    payee: nonempty(input.payee, "challenge payee"),
    amount: valueQuantityContract.assert(input.amount, "challenge amount") as ValueQuantity,
    rails: rails(input.rails),
    issuedAt: nonempty(input.issuedAt, "challenge issuedAt"),
    ...(input.memo === undefined ? {} : { memo: input.memo }),
  }), "x402 challenge") as X402Challenge;
}

/** Construct the payment authorization that crosses the membrane in response to a challenge. */
export function paymentFromChallenge(
  challenge: X402Challenge,
  options: {
    readonly id?: string;
    readonly payer: string;
    readonly rail?: X402Rail;
    readonly authorization: string;
    readonly paidAt?: string;
  },
): X402Payment {
  const admitted = x402ChallengeContract.assert(challenge, "x402 challenge") as X402Challenge;
  const selectedRail = rail(options.rail ?? admitted.rails[0] ?? "x402");
  if (!admitted.rails.includes(selectedRail)) throw new TypeError(`paymentFromChallenge: rail ${selectedRail} is not accepted by challenge ${admitted.id}`);
  return x402PaymentContract.assert(Object.freeze({
    kind: "x402.payment" as const,
    id: options.id ?? `${admitted.id}/payment`,
    challengeId: admitted.id,
    resource: admitted.resource,
    payer: nonempty(options.payer, "payment payer"),
    payee: admitted.payee,
    amount: admitted.amount,
    rail: selectedRail,
    authorization: nonempty(options.authorization, "payment authorization"),
    paidAt: options.paidAt ?? admitted.issuedAt,
    membrane: "across" as const,
  }), "x402 payment") as X402Payment;
}

function sameQuantity(left: ValueQuantity, right: ValueQuantity): boolean {
  return left.commodity === right.commodity &&
    BigInt(left.num) * BigInt(right.den) === BigInt(right.num) * BigInt(left.den);
}

function paymentChallengeReasons(challenge: X402Challenge, payment: X402Payment): readonly string[] {
  const reasons: string[] = [];
  if (payment.challengeId !== challenge.id) reasons.push("payment must answer the challenge");
  if (payment.resource !== challenge.resource) reasons.push("payment resource must match challenge resource");
  if (payment.payee !== challenge.payee) reasons.push("payment payee must match challenge payee");
  if (!challenge.rails.includes(payment.rail)) reasons.push("payment rail must be accepted by the challenge");
  if (!sameQuantity(payment.amount, challenge.amount)) reasons.push("payment amount must match challenged amount");
  return Object.freeze(reasons);
}

function addQuantity(left: ValueQuantity, right: ValueQuantity): ValueQuantity {
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
const valueQuantityAdditive: GradedAdditive<ValueQuantity> = Object.freeze({
  gradeOf: (quantity: ValueQuantity) => quantity.commodity,
  add: addQuantity,
  isZero: (quantity: ValueQuantity) => quantity.num === 0,
  negate: (quantity: ValueQuantity) => valueQuantity(-quantity.num, quantity.den, quantity.commodity),
});

/** One signed leg of a settlement ledger: a quantity and which side it sits on. */
export interface LedgerEntry {
  readonly quantity: ValueQuantity;
  readonly sign: "debit" | "credit";
}

function signedAmount(entry: LedgerEntry): ValueQuantity {
  return entry.sign === "debit" ? valueQuantityAdditive.negate(entry.quantity) : entry.quantity;
}

/**
 * Whether a whole ledger of signed debit/credit legs conserves value per
 * commodity (sector) — generalizing the single-pair `valueConserved` check
 * (now a thin special case of this) to any number of legs, via
 * `core/closure/analysis/conservation.mjs`'s `GradedAdditive` abstraction
 * (built for physical conservation laws graded by sector).
 */
export function ledgerConserved(entries: readonly LedgerEntry[]): { readonly conserved: boolean; readonly residual: readonly ValueQuantity[] } {
  return gradedConservedBy(entries.map(signedAmount), valueQuantityAdditive);
}

/**
 * Infer the one missing leg's signed quantity that would make a ledger
 * conserve (residual confined to one commodity) — the completion half of
 * `ledgerConserved`: "here are N-1 legs of a settlement, what must the last
 * one be." The inferred amount's sign says which side it belongs on
 * (positive = credit-shaped, negative = debit-shaped).
 */
export function ledgerComplete(known: readonly LedgerEntry[]): GradedCompletionBy<ValueQuantity> {
  return gradedCompleteBy(known.map(signedAmount), valueQuantityAdditive);
}

/** True when debit and credit name the same exact value quantity — the
 *  degenerate one-debit/one-credit case of `ledgerConserved`. */
export function valueConserved(debit: ValueQuantity, credit: ValueQuantity): boolean {
  const d = valueQuantityContract.assert(debit, "settlement debit") as ValueQuantity;
  const c = valueQuantityContract.assert(credit, "settlement credit") as ValueQuantity;
  return ledgerConserved([
    { quantity: d, sign: "debit" },
    { quantity: c, sign: "credit" },
  ]).conserved;
}

function receiptEntity(id: string): readonly JsonValue[] {
  return Object.freeze(["metroplat", "value-settlement", "x402", "receipt", id] as const);
}

function receiptStatementRows(receipt: Omit<X402Receipt, "statementLog">): readonly EAVT[] {
  const e = receiptEntity(receipt.id);
  const t = receipt.settledAt;
  return Object.freeze([
    toEavt({ e, a: "kind", v: "x402.settlement", t }),
    toEavt({ e, a: "challenge", v: receipt.challengeId, t }),
    toEavt({ e, a: "payment", v: receipt.paymentId, t }),
    toEavt({ e, a: "resource", v: receipt.resource, t }),
    toEavt({ e, a: "payer", v: receipt.payer, t }),
    toEavt({ e, a: "payee", v: receipt.payee, t }),
    toEavt({ e, a: "debit", v: receipt.debit as unknown as JsonValue, t }),
    toEavt({ e, a: "credit", v: receipt.credit as unknown as JsonValue, t }),
    toEavt({ e, a: "rail", v: receipt.rail, t }),
    toEavt({ e, a: "valueConserved", v: receipt.valueConserved, t }),
  ]);
}

function receiptIdFromRows(rows: readonly EAVT[], fallback: string): string {
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
export function admitX402Receipt(value: unknown, context: string = "x402 receipt"): X402Receipt {
  const admitted = x402ReceiptContract.assert(value, context) as X402Receipt;
  const hasLedger = admitted.statementLog !== undefined;
  const hasReference = admitted.statementLogReference !== undefined;
  if (hasLedger === hasReference) {
    throw new TypeError(`${context}: expected exactly one of statementLog or statementLogReference`);
  }
  return admitted;
}

/** Build the recorded receipt for a payment that answers a challenge. */
export function receiptFromPayment(
  challenge: X402Challenge,
  payment: X402Payment,
  options: {
    readonly id?: string;
    readonly settledAt?: string;
  } = {},
): X402Receipt {
  const c = x402ChallengeContract.assert(challenge, "x402 challenge") as X402Challenge;
  const p = x402PaymentContract.assert(payment, "x402 payment") as X402Payment;
  const paymentReasons = paymentChallengeReasons(c, p);
  if (paymentReasons.length > 0) throw new TypeError(`receiptFromPayment: ${paymentReasons.join("; ")}`);
  const settledAt = options.settledAt ?? p.paidAt;
  const base = Object.freeze({
    kind: "x402.receipt" as const,
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
export function statementLogFromReceipt(receipt: X402Receipt): readonly EAVT[] {
  const admitted = admitX402Receipt(receipt, "x402 receipt");
  if (admitted.statementLog === undefined) throw new TypeError("statementLogFromReceipt: receipt carries a statementLogReference, not embedded statement rows");
  return Object.freeze(admitted.statementLog.map(toEavt));
}

export interface X402ReceiptStatementCollector {
  push(row: EAVT): void;
  read(): X402ReceiptCore & { readonly statementRows: number };
}

export function x402ReceiptStatementCollector(): X402ReceiptStatementCollector {
  const state: Record<string, JsonValue> = {};
  let first: EAVT | undefined;
  let rows = 0;
  const push = (eavt: EAVT): void => {
    first ??= eavt;
    rows += 1;
    const row = eavtObject(eavt);
    if (typeof row.a === "string") state[row.a] = row.v;
  };
  return Object.freeze({
    push,
    read: () => {
      const debit = valueQuantityContract.assert(state.debit, "receipt log debit") as ValueQuantity;
      const credit = valueQuantityContract.assert(state.credit, "receipt log credit") as ValueQuantity;
      const fallbackId = typeof state.payment === "string" ? `${state.payment}/receipt` : "receipt-from-log";
      return Object.freeze({
        kind: "x402.receipt" as const,
        id: receiptIdFromRows(first === undefined ? [] : [first], fallbackId),
        challengeId: nonempty(String(state.challenge ?? ""), "receipt log challenge"),
        paymentId: nonempty(String(state.payment ?? ""), "receipt log payment"),
        resource: nonempty(String(state.resource ?? ""), "receipt log resource"),
        payer: nonempty(String(state.payer ?? ""), "receipt log payer"),
        payee: nonempty(String(state.payee ?? ""), "receipt log payee"),
        debit,
        credit,
        rail: rail(state.rail as X402Rail),
        settledAt: nonempty(String(first === undefined ? "" : eavtObject(first).t), "receipt log settledAt"),
        valueConserved: state.valueConserved === true && valueConserved(debit, credit),
        statementRows: rows,
      });
    },
  });
}

/** Read statement rows back into a receipt-shaped state object when all required settlement cells are present. */
export function receiptFromStatementLog(rows: Iterable<EAVT>): X402ReceiptCore {
  const collector = x402ReceiptStatementCollector();
  for (const row of rows) collector.push(row);
  const { statementRows: _statementRows, ...receipt } = collector.read();
  return Object.freeze(receipt);
}

/** Decide whether the receipt is a valid exchange over its own exposed ledger rows. */
export function isCompleteExchange(receipt: X402Receipt): boolean {
  const r = admitX402Receipt(receipt, "x402 receipt");
  const attrs = new Set(statementLogFromReceipt(r).map((row) => eavtObject(row).a));
  return r.valueConserved === true &&
    valueConserved(r.debit, r.credit) &&
    attrs.has("challenge") &&
    attrs.has("payment") &&
    attrs.has("valueConserved");
}

/** Verify challenge, payment, receipt, conservation, and statement exposure as one settlement judgment. */
export function verifyX402Payment(challenge: X402Challenge, payment: X402Payment, receipt: X402Receipt): X402PaymentJudgment {
  const c = x402ChallengeContract.assert(challenge, "x402 challenge") as X402Challenge;
  const p = x402PaymentContract.assert(payment, "x402 payment") as X402Payment;
  const r = admitX402Receipt(receipt, "x402 receipt");
  const reasons: string[] = [...paymentChallengeReasons(c, p)];
  if (r.challengeId !== c.id) reasons.push("receipt challenge id must match challenge");
  if (r.paymentId !== p.id) reasons.push("receipt payment id must match payment");
  if (r.resource !== p.resource || r.payer !== p.payer || r.payee !== p.payee) reasons.push("receipt boundary parties must match payment");
  if (!valueConserved(r.debit, r.credit) || !r.valueConserved) reasons.push("receipt debit and credit must conserve value");
  if (!isCompleteExchange(r)) reasons.push("receipt must expose challenge, payment, and value-conserved statement rows");
  const ok = reasons.length === 0;
  return x402PaymentJudgmentContract.assert(Object.freeze({
    kind: ok ? "x402.settlement:witness" as const : "x402.settlement-obstruction" as const,
    challenge: c,
    payment: p,
    receipt: r,
    ok,
    reasons: Object.freeze(reasons),
  }), "x402 settlement judgment") as X402PaymentJudgment;
}

/** Deterministic structural receipt id over the canonical settlement material. */
export function x402ReceiptFingerprint(receipt: X402Receipt): string {
  return `structural:${canonicalBytes(requireJsonValue(receipt, "x402 receipt") as JsonValue)}`;
}
