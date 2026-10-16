import assert from "node:assert/strict";
import test from "node:test";
import { operationDescriptor } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { encodePaymentRequiredHeader } from "@x402/core/http";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { x402ObservationOperations } from "../src/operations.mjs";

const URL = "https://services.561.group/value?q=btc";
const PAY_TO = "0x1111111111111111111111111111111111111111";
const ASSET = "0x2222222222222222222222222222222222222222";

function challenge() {
  return {
    x402Version: 2,
    resource: { url: URL, description: "one bounded value" },
    accepts: [{ scheme: "exact", network: "eip155:8453", amount: "1000", asset: ASSET, payTo: PAY_TO, maxTimeoutSeconds: 60 }],
    extensions: declareDiscoveryExtension({ method: "GET", input: { q: "btc" }, output: { example: { value: 1 } } }),
  };
}

test("provider exposes the two bounded read-only public receiving operations", async () => {
  const operations = x402ObservationOperations();
  assert.deepEqual(operations.map((op) => op.verb), ["resource-observation", "public-service-market-listing"]);
  for (const op of operations) {
    const descriptor = operationDescriptor(op);
    assert.deepEqual(descriptor.writes, []);
    assert.equal(descriptor.effects.class, "external");
    assert.equal(descriptor.effects.replay, "safe");
  }

  const priorFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, {
    status: 402,
    headers: { "payment-required": encodePaymentRequiredHeader(challenge()) },
  });
  try {
    const reading = await operations[0].execute({ resourceUrl: URL });
    assert.equal(reading.transport.status, 402);
    assert.equal(reading.authority.publicReadOnly, true);
    assert.equal(reading.authority.paymentAttempted, false);
  } finally {
    globalThis.fetch = priorFetch;
  }
});
