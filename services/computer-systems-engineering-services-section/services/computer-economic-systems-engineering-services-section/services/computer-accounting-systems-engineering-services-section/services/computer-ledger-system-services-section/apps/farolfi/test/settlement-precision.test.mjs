import assert from "node:assert/strict";
import test from "node:test";
import { addDecimalStrings } from "@red-cup-engineering/exact-number-data-service/decimal-string";
import { deriveSetOfSettlementTransactions } from "../src/ledger/maintenance/settlements.mjs";

const base = { enterprise: "house-service", order: "order-1", date: "2026-10-13", witness: "source-receipt-1" };
function derive(record) {
  const result = deriveSetOfSettlementTransactions({ settlements: [{ ...base, ...record }] });
  assert.equal(result.refusals.length, 0);
  assert.equal(result.transactionCount, 1);
  const transaction = result.transactions[0];
  assert.equal(addDecimalStrings(transaction.postings.map(({ amount }) => amount)), "0");
  assert.match(transaction.directive, /source: "source-receipt-1"/u);
  return transaction;
}

test("decimal currency evidence keeps cents beyond binary floating-point precision", () => {
  for (const record of [
    { received: "90071992547409.90" },
    { kind: "deposit", deposit: "90071992547409.90" },
    { kind: "payout", amount: "90071992547409.90", party: "provider" },
    { kind: "holding-income", amount: "90071992547409.90", what: "services" },
    { kind: "holding-cost", amount: "90071992547409.90", what: "compute" },
  ]) {
    assert.equal(derive(record).postings[0].amount, "90071992547409.90");
  }
});

test("declared USD cent rounding uses exact decimal ties", () => {
  for (const received of ["1.005", 1.005]) {
    assert.deepEqual(derive({ received }).postings.map(({ amount }) => amount), ["1.01", "-1.01"]);
  }
});

test("acquisition financing and fees compose exactly before cent rendering", () => {
  const result = derive({ kind: "acquisition", price: "90071992547409.91", paid: "90071992547409.90", fees: "0.02" });
  assert.deepEqual(result.postings.map(({ amount }) => amount), ["90071992547409.93", "-90071992547409.92", "-0.01"]);
  assert.match(result.narration, /on terms$/u);
});

test("installment totals preserve a cent contribution beside a large principal", () => {
  const result = derive({ kind: "installment", principal: "90071992547409.90", interest: "0.01" });
  assert.deepEqual(result.postings.map(({ amount }) => amount), ["90071992547409.90", "0.01", "-90071992547409.91"]);
});

test("installment cash balances the independently rounded posting components", () => {
  const result = derive({ kind: "installment", principal: "1.005", interest: "1.005" });
  assert.deepEqual(result.postings.map(({ amount }) => amount), ["1.01", "1.01", "-2.02"]);
});

test("an acquisition whose declared components disagree after cent admission is refused", () => {
  const result = deriveSetOfSettlementTransactions({ settlements: [{ ...base, kind: "acquisition", price: "1.01", paid: "0.505", financed: "0.505" }] });
  assert.equal(result.transactionCount, 0);
  assert.equal(result.refusals.length, 1);
});

test("shares, returned deposits and reserves retain exact currency evidence", () => {
  const result = derive({ received: "10.10", depositReturned: "90071992547409.91",
    shares: [{ party: "provider", amount: "90071992547409.91" }], reserves: [{ fund: "maintenance", amount: "90071992547409.91" }] });
  assert.deepEqual(result.postings.map(({ amount }) => amount), ["10.10", "-10.10", "90071992547409.91", "-90071992547409.91", "90071992547409.91", "-90071992547409.91", "90071992547409.91", "-90071992547409.91"]);
});

test("ordinary numeric boundary amounts keep existing transaction and account behavior", () => {
  const result = derive({ received: 12.25, shares: [{ party: "provider", amount: 2.25 }], reserves: [{ fund: "maintenance", amount: 3 }] });
  assert.deepEqual(result.postings.map(({ amount }) => amount), ["12.25", "-12.25", "2.25", "-2.25", "3.00", "-3.00"]);
  assert.equal(result.id, "house-service:order-1:settlement:2026-10-13");
  assert.equal(result.postings[0].account, "Assets:Cash:Operating");
});

test("empty settlements remain refused rather than booked as zero", () => {
  const result = deriveSetOfSettlementTransactions({ settlements: [base] });
  assert.equal(result.transactionCount, 0);
  assert.equal(result.refusals.length, 1);
});

test("nonfinite values cannot enter a currency posting", () => {
  for (const received of [NaN, Infinity, -Infinity]) {
    assert.throws(() => deriveSetOfSettlementTransactions({ settlements: [{ ...base, received }] }), /finite decimal evidence/u);
  }
});

test("negative declared or inferred components cannot create an unbalanced transaction", () => {
  const invalid = [
    { kind: "acquisition", price: "1.00", paid: "2.00" },
    { kind: "acquisition", price: "1.00", paid: "2.00", financed: "-1.00" },
    { kind: "installment", principal: "-1.00", interest: "2.00" },
    { received: "1.00", shares: [{ party: "provider", amount: "-1.00" }] },
    { received: "1.00", reserves: [{ fund: "maintenance", amount: "-1.00" }] },
  ];
  for (const record of invalid) {
    const result = deriveSetOfSettlementTransactions({ settlements: [{ ...base, ...record }] });
    assert.equal(result.transactionCount, 0);
    assert.equal(result.refusals.length, 1);
    assert.deepEqual(result.accountsToOpen, []);
  }
});

test("positive subcent records establish no posted currency and open no accounts", () => {
  for (const record of [
    { kind: "deposit", deposit: "0.001" },
    { kind: "payout", amount: "0.001", party: "provider" },
    { received: "0.001" },
    { kind: "holding-income", amount: "0.001", what: "services" },
  ]) {
    const result = deriveSetOfSettlementTransactions({ settlements: [{ ...base, ...record }] });
    assert.equal(result.transactionCount, 0);
    assert.equal(result.refusals[0].reason, "nothing to post at USD-cent resolution");
    assert.deepEqual(result.accountsToOpen, []);
  }
});

test("fully financed acquisitions omit zero cash postings while preserving conservation", () => {
  const result = derive({ kind: "acquisition", price: "10.00" });
  assert.deepEqual(result.postings.map(({ amount }) => amount), ["10.00", "-10.00"]);
  assert.equal(result.postings.some(({ amount }) => /^-?0\.00$/u.test(amount)), false);
});
