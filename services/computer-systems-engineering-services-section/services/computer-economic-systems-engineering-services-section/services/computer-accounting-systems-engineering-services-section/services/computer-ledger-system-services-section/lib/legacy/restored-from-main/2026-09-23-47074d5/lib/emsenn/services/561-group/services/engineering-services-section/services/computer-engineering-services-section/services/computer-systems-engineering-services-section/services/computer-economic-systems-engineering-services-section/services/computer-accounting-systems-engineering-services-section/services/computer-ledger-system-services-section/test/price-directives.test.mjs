import assert from "node:assert/strict";
import { test } from "node:test";
import { composeCoingeckoDirectives, composeHiveEngineDerivedDirectives } from "../src/price-directives.mjs";

test("composeCoingeckoDirectives: renders a price directive per priced commodity", () => {
  const sourcesMap = { HIVE: { coingecko: "hive" }, HBD: { coingecko: "hive_dollar" } };
  const coingeckoPrices = new Map([["hive", 0.04643451], ["hive_dollar", 0.998]]);
  const { priced, unpriced } = composeCoingeckoDirectives({ date: "2026-09-04", sourcesMap, coingeckoPrices });
  assert.deepEqual(unpriced, []);
  assert.equal(priced.length, 2);
  const hive = priced.find((p) => p.symbol === "HIVE");
  assert.equal(hive.price, "0.04643451");
  assert.equal(hive.directive, "2026-09-04 price HIVE 0.04643451 USD");
});

test("composeCoingeckoDirectives: a missing coingecko price is unpriced, never zero", () => {
  const sourcesMap = { ETH: { coingecko: "ethereum" } };
  const coingeckoPrices = new Map();
  const { priced, unpriced } = composeCoingeckoDirectives({ date: "2026-09-04", sourcesMap, coingeckoPrices });
  assert.deepEqual(priced, []);
  assert.equal(unpriced.length, 1);
  assert.equal(unpriced[0].symbol, "ETH");
  assert.match(unpriced[0].reason, /no USD price/u);
});

test("composeHiveEngineDerivedDirectives: derives USD price as lastPrice x HIVE/USD", () => {
  const metricsBySymbol = new Map([["LEO", { lastPrice: "0.08005745" }]]);
  const { priced, unpriced } = composeHiveEngineDerivedDirectives({
    date: "2026-09-04", symbols: ["LEO"], hivePriceUsd: "0.04643451", metricsBySymbol,
  });
  assert.deepEqual(unpriced, []);
  assert.equal(priced.length, 1);
  assert.equal(priced[0].symbol, "LEO");
  assert.equal(priced[0].price, "0.0037174284");
  assert.equal(priced[0].directive, [
    "2026-09-04 price LEO 0.0037174284 USD",
    '  source: "hive-engine-metrics x coingecko"',
  ].join("\n"));
});

test("composeHiveEngineDerivedDirectives: no market metrics leaves a symbol unpriced", () => {
  const metricsBySymbol = new Map([["GHOST", null]]);
  const { priced, unpriced } = composeHiveEngineDerivedDirectives({
    date: "2026-09-04", symbols: ["GHOST"], hivePriceUsd: "0.04643451", metricsBySymbol,
  });
  assert.deepEqual(priced, []);
  assert.equal(unpriced.length, 1);
  assert.equal(unpriced[0].symbol, "GHOST");
  assert.match(unpriced[0].reason, /no Hive-Engine market metrics/u);
});

test("composeHiveEngineDerivedDirectives: a failed metrics fetch is unpriced with the fetch reason, never zero", () => {
  const metricsBySymbol = new Map([["FLAKY", { error: "hive-chain: HTTP 503 from https://api.hive-engine.com/rpc/contracts" }]]);
  const { priced, unpriced } = composeHiveEngineDerivedDirectives({
    date: "2026-09-04", symbols: ["FLAKY"], hivePriceUsd: "0.04643451", metricsBySymbol,
  });
  assert.deepEqual(priced, []);
  assert.equal(unpriced.length, 1);
  assert.equal(unpriced[0].symbol, "FLAKY");
  assert.match(unpriced[0].reason, /Hive-Engine market metrics fetch failed/u);
});

test("composeHiveEngineDerivedDirectives: an unavailable HIVE/USD price leaves every symbol unpriced", () => {
  const metricsBySymbol = new Map([["LEO", { lastPrice: "0.08005745" }]]);
  const { priced, unpriced } = composeHiveEngineDerivedDirectives({
    date: "2026-09-04", symbols: ["LEO"], hivePriceUsd: null, metricsBySymbol,
  });
  assert.deepEqual(priced, []);
  assert.equal(unpriced.length, 1);
  assert.match(unpriced[0].reason, /HIVE\/USD price unavailable/u);
});
