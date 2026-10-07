import { assertNonemptyString as nonempty } from "@red-cup-engineering/json-services-section/assert-nonempty-string";
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
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { canonicalJson } from "@red-cup-engineering/json-services-section";

import {
  canInvoke,
  capabilityViewContract,
  capabilityViewFromObjectCapability,
  capabilityInvocationContract,
  objectCapabilityContract,

} from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { captpDeliveryContract } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability/captp";
import { wasiInvocationContract } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability/wasi";
import { ucanTokenContract } from "@red-cup-engineering/ucan-invocation-verification-service/token";
import {
  admitX402Receipt,
  verifyX402Payment,
  x402ChallengeContract,
  x402PaymentContract,

} from "@red-cup-engineering/x402-services-section/value-settlement";
import {
  accountabilityReportContract,
  transactionAttestationContract,
  transactionFacetWireContract,
  accountableTransactionContract,
} from "./schema.mjs";
import { eavtRecord, toEavt } from "@red-cup-engineering/eavt/row";

export {
  accountabilityReportContract,
  transactionAttestationContract,
  transactionFacetWireContract,
  accountableTransactionContract,
} from "./schema.mjs";

const TRANSACTION_ATTRIBUTE = "authorized-paid-attested";

function transactionEntity(id) {
  return Object.freeze(["metroplat", "accountable-transaction", id]);
}

function structuralSignature(signer, datom) {
  return `structural-signature(${signer}:${canonicalJson(datom)})`;
}

function jsonClone(value, context) {
  return requireJsonValue(JSON.parse(JSON.stringify(value)), context);
}

function grantWithin(parent, child) {
  if (parent === child || parent === "*") return true;
  if (parent.endsWith("*")) return child.startsWith(parent.slice(0, -1));
  return child === parent || child.startsWith(`${parent}/`) || child.startsWith(`${parent}:`) || child.startsWith(`${parent}#`);
}

function invocationGrant(invocation) {
  return `${invocation.resource}#${invocation.action}`;
}

function capabilityViewGrant(view) {
  if ((view).kind === "capability.view") return (view).grants;
  const capability = objectCapabilityContract.assert(view, "transaction object-capability authorization");
  return capabilityViewFromObjectCapability(capability).grants;
}

/** Default authorization when none is supplied: a capability view scoped to
 *  the actual invoked action, never `capabilityGrant`'s bare first-declared-
 *  action fallback — a capability granting many actions must default-authorize
 *  the one being invoked, not always its `actions[0]`. */
function authorizationOrDefault(capability, invocation, authorization) {
  if (authorization !== undefined) return authorization;
  return Object.freeze({
    kind: "capability",
    token: capabilityViewFromObjectCapability(capability, invocation.action),
  });
}

function admittedAuthorization(authorization) {
  if (authorization.kind === "ucan") {
    return Object.freeze({
      kind: "ucan",
      token: ucanTokenContract.assert(authorization.token, "transaction UCAN authorization"),
    });
  }
  const token = authorization.token;
  if ((token).kind === "capability.view") {
    return Object.freeze({
      kind: "capability",
      token: capabilityViewContract.assert(token, "transaction capability-view authorization"),
    });
  }
  return Object.freeze({
    kind: "capability",
    token: objectCapabilityContract.assert(token, "transaction object-capability authorization"),
  });
}

function transactionProtocolInvocation(input, invocation) {
  if (input.captp === undefined && input.wasi === undefined) return undefined;
  return Object.freeze({
    kind: "accountable-transaction.protocol-invocation",
    capability: invocation,
    ...(input.captp === undefined ? {} : { captp: captpDeliveryContract.assert(input.captp, "transaction CapTP delivery") }),
    ...(input.wasi === undefined ? {} : { wasi: wasiInvocationContract.assert(input.wasi, "transaction WASI invocation") }),
  });
}

/** Build an accountable transaction over admitted capability, invocation, settlement, and optional attestation. */
export function accountableTransaction(input) {
  const capability = objectCapabilityContract.assert(input.capability, "transaction capability");
  const invocation = capabilityInvocationContract.assert(input.invocation, "transaction invocation");
  const authorization = admittedAuthorization(authorizationOrDefault(capability, invocation, input.authorization));
  const protocolInvocation = transactionProtocolInvocation(input, invocation);
  const challenge = x402ChallengeContract.assert(input.challenge, "transaction challenge");
  const payment = input.payment === undefined ? undefined : x402PaymentContract.assert(input.payment, "transaction payment");
  const receipt = input.receipt === undefined ? undefined : admitX402Receipt(input.receipt, "transaction receipt");
  const base = accountableTransactionContract.assert(Object.freeze({
    kind: "accountable-transaction.witness",
    id: nonempty(input.id, "transaction id"),
    recordedAt: nonempty(input.recordedAt, "transaction recordedAt"),
    affordances: Object.freeze([...(input.affordances ?? capability.actions)]),
    capability,
    authorization,
    invocation,
    ...(protocolInvocation === undefined ? {} : { protocolInvocation }),
    settlement: Object.freeze({
      kind: "accountable-transaction.settlement",
      challenge,
      ...(payment === undefined ? {} : { payment }),
      ...(receipt === undefined ? {} : { receipt }),
      paymentClaimed: input.paymentClaimed ?? payment !== undefined,
    }),
  }), "accountable transaction");
  if (input.attestBy === undefined) return base;
  const attestation = attestTransaction(base, input.attestBy, input.recordedAt);
  return accountableTransactionContract.assert(Object.freeze({
    ...base,
    provenance: Object.freeze({
      kind: "accountable-transaction.provenance",
      attestation,
    }),
  }), "attested accountable transaction");
}

/** Expose the accountable transaction as one EAVT row. */
export function accountableTransactionRow(transaction) {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction");
  return toEavt({
    e: transactionEntity(admitted.id),
    a: TRANSACTION_ATTRIBUTE,
    v: jsonClone(admitted, "accountable transaction value"),
    t: admitted.recordedAt,
  });
}

/** Recover the accountable transaction from its EAVT row. */
export function accountableTransactionFromRow(row) {
  const statement = eavtRecord(row);
  if (statement.a !== TRANSACTION_ATTRIBUTE) throw new TypeError(`accountableTransactionFromRow: unsupported attribute ${JSON.stringify(statement.a)}`);
  return accountableTransactionContract.assert(statement.v, "accountable transaction value");
}

/** Recover the single accountable transaction carried by a durable statement log. */

export function accountableTransactionCollector() {
  let found;
  let count = 0;
  const push = (row) => {
    if (eavtRecord(row).a !== TRANSACTION_ATTRIBUTE) return;
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

export function accountableTransactionFromLog(rows) {
  const collector = accountableTransactionCollector();
  for (const row of rows) collector.push(row);
  return collector.read();
}

/** Create a structural provenance attestation over the transaction statement row. */
export function attestTransaction(transaction, signer, signedAt) {
  const row = eavtRecord(accountableTransactionRow(transaction));
  const datom = Object.freeze([
    row.e,
    "provenance.attested",
    true,
    nonempty(signedAt, "attestation signedAt"),
    Object.freeze({
      kind: "accountable-transaction.attestation.reading",
      statementAttribute: row.a,
      statementCoordinate: row.t,
    }),
  ]);
  return transactionAttestationContract.assert(Object.freeze({
    kind: "accountable-transaction.attestation",
    subject: transaction.id,
    signer: nonempty(signer, "attestation signer"),
    signedAt,
    datom,
    signature: structuralSignature(signer, datom),
  }), "accountable transaction attestation");
}

function authorizedStanding(transaction) {
  const authorization = admittedAuthorization(authorizationOrDefault(transaction.capability, transaction.invocation, transaction.authorization));
  const authorizedGrant = authorization.kind === "ucan"
    ? (authorization.token).authority.grants
    : capabilityViewGrant(authorization.token);
  const ok = canInvoke(transaction.capability, transaction.invocation).ok
    && grantWithin(authorizedGrant, invocationGrant(transaction.invocation));
  return Object.freeze({ ok, charge: ok ? "unknown" : "held" });
}

function paidStanding(transaction) {
  const { challenge, payment, receipt, paymentClaimed } = transaction.settlement;
  if (payment === undefined || receipt === undefined) {
    return Object.freeze({
      ok: false,
      charge: paymentClaimed ? "denied" : "held",
      disputed: paymentClaimed ? Object.freeze(["payment is claimed but no recorded x402 receipt is present"]) : Object.freeze([]),
    });
  }
  const judgment = verifyX402Payment(challenge, payment, receipt);
  return Object.freeze({
    ok: judgment.ok,
    charge: judgment.ok ? "unknown" : "held",
    disputed: Object.freeze(judgment.reasons),
  });
}

function attestedStanding(transaction) {
  const attestation = transaction.provenance?.attestation;
  if (attestation === undefined) return Object.freeze({ ok: false, charge: "held" });
  const admitted = transactionAttestationContract.assert(attestation, "transaction attestation");
  const ok = admitted.subject === transaction.id && admitted.signature === structuralSignature(admitted.signer, admitted.datom);
  return Object.freeze({ ok, charge: ok ? "unknown" : "held" });
}

function coherence(transaction) {
  const row = accountableTransactionRow(transaction);
  const evidence = canonicalJson(row);
  return Object.freeze([
    Object.freeze({ facet: "capability-invocation", ok: accountableTransactionFromRow(row).id === transaction.id, evidence }),
    Object.freeze({ facet: "x402-receipt", ok: transaction.settlement.receipt === undefined || transaction.settlement.receipt.challengeId === transaction.settlement.challenge.id, evidence }),
    Object.freeze({ facet: "attestation", ok: transaction.provenance?.attestation === undefined || transaction.provenance.attestation.subject === transaction.id, evidence }),
  ]);
}

/** Decide whether one transaction is authorized, paid, attested, and coherent. */
export function verifyAccountableTransaction(transaction) {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction");
  const authority = authorizedStanding(admitted);
  const payment = paidStanding(admitted);
  const attestation = attestedStanding(admitted);
  const coherenceReport = coherence(admitted);
  const coherent = coherenceReport.every((entry) => entry.ok);
  const accountable = authority.ok && payment.ok && attestation.ok && coherent;
  return accountabilityReportContract.assert(Object.freeze({
    kind: "accountable-transaction.report",
    query: "authorized and paid and attested",
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
  }), "accountability report");
}

/** Compare two transactions at their exposed statement row. */
export function sameAccountableTransaction(left, right) {
  return canonicalJson(accountableTransactionRow(left)) === canonicalJson(accountableTransactionRow(right));
}

/** Read the capability invocation facet from the accountable transaction. */
export function capabilityInvokeWire(transaction) {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction");
  return transactionFacetWireContract.assert(Object.freeze({
    kind: "accountable-transaction.capability-invoke",
    transaction: admitted,
    facet: Object.freeze({
      capability: admitted.capability,
      invocation: admitted.invocation,
      protocolInvocation: admitted.protocolInvocation,
    }),
  }), "capability invoke facet");
}

/** Read the authorization facet from the accountable transaction. */
export function authorizationWire(transaction) {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction");
  return transactionFacetWireContract.assert(Object.freeze({
    kind: "accountable-transaction.authorization",
    transaction: admitted,
    facet: Object.freeze({ authorization: authorizationOrDefault(admitted.capability, admitted.invocation, admitted.authorization) }),
  }), "authorization facet");
}

/** Read the CapTP delivery facet from the accountable transaction. */
export function captpDeliveryWire(transaction) {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction");
  const captp = admitted.protocolInvocation?.captp;
  if (captp === undefined) throw new TypeError("captpDeliveryWire: transaction has no CapTP delivery");
  return transactionFacetWireContract.assert(Object.freeze({
    kind: "accountable-transaction.captp-delivery",
    transaction: admitted,
    facet: Object.freeze({ captp }),
  }), "CapTP delivery facet");
}

/** Read the WASI invocation facet from the accountable transaction. */
export function wasiInvocationWire(transaction) {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction");
  const wasi = admitted.protocolInvocation?.wasi;
  if (wasi === undefined) throw new TypeError("wasiInvocationWire: transaction has no WASI invocation");
  return transactionFacetWireContract.assert(Object.freeze({
    kind: "accountable-transaction.wasi-invocation",
    transaction: admitted,
    facet: Object.freeze({ wasi }),
  }), "WASI invocation facet");
}

/** Read the x402 receipt facet from the accountable transaction. */
export function x402ReceiptWire(transaction) {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction");
  if (admitted.settlement.receipt === undefined) throw new TypeError("x402ReceiptWire: transaction has no receipt");
  return transactionFacetWireContract.assert(Object.freeze({
    kind: "accountable-transaction.x402-receipt",
    transaction: admitted,
    facet: Object.freeze({ receipt: admitted.settlement.receipt }),
  }), "x402 receipt facet");
}

/** Read the provenance attestation facet from the accountable transaction. */
export function attestationWire(transaction) {
  const admitted = accountableTransactionContract.assert(transaction, "accountable transaction");
  const attestation = admitted.provenance?.attestation;
  if (attestation === undefined) throw new TypeError("attestationWire: transaction has no attestation");
  return transactionFacetWireContract.assert(Object.freeze({
    kind: "accountable-transaction.attestation",
    transaction: admitted,
    facet: Object.freeze({ attestation }),
  }), "attestation facet");
}
