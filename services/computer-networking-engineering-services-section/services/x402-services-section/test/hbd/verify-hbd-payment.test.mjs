import assert from "node:assert/strict";
import test from "node:test";
import { verifyHbdPayment } from "../../src/hbd/verify-hbd-payment.mjs";

const REQUIREMENT = {
  scheme: "hbd-transfer",
  network: "hive:mainnet",
  maxAmountRequired: "0.002",
  resource: "hive-engine-exit-tightness-report",
  payTo: "emsenn0",
  asset: "HBD",
  maxTimeoutSeconds: 900,
  extra: { memo: "the-memo", expiresAt: "2021-03-30T00:00:00.000Z" },
};

const REAL_TRANSFER_ROW = {
  op: ["transfer", { to: "emsenn0", from: "actifit.pay", memo: "the-memo", amount: "0.002 HBD" }],
  block: 52555235,
  trx_id: "3138e2ef6b5881d0752c9512047ab7360a9b9127",
  timestamp: "2021-03-29T09:07:45",
};

const BASE_REQUEST = {
  requirement: REQUIREMENT,
  claim: { block: 52555235, transactionId: "3138e2ef6b5881d0752c9512047ab7360a9b9127" },
  nodes: ["https://fixture-node-a.example", "https://fixture-node-b.example"],
  observedAt: "2021-03-29T10:00:00.000Z",
};

test("verifies when both nodes independently agree on the identical transfer", async () => {
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, fixtureResponses: [[REAL_TRANSFER_ROW], [REAL_TRANSFER_ROW]] });
  assert.equal(verification.status, "verified");
  assert.equal(verification.transfer.from, "actifit.pay");
  assert.equal(verification.transfer.amount, "0.002");
  assert.equal(verification.transfer.transactionId, "3138e2ef6b5881d0752c9512047ab7360a9b9127");
  assert.deepEqual(verification.nodesAgreeing, BASE_REQUEST.nodes);
});

test("looks up by account history when no claim.block is given, matching by memo", async () => {
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, claim: {}, fixtureResponses: [[[1, REAL_TRANSFER_ROW]], [[1, REAL_TRANSFER_ROW]]] });
  assert.equal(verification.status, "verified");
});

test("refuses not-found when neither node reports a matching transfer", async () => {
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, fixtureResponses: [[], []] });
  assert.equal(verification.status, "refused");
  assert.equal(verification.reason, "not-found");
});

test("refuses nodes-disagree when only one node reports the transfer", async () => {
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, fixtureResponses: [[REAL_TRANSFER_ROW], []] });
  assert.equal(verification.status, "refused");
  assert.equal(verification.reason, "nodes-disagree");
});

test("refuses wrong-amount when the found transfer does not match the requirement's price", async () => {
  const row = { ...REAL_TRANSFER_ROW, op: ["transfer", { ...REAL_TRANSFER_ROW.op[1], amount: "0.003 HBD" }] };
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, fixtureResponses: [[row], [row]] });
  assert.equal(verification.status, "refused");
  assert.equal(verification.reason, "wrong-amount");
});

test("refuses wrong-memo when a transactionId-matched transfer carries a different memo", async () => {
  const row = { ...REAL_TRANSFER_ROW, op: ["transfer", { ...REAL_TRANSFER_ROW.op[1], memo: "a-different-memo" }] };
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, fixtureResponses: [[row], [row]] });
  assert.equal(verification.status, "refused");
  assert.equal(verification.reason, "wrong-memo");
});

test("refuses expired when the transfer lands after the requirement's expiry", async () => {
  const expired = { ...REQUIREMENT, extra: { ...REQUIREMENT.extra, expiresAt: "2021-01-01T00:00:00.000Z" } };
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, requirement: expired, fixtureResponses: [[REAL_TRANSFER_ROW], [REAL_TRANSFER_ROW]] });
  assert.equal(verification.status, "refused");
  assert.equal(verification.reason, "expired");
});

test("refuses node-unavailable when one node's fixture reports an error", async () => {
  const verification = await verifyHbdPayment({ ...BASE_REQUEST, fixtureResponses: [[REAL_TRANSFER_ROW], { error: "bad gateway" }] });
  assert.equal(verification.status, "refused");
  assert.equal(verification.reason, "node-unavailable");
});

test("refuses a requirement of the wrong scheme", () => {
  return assert.rejects(verifyHbdPayment({ ...BASE_REQUEST, requirement: { ...REQUIREMENT, scheme: "exact" } }), /requirement\.scheme/u);
});

test("refuses fewer or more than two nodes", () => {
  return assert.rejects(verifyHbdPayment({ ...BASE_REQUEST, nodes: ["https://only-one.example"] }), /nodes/u);
});

test("refuses a malformed observedAt", () => {
  return assert.rejects(verifyHbdPayment({ ...BASE_REQUEST, observedAt: "not-a-date" }), /observedAt/u);
});
