import assert from "node:assert/strict";
import test from "node:test";
import { settleHbdPurchase } from "../../src/hbd/settle-hbd-purchase.mjs";

const VERIFIED = {
  type: "HbdPaymentVerification",
  version: 1,
  status: "verified",
  transfer: {
    from: "actifit.pay",
    to: "emsenn0",
    amount: "0.002",
    asset: "HBD",
    memo: "Weekly delegator share payment. Thank you for supporting @actifit :)",
    block: 52555235,
    transactionId: "3138e2ef6b5881d0752c9512047ab7360a9b9127",
    timestamp: "2021-03-29T09:07:45",
  },
  nodesAgreeing: ["https://api.hive.blog", "https://api.openhive.network"],
};

const BASE_REQUEST = {
  verification: VERIFIED,
  resource: { id: "hive-engine-exit-tightness-report", price: "0.002" },
  sellerAccount: "emsenn0",
  date: "2021-03-29",
};

test("computes the settlement witness graph id from the verified network and transaction", () => {
  const settlement = settleHbdPurchase(BASE_REQUEST);
  assert.equal(settlement.witnessRecord.transaction, "3138e2ef6b5881d0752c9512047ab7360a9b9127");
  assert.match(settlement.witnessRecord.graphId, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
});

test("carries the exact resource, seller, buyer, amount, memo, and block into the witness record", () => {
  const settlement = settleHbdPurchase(BASE_REQUEST);
  assert.equal(settlement.witnessRecord.resourceId, "hive-engine-exit-tightness-report");
  assert.equal(settlement.witnessRecord.sellerAccount, "emsenn0");
  assert.equal(settlement.witnessRecord.buyerAccount, "actifit.pay");
  assert.equal(settlement.witnessRecord.amount, "0.002");
  assert.equal(settlement.witnessRecord.memo, VERIFIED.transfer.memo);
  assert.equal(settlement.witnessRecord.block, 52555235);
  assert.equal(settlement.witnessRecord.settledAt, "2021-03-29");
});

test("renders one balanced two-posting Beancount transaction with capitalized account-path components", () => {
  const settlement = settleHbdPurchase(BASE_REQUEST);
  assert.deepEqual(settlement.beancount.postings, [
    { account: "Assets:Hive:HBD:Emsenn0", amount: "0.002", commodity: "HBD" },
    { account: "Income:Sales:X402:Hive-engine-exit-tightness-report", amount: "-0.002", commodity: "HBD" },
  ]);
  assert.equal(
    settlement.beancount.text,
    '2021-03-29 * "x402 hbd-transfer sale: hive-engine-exit-tightness-report to actifit.pay"\n  Assets:Hive:HBD:Emsenn0  0.002 HBD\n  Income:Sales:X402:Hive-engine-exit-tightness-report  -0.002 HBD\n',
  );
});

test("preserves the raw lowercase sellerAccount and resourceId everywhere outside the account path", () => {
  const settlement = settleHbdPurchase(BASE_REQUEST);
  assert.equal(settlement.witnessRecord.sellerAccount, "emsenn0");
  assert.equal(settlement.witnessRecord.resourceId, "hive-engine-exit-tightness-report");
  assert.equal(settlement.beancount.narration, "x402 hbd-transfer sale: hive-engine-exit-tightness-report to actifit.pay");
});

test("refuses an unverified verification", () => {
  assert.throws(() => settleHbdPurchase({ ...BASE_REQUEST, verification: { ...VERIFIED, status: "refused" } }), /verification\.status/u);
});

test("refuses a verification missing a required transfer field", () => {
  const { block, ...rest } = VERIFIED.transfer;
  assert.throws(() => settleHbdPurchase({ ...BASE_REQUEST, verification: { ...VERIFIED, transfer: rest } }), /verification\.transfer\.block/u);
});

test("refuses a resource price that does not match the verified transfer amount", () => {
  assert.throws(() => settleHbdPurchase({ ...BASE_REQUEST, resource: { ...BASE_REQUEST.resource, price: "0.003" } }), /resource\.price/u);
});

test("refuses a seller account that does not match the verified transfer's payee", () => {
  assert.throws(() => settleHbdPurchase({ ...BASE_REQUEST, sellerAccount: "someoneelse" }), /sellerAccount/u);
});

test("refuses a malformed resource id", () => {
  assert.throws(() => settleHbdPurchase({ ...BASE_REQUEST, resource: { ...BASE_REQUEST.resource, id: "Bad Id" } }), /resource\.id/u);
});

test("refuses a malformed date", () => {
  assert.throws(() => settleHbdPurchase({ ...BASE_REQUEST, date: "03/29/2021" }), /date/u);
});
