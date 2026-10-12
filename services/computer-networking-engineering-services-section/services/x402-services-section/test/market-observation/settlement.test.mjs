import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTHORIZATION_USED_TOPIC, BASE_BLOCKS_PER_DAY, BASE_USDC, authorizerOf, catalogAuthorizationProjection, chainTip, measureRange, observeSettlement } from "../../src/market-observation/settlement.mjs";

const topicFor = (addr) => `0x${"0".repeat(24)}${addr.slice(2).toLowerCase()}`;
const log = (addr) => ({ removed: false, data: "0x", topics: [AUTHORIZATION_USED_TOPIC, topicFor(addr), `0x${"1".repeat(64)}`] });
function pool({ tip = 50548585, logs = [], readLogsError = null } = {}) {
  return {
    chain: { id: 8453 },
    async requestAtBoundary({ operation }) {
      return { provider: { id: "base-a", url: "https://base-a.example/" },
        value: await operation({ boundary: { chainId: 8453, blockNumber: String(tip), blockHash: `0x${"a".repeat(64)}`, blockTimestamp: null } }) };
    },
    async readLogs({ filter }) {
      if (readLogsError) throw readLogsError;
      return { provider: { id: "base-a", url: "https://base-a.example/" },
        boundary: { chainId: 8453, blockNumber: String(tip), blockHash: `0x${"a".repeat(64)}`, blockTimestamp: null }, value: logs, filter };
    },
  };
}
test("AuthorizationUsed is the EIP-3009 event and Base constants remain fixed", () => {
  assert.equal(AUTHORIZATION_USED_TOPIC, "0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5");
  assert.equal(BASE_USDC, "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
  assert.equal(BASE_BLOCKS_PER_DAY, 43200);
});
test("authorizerOf extracts indexed authorizers and refuses malformed logs", () => {
  assert.equal(authorizerOf(log("0xabc0000000000000000000000000000000000001")), "0xabc0000000000000000000000000000000000001");
  assert.equal(authorizerOf({}), null);
});
test("measureRange uses the canonical reader and preserves its provider provenance", async () => {
  const a = "0x1111111111111111111111111111111111111111";
  const b = "0x2222222222222222222222222222222222222222";
  const readPool = pool({ logs: [log(a), log(b), log(a)] });
  const r = await measureRange({ readPool, fromBlock: 100, toBlock: 199 });
  assert.equal(r.ok, true);
  assert.equal(r.authorizations, 3);
  assert.equal(r.distinctAuthorizers, 2);
  assert.equal(r.provenance.chainId, 8453);
  assert.equal(r.provenance.endpoint, "https://base-a.example/");
});
test("measureRange returns a refusal when the shared reader fails", async () => {
  const r = await measureRange({ readPool: pool({ readLogsError: new Error("provider exhausted") }), fromBlock: 1, toBlock: 2 });
  assert.deepEqual(r.ok, false);
  assert.match(r.reason, /provider exhausted/);
});
test("measureRange refuses invalid ranges before a reader call", async () => {
  await assert.rejects(() => measureRange({ readPool: pool(), fromBlock: 10, toBlock: 5 }), RangeError);
});
test("chainTip reads the shared reader boundary", async () => {
  const t = await chainTip({ readPool: pool({ tip: 50548585 }) });
  assert.equal(t.ok, true);
  assert.equal(t.value, 50548585);
  assert.equal(t.provenance.chainId, 8453);
});
test("observeSettlement distinguishes sampled EIP-3009 activity from x402 use and its extrapolation", async () => {
  const logs = Array.from({ length: 2279 }, (_, i) => log(`0x${String(i % 645).padStart(40, "0")}`));
  const o = await observeSettlement({ readPool: pool({ logs }), windowBlocks: 900 });
  assert.equal(o.ok, true);
  assert.equal(o.measured.authorizations, 2279);
  assert.equal(o.extrapolated.authorizationsPer30Days, 3281760);
  assert.match(o.caveat, /not a count of x402 uses/);
});
test("catalog comparison labels its incompatible units and never claims protocol visibility", () => {
  const result = catalogAuthorizationProjection({ catalogCalls: 100, sampleDerivedAuthorizationProjection: 1000 });
  assert.equal(result.available, true);
  assert.equal(result.catalogCallsPerAuthorizationProjection, 0.1);
  assert.match(result.note, /different units/);
  assert.ok(!("understatementFactor" in result));
});
test("zero authorization projection has no ratio", () => {
  assert.deepEqual(catalogAuthorizationProjection({ catalogCalls: 100, sampleDerivedAuthorizationProjection: 0 }), {
    available: false, reason: "sample-derived authorization projection is zero; no comparison ratio is available", catalogCalls: 100, sampleDerivedAuthorizationProjection: 0,
  });
});

test("a malformed or removed matching-topic log is a refusal, never a successful zero count", async () => {
  const malformed = { removed: false, data: "0x01", topics: [AUTHORIZATION_USED_TOPIC,
    `0x${"0".repeat(24)}${"a".repeat(40)}`, `0x${"b".repeat(64)}`] };
  const result = await measureRange({ readPool: pool({ logs: [malformed] }), fromBlock: 1, toBlock: 1 });
  assert.equal(result.ok, false);
  assert.match(result.reason, /invalid AuthorizationUsed/);
});
