import assert from "node:assert/strict";
import test from "node:test";

import { bindingSpecifier } from "@red-cup-engineering/x402-services-section/compute-binding";

import { EDGE_BINDING_SPECIFIERS, loadEdgeBinding } from "../../apps/market-561-group/src/edge-bindings.mjs";
import { MARKET_NAME, catalog, catalogForRuntime, createMarket561Group, paidSellerRows } from "../../apps/market-561-group/src/market.mjs";
import { derivePaidSellers } from "../../apps/market-561-group/scripts/derive-paid-sellers.mjs";

const NETWORK = "eip155:8453";
const PAY_TO = "0x32886F6F361C1d570255c2762967A2e41D0E9B1a";
const ENV = Object.freeze({ X402_NETWORK: NETWORK, X402_PAY_TO: PAY_TO, X402_FACILITATOR: "https://facilitator.payai.network" });

function unpaidFacilitator() {
  return {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { throw new Error("an unpaid request must never verify"); },
    async settle() { throw new Error("an unpaid request must never settle"); },
  };
}

function paidFacilitator() {
  return {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
    async verify() { return { isValid: true, payer: `0x${"11".repeat(20)}` }; },
    async settle() { return { success: true, network: NETWORK, transaction: `0x${"ab".repeat(32)}`, payer: `0x${"11".repeat(20)}` }; },
  };
}

const challengeOf = (response) => JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));

test("the catalog is admitted: every offer is served from market.561.group and declares the compute it sells", () => {
  assert.ok(catalog().length >= 10, `${catalog().length} offers`);
  for (const offer of catalog()) {
    assert.equal(offer.declaration.origin, "https://market.561.group", offer.routeKey);
    assert.ok(offer.declaration.compute, `${offer.routeKey} declares its compute binding`);
    assert.equal(typeof bindingSpecifier(offer.declaration.compute), "string");
    if (offer.declaration.probeUrl) assert.ok(offer.declaration.probeUrl.startsWith("https://market.561.group/"), offer.declaration.probeUrl);
  }
  assert.deepEqual([...new Set(catalog().map((offer) => offer.declaration.gateway))].sort(), [
    "astronomy", "base-chain", "brokerage-control", "ephemeris", "inference", "jsnode-package-vulnerability-triage", "medical-glossary",
    "pacing-intelligence", "trashpanda", "x402-market-observation",
  ]);
});

test("every declared compute and validate binding resolves to a real export of a pinned dependency", async () => {
  for (const offer of catalog()) {
    for (const [role, binding] of [["compute", offer.declaration.compute], ["validate", offer.declaration.validate]]) {
      if (binding === undefined) continue;
      const module = await import(bindingSpecifier(binding));
      assert.equal(typeof module[binding.export], "function", `${offer.routeKey} ${role} -> ${bindingSpecifier(binding)}#${binding.export}`);
    }
  }
});

test("every priced route answers 402 with its derived challenge, unpaid, and the readouts are served free", async () => {
  const market = createMarket561Group(ENV, { facilitatorClient: unpaidFacilitator() });
  assert.equal(market.name, MARKET_NAME);
  for (const offer of catalog()) {
    const url = offer.declaration.probeUrl ?? offer.url;
    const init = offer.declaration.method === "POST"
      ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(offer.declaration.bodyExample) }
      : {};
    const response = await market.fetch(new Request(url, init));
    assert.equal(response.status, 402, `${offer.routeKey}: ${await response.text()}`);
    const challenge = challengeOf(response);
    assert.equal(challenge.accepts[0].amount, offer.amount, offer.routeKey);
    assert.equal(challenge.accepts[0].payTo, PAY_TO);
    assert.equal(challenge.extensions.bazaar.routeTemplate, offer.declaration.route);
  }
  const status = await market.fetch(new Request("https://market.561.group/v1/status"));
  assert.deepEqual(await status.json(), { status: "ok", service: MARKET_NAME, offers: catalog().length });
  const readout = await (await market.fetch(new Request("https://market.561.group/v1/catalog"))).json();
  assert.equal(readout.offers.length, catalog().length);
  const card = await (await market.fetch(new Request("https://market.561.group/.well-known/agent-card.json"))).json();
  assert.equal(card.skills.length, catalog().length);
});

test("a malformed request is refused before any challenge, by the body schema (400) or the declared validate binding (422)", async () => {
  const market = createMarket561Group(ENV, { facilitatorClient: unpaidFacilitator() });
  const cases = [
    ["https://market.561.group/v1/ephemeris/moment/not-a-date", {}],
    ["https://market.561.group/v1/x402-market/observation?windowBlocks=1", {}],
    ["https://market.561.group/v1/pacing/analysis", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ observations: [] }) }],
    ["https://market.561.group/v1/pacing/heart-rate-threshold", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ restingHr: -5 }) }],
  ];
  for (const [url, init] of cases) {
    const response = await market.fetch(new Request(url, init));
    assert.ok([400, 422].includes(response.status), `${url}: ${response.status} ${await response.clone().text()}`);
    assert.equal(response.headers.get("payment-required"), null, url);
  }
});

test("a settled payment reaches the bound typed operation and returns its result", async () => {
  const market = createMarket561Group(ENV, { facilitatorClient: paidFacilitator() });
  const url = "https://market.561.group/v1/pacing/heart-rate-threshold";
  const init = { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ restingHr: 60 }) };
  const unpaid = await market.fetch(new Request(url, init));
  const payment = Buffer.from(JSON.stringify({ x402Version: 2, accepted: challengeOf(unpaid).accepts[0], payload: { signature: "0xtest" } })).toString("base64");
  const paid = await market.fetch(new Request(url, { ...init, headers: { ...init.headers, "payment-signature": payment } }));
  assert.equal(paid.status, 200, await paid.clone().text());
  const result = await paid.json();
  assert.equal(typeof result, "object");
  const astronomy = "https://market.561.group/v1/astronomy/positions/2026-07-21T00:00:00Z";
  const challenged = await market.fetch(new Request(astronomy));
  const astronomyPayment = Buffer.from(JSON.stringify({ x402Version: 2, accepted: challengeOf(challenged).accepts[0], payload: { signature: "0xtest" } })).toString("base64");
  const positions = await market.fetch(new Request(astronomy, { headers: { "payment-signature": astronomyPayment } }));
  assert.equal(positions.status, 200, await positions.clone().text());
});

test("the paid-sellers catalog is derived from the market catalog, never authored twice", () => {
  const rows = paidSellerRows({ network: NETWORK, asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", payTo: PAY_TO });
  assert.equal(rows.length, catalog().length);
  for (const row of rows) {
    assert.ok(row.url.startsWith("https://market.561.group/"), row.url);
    assert.equal(row.payTo, PAY_TO);
  }
  const record = derivePaidSellers({ payTo: PAY_TO });
  assert.equal(record.rows.length, catalog().length);
  assert.equal(record.network, NETWORK);
  assert.throws(() => derivePaidSellers({}), /--pay-to is required/u);
});

test("the edge face serves every offer except the node-only precision computes; the node face serves all", async () => {
  const node = catalogForRuntime("node");
  const edge = catalogForRuntime("edge");
  assert.equal(node.length, catalog().length);
  const nodeOnly = catalog().filter((offer) => offer.declaration.runtime === "node").map((offer) => offer.declaration.operation).sort();
  // Node-only: the two DE440 precision computes (a pinned binary), the five
  // A2A-dispatching operations whose packages read schema files at load, and
  // the house pure-function batch (FOUR readings, the Relating SignCell/
  // SignGraph/SignCraft pipeline, content addressing, schema validation,
  // attention allocation) not yet proven safe in a Workers isolate.
  assert.deepEqual(nodeOnly, [
    "account-reconciliation", "allocate-attention", "astronomy-precision-positions", "content-address",
    "daily-divination-reading", "meter-inference", "occupation-entropy", "precision-moment",
    "reading-census", "reading-conflate", "reading-convert",
    "reading-knowledge-join", "reading-knowledge-meet", "reading-negate", "reading-truth-join", "reading-truth-meet",
    "schema-validate", "sen-articulate", "sen-canonicalize", "sen-coincide", "sen-conflate-reading",
    "sen-induce", "sen-posit", "sen-predicate", "sen-relate-relations", "sen-settle", "sen-utter",
    "strategy-synthesis",
  ]);
  assert.equal(edge.length, catalog().length - nodeOnly.length);
  assert.throws(() => catalogForRuntime("wasm"), /MARKET_RUNTIME/u);
  const market = createMarket561Group({ ...ENV, MARKET_RUNTIME: "edge" }, { facilitatorClient: unpaidFacilitator() });
  const status = await market.fetch(new Request("https://market.561.group/v1/status"));
  assert.deepEqual(await status.json(), { status: "ok", service: MARKET_NAME, offers: edge.length });
  const precision = await market.fetch(new Request("https://market.561.group/v1/ephemeris/precision-moment/2026-07-21T00:00:00Z?latitude=41.8781&longitude=-87.6298"));
  assert.equal(precision.status, 404, "a node-only offer is not served from the edge face");
});

test("the compiled edge module map covers every binding the edge face serves and resolves each export", async () => {
  const expected = [...new Set(catalogForRuntime("edge").flatMap((offer) => [offer.declaration.compute, offer.declaration.validate].filter(Boolean).map(bindingSpecifier)))].sort();
  assert.deepEqual([...EDGE_BINDING_SPECIFIERS].sort(), expected, "src/edge-bindings.mjs is stale: run scripts/compile-catalog.mjs");
  for (const offer of catalogForRuntime("edge")) {
    for (const binding of [offer.declaration.compute, offer.declaration.validate].filter(Boolean)) {
      const module = await loadEdgeBinding(bindingSpecifier(binding));
      assert.equal(typeof module[binding.export], "function", `${offer.routeKey} -> ${bindingSpecifier(binding)}#${binding.export}`);
    }
  }
  await assert.rejects(() => loadEdgeBinding("@red-cup-engineering/not-in-the-catalog"), /carries no module/u);
});
