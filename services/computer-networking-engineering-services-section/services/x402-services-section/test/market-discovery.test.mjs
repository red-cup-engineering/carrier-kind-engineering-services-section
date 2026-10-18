import assert from "node:assert/strict";
import test from "node:test";
import { marketAgentCard, marketCatalogReadout, marketPageModel } from "../src/market/market.mjs";
import { selectMarketCoordinateFiber } from "../src/market/catalog.mjs";

const base = {
  gateway: "demo",
  gatewayPackageName: "@red-cup-engineering/demo",
  section: "lib/demo-services-section",
  origin: "https://example.test",
  method: "GET",
  price: "$0.01",
  output: { schema: { type: "object" }, example: {} },
  ledgerAccount: "Income:Sales:X402:Demo",
  markets: ["house-seller-catalog"],
};

const offer = (name, operation, listed = true) => ({
  ...base,
  name,
  operation,
  route: "/" + operation,
  listed,
  framings: [{ key: "default", title: name, description: name, tags: ["demo"], serviceName: operation }],
});

test("public discovery excludes unlisted offers while catalog readout retains state", () => {
  const visible = offer("Visible", "visible");
  const unavailable = offer("Unavailable", "unavailable", false);
  assert.deepEqual(marketAgentCard([visible, unavailable]).skills.map((skill) => skill.name), ["Visible"]);
  assert.doesNotMatch(JSON.stringify(marketPageModel([visible, unavailable])), /Unavailable/u);
  assert.equal(marketCatalogReadout([visible, unavailable]).offers.find((row) => row.name === "Unavailable")?.listed, false);
});


test("Networking coordinates reuse original public SKU admission and derive bounded graph edges", () => {
  const original = {
    recordType: "561-group.x402-market-catalog",
    offers: [
      { sku:"ni:///sha-256;A", listed:true, category:"measurement",
        seller:{enterprise:"Science"}, compute:{package:"metrologic"}, gateway:"a",
        price:"$0.01", payTo:"private-no-graph-authority" },
      { sku:"ni:///sha-256;B", listed:true, category:"measurement",
        seller:{enterprise:"Science"}, compute:{package:"unrelated"}, gateway:"b" },
      { sku:"ni:///sha-256;C", listed:true, category:"astrometry",
        seller:{enterprise:"Other"}, compute:{package:"metrologic"}, gateway:"a" },
      { sku:"ni:///sha-256;D", listed:true, category:"astrometry",
        seller:{enterprise:"Other"}, compute:{package:"unrelated"}, gateway:"b" },
      { sku:"ni:///sha-256;HIDDEN", listed:false, category:"measurement",
        seller:{enterprise:"Science"}, compute:{package:"metrologic"}, gateway:"a" },
    ],
  };
  const base = selectMarketCoordinateFiber(original);
  assert.equal(base.total, 4);
  assert.equal(base.facets.category.values.find(v => v.value === "measurement").count, 2);
  const narrower = selectMarketCoordinateFiber(original,
    {filters:{category:"measurement",producer:"metrologic"}});
  assert.deepEqual(narrower.offers.map(r => r.sku), ["ni:///sha-256;A"]);
  assert.ok(narrower.offers.every(r => base.offers.some(v => v.sku === r.sku)));
  const graph = selectMarketCoordinateFiber(original,{near:"ni:///sha-256;A"});
  assert.deepEqual(graph.offers.map(r => r.sku), ["ni:///sha-256;B", "ni:///sha-256;C"]);
  assert.deepEqual(graph.edges.map(e => e.via.map(v => v.axis)),
    [["seller", "category"], ["producer", "gateway"]]);
  assert.equal(graph.edges[1].legalSubstitutability,"unassayed");
  assert.ok(!JSON.stringify(graph.edges).includes("payTo"));
  assert.equal(selectMarketCoordinateFiber(original,{near:"ni:///sha-256;A",
    filters:{category:"astrometry"}}).total,1);
  assert.throws(() => selectMarketCoordinateFiber(original,{near:"ni:///sha-256;HIDDEN"}),TypeError);
  assert.throws(() => selectMarketCoordinateFiber({...original,
    offers:[original.offers[0],original.offers[0]]}),/duplicate catalog SKU/);
  assert.throws(() => selectMarketCoordinateFiber(original,{limit:21}),TypeError);
  assert.throws(() => selectMarketCoordinateFiber(original,{filters:{payTo:"any"}}),TypeError);
  assert.throws(() => selectMarketCoordinateFiber(original,{near:"NI:///SHA-256;A"}),TypeError);
  assert.equal(selectMarketCoordinateFiber(original,{limit:1}).nextOffset,1);
});
