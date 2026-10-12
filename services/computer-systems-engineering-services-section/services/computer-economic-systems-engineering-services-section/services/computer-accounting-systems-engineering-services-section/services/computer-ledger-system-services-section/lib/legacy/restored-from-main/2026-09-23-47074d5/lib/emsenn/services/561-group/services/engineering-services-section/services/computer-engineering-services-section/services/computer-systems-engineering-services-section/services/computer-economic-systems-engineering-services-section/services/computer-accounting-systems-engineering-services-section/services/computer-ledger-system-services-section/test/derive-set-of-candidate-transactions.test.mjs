import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfCandidateTransactions } from "../scripts/derive-set-of-candidate-transactions.mjs";

test("refuses a non-array mismatches input", () => {
  assert.throws(() => deriveSetOfCandidateTransactions({}), /mismatches must be an array/u);
});

test("increase posts to Income:Investment:Unrealized-Gains, dated the day before the assertion", () => {
  const result = deriveSetOfCandidateTransactions({
    mismatches: [{
      account: "Assets:Digital-Assets:Hive:Liquid", commodity: "HIVE",
      postedBalance: "142.423", assertedBalance: "142913/1000",
      assertionDate: "2026-09-05", sourceId: "CHAIN-HIVE-20260904",
    }],
    openAccounts: ["Income:Investment:Unrealized-Gains", "Expenses:Investment:Unrealized-Losses"],
  });
  assert.equal(result.transactionCount, 1);
  const [txn] = result.transactions;
  assert.equal(txn.date, "2026-09-04");
  assert.equal(txn.delta, "0.49");
  assert.equal(txn.counterAccount, "Income:Investment:Unrealized-Gains");
  assert.equal(txn.counterAmount, "-0.49");
  assert.equal(result.accountsToOpen.length, 0);
});

test("decrease posts to Expenses:Investment:Unrealized-Losses", () => {
  const result = deriveSetOfCandidateTransactions({
    mismatches: [{
      account: "Assets:Digital-Assets:HiveEngine:Unclassified", commodity: "ALIVE",
      postedBalance: "1/5000 ALIVE", assertedBalance: "0/1 ALIVE",
      assertionDate: "2026-09-05", sourceId: "CHAIN-HIVEENGINE-20260904",
    }],
    openAccounts: ["Income:Investment:Unrealized-Gains", "Expenses:Investment:Unrealized-Losses"],
  });
  assert.equal(result.transactions[0].counterAccount, "Expenses:Investment:Unrealized-Losses");
  assert.equal(result.transactions[0].delta, "-0.0002");
  assert.equal(result.transactions[0].counterAmount, "0.0002");
});

test("a null postedBalance is treated as zero", () => {
  const result = deriveSetOfCandidateTransactions({
    mismatches: [{
      account: "Assets:Digital-Assets:HiveEngine:Unclassified", commodity: "NEWTOKEN",
      postedBalance: null, assertedBalance: "5.5",
      assertionDate: "2026-09-05", sourceId: "CHAIN-HIVEENGINE-20260904",
    }],
  });
  assert.equal(result.transactions[0].delta, "5.5");
});

test("a zero delta is skipped, never posted", () => {
  const result = deriveSetOfCandidateTransactions({
    mismatches: [{
      account: "Assets:Digital-Assets:Hive:Liquid", commodity: "HIVE",
      postedBalance: "142.423", assertedBalance: "142.423",
      assertionDate: "2026-09-05", sourceId: "CHAIN-HIVE-20260904",
    }],
  });
  assert.equal(result.transactionCount, 0);
  assert.deepEqual(result.skipped, [{
    account: "Assets:Digital-Assets:Hive:Liquid", commodity: "HIVE", sourceId: "CHAIN-HIVE-20260904", reason: "zero-delta",
  }]);
});

test("a missing counter account is listed once under accountsToOpen", () => {
  const result = deriveSetOfCandidateTransactions({
    mismatches: [
      { account: "A", commodity: "X", postedBalance: "1", assertedBalance: "2", assertionDate: "2026-09-05", sourceId: "S1" },
      { account: "B", commodity: "Y", postedBalance: "1", assertedBalance: "3", assertionDate: "2026-09-05", sourceId: "S2" },
    ],
    openAccounts: [],
  });
  assert.equal(result.accountsToOpen.length, 1);
  assert.equal(result.accountsToOpen[0].account, "Income:Investment:Unrealized-Gains");
});

test("rejects a non-terminating fraction", () => {
  assert.throws(() => deriveSetOfCandidateTransactions({
    mismatches: [{ account: "A", commodity: "X", postedBalance: "0", assertedBalance: "1/3", assertionDate: "2026-09-05", sourceId: "S1" }],
  }), /non-terminating/u);
});
