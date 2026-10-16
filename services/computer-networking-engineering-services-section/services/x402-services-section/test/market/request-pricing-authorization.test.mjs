import assert from "node:assert/strict";
import test from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import { verifyTypedData } from "viem";
import { ExactEvmScheme as ExactEvmClient } from "@x402/evm/exact/client";
import { createMarket } from "../../src/market/market.mjs";
import { resolveBinding } from "../../src/compute-binding.mjs";
import catalog from "../../data/market-561-group/records/catalog.json" with { type: "json" };

// Isolated protocol fixtures: no deployed house asset, chain transaction or funds.
const network = "eip155:5615611", asset = "0x" + "22".repeat(20), payTo = "0x" + "33".repeat(20);
const assetRef = `${network}/erc20:${asset}`, name = "House Compute Test Credit";
const signer = privateKeyToAccount("0x" + "1".padStart(64, "0"));
const base = catalog.find(o => o.route === "/v1/data/unicode-normalize");
assert(base, "use the actual already-offered primitive, not a new endpoint family");

test("a payment authorized for a small admitted body cannot buy a larger body's tariff", async () => {
  const d = { ...structuredClone(base), origin: "https://house.test", price: { amountAtomic: "3", asset: assetRef },
    requestPricing: { mode: "canonical-json-byte-bands", includedBytes: 64, additionalUnitBytes: 64, additionalUnitAtomic: "2", maximumAtomic: "9" } };
  const run = resolveBinding(d.compute, d);
  const small = { text: "é", form: "NFC" }, large = { text: "é".repeat(200), form: "NFC" };
  let executions = 0, settlements = 0;
  const market = createMarket({ catalog: [d],
    env: { X402_NETWORK: network, X402_ASSET: asset, X402_PAY_TO: payTo, X402_ASSET_NAME: name, X402_ASSET_VERSION: "1", X402_FACILITATOR: "https://facilitator.test" },
    compute: { [d.route]: async context => { executions++; return run(context); } },
    facilitatorClient: {
      async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network }], extensions: [], signers: {} }; },
      async verify(payload, requirements) {
        const signed = await verifyTypedData({ address: signer.address, signature: payload.payload.signature,
          domain: { name, version: "1", chainId: 5615611, verifyingContract: asset },
          types: { TransferWithAuthorization: ["from:address", "to:address", "value:uint256", "validAfter:uint256", "validBefore:uint256", "nonce:bytes32"].map(f => ({ name: f.split(":")[0], type: f.split(":")[1] })) },
          primaryType: "TransferWithAuthorization", message: payload.payload.authorization });
        return signed && String(payload.payload.authorization.value) === requirements.amount ? { isValid: true, payer: signer.address } : { isValid: false, invalidReason: "authorization_amount_mismatch" };
      },
      async settle() { settlements++; return { success: true, network, payer: signer.address, transaction: "0x" + String(settlements).repeat(64) }; },
    } });
  const request = (body, payload) => new Request("https://house.test" + d.route, { method: "POST",
    headers: { "content-type": "application/json", ...(payload ? { "payment-signature": Buffer.from(JSON.stringify(payload)).toString("base64") } : {}) }, body: JSON.stringify(body) });
  const quote = async body => { const response = await market.fetch(request(body)); assert.equal(response.status, 402); return JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64")); };
  const smallQuote = await quote(small), largeQuote = await quote(large);
  assert.equal(smallQuote.accepts[0].amount, "3");
  assert.ok(BigInt(largeQuote.accepts[0].amount) > 3n, "the larger admitted body quotes a higher tariff");
  const sign = async q => ({ ...await new ExactEvmClient(signer).createPaymentPayload(q.x402Version, q.accepts[0]), accepted: q.accepts[0] });
  const smallPayment = await sign(smallQuote);
  assert.equal((await market.fetch(request(large, smallPayment))).status, 402);
  assert.equal(executions, 0);assert.equal(settlements, 0);
  const result = await market.fetch(request(large, await sign(largeQuote)));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), await run({ body: large }));
  assert.equal(executions, 1);assert.equal(settlements, 1);
});
