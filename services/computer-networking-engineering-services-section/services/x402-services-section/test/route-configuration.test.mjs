import assert from "node:assert/strict";
import test from "node:test";
import { evmNetwork, routeSet } from "../src/route-configuration.mjs";

test("pure route admission retains the official declarations", () => {
  const routes = { "GET /value": { accepts: [{ scheme: "exact", network: "eip155:8453", price: "$0.04" }] } };
  assert.equal(routeSet(routes, "exact"), routes);
  assert.equal(evmNetwork("eip155:5615611"), "eip155:5615611");
});

test("pure route admission refuses invalid routes, empty acceptance and implicit chains", () => {
  assert.throws(() => routeSet({}, "exact"), /nonempty/u);
  assert.throws(() => routeSet({ "/value": { accepts: { scheme: "exact" } } }, "exact"), /invalid x402 route/u);
  assert.throws(() => routeSet({ "GET /value": { accepts: [] } }, "exact"), /exact scheme/u);
  assert.throws(() => routeSet({ "GET /value": { accepts: { scheme: "custom" } } }, "exact"), /exact scheme/u);
  assert.throws(() => evmNetwork("base"), /CAIP-2/u);
});
