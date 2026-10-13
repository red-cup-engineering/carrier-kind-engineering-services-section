import assert from "node:assert/strict";
import test from "node:test";

import { createExactEvmFetchPaymentBoundary } from "../src/fetch-server.mjs";

const NETWORK = "eip155:84532";
const PAY_TO = `0x${"22".repeat(20)}`;
const PAYER = `0x${"11".repeat(20)}`;

test("a failing response stream releases its recoverable claim and cancels before settlement", async () => {
  const failure = new Error("the generated response stream failed");
  const cancellations = [];
  let settles = 0;
  let releases = 0;
  let prepares = 0;
  let active = false;
  const facilitator = {
    async getSupported() {
      return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} };
    },
    async verify() { return { isValid: true, payer: PAYER }; },
    async settle() { settles += 1; throw new Error("a failed response must never settle"); },
  };
  const boundary = createExactEvmFetchPaymentBoundary({
    network: NETWORK,
    facilitatorClient: facilitator,
    routes: { "GET /value": { accepts: [{ scheme: "exact", network: NETWORK, price: "$0.001", payTo: PAY_TO }] } },
  });
  boundary.resourceServer.onVerifiedPaymentCanceled(context => { cancellations.push(context); });
  const challengeResponse = await boundary.handle(new Request("https://gateway.example/value"), () => Response.json({ ok: true }));
  const challenge = JSON.parse(Buffer.from(challengeResponse.headers.get("payment-required"), "base64").toString("utf8"));
  const signature = Buffer.from(JSON.stringify({
    x402Version: 2,
    accepted: challenge.accepts[0],
    payload: {
      signature: `0x${"ab".repeat(65)}`,
      authorization: {
        from: PAYER, to: PAY_TO, value: "1000", validAfter: "0", validBefore: "1900000000", nonce: `0x${"33".repeat(32)}`,
      },
    },
  })).toString("base64");
  const store = {
    async recover() { return { state: "absent" }; },
    async claim(input) { active = true; return { claimed: true, claim: { identity: input.identity } }; },
    async release() { active = false; releases += 1; },
    async prepare() { prepares += 1; throw new Error("an unreadable response must never be persisted"); },
  };
  const request = new Request("https://gateway.example/value", {
    headers: { "payment-signature": signature, "x-payment-recovery": "ef".repeat(32) },
  });
  await assert.rejects(
    boundary.handle(request, () => new Response(new ReadableStream({
      start(controller) { controller.error(failure); },
    })), { purchaseStore: store }),
    error => error === failure,
  );
  assert.equal(active, false, "a retry can claim the unfulfilled purchase again");
  assert.equal(releases, 1);
  assert.equal(prepares, 0);
  assert.equal(settles, 0);
  assert.equal(cancellations.length, 1);
  assert.equal(cancellations[0].reason, "handler_threw");
  assert.equal(cancellations[0].error, failure);
});
