import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfX402SettlementTransactions } from "../scripts/derive-set-of-x402-settlement-transactions.mjs";

const WITNESS_ID = "ni:///sha-256;abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHI";
const TX_HASH = `0x${"a".repeat(64)}`;
const RECEIVER = "0x1111111111111111111111111111111111111111";
const ASSET = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const CLASSIFIED = { asset: ASSET, receiver: RECEIVER, logIndex: "0x0", evidenceId: "ni:///sha-256;receipt", recognition: { kind: "advance", account: "Liabilities:Contract", contractId: "contract:1" } };

test("refuses a non-array settlements input", () => {
  assert.throws(() => deriveSetOfX402SettlementTransactions({ receiver: RECEIVER, gateway: "g" }), /input\.settlements must be an array/u);
});

test("throws when receiver is missing", () => {
  assert.throws(() => deriveSetOfX402SettlementTransactions({ settlements: [], gateway: "g", asOf: "2026-09-05" }), /input\.receiver must be a non-empty string/u);
});

test("throws when gateway is missing", () => {
  assert.throws(() => deriveSetOfX402SettlementTransactions({ settlements: [], receiver: "r", asOf: "2026-09-05" }), /input\.gateway must be a non-empty string/u);
});

test("throws a RangeError when settlements is empty and asOf is missing", () => {
  assert.throws(() => deriveSetOfX402SettlementTransactions({ settlements: [], receiver: RECEIVER, gateway: "public-solar" }), RangeError);
});

test("an empty settlement set still derives the gateway's income and shared asset accounts to open, dated asOf", () => {
  const result = deriveSetOfX402SettlementTransactions({ settlements: [], receiver: RECEIVER, gateway: "public-solar", asOf: "2026-09-05" });
  assert.equal(result.transactionCount, 0);
  assert.deepEqual(result.refusals, []);
  const accounts = result.accountsToOpen.map((a) => a.account);
  assert.ok(accounts.includes("Income:Sales:X402:Public-solar"));
  assert.ok(accounts.includes("Assets:Digital-Assets:EVM:Base:Tokens"));
  assert.ok(result.accountsToOpen.every((a) => a.date === "2026-09-05"));
});

test("an already-open shared asset account is not re-opened when settlements is empty", () => {
  const result = deriveSetOfX402SettlementTransactions({
    settlements: [], receiver: RECEIVER, gateway: "public-solar", asOf: "2026-09-05",
    openAccounts: ["Assets:Digital-Assets:EVM:Base:Tokens"],
  });
  const accounts = result.accountsToOpen.map((a) => a.account);
  assert.deepEqual(accounts, ["Income:Sales:X402:Public-solar"]);
});

test("a settlement missing witnessGraphId is refused, never booked, and opens no account", () => {
  const result = deriveSetOfX402SettlementTransactions({
    receiver: RECEIVER, gateway: "public-solar",
    settlements: [{ transactionHash: TX_HASH, payer: "0xpayer", amount: "510000", blockTime: "2026-09-05T14:00:00Z" }],
  });
  assert.equal(result.transactionCount, 0);
  assert.equal(result.accountsToOpen.length, 0);
  assert.deepEqual(result.refusals, [{ transactionHash: TX_HASH, reason: "missing-second-witness" }]);
});

test("a two-witness settlement books the exact decimal amount against the shared Base USDC account", () => {
  const result = deriveSetOfX402SettlementTransactions({
    receiver: RECEIVER, gateway: "public-solar", openAccounts: ["Assets:Digital-Assets:EVM:Base:Tokens"],
    settlements: [{ transactionHash: TX_HASH, payer: "0xpayer", amount: "510000", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID, ...CLASSIFIED }],
  });
  assert.equal(result.transactionCount, 1);
  assert.deepEqual(result.refusals, []);
  const [tx] = result.transactions;
  assert.equal(tx.amount, "0.51");
  assert.equal(tx.date, "2026-09-05");
  assert.match(tx.directive, /Assets:Digital-Assets:EVM:Base:Tokens {2}0\.51 USDC/u);
  assert.match(tx.directive, /Liabilities:Contract {2}-0\.51 USDC/u);
  assert.deepEqual(result.accountsToOpen.map((a) => a.account), ["Liabilities:Contract"]);
});

test("every booked transaction carries source_id, payer, network, witness_graph_id, gateway, and receiver metadata", () => {
  const result = deriveSetOfX402SettlementTransactions({
    receiver: RECEIVER, gateway: "public-solar",
    settlements: [{ transactionHash: TX_HASH, payer: "0xpayer", amount: "1000000", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID, ...CLASSIFIED }],
  });
  const [tx] = result.transactions;
  for (const line of [
    'source_id: "evm:eip155:8453:', 'payer: "0xpayer"', 'network: "eip155:8453"',
    `witness_graph_id: "${WITNESS_ID}"`, 'gateway: "public-solar"', `receiver: "${RECEIVER}"`,
  ]) assert.ok(tx.directive.includes(line), `expected directive to include ${line}`);
});

test("a non-Base network is refused", () => {
  const result = deriveSetOfX402SettlementTransactions({
    receiver: RECEIVER, gateway: "g",
    settlements: [{ transactionHash: TX_HASH, payer: "p", amount: "1000000", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID, ...CLASSIFIED, network: "eip155:1" }],
  });
  assert.equal(result.refusals[0].reason, "event-binding-mismatch");
});

test("a matching USDC price directive attaches amountUsd without a second posting", () => {
  const result = deriveSetOfX402SettlementTransactions({
    receiver: RECEIVER, gateway: "g",
    settlements: [{ transactionHash: TX_HASH, payer: "p", amount: "2000000", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID, ...CLASSIFIED }],
    priceDirectives: [{ symbol: "USDC", date: "2026-09-01", price: "1.00" }],
  });
  const [tx] = result.transactions;
  assert.equal(tx.amountUsd, "2");
  assert.equal((tx.directive.match(/USDC/gu) ?? []).length, 2);
});

test("no matching price directive leaves amountUsd null", () => {
  const result = deriveSetOfX402SettlementTransactions({
    receiver: RECEIVER, gateway: "g",
    settlements: [{ transactionHash: TX_HASH, payer: "p", amount: "2000000", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID, ...CLASSIFIED }],
  });
  assert.equal(result.transactions[0].amountUsd, null);
});

test("a malformed transactionHash on a witnessed settlement throws TypeError", () => {
  assert.throws(() => deriveSetOfX402SettlementTransactions({
    receiver: RECEIVER, gateway: "g",
    settlements: [{ transactionHash: "not-a-hash", payer: "p", amount: "1", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID, ...CLASSIFIED }],
  }), /transactionHash must be a 0x-prefixed 32-byte hash/u);
});

test("a non-digit amount on a witnessed settlement throws TypeError", () => {
  assert.throws(() => deriveSetOfX402SettlementTransactions({
    receiver: RECEIVER, gateway: "g",
    settlements: [{ transactionHash: TX_HASH, payer: "p", amount: "1.5", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID, ...CLASSIFIED }],
  }), /amount must be a non-negative atomic-unit digit string/u);
});

test("accountsToOpen is deduplicated across multiple settlements to the same gateway", () => {
  const result = deriveSetOfX402SettlementTransactions({
    receiver: RECEIVER, gateway: "g",
    settlements: [
      { transactionHash: TX_HASH, payer: "p", amount: "1000000", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID, ...CLASSIFIED },
      { transactionHash: `0x${"b".repeat(64)}`, payer: "p", amount: "2000000", blockTime: "2026-09-06T14:00:00Z", witnessGraphId: WITNESS_ID, ...CLASSIFIED },
    ],
  });
  assert.equal(result.transactionCount, 2);
  assert.equal(result.accountsToOpen.length, 2);
});
