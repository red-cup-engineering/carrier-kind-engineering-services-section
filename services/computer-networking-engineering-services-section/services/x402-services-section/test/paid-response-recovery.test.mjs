import assert from "node:assert/strict";
import test from "node:test";

import {
  identifyPaidResponseAuthorization,
  inspectPaidResponseRequest,
  recoverPaidResponse,
} from "../src/paid-response-recovery.mjs";

const accepted = Object.freeze({
  scheme: "exact",
  network: "eip155:8453",
  asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  amount: "1000",
  payTo: "0x32886F6F361C1d570255c2762967A2e41D0E9B1a",
});
const authorization = Object.freeze({
  from: `0x${"11".repeat(20)}`,
  to: accepted.payTo,
  value: "1000",
  validAfter: "0",
  validBefore: "1900000000",
  nonce: `0x${"22".repeat(32)}`,
});
const recoveryToken = "ab".repeat(32);

function payload(extra = {}) {
  return {
    x402Version: 2,
    accepted,
    payload: { signature: `0x${"ab".repeat(65)}`, authorization, ...extra },
  };
}

function request(url = "https://market.example/handbook") {
  const encoded = Buffer.from(JSON.stringify(payload())).toString("base64");
  return new Request(url, { headers: { "payment-signature": encoded, "x-payment-recovery": recoveryToken } });
}

test("authorization identity excludes incidental payload fields but credentials and requests remain bound", async () => {
  const first = await identifyPaidResponseAuthorization(payload(), recoveryToken);
  const withExtraField = await identifyPaidResponseAuthorization(payload({ note: "ignored for identity" }), recoveryToken);
  const changedNonce = await identifyPaidResponseAuthorization(payload({ authorization: { ...authorization, nonce: `0x${"33".repeat(32)}` } }), recoveryToken);
  const changedAccepted = await identifyPaidResponseAuthorization({ ...payload(), accepted: { ...accepted, amount: "1001" } }, recoveryToken);
  const changedToken = await identifyPaidResponseAuthorization(payload(), "cd".repeat(32));
  assert.equal(first.identity, withExtraField.identity);
  assert.equal(first.credentialDigest, withExtraField.credentialDigest);
  assert.notEqual(first.identity, changedNonce.identity);
  assert.notEqual(first.credentialDigest, changedAccepted.credentialDigest);
  assert.notEqual(first.credentialDigest, changedToken.credentialDigest);
  assert.equal(await identifyPaidResponseAuthorization(payload()), null);

  const a = await inspectPaidResponseRequest(request());
  const b = await inspectPaidResponseRequest(request("https://market.example/handbook?edition=2"));
  assert.equal(a.identity, b.identity);
  assert.notEqual(a.requestDigest, b.requestDigest);
  assert.equal("signature" in a, false);
});

test("recovery returns only matching completed purchases and refuses conflicts or unsettled records", async () => {
  const candidate = request();
  const inspected = await inspectPaidResponseRequest(candidate);
  const store = {
    async recover(value) {
      assert.equal(value.identity, inspected.identity);
      assert.equal(value.credentialDigest, inspected.credentialDigest);
      assert.equal(value.requestDigest, inspected.requestDigest);
      assert.equal(value.paymentPayload.payload.signature, inspected.paymentPayload.payload.signature);
      return { state: "complete", response: { status: 200, headers: { "content-type": "application/json" }, body: new TextEncoder().encode('{"edition":"2026"}') }, settlementHeaders: { "payment-response": "settled" } };
    },
  };
  const recovered = await recoverPaidResponse(candidate, store);
  assert.equal(recovered.status, 200);
  assert.equal(recovered.headers.get("payment-response"), "settled");
  assert.deepEqual(await recovered.json(), { edition: "2026" });

  assert.equal(await recoverPaidResponse(candidate, { recover: async () => ({ state: "pending" }) }).then((r) => r.status), 503);
  assert.equal(await recoverPaidResponse(candidate, { recover: async () => ({ state: "conflict" }) }).then((r) => r.status), 409);
  assert.equal(await recoverPaidResponse(candidate, { recover: async () => ({ state: "absent" }) }), null);
});

test("malformed or non-exact payment payloads do not become recovery identities", async () => {
  assert.equal(await identifyPaidResponseAuthorization({ x402Version: 2, accepted, payload: { signature: "0xsig" } }, recoveryToken), null);
  const bad = { ...payload(), accepted: { ...accepted, scheme: "upto" } };
  assert.equal(await identifyPaidResponseAuthorization(bad, recoveryToken), null);
  assert.equal(await inspectPaidResponseRequest(new Request("https://market.example/handbook", { headers: { "payment-signature": "invalid" } })), null);
  const missingToken = request();
  missingToken.headers.delete("x-payment-recovery");
  assert.equal((await recoverPaidResponse(missingToken, { recover: async () => ({ state: "absent" }) })).status, 400);
});
