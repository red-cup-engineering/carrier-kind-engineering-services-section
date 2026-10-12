import assert from "node:assert/strict";
import test from "node:test";

import {
  x402ChallengeContract,
  valueQuantity,
  x402Challenge,
  paymentFromChallenge,
  receiptFromPayment,
  admitX402Receipt,
  verifyX402Payment,
  ledgerConserved,
  ledgerComplete,
  valueConserved,
  x402ReceiptFingerprint,
  x402ReceiptStatementCollector,
  receiptFromStatementLog,
  isCompleteExchange,
} from "../../src/value-settlement/codec.mjs";

test("schema contract references reject malformed nested values", () => {
  assert.equal(x402ChallengeContract.validate({ kind: "x402.challenge", id: "c", resource: "r", payee: "p", amount: { kind: "value-settlement.quantity", num: 1, den: 1, commodity: "USD" }, rails: ["x402"], issuedAt: "now" }), true);
  assert.equal(x402ChallengeContract.validate({ kind: "x402.challenge", id: "c", resource: "r", payee: "p", amount: { kind: "value-settlement.quantity", num: 1, den: 0, commodity: "USD" }, rails: ["x402"], issuedAt: "now" }), false);
});

test("valueQuantity admits an exact rational amount and rejects an empty commodity", () => {
  const q = valueQuantity(5, 2, "USD");
  assert.equal(q.num, 5);
  assert.equal(q.den, 2);
  assert.equal(q.commodity, "USD");
  assert.throws(() => valueQuantity(1, 1, ""), TypeError);
});

function buildChallenge() {
  return x402Challenge({
    id: "challenge-1",
    resource: "https://example.test/resource",
    payee: "payee-1",
    amount: valueQuantity(100, 1, "USD"),
    rails: ["x402", "ap2"],
    issuedAt: "2026-09-11T00:00:00Z",
  });
}

test("paymentFromChallenge answers the challenge on an accepted rail", () => {
  const challenge = buildChallenge();
  const payment = paymentFromChallenge(challenge, { payer: "payer-1", authorization: "sig", rail: "ap2" });
  assert.equal(payment.challengeId, challenge.id);
  assert.equal(payment.rail, "ap2");
  assert.equal(payment.membrane, "across");
  assert.throws(() => paymentFromChallenge(challenge, { payer: "payer-1", authorization: "sig", rail: "l402" }), TypeError);
});

test("receiptFromPayment produces a value-conserved receipt with embedded statement rows", () => {
  const challenge = buildChallenge();
  const payment = paymentFromChallenge(challenge, { payer: "payer-1", authorization: "sig" });
  const receipt = receiptFromPayment(challenge, payment);
  assert.equal(receipt.valueConserved, true);
  assert.equal(valueConserved(receipt.debit, receipt.credit), true);
  assert.ok(Array.isArray(receipt.statementLog));
  assert.equal(isCompleteExchange(receipt), true);
  admitX402Receipt(receipt);
});

test("admitX402Receipt refuses a receipt carrying both or neither statement forms", () => {
  const challenge = buildChallenge();
  const payment = paymentFromChallenge(challenge, { payer: "payer-1", authorization: "sig" });
  const receipt = receiptFromPayment(challenge, payment);
  assert.throws(() => admitX402Receipt({ ...receipt, statementLog: undefined }), TypeError);
  assert.throws(() => admitX402Receipt({
    ...receipt,
    statementLogReference: { kind: "metroplat.witness-ledger-reference", path: "p", mediaType: "application/eavt+jsonl; charset=utf-8", rows: 1 },
  }), TypeError);
});

test("verifyX402Payment witnesses a matching challenge/payment/receipt triple", () => {
  const challenge = buildChallenge();
  const payment = paymentFromChallenge(challenge, { payer: "payer-1", authorization: "sig" });
  const receipt = receiptFromPayment(challenge, payment);
  const judgment = verifyX402Payment(challenge, payment, receipt);
  assert.equal(judgment.kind, "x402.settlement:witness");
  assert.equal(judgment.ok, true);
  assert.deepEqual(judgment.reasons, []);
});

test("verifyX402Payment obstructs a receipt that answers the wrong payment", () => {
  const challenge = buildChallenge();
  const payment = paymentFromChallenge(challenge, { payer: "payer-1", authorization: "sig" });
  const otherPayment = paymentFromChallenge(challenge, { id: "other-payment", payer: "payer-2", authorization: "sig-2" });
  const receipt = receiptFromPayment(challenge, payment);
  const judgment = verifyX402Payment(challenge, otherPayment, receipt);
  assert.equal(judgment.kind, "x402.settlement-obstruction");
  assert.equal(judgment.ok, false);
  assert.ok(judgment.reasons.length > 0);
});

test("ledgerConserved/ledgerComplete generalize valueConserved to N legs", () => {
  const usd = (n) => valueQuantity(n, 1, "USD");
  const conserved = ledgerConserved([
    { quantity: usd(60), sign: "debit" },
    { quantity: usd(40), sign: "debit" },
    { quantity: usd(100), sign: "credit" },
  ]);
  assert.equal(conserved.conserved, true);
  const completion = ledgerComplete([
    { quantity: usd(60), sign: "debit" },
    { quantity: usd(40), sign: "debit" },
  ]);
  assert.ok(completion);
});

test("x402ReceiptFingerprint is deterministic and content-addressed", () => {
  const challenge = buildChallenge();
  const payment = paymentFromChallenge(challenge, { payer: "payer-1", authorization: "sig" });
  const receipt = receiptFromPayment(challenge, payment);
  const first = x402ReceiptFingerprint(receipt);
  const second = x402ReceiptFingerprint(receipt);
  assert.equal(first, second);
  assert.match(first, /^structural:/);
});

test("x402ReceiptStatementCollector/receiptFromStatementLog round-trip a statement log", () => {
  const challenge = buildChallenge();
  const payment = paymentFromChallenge(challenge, { payer: "payer-1", authorization: "sig" });
  const receipt = receiptFromPayment(challenge, payment);
  const collector = x402ReceiptStatementCollector();
  for (const row of receipt.statementLog) collector.push(row);
  const read = collector.read();
  assert.equal(read.challengeId, challenge.id);
  assert.equal(read.paymentId, payment.id);
  const core = receiptFromStatementLog(receipt.statementLog);
  assert.equal(core.challengeId, challenge.id);
  assert.equal(core.valueConserved, true);
});
