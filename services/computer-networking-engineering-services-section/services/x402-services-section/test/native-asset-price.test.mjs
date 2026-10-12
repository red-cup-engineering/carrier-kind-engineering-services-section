import assert from "node:assert/strict";
import test from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import { verifyTypedData } from "viem";
import { createMarket, marketX402Discovery, marketX402Service, marketLlmsText } from "../src/market/market.mjs";
import { declareOffer, priceAtomicUnits, offerRequestPricing } from "../src/offer.mjs";
import { deriveCapabilityOutbox } from "../src/capability-outbox.mjs";
import { extractSenActivity, projectSenActivity, senActivityObjectBytes } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { ACTIVITYSTREAMS_PUBLIC } from "@red-cup-engineering/activitypub-services-section/activitystreams";
import { termToJson } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { admitNormalizedSemanticContent } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime";
import { agentSenMessage } from "@red-cup-engineering/a2a-services-section/sen-part";
import { resolveBinding } from "../src/compute-binding.mjs";
import { purchaseHttpResource } from "../services/x402-exact-purchase-service/src/purchase.mjs";
import { purchaseObservationCollector, purchaseObservationRow, readX402Purchase } from "../src/purchase-observation.mjs";
import catalog from "../data/market-561-group/records/catalog.json" with { type: "json" };

// Isolated protocol fixtures: no deployed house asset, chain transaction or funds.
const network = "eip155:5615611", asset = "0x" + "22".repeat(20), payTo = "0x" + "33".repeat(20);
const assetRef = `${network}/erc20:${asset}`;
const signer = privateKeyToAccount("0x" + "1".padStart(64, "0"));
const rails = { network, asset, payTo, assetExtra: { name: "House Compute Test Credit", version: "1" } };
const base = catalog.find(o => o.route === "/v1/data/unicode-normalize");
assert(base, "use the actual already-offered primitive, not a new endpoint family");
function declaration(overrides = {}) {
  return { ...structuredClone(base), origin: "https://house.test", price: { amountAtomic: "3", asset: assetRef },
    requestPricing: { mode: "canonical-json-byte-bands", includedBytes: 32, additionalUnitBytes: 64, additionalUnitAtomic: "2", maximumAtomic: "9" },
    ...overrides };
}
function opened(activity, recipient = ACTIVITYSTREAMS_PUBLIC) {
  const value = extractSenActivity(activity, { expectedActor: activity.actor, expectedRecipient: recipient });
  return { ...value, value: termToJson(admitNormalizedSemanticContent(value.objectBytes, value.objectNi).envelope.settledBody) };
}

test("native atomic consideration reaches the same typed compute through official x402 and ActivityPub++/SEN evidence", async () => {
  const input = { text: "e\u0301".repeat(35), form: "NFC" }, d = declaration(), o = declareOffer(d), q = offerRequestPricing(d, input);
  assert.equal(q.amountAtomic, "7");
  const emitted = deriveCapabilityOutbox([o], { rails, origin: d.origin, now: "2026-10-07T20:00:00Z" });
  assert.equal(emitted.length, 1);const advertised = opened(emitted[0].activity).value;
  assert.equal(advertised.price.network, network);assert.equal(advertised.price.asset, asset);assert.equal(advertised.price.amount, "9");
  let verifies = 0, settlements = 0, executions = 0;
  const transaction = "0x" + "a".repeat(64);
  const facilitatorClient = {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network }], extensions: [], signers: {} }; },
    async verify(payload, requirements) {
      verifies++;assert.equal(requirements.amount, q.amountAtomic);assert.equal(payload.accepted.network, network);
      const valid = await verifyTypedData({ address: signer.address, signature: payload.payload.signature,
        domain: { name: rails.assetExtra.name, version: "1", chainId: 5615611, verifyingContract: asset },
        types: { TransferWithAuthorization: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" }, { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" }] },
        primaryType: "TransferWithAuthorization", message: payload.payload.authorization });
      assert(valid);return { isValid: true, payer: signer.address };
    },
    async settle() { settlements++;return { success: true, network, payer: signer.address, transaction }; },
  };
  const run = resolveBinding(d.compute, d);
  const market = createMarket({ catalog: [d], env: { X402_NETWORK: network, X402_ASSET: asset, X402_PAY_TO: payTo,
    X402_ASSET_NAME: rails.assetExtra.name, X402_ASSET_VERSION: "1", X402_FACILITATOR: "https://facilitator.test" },
    facilitatorClient, compute: { [d.route]: async context => { executions++;return run(context); } } });
  const retained = [];
  const result = await purchaseHttpResource({ url: d.origin + d.route, method: "POST", body: input, network, asset,
    maximumAmount: "9", payer: { signer, network, caip10: `${network}:${signer.address}` },
    beforePayment: value => { retained.push({ kind: "owner-signed-payment-intent", value }); },
    onSettlement: value => { retained.push({ kind: "facilitator-reported-settlement", value }); },
    fetchImpl: async (url, init) => market.fetch(new Request(url, init)) });
  assert.equal(verifies, 1);assert.equal(settlements, 1);assert.equal(executions, 1);assert.equal(retained.length, 2);
  const expected = await run({ body: input });
  assert.deepEqual(JSON.parse(Buffer.from(result.delivery.body, "base64").toString("utf8")), expected);
  const ledger = purchaseObservationCollector();ledger.push(JSON.parse(JSON.stringify(purchaseObservationRow(result, "2026-10-07T20:00:00Z"))));
  assert.equal(readX402Purchase(ledger.read()).acceptance, "unobserved");
  const bytes = senActivityObjectBytes({ objectKind: "x402.compute.response-observation", value: result });
  const message = agentSenMessage(bytes, "operation.sen.cbor");
  message.metadata = { ...message.metadata, "x402.payment.status": "payment-completed", "x402.payment.receipts": [result.settlement] };
  const returned = projectSenActivity({ type: "Create", origin: d.origin, identifier: "market", recipient: "https://buyer.test/actors/owner",
    objectBytes: bytes, a2aMessage: message, agentCard: d.origin + "/.well-known/agent-card.json", eventTime: "2026-10-07T20:00:00Z" });
  const received = opened(returned, "https://buyer.test/actors/owner");
  assert.deepEqual(received.value, result);assert.equal(received.a2aMessage.metadata["x402.payment.receipts"][0].transaction, transaction);
});

test("native assets retain uint256 precision and cannot silently change chain, token or dollar denomination", () => {
  const d = declaration({ price: { amountAtomic: ((1n << 255n) + 1n).toString(), asset: assetRef }, requestPricing: undefined });
  delete d.requestPricing;
  const o = declareOffer(d);assert.equal(o.amount, d.price.amountAtomic);
  assert.equal(o.x402Route(rails)[o.routeKey].accepts[0].price.amount, d.price.amountAtomic);
  for (const other of [{ ...rails, network: "eip155:8453" }, { ...rails, asset: payTo }]) {
    assert.throws(() => o.x402Route(other), /does not match/);
    assert.throws(() => o.sellerCatalogRow(other), /does not match/);
    assert.throws(() => o.capabilityOffer({ ...other, agentCard: "https://house.test/card", expiresAt: "2027-01-01T00:00:00Z" }), /does not match/);
  }
  assert.throws(() => o.index402Registration(), /no implicit USD rate/);
  assert.throws(() => priceAtomicUnits({ ...d.price, amountAtomic: (1n << 256n).toString() }), /uint256/);
  assert.throws(() => priceAtomicUnits({ ...d.price, amountAtomic: "03" }), /uint256/);
  const large = declaration({ price: { amountAtomic: "1000000000000000000", asset: assetRef },
    requestPricing: { mode: "canonical-json-byte-bands", includedBytes: 2, additionalUnitBytes: 1,
      additionalUnitAtomic: "1000000000000000000", maximumAtomic: "3000000000000000000" } });
  assert.equal(offerRequestPricing(large, { x: 1 }).amountAtomic, "3000000000000000000");
  assert.throws(() => offerRequestPricing({ ...large, requestPricing: { ...large.requestPricing,
    maximumAtomic: (1n << 256n).toString() } }, { x: 1 }), /bounded owner-declared/);

});

test("all discovery and seller assay projections preserve native atomic denomination", () => {
  const d = declaration(), o = declareOffer(d), row = o.sellerCatalogRow(rails);
  assert.equal(row.expectedAmount, offerRequestPricing(d, d.bodyExample).amountAtomic);assert.equal(row.asset, asset);
  assert(!("assetUsdc" in row));assert(!("expectedAmountAtomicUsdc" in row));
  const discovery = marketX402Discovery([o], rails);assert.equal(discovery.resources[0].asset, assetRef);
  const service = marketX402Service([o], rails);assert.equal(service.pricing.currency, assetRef);
  assert.equal(service.pricing.unit, "atomic-unit/request");assert.equal(service.services[0].pricing.currency, assetRef);
  const text = marketLlmsText([o]);assert(text.includes(`3 atomic units of ${assetRef}`));assert(!text.includes("[object Object]"));
});
