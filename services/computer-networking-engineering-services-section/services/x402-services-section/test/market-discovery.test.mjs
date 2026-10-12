import assert from "node:assert/strict";
import test from "node:test";
import { marketAgentCard, marketCatalogReadout, marketPageModel } from "../src/market/market.mjs";

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
