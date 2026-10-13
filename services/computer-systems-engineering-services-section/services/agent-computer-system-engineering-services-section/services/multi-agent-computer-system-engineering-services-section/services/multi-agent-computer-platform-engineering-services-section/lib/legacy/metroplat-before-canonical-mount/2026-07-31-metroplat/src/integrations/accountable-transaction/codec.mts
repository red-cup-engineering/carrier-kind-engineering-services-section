/**
 * integrations/accountable-transaction/src/codec — authorization, invocation, settlement, and attestation over one accountable transaction.
 *
 * This branch owns the off-diagonal transaction material used by the accountable
 * transaction protocol. It composes package-owned capability and value-settlement
 * schema contracts, exposes the transaction as an EAVT statement row, signs a
 * structural provenance datom, and reports whether the
 * authorization/payment/attestation legs cohere over the same transaction.
 *
 * @packageDocumentation
 */
import { requireJsonValue, type JsonValue } from "../../lib/codecs/json/core.mts";
import { canonicalBytes } from "../../lib/identity/index.mts";
import type { ChargeValueName } from "../../lib/values/index.mts";
import { eavtObject, toEavt, type EAVT } from "../../lib/codecs/json/jsonl/eavt/index.mts";
import {
  canInvoke,
  capabilityViewContract,
  capabilityViewFromObjectCapability,
  capabilityInvocationContract,
  objectCapabilityContract,
  type CapabilityView,
  type CapabilityInvocation,
  type ObjectCapability,
} from "../../lib/capability/index.mts";
import { captpDeliveryContract, type CapTpDelivery } from "../../lib/capability/captp/index.mts";
import { wasiInvocationContract, type WasiInvocation } from "../../lib/capability/wasi/index.mts";
import { ucanTokenContract, type UcanToken } from "../../lib/capability/ucan/index.mts";
import {
  admitX402Receipt,
  verifyX402Payment,
  x402ChallengeContract,
  x402PaymentContract,
  type X402Challenge,
  type X402Payment,
  type X402Receipt,
} from "../x402/codec.mts";
import {
  accountabilityReportContract,
  transactionAttestationContract,
  transactionFacetWireContract,
  accountableTransactionContract,
} from "./schema.mts";

export {
  accountabilityReportContract,
  transactionAttestationContract,
  transactionFacetWireContract,
  accountableTransactionContract,
} from "./schema.mts";

export type AccountabilityCharge = ChargeValueName;

export interface TransactionAttestation {
  readonly kind: "accountable-transaction.attestation";
  readonly subject: string;
  readonly signer: string;
  readonly signedAt: string;
  readonly datom: readonly [JsonValue, JsonValue, JsonValue, JsonValue, JsonValue];
  readonly signature: string;
}

export interface TransactionPayment {
  readonly kind: "accountable-transaction.settlement";
  readonly challenge: X402Challenge;
  readonly payment?: X402Payment;
  readonly receipt?: X402Receipt;
  readonly paymentClaimed: boolean;
}

export interface TransactionProvenance {
  readonly kind: "accountable-transaction.provenance";
  readonly attestation?: TransactionAttestation;
}

export interface TransactionAuthorization {
  readonly kind: "ucan" | "capability";
  readonly token: UcanToken | CapabilityView | ObjectCapability;
}

export interface TransactionProtocolInvocation {
  readonly kind: "accountable-transaction.protocol-invocation";
  readonly capability: CapabilityInvocation;
  readonly captp?: CapTpDelivery;
  readonly wasi?: WasiInvocation;
}

export interface AccountableTransaction {
  readonly kind: "accountable-transaction.witness";
  readonly id: string;
  readonly recordedAt: string;
  readonly affordances: readonly string[];
  readonly capability: ObjectCapability;
  readonly authorization?: TransactionAuthorization;
  readonly invocation: CapabilityInvocation;
  readonly protocolInvocation?: TransactionProtocolInvocation;
  readonly settlement: TransactionPayment;
  readonly provenance?: TransactionProvenance;
}

export interface AccountabilityReport {
  readonly kind: "accountable-transaction.report";
  readonly query: "authorized and paid and attested";
  readonly statement: EAVT;
  readonly authorized: boolean;
  readonly paid: boolean;
  readonly attested: boolean;
  readonly accountable: boolean;
  readonly coherent: boolean;
  readonly legs: {
    readonly authorized: AccountabilityCharge;
    readonly paid: AccountabilityCharge;
    readonly attested: AccountabilityCharge;
  };
  readonly disputed: readonly string[];
  readonly coherence: readonly Readonly<{ readonly facet: string; readonly ok: boolean; readonly evidence: string }>[] ;
}

export interface TransactionFacetWire {
  readonly kind:
    | "accountable-transaction.authorization"
    | "accountable-transaction.capability-invoke"
    | "accountable-transaction.captp-delivery"
    | "accountable-transaction.wasi-invocation"
    | "accountable-transaction.x402-receipt"
    | "accountable-transaction.attestation";
  readonly transaction: AccountableTransaction;
  readonly facet: Record<string, unknown>;
}

export interface AccountableTransactionInput {
  readonly id: string;
  readonly recordedAt: string;
  readonly affordances?: readonly string[];
  readonly capability: ObjectCapability;
  readonly authorization?: TransactionAuthorization;
  readonly invocation: CapabilityInvocation;
  readonly captp?: CapTpDelivery;
  readonly wasi?: WasiInvocation;
  readonly challenge: X402Challenge;
  readonly payment?: X402Payment;
  readonly receipt?: X402Receipt;
  readonly paymentClaimed?: boolean;
  readonly attestBy?: string;
}

const TRANSACTION_ATTRIBUTE = "authorized-paid-attested";

function nonempty(value: string, label: string): string {
  if (value.trim().length === 0) throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

function transactionEntity(id: string): readonly JsonValue[] {
  return Object.freeze(["metroplat", "accountable-transaction", id] as const);
}

function structuralSignature(signer: string, datom: readonly JsonValue[]): string {
  return `structural-signature(${signer}:${canonicalBytes(datom as unknown as JsonValue)})`;
}

function jsonClone<T>(value: T, context: string): T {
  return requireJsonValue(JSON.parse(JSON.stringify(value)) as JsonValue, context) as T;
}

function grantWithin(parent: string, child: string): boolean {
  if (parent === child || parent === "*") return true;
  if (parent.endsWith("*")) return child.startsWith(parent.slice(0, -1));
  return child === parent || child.startsWith(`${parent}/`) || child.startsWith(`${parent}:`) || child.startsWith(`${parent}#`);
}

function invocationGrant(invocation: CapabilityInvocation): string {
  return `${invocation.resource}#${invocation.action}`;
}

function capabilityViewGrant(view: CapabilityView | ObjectCapability): string {
  if ((view as CapabilityView).kind === "capability.view") return (view as CapabilityView).grants;
  const capability = objectCapabilityContract.assert(view, "transaction object-capability authorization") as ObjectCapability;
  return capabilityViewFromObjectCapability(capability).grants;
}

/** Default authorization when none is supplied: a capability view scoped to
 *  the actual invoked action, never `capabilityGrant`'s bare first-declared-
 *  action fallback — a capability granting many actions must default-authorize
 *  the one being invoked, not always its `actions[0]`. */
function authorizationOrDefault(capability: ObjectCapability, invocation: CapabilityInvocation, authorization?: TransactionAuthorization): TransactionAuthorization {
  if (authorization !== undefined) return authorization;
  return Object.freeze({
    kind: "capability" as const,
    token: capabilityViewFromObjectCapability(capability, invocation.action),
  });
}

function admittedAuthorization(authorization: TransactionAuthorization): TransactionAuthorization {
  if (authorization.kind === "ucan") {
    return Object.freeze({
      kind: "ucan" as const,
      token: ucanTokenContract.assert(authorization.token, "transaction UCAN authorization") as UcanToken,
    });
  }
  const token = authorization.token as CapabilityView | ObjectCapability;
  if ((token as CapabilityView).kind === "capability.view") {
    return Object.freeze({
      kind: "capability" as const,
      token: capabilityViewContract.assert(token, "transaction capability-view authorization") as CapabilityView,
    });
  }
  return Object.freeze({
    kind: "capability" as const,
    token: objectCapabilityContract.assert(token, "transaction object-capability authorization") as ObjectCapability,
  });
}

function transactionProtocolInvocation(input: AccountableTransactionInput, invocation: CapabilityInvocation): TransactionProtocolInvocation | undefined {
  if (input.captp === undefined && input.wasi === undefined) return undefined;
  return Object.freeze({
    kind: "accountable-transaction.protocol-invocation" as const,
    capability: invocation,
    ...(input.captp === undefined ? {} : { captp: captpDeliveryContract.assert(input.captp, "transaction CapTP delivery") as CapTpDelivery }),
    ...(input.wasi === undefined ? {} : { wasi: wasiInvocationContract.assert(input.wasi, "transaction WASI invocation") as WasiInvocation }),
  });
}

/** Build an accountable transaction over admitted capability, invocation, settlement, and optional attestation. */
export function accountableTransaction(input: AccountableTransactionInput): AccountableTransaction {
  const capability = objectCapabilityContract.assert(input.capability, "transaction capability") as ObjectCapability;
  const invocation = capabilityInvocationContract.assert(input.invocation, "transaction invocation") as CapabilityInvocation;
  const authorization = admittedAuthorization(authorizationOrDefault(capability, invocation, input.authorization));
  const protocolInvocation = transactionProtocolInvocation(input, invocation);
  const challenge = x402ChallengeContract.assert(input.challenge, "transaction challenge") as X402Challenge;
  const payment = input.payment === undefined ? undefined : x402PaymentContract.assert(input.payment, "transaction payment") as X402Payment;
  const receipt = input.receipt === undefined ? undefined : admitX402Receipt(input.receipt, "transaction receipt");
  const base = accountableTransactionContract.assert(Object.freeze({
    kind: "accountable-transaction.witness" as const,
    id: nonempty(input.id, "transaction id"),
    recordedAt: nonempty(input.recordedAt, "transaction recordedAt"),
    affordances: Object.freeze([...(input.affordances ?? capability.actions)]),
    capability,
    authorization,
    invocation,
    ...(protocolInvocation === undefined ? {} : { protocolInvocation }),
    settlement: Object.freeze({
      kind: "accountable-transaction.settlement" as const,
      challenge,
      ...(payment === undefined ? {} : { payment }),
      ...(receipt === undefined ? {} : { receipt }),
      paymentClaimed: input.paymentClaimed ?? payment !== undefined,
    }),
  }), "accountable transaction") as unknown as AccountableTransaction;
  if (input.attestBy === undefined) return base;
  const attestation = attestTransaction(base, input.attestBy, input.recordedAt);
  return accountableTransactionContract.assert(Object.freeze({
    ...base,
    provenance: Object.freeze({
      kind: "accountable-transaction.provenance" as const,
      attestation,
    }),
  }), "attested accountable transaction") as unknown as AccountableTransaction;
}

/** Expose the accountable transaction as one EAVT row. */
export function accountableTransactionRow(transaction: AccountableTransaction): EAVT {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction") as unknown as AccountableTransaction;
  return toEavt({
    e: transactionEntity(admitted.id),
    a: TRANSACTION_ATTRIBUTE,
    v: jsonClone(admitted, "accountable transaction value") as unknown as JsonValue,
    t: admitted.recordedAt,
  });
}

/** Recover the accountable transaction from its EAVT row. */
export function accountableTransactionFromRow(row: EAVT): AccountableTransaction {
  const statement = eavtObject(row);
  if (statement.a !== TRANSACTION_ATTRIBUTE) throw new TypeError(`accountableTransactionFromRow: unsupported attribute ${JSON.stringify(statement.a)}`);
  return accountableTransactionContract.assert(statement.v, "accountable transaction value") as unknown as AccountableTransaction;
}

/** Recover the single accountable transaction carried by a durable statement log. */
export interface AccountableTransactionCollector {
  push(row: EAVT): void;
  read(): AccountableTransaction;
}

export function accountableTransactionCollector(): AccountableTransactionCollector {
  let found: EAVT | undefined;
  let count = 0;
  const push = (row: EAVT): void => {
    if (eavtObject(row).a !== TRANSACTION_ATTRIBUTE) return;
    found = row;
    count += 1;
  };
  return Object.freeze({
    push,
    read: () => {
      if (count !== 1) {
        throw new TypeError(`accountableTransactionFromLog: expected exactly one accountable transaction statement row, found ${count}`);
      }
      if (found === undefined) throw new TypeError("accountableTransactionFromLog: missing accountable transaction statement row");
      return accountableTransactionFromRow(found);
    },
  });
}

export function accountableTransactionFromLog(rows: Iterable<EAVT>): AccountableTransaction {
  const collector = accountableTransactionCollector();
  for (const row of rows) collector.push(row);
  return collector.read();
}

/** Create a structural provenance attestation over the transaction statement row. */
export function attestTransaction(transaction: AccountableTransaction, signer: string, signedAt: string): TransactionAttestation {
  const row = eavtObject(accountableTransactionRow(transaction));
  const datom = Object.freeze([
    row.e,
    "provenance.attested",
    true,
    nonempty(signedAt, "attestation signedAt"),
    Object.freeze({
      kind: "accountable-transaction.attestation.reading",
      statementAttribute: row.a,
      statementCoordinate: row.t,
    }) as unknown as JsonValue,
  ] as const);
  return transactionAttestationContract.assert(Object.freeze({
    kind: "accountable-transaction.attestation" as const,
    subject: transaction.id,
    signer: nonempty(signer, "attestation signer"),
    signedAt,
    datom,
    signature: structuralSignature(signer, datom),
  }), "accountable transaction attestation") as TransactionAttestation;
}

function authorizedStanding(transaction: AccountableTransaction): { readonly ok: boolean; readonly charge: AccountabilityCharge } {
  const authorization = admittedAuthorization(authorizationOrDefault(transaction.capability, transaction.invocation, transaction.authorization));
  const authorizedGrant = authorization.kind === "ucan"
    ? (authorization.token as UcanToken).authority.grants
    : capabilityViewGrant(authorization.token as CapabilityView | ObjectCapability);
  const ok = canInvoke(transaction.capability, transaction.invocation).ok
    && grantWithin(authorizedGrant, invocationGrant(transaction.invocation));
  return Object.freeze({ ok, charge: ok ? "unknown" as const : "held" as const });
}

function paidStanding(transaction: AccountableTransaction): { readonly ok: boolean; readonly charge: AccountabilityCharge; readonly disputed: readonly string[] } {
  const { challenge, payment, receipt, paymentClaimed } = transaction.settlement;
  if (payment === undefined || receipt === undefined) {
    return Object.freeze({
      ok: false,
      charge: paymentClaimed ? "denied" as const : "held" as const,
      disputed: paymentClaimed ? Object.freeze(["payment is claimed but no recorded x402 receipt is present"]) : Object.freeze([]),
    });
  }
  const judgment = verifyX402Payment(challenge, payment, receipt);
  return Object.freeze({
    ok: judgment.ok,
    charge: judgment.ok ? "unknown" as const : "held" as const,
    disputed: Object.freeze(judgment.reasons),
  });
}

function attestedStanding(transaction: AccountableTransaction): { readonly ok: boolean; readonly charge: AccountabilityCharge } {
  const attestation = transaction.provenance?.attestation;
  if (attestation === undefined) return Object.freeze({ ok: false, charge: "held" as const });
  const admitted = transactionAttestationContract.assert(attestation, "transaction attestation") as TransactionAttestation;
  const ok = admitted.subject === transaction.id && admitted.signature === structuralSignature(admitted.signer, admitted.datom);
  return Object.freeze({ ok, charge: ok ? "unknown" as const : "held" as const });
}

function coherence(transaction: AccountableTransaction): readonly Readonly<{ readonly facet: string; readonly ok: boolean; readonly evidence: string }>[] {
  const row = accountableTransactionRow(transaction);
  const evidence = canonicalBytes(row as unknown as JsonValue);
  return Object.freeze([
    Object.freeze({ facet: "capability-invocation", ok: accountableTransactionFromRow(row).id === transaction.id, evidence }),
    Object.freeze({ facet: "x402-receipt", ok: transaction.settlement.receipt === undefined || transaction.settlement.receipt.challengeId === transaction.settlement.challenge.id, evidence }),
    Object.freeze({ facet: "attestation", ok: transaction.provenance?.attestation === undefined || transaction.provenance.attestation.subject === transaction.id, evidence }),
  ]);
}

/** Decide whether one transaction is authorized, paid, attested, and coherent. */
export function verifyAccountableTransaction(transaction: AccountableTransaction): AccountabilityReport {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction") as unknown as AccountableTransaction;
  const authority = authorizedStanding(admitted);
  const payment = paidStanding(admitted);
  const attestation = attestedStanding(admitted);
  const coherenceReport = coherence(admitted);
  const coherent = coherenceReport.every((entry) => entry.ok);
  const accountable = authority.ok && payment.ok && attestation.ok && coherent;
  return accountabilityReportContract.assert(Object.freeze({
    kind: "accountable-transaction.report" as const,
    query: "authorized and paid and attested" as const,
    statement: accountableTransactionRow(admitted),
    authorized: authority.ok,
    paid: payment.ok,
    attested: attestation.ok,
    accountable,
    coherent,
    legs: Object.freeze({
      authorized: authority.charge,
      paid: payment.charge,
      attested: attestation.charge,
    }),
    disputed: payment.disputed,
    coherence: coherenceReport,
  }), "accountability report") as AccountabilityReport;
}

/** Compare two transactions at their exposed statement row. */
export function sameAccountableTransaction(left: AccountableTransaction, right: AccountableTransaction): boolean {
  return canonicalBytes(accountableTransactionRow(left) as unknown as JsonValue) === canonicalBytes(accountableTransactionRow(right) as unknown as JsonValue);
}

/** Read the capability invocation facet from the accountable transaction. */
export function capabilityInvokeWire(transaction: AccountableTransaction): TransactionFacetWire {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction") as unknown as AccountableTransaction;
  return transactionFacetWireContract.assert(Object.freeze({
    kind: "accountable-transaction.capability-invoke" as const,
    transaction: admitted,
    facet: Object.freeze({
      capability: admitted.capability,
      invocation: admitted.invocation,
      protocolInvocation: admitted.protocolInvocation,
    }),
  }), "capability invoke facet") as unknown as TransactionFacetWire;
}

/** Read the authorization facet from the accountable transaction. */
export function authorizationWire(transaction: AccountableTransaction): TransactionFacetWire {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction") as unknown as AccountableTransaction;
  return transactionFacetWireContract.assert(Object.freeze({
    kind: "accountable-transaction.authorization" as const,
    transaction: admitted,
    facet: Object.freeze({ authorization: authorizationOrDefault(admitted.capability, admitted.invocation, admitted.authorization) }),
  }), "authorization facet") as unknown as TransactionFacetWire;
}

/** Read the CapTP delivery facet from the accountable transaction. */
export function captpDeliveryWire(transaction: AccountableTransaction): TransactionFacetWire {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction") as unknown as AccountableTransaction;
  const captp = admitted.protocolInvocation?.captp;
  if (captp === undefined) throw new TypeError("captpDeliveryWire: transaction has no CapTP delivery");
  return transactionFacetWireContract.assert(Object.freeze({
    kind: "accountable-transaction.captp-delivery" as const,
    transaction: admitted,
    facet: Object.freeze({ captp }),
  }), "CapTP delivery facet") as unknown as TransactionFacetWire;
}

/** Read the WASI invocation facet from the accountable transaction. */
export function wasiInvocationWire(transaction: AccountableTransaction): TransactionFacetWire {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction") as unknown as AccountableTransaction;
  const wasi = admitted.protocolInvocation?.wasi;
  if (wasi === undefined) throw new TypeError("wasiInvocationWire: transaction has no WASI invocation");
  return transactionFacetWireContract.assert(Object.freeze({
    kind: "accountable-transaction.wasi-invocation" as const,
    transaction: admitted,
    facet: Object.freeze({ wasi }),
  }), "WASI invocation facet") as unknown as TransactionFacetWire;
}

/** Read the x402 receipt facet from the accountable transaction. */
export function x402ReceiptWire(transaction: AccountableTransaction): TransactionFacetWire {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction") as unknown as AccountableTransaction;
  if (admitted.settlement.receipt === undefined) throw new TypeError("x402ReceiptWire: transaction has no receipt");
  return transactionFacetWireContract.assert(Object.freeze({
    kind: "accountable-transaction.x402-receipt" as const,
    transaction: admitted,
    facet: Object.freeze({ receipt: admitted.settlement.receipt }),
  }), "x402 receipt facet") as unknown as TransactionFacetWire;
}

/** Read the provenance attestation facet from the accountable transaction. */
export function attestationWire(transaction: AccountableTransaction): TransactionFacetWire {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction") as unknown as AccountableTransaction;
  const attestation = admitted.provenance?.attestation;
  if (attestation === undefined) throw new TypeError("attestationWire: transaction has no attestation");
  return transactionFacetWireContract.assert(Object.freeze({
    kind: "accountable-transaction.attestation" as const,
    transaction: admitted,
    facet: Object.freeze({ attestation }),
  }), "attestation facet") as unknown as TransactionFacetWire;
}
