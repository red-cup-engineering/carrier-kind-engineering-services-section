import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_WINDOW_BLOCKS, normalizeWindowRequest, observeX402Market } from "../../src/market-observation/product.mjs";

test("normalizeWindowRequest admits the default, an integer in bounds, and refuses the rest", () => {
  assert.equal(normalizeWindowRequest(), DEFAULT_WINDOW_BLOCKS);
  assert.equal(normalizeWindowRequest({ windowBlocks: "300" }), 300);
  assert.throws(() => normalizeWindowRequest({ windowBlocks: "x" }), TypeError);
  assert.throws(() => normalizeWindowRequest({ windowBlocks: 1 }), RangeError);
});

test("observeX402Market shapes one public record from a settlement observation", async () => {
  const observed = { ok: true, asset: "0xusdc", measured: { fromBlock: 1, toBlock: 900, blocks: 900, authorizations: 5, distinctAuthorizers: 3, provenance: { p: 1 } }, extrapolated: { dayFactor: 48 }, caveat: "c" };
  const record = await observeX402Market({ windowBlocks: 900 }, { observeSettlement: async () => observed, now: () => "2026-09-11T00:00:00.000Z" });
  assert.equal(record.recordType, "561-group.x402-market-observation");
  assert.equal(record.distinctAuthorizersSampled, 3);
  assert.equal(record.chain.asset, "0xusdc");
  await assert.rejects(() => observeX402Market({}, { observeSettlement: async () => ({ ok: false, reason: "rpc down" }) }), (error) => error.status === 502);
});
