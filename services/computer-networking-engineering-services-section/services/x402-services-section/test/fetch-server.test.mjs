import assert from "node:assert/strict";
import test from "node:test";

import { createExactEvmFetchPaymentBoundary } from "../src/fetch-server.mjs";

const NETWORK = "eip155:84532";
const PAY_TO = "0x0000000000000000000000000000000000000001";

function unpaidFacilitator() {
  return {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { throw new Error("an unpaid assay must never verify"); },
    async settle() { throw new Error("an unpaid assay must never settle"); },
  };
}

test("fetch boundary emits the official x402 v2 exact challenge for a request with no payment", async () => {
  const boundary = createExactEvmFetchPaymentBoundary({
    network: NETWORK,
    facilitatorClient: unpaidFacilitator(),
    routes: { "GET /value": { accepts: [{ scheme: "exact", network: NETWORK, price: "$0.001", payTo: PAY_TO }], description: "one value" } },
  });
  const response = await boundary.handle(
    new Request("https://gateway.example/value"),
    () => Response.json({ value: true }),
  );
  assert.equal(response.status, 402);
  const challenge = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));
  assert.equal(challenge.x402Version, 2);
  assert.equal(challenge.accepts[0].scheme, "exact");
  assert.equal(challenge.accepts[0].network, NETWORK);
  assert.equal(challenge.accepts[0].payTo.toLowerCase(), PAY_TO);
});

test("fetch boundary passes an unpriced route straight to the handler", async () => {
  const boundary = createExactEvmFetchPaymentBoundary({
    network: NETWORK,
    facilitatorClient: unpaidFacilitator(),
    routes: { "GET /value": { accepts: [{ scheme: "exact", network: NETWORK, price: "$0.001", payTo: PAY_TO }], description: "one value" } },
  });
  const response = await boundary.handle(
    new Request("https://gateway.example/free"),
    () => Response.json({ ok: true }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("fetch boundary refuses implicit networks and non-exact schemes", () => {
  assert.throws(
    () => createExactEvmFetchPaymentBoundary({ network: "", facilitatorClient: unpaidFacilitator(), routes: { "GET /value": { accepts: { scheme: "exact" } } } }),
    /CAIP-2/u,
  );
  assert.throws(
    () => createExactEvmFetchPaymentBoundary({ network: NETWORK, facilitatorClient: unpaidFacilitator(), routes: { "GET /value": { accepts: { scheme: "custom" } } } }),
    /exact scheme/u,
  );
});

function countingFacilitator() {
  let calls = 0;
  return {
    calls: () => calls,
    async getSupported() { calls += 1; return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { throw new Error("an unpaid assay must never verify"); },
    async settle() { throw new Error("an unpaid assay must never settle"); },
  };
}

test("constructing the boundary makes no facilitator calls (handshake is not armed at construction)", async () => {
  const facilitator = countingFacilitator();
  createExactEvmFetchPaymentBoundary({
    network: NETWORK,
    facilitatorClient: facilitator,
    routes: { "GET /value": { accepts: [{ scheme: "exact", network: NETWORK, price: "$0.001", payTo: PAY_TO }], description: "one value" } },
  });
  assert.equal(facilitator.calls(), 0);
});

test("handling an unpriced request first makes no facilitator calls (a subrequest an unpriced request cannot await must never be started)", async () => {
  const facilitator = countingFacilitator();
  const boundary = createExactEvmFetchPaymentBoundary({
    network: NETWORK,
    facilitatorClient: facilitator,
    routes: { "GET /value": { accepts: [{ scheme: "exact", network: NETWORK, price: "$0.001", payTo: PAY_TO }], description: "one value" } },
  });
  const response = await boundary.handle(new Request("https://gateway.example/free"), () => Response.json({ ok: true }));
  assert.equal(response.status, 200);
  assert.equal(facilitator.calls(), 0);
});

test("a priced request after an unpriced one arms the handshake exactly once and issues a 402", async () => {
  const facilitator = countingFacilitator();
  const boundary = createExactEvmFetchPaymentBoundary({
    network: NETWORK,
    facilitatorClient: facilitator,
    routes: { "GET /value": { accepts: [{ scheme: "exact", network: NETWORK, price: "$0.001", payTo: PAY_TO }], description: "one value" } },
  });
  await boundary.handle(new Request("https://gateway.example/free"), () => Response.json({ ok: true }));
  assert.equal(facilitator.calls(), 0);
  const response = await boundary.handle(new Request("https://gateway.example/value"), () => Response.json({ value: true }));
  assert.equal(response.status, 402);
  assert.equal(facilitator.calls(), 1);
});

test("a rejected first handshake is retried on the next priced request", async () => {
  // A single failing first attempt makes exactly one getSupported() call (the rejection surfaces
  // to this handle() caller); the catch block only ARMS the retried initialize() call for whichever
  // request comes next, so the second getSupported() call happens on the following priced request.
  let calls = 0;
  const flakyFacilitator = {
    calls: () => calls,
    async getSupported() {
      calls += 1;
      if (calls === 1) throw new Error("facilitator handshake unavailable");
      return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} };
    },
    async verify() { throw new Error("an unpaid assay must never verify"); },
    async settle() { throw new Error("an unpaid assay must never settle"); },
  };
  const boundary = createExactEvmFetchPaymentBoundary({
    network: NETWORK,
    facilitatorClient: flakyFacilitator,
    routes: { "GET /value": { accepts: [{ scheme: "exact", network: NETWORK, price: "$0.001", payTo: PAY_TO }], description: "one value" } },
  });

  await assert.rejects(
    boundary.handle(new Request("https://gateway.example/value"), () => Response.json({ value: true })),
    /Failed to initialize/u,
  );
  assert.equal(flakyFacilitator.calls(), 1);

  const response = await boundary.handle(new Request("https://gateway.example/value"), () => Response.json({ value: true }));
  assert.equal(response.status, 402);
  assert.equal(flakyFacilitator.calls(), 2);
});

test("fetch boundary settles a verified payment and invokes afterSettle", async () => {
  let afterSettleCalls = 0;
  const paidFacilitator = {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() {
      return { isValid: true, payer: `0x${"11".repeat(20)}` };
    },
    async settle() {
      return { success: true, network: NETWORK, transaction: `0x${"ab".repeat(32)}`, payer: `0x${"11".repeat(20)}` };
    },
  };
  const boundary = createExactEvmFetchPaymentBoundary({
    network: NETWORK,
    facilitatorClient: paidFacilitator,
    afterSettle: () => { afterSettleCalls += 1; },
    routes: { "GET /value": { accepts: [{ scheme: "exact", network: NETWORK, price: "$0.001", payTo: PAY_TO }], description: "one value" } },
  });

  const unpaid = await boundary.handle(new Request("https://gateway.example/value"), () => Response.json({ value: true }));
  assert.equal(unpaid.status, 402);
  const challenge = JSON.parse(Buffer.from(unpaid.headers.get("payment-required"), "base64").toString("utf8"));

  const paymentSignature = Buffer.from(JSON.stringify({
    x402Version: 2,
    accepted: challenge.accepts[0],
    payload: { signature: "0xtest" },
  })).toString("base64");

  const response = await boundary.handle(
    new Request("https://gateway.example/value", { headers: { "payment-signature": paymentSignature } }),
    () => Response.json({ value: true }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { value: true });
  assert.equal(afterSettleCalls, 1);
});

test("a recovered publication response is returned before replaying a spent authorization", async () => {
  let verifyCalls = 0;
  let settleCalls = 0;
  let computeCalls = 0;
  let chainSettlement;
  const transaction = `0x${"cd".repeat(32)}`;
  const payer = `0x${"11".repeat(20)}`;
  const facilitator = {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { verifyCalls += 1; return { isValid: true, payer }; },
    async settle() {
      settleCalls += 1;
      chainSettlement = { success: true, network: NETWORK, transaction, payer, amount: "1000" };
      return chainSettlement;
    },
  };
  const boundary = createExactEvmFetchPaymentBoundary({
    network: NETWORK,
    facilitatorClient: facilitator,
    routes: { "GET /handbook": { accepts: [{ scheme: "exact", network: NETWORK, price: "$0.001", payTo: PAY_TO }], description: "one publication" } },
  });
  const unpaid = await boundary.handle(new Request("https://gateway.example/handbook"), () => Response.json({ edition: "2026" }));
  const challenge = JSON.parse(Buffer.from(unpaid.headers.get("payment-required"), "base64").toString("utf8"));
  const signed = Buffer.from(JSON.stringify({
    x402Version: 2,
    accepted: challenge.accepts[0],
    payload: {
      signature: `0x${"ab".repeat(65)}`,
      authorization: {
        from: payer,
        to: PAY_TO,
        value: "1000",
        validAfter: "0",
        validBefore: "1900000000",
        nonce: `0x${"22".repeat(32)}`,
      },
    },
  })).toString("base64");
  let prepared;
  const store = {
    async recover() {
      if (!chainSettlement) return { state: "absent" };
      // The production adapter reaches this state only after its chain read
      // proves the exact Transfer and consumed EIP-3009 authorization.
      return {
        state: "complete",
        response: prepared,
        settlementHeaders: { "payment-response": Buffer.from(JSON.stringify(chainSettlement)).toString("base64") },
      };
    },
    async claim(input) { return { claimed: true, claim: { identity: input.identity } }; },
    async prepare({ response }) { prepared = response; return { identity: `0x${"11".repeat(32)}` }; },
    async finalize() { throw new Error("simulated lost final write after chain settlement"); },
  };
  const makeRequest = () => new Request("https://gateway.example/handbook", { headers: { "payment-signature": signed, "x-payment-recovery": "ef".repeat(32) } });
  const compute = () => { computeCalls += 1; return Response.json({ edition: "2026" }); };
  const first = await boundary.handle(makeRequest(), compute, { purchaseStore: store });
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { edition: "2026" });
  assert.equal(settleCalls, 1);

  const retry = await boundary.handle(makeRequest(), compute, { purchaseStore: store });
  assert.equal(retry.status, 200);
  assert.deepEqual(await retry.json(), { edition: "2026" });
  assert.equal(retry.headers.get("payment-response"), Buffer.from(JSON.stringify(chainSettlement)).toString("base64"));
  assert.equal(verifyCalls, 1);
  assert.equal(settleCalls, 1);
  assert.equal(computeCalls, 1);
});
