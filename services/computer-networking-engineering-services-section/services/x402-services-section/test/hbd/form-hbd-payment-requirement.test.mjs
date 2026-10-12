import assert from "node:assert/strict";
import test from "node:test";
import { formHbdPaymentRequirement } from "../../src/hbd/form-hbd-payment-requirement.mjs";

const BASE_REQUEST = {
  resource: { id: "hive-engine-exit-tightness-report", price: "0.100" },
  sellerAccount: "emsenn0",
  memoPrefix: "x402",
  nonce: "n-1",
  expirySeconds: 900,
  requestedAt: "2026-09-05T00:00:00.000Z",
};

test("forms one hbd-transfer accepts entry with the exact requested price and resource", () => {
  const body = formHbdPaymentRequirement(BASE_REQUEST);
  assert.equal(body.type, "X402PaymentRequired");
  assert.equal(body.x402Version, 1);
  assert.equal(body.accepts.length, 1);
  const entry = body.accepts[0];
  assert.equal(entry.scheme, "hbd-transfer");
  assert.equal(entry.network, "hive:mainnet");
  assert.equal(entry.maxAmountRequired, "0.100");
  assert.equal(entry.resource, "hive-engine-exit-tightness-report");
  assert.equal(entry.payTo, "emsenn0");
  assert.equal(entry.asset, "HBD");
  assert.equal(entry.maxTimeoutSeconds, 900);
});

test("computes a content-addressed ni: memo prefixed by memoPrefix", () => {
  const entry = formHbdPaymentRequirement(BASE_REQUEST).accepts[0];
  assert.match(entry.extra.memo, /^x402:ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
});

test("is deterministic for identical inputs", () => {
  const a = formHbdPaymentRequirement(BASE_REQUEST).accepts[0].extra.memo;
  const b = formHbdPaymentRequirement(BASE_REQUEST).accepts[0].extra.memo;
  assert.equal(a, b);
});

test("changes the memo when the nonce changes", () => {
  const a = formHbdPaymentRequirement(BASE_REQUEST).accepts[0].extra.memo;
  const b = formHbdPaymentRequirement({ ...BASE_REQUEST, nonce: "n-2" }).accepts[0].extra.memo;
  assert.notEqual(a, b);
});

test("computes expiresAt from requestedAt plus expirySeconds", () => {
  const entry = formHbdPaymentRequirement(BASE_REQUEST).accepts[0];
  assert.equal(entry.extra.expiresAt, "2026-09-05T00:15:00.000Z");
});

test("states the verification rule naming the transfer operation and two required nodes", () => {
  const rule = formHbdPaymentRequirement(BASE_REQUEST).accepts[0].extra.verificationRule;
  assert.equal(rule.kind, "hive-transfer-with-memo");
  assert.equal(rule.operation, "transfer");
  assert.equal(rule.nodesRequired, 2);
});

test("refuses a malformed resource id", () => {
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, resource: { ...BASE_REQUEST.resource, id: "Bad Id" } }), /resource\.id/u);
});

test("refuses a malformed resource price", () => {
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, resource: { ...BASE_REQUEST.resource, price: "0" } }), /resource\.price/u);
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, resource: { ...BASE_REQUEST.resource, price: "0.1000" } }), /resource\.price/u);
});

test("refuses a malformed seller account", () => {
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, sellerAccount: "AB" }), /sellerAccount/u);
});

test("refuses a memo prefix starting with # (Hive encrypted-memo marker)", () => {
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, memoPrefix: "#x402" }), /memoPrefix/u);
});

test("refuses a missing nonce", () => {
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, nonce: "" }), /nonce/u);
});

test("refuses an out-of-range expirySeconds", () => {
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, expirySeconds: 0 }), /expirySeconds/u);
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, expirySeconds: 86401 }), /expirySeconds/u);
});

test("refuses a requestedAt without a trailing Z", () => {
  assert.throws(() => formHbdPaymentRequirement({ ...BASE_REQUEST, requestedAt: "2026-09-05T00:00:00.000" }), /requestedAt/u);
});
