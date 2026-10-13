import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { encodePaymentSignatureHeader } from "@x402/core/http";
import { createExactEvmPaymentBoundary, createBatchEvmPaymentBoundary, createUptoEvmPaymentBoundary, setSettlementOverrides } from "../src/resource-server.mjs";
import { createExactEvmFetchPaymentBoundary, createUptoEvmFetchPaymentBoundary, SETTLEMENT_OVERRIDES_HEADER } from "../src/fetch-server.mjs";
import { boundUptoSettlement } from "../src/route-configuration.mjs";

const network = "eip155:84532", payTo = `0x${"22".repeat(20)}`, payer = `0x${"11".repeat(20)}`;
const routes = scheme => ({ "GET /compute": { accepts: [{ scheme, network, price: "$0.01", payTo }], description: "metered computation" } });
function facilitator(scheme) {
  const calls = { verify: [], settle: [] };
  return { calls,
    async getSupported() { return { kinds: [{ x402Version: 2, scheme, network, extra: { facilitatorAddress: payTo } }], extensions: [], signers: {} }; },
    async verify(payload, requirements) { calls.verify.push({ payload, requirements }); return { isValid: true, payer }; },
    async settle(payload, requirements) { calls.settle.push({ payload, requirements }); return { success: true, network, transaction: `0x${"ab".repeat(32)}`, payer, amount: requirements.amount }; },
  };
}
async function paidRequest(boundary, amount, options) {
  const request = new Request("https://seller.example/compute");
  const response = await boundary.handle(request, () => { throw new Error("unpaid compute must not run"); });
  assert.equal(response.status, 402);
  const challenge = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64"));
  const paymentPayload = { x402Version: 2, accepted: challenge.accepts[0], payload: { signature: "0x1234" } };
  return boundary.handle(new Request(request.url, { headers: { "payment-signature": encodePaymentSignatureHeader(paymentPayload), "settlement-overrides": JSON.stringify({ amount: "0" }) } }),
    () => Response.json({ result: true }, { headers: { [SETTLEMENT_OVERRIDES_HEADER]: JSON.stringify({ amount }) } }), options);
}

test("Fetch upto settles the seller's actual atomic usage and keeps the maximum authorization", async () => {
  const hired = facilitator("upto");
  const boundary = createUptoEvmFetchPaymentBoundary({ network, routes: routes("upto"), facilitatorClient: hired });
  const response = await paidRequest(boundary, "2300");
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { result: true });
  assert.equal(response.headers.has(SETTLEMENT_OVERRIDES_HEADER), false);
  assert.equal(hired.calls.verify[0].requirements.amount, "10000");
  assert.equal(hired.calls.settle[0].requirements.amount, "2300");
  assert.equal(hired.calls.settle[0].payload.accepted.amount, "10000");
  assert.equal(hired.calls.settle.length, 1);
});

test("the boundary refuses usage above the buyer ceiling and admits zero", async () => {
  for (const amount of ["10001", "0"]) {
    const hired = facilitator("upto"), boundary = createUptoEvmFetchPaymentBoundary({ network, routes: routes("upto"), facilitatorClient: hired });
    const response = await paidRequest(boundary, amount);
    assert.equal(response.status, amount === "0" ? 200 : 402);
    assert.equal(hired.calls.settle.length, amount === "0" ? 1 : 0);
    if (amount === "0") assert.equal(hired.calls.settle[0].requirements.amount, "0");
  }
});

test("upto refuses the exact-authorization recovery store before paid compute or persistence", async () => {
  const hired = facilitator("upto"), boundary = createUptoEvmFetchPaymentBoundary({ network, routes: routes("upto"), facilitatorClient: hired });
  await assert.rejects(paidRequest(boundary, "1000", { purchaseStore: { recover() { throw new Error("unsupported persistence must not run"); } } }), /only exact-EVM/u);
  assert.equal(hired.calls.verify.length, 0); assert.equal(hired.calls.settle.length, 0);
});

test("every EVM transport binds its routes to its registered chain before facilitator effects", () => {
  let probes = 0;
  const hired = { getSupported() { probes++; throw new Error("wrong-chain route must refuse before discovery"); } };
  for (const [factory, scheme, extra] of [
    [createExactEvmPaymentBoundary, "exact", {}], [createExactEvmFetchPaymentBoundary, "exact", {}],
    [createUptoEvmPaymentBoundary, "upto", {}], [createUptoEvmFetchPaymentBoundary, "upto", {}],
    [createBatchEvmPaymentBoundary, "batch-settlement", { receiver: payTo, storage: {} }],
  ]) {
    const wrong = routes(scheme); wrong["GET /compute"].accepts[0].network = "eip155:5615611";
    assert.throws(() => factory({ network, routes: wrong, facilitatorClient: hired, ...extra }), /registered network/u);
  }
  assert.equal(probes, 0);
});

test("Express uses the same official upto amount override and removes its internal header", async () => {
  const hired = facilitator("upto"), boundary = createUptoEvmPaymentBoundary({ network, routes: routes("upto"), facilitatorClient: hired });
  const app = express(); app.use(boundary.middleware); app.get("/compute", (_req, res) => { setSettlementOverrides(res, { amount: "2300" }); res.json({ result: true }); });
  const server = app.listen(0, "127.0.0.1"); await new Promise(resolve => server.once("listening", resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/compute`, response = await fetch(url);
    assert.equal(response.status, 402);
    const challenge = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64"));
    const paid = await fetch(url, { headers: { "payment-signature": encodePaymentSignatureHeader({ x402Version: 2, accepted: challenge.accepts[0], payload: { signature: "0x1234" } }) } });
    assert.equal(paid.status, 200); assert.deepEqual(await paid.json(), { result: true });
    assert.equal(paid.headers.has(SETTLEMENT_OVERRIDES_HEADER), false);
    assert.equal(hired.calls.settle[0].requirements.amount, "2300");
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test("noncanonical or out-of-range actual consideration and ceilings refuse through the shared settlement hook", async () => {
  for (const value of [undefined, 1, "-1", "01", "1.2", "1e3", "", (1n << 256n).toString()]) {
    for (const [maximum, actual] of [["10000", value], [value, "0"]]) {
      const result = await boundUptoSettlement({ paymentPayload: { accepted: { amount: maximum } }, requirements: { amount: actual } });
      assert.equal(result.abort, true);
    }
  }
  assert.equal(await boundUptoSettlement({ paymentPayload: { accepted: { amount: ((1n << 256n) - 1n).toString() } }, requirements: { amount: "0" } }), undefined);
});

test("a failed Fetch handler cancels without settling and strips its internal override", async () => {
  const hired = facilitator("upto"), boundary = createUptoEvmFetchPaymentBoundary({ network, routes: routes("upto"), facilitatorClient: hired });
  const canceled = []; boundary.resourceServer.onVerifiedPaymentCanceled(context => canceled.push(context));
  const challengeResponse = await boundary.handle(new Request("https://seller.example/compute"), () => assert.fail("unpaid execution"));
  const challenge = JSON.parse(Buffer.from(challengeResponse.headers.get("payment-required"), "base64"));
  const response = await boundary.handle(new Request("https://seller.example/compute", { headers: {
    "payment-signature": encodePaymentSignatureHeader({ x402Version: 2, accepted: challenge.accepts[0], payload: { signature: "0x1234" } }),
  } }), () => new Response("temporarily unavailable", { status: 503, statusText: "Busy", headers: {
    [SETTLEMENT_OVERRIDES_HEADER]: JSON.stringify({ amount: "2300" }), "retry-after": "2",
  } }));
  assert.equal(response.status, 503); assert.equal(response.statusText, "Busy");
  assert.equal(await response.text(), "temporarily unavailable");
  assert.equal(response.headers.get("retry-after"), "2");
  assert.equal(response.headers.has(SETTLEMENT_OVERRIDES_HEADER), false);
  assert.equal(hired.calls.settle.length, 0);
  assert.equal(canceled.length, 1); assert.equal(canceled[0].reason, "handler_failed");
});
