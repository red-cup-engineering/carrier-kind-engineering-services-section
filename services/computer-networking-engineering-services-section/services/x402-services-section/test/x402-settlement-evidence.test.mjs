import assert from "node:assert/strict";
import test from "node:test";
import { x402SettlementEvidence } from "../src/x402-settlement-evidence.mjs";

const NETWORK = "eip155:5615611";
const TX = `0x${"AB".repeat(32)}`;
const PAYER = `0x${"CD".repeat(20)}`;
const identify = (payload) => `payment:${payload.accepted.network}:${payload.accepted.amount}`;

function context() {
  return {
    paymentPayload: { x402Version: 2, accepted: { network: NETWORK, amount: "12" } },
    requirements: { network: NETWORK, amount: "12" },
    result: { success: true, network: NETWORK, transaction: TX, payer: PAYER, amount: "12" },
  };
}

test("a settlement names the same chain at signed payment, requirement, and report faces", () => {
  const admitted = context();
  assert.deepEqual(x402SettlementEvidence(admitted, { identify }), {
    type: "X402SettlementEvidence", invocation: `payment:${NETWORK}:12`, success: true,
    network: NETWORK, transaction: TX.toLowerCase(), payer: PAYER.toLowerCase(), amount: "12",
  });
  assert.equal(admitted.result.transaction, TX);
});

test("a facilitator transaction from another chain cannot enter the customer's settlement evidence", () => {
  const mismatched = context();
  mismatched.result.network = "eip155:8453";
  assert.throws(() => x402SettlementEvidence(mismatched, { identify }), /settlement network disagrees/u);
});

test("the hook's selected requirement cannot name a different chain", () => {
  const mismatched = context();
  mismatched.requirements.network = "eip155:8453";
  assert.throws(() => x402SettlementEvidence(mismatched, { identify }), /requirements disagree/u);
});

test("signed payment network is required and remains an explicit EVM CAIP-2 identifier", () => {
  for (const network of [undefined, "8453", "eip155:0", "eip155:05615611", "solana:mainnet"]) {
    const malformed = context();
    malformed.paymentPayload.accepted.network = network;
    assert.throws(() => x402SettlementEvidence(malformed, { identify }), /EVM CAIP-2/u);
  }
});

test("callers without the optional requirement snapshot still join to the signed payment", () => {
  const admitted = context();
  delete admitted.requirements;
  delete admitted.result.amount;
  delete admitted.result.payer;
  const projected = x402SettlementEvidence(admitted, { identify });
  assert.equal(projected.amount, "12");
  assert.equal(projected.payer, null);
  assert.equal(projected.network, NETWORK);
});

test("missing selected requirement network and noncanonical amounts remain refused", () => {
  const missing = context();
  delete missing.requirements.network;
  assert.throws(() => x402SettlementEvidence(missing, { identify }), /EVM CAIP-2/u);
  const noncanonical = context();
  noncanonical.result.amount = "012";
  assert.throws(() => x402SettlementEvidence(noncanonical, { identify }), /canonical atomic/u);
  const mismatch = context();
  mismatch.result.amount = "13";
  assert.throws(() => x402SettlementEvidence(mismatch, { identify }), /amount disagrees/u);
});
