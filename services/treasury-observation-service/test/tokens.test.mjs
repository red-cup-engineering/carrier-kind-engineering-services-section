import { test } from "node:test";
import assert from "node:assert/strict";
import { Interface } from "ethers";
import { CHAINS } from "../src/chains.mjs";
import { balanceOfToken, discoverTokenHoldings, verifiedTokenHoldings } from "../src/tokens.mjs";

const TOKEN = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base
const WALLET = "0x32886F6F361C1d570255c2762967A2e41D0E9B1a";
const erc20 = new Interface([
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

/** Drive fetch from an eth_call `data` prefix -> encoded result map. */
function rpcFake(byFunction) {
  return async (url, init) => {
    const body = JSON.parse(init.body);
    const [{ data }] = body.params;
    for (const [fn, result] of Object.entries(byFunction)) {
      if (data.startsWith(erc20.getFunction(fn).selector)) {
        return { ok: true, status: 200, json: async () => ({ jsonrpc: "2.0", id: 1, result: erc20.encodeFunctionResult(fn, [result]) }) };
      }
    }
    return { ok: false, status: 500, json: async () => ({}) };
  };
}

test("balanceOfToken(): reports an exact ERC-20 balance with symbol and decimals", async () => {
  const b = await balanceOfToken(CHAINS.base, TOKEN, WALLET, {
    fetchImpl: rpcFake({ balanceOf: 541862n, decimals: 6, symbol: "USDC" }),
  });
  assert.equal(b.checked, true);
  assert.equal(b.raw, "541862");
  assert.equal(b.amount, "0.541862");
  assert.equal(b.symbol, "USDC");
  assert.equal(b.empty, false);
});

test("balanceOfToken(): a zero balance is checked-and-empty, not unchecked", async () => {
  const b = await balanceOfToken(CHAINS.base, TOKEN, WALLET, {
    fetchImpl: rpcFake({ balanceOf: 0n, decimals: 6, symbol: "USDC" }),
  });
  assert.equal(b.checked, true);
  assert.equal(b.empty, true);
});

test("balanceOfToken(): an unreachable chain is NOT reported as empty", async () => {
  const b = await balanceOfToken(CHAINS.base, TOKEN, WALLET, { fetchImpl: async () => { throw new Error("521"); } });
  assert.equal(b.checked, false);
  assert.equal("amount" in b, false);
  assert.equal("empty" in b, false);
});

test("balanceOfToken(): a bad token address rejects rather than calling a wrong contract", async () => {
  await assert.rejects(() => balanceOfToken(CHAINS.base, "not-an-address", WALLET), TypeError);
});

test("discoverTokenHoldings(): a chain with no registered indexer refuses immediately", async () => {
  const d = await discoverTokenHoldings(CHAINS.ronin, WALLET);
  assert.equal(d.checked, false);
  assert.match(d.reason, /no registered indexer/);
});

test("discoverTokenHoldings(): parses ERC-20 entries from the indexer response", async () => {
  const fetchImpl = async () => ({
    ok: true, status: 200,
    json: async () => ([
      { token: { type: "ERC-20", address_hash: TOKEN, symbol: "USDC", decimals: "6" }, value: "541862" },
      { token: { type: "ERC-721", address_hash: "0xabc" }, value: "1" }, // must be filtered out
    ]),
  });
  const d = await discoverTokenHoldings(CHAINS.base, WALLET, { fetchImpl });
  assert.equal(d.checked, true);
  assert.equal(d.discovered.length, 1);
  assert.equal(d.discovered[0].tokenAddress, TOKEN);
  assert.equal(d.discovered[0].claimedSymbol, "USDC");
});

test("verifiedTokenHoldings(): re-reads every discovered token on-chain rather than trusting the indexer", async () => {
  let indexerCalled = false;
  const rpc = rpcFake({ balanceOf: 541862n, decimals: 6, symbol: "USDC" });
  const fetchImpl = async (url, init) => {
    if (init?.body === undefined) {
      indexerCalled = true;
      return { ok: true, status: 200, json: async () => ([{ token: { type: "ERC-20", address_hash: TOKEN, symbol: "USDC", decimals: "6" }, value: "999999999" }]) };
    }
    return rpc(url, init);
  };
  const v = await verifiedTokenHoldings(CHAINS.base, WALLET, { fetchImpl });
  assert.equal(indexerCalled, true);
  assert.equal(v.holdings.length, 1);
  assert.equal(v.holdings[0].checked, true);
  // The verified on-chain balance wins, not the indexer's stale claim.
  assert.equal(v.holdings[0].raw, "541862");
  assert.equal(v.holdings[0].indexerClaimedRawBalance, "999999999");
});

test("verifiedTokenHoldings(): falls from Blockscout to Rabby candidates and proves the Rabby claim at the fixed boundary", async () => {
  const boundary = Object.freeze({ chain: "base", chainId: 8453, caip2: "eip155:8453", requestedFinality: "finalized",
    finality: "finalized", blockNumber: "100", blockTag: "0x64", blockHash: `0x${"ab".repeat(32)}`,
    observedAt: "2026-09-01T12:00:00.000Z", provider: CHAINS.base.rpc[0] });
  const calls = [];
  const publicEvmReadPool = {
    async requestAtBoundary({ boundary: selected, method, params }) {
      assert.equal(selected.blockHash, boundary.blockHash);
      calls.push(method);
      const [{ data }] = params;
      for (const [fn, result] of Object.entries({ balanceOf: 541862n, decimals: 6, symbol: "USDC" })) {
        if (data.startsWith(erc20.getFunction(fn).selector)) {
          return { value: erc20.encodeFunctionResult(fn, [result]), provider: { url: CHAINS.base.rpc[1] } };
        }
      }
      throw new Error(`unexpected ${method}`);
    },
  };
  const fetchImpl = async (url) => {
    if (String(url).includes("base.blockscout.com")) return { ok: false, status: 429, json: async () => ({}) };
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://api.rabby.io");
    assert.equal(parsed.searchParams.get("chain_id"), "base");
    return { ok: true, status: 200, json: async () => ([
      { chain: "base", id: "base", name: "Native ETH", raw_amount_hex_str: "0x1" },
      { chain: "base", id: "https://phish.example/token", name: "Phishing URL", raw_amount_hex_str: "0x2" },
      { chain: "base", id: "not-an-evm-contract", name: "Malformed ID", raw_amount_hex_str: "0x3" },
      { chain: "base", id: TOKEN, name: "Stale index claim", decimals: 18, raw_amount_hex_str: "0xdeadbeef" },
    ]) };
  };
  const result = await verifiedTokenHoldings(CHAINS.base, WALLET, { boundary, fetchImpl, publicEvmReadPool });
  assert.equal(result.checked, true);
  assert.equal(result.holdings[0].raw, "541862");
  assert.equal(result.holdings[0].indexerClaimedRawBalance, "0xdeadbeef");
  assert.deepEqual(calls, ["eth_call", "eth_call", "eth_call"]);
});

test("discoverTokenHoldings(): skips Rabby native and malformed candidates without treating them as token balances", async () => {
  const base = structuredClone(CHAINS.base);
  base.indexers = [{ id: "rabby", url: "https://api.rabby.io" }];
  const result = await discoverTokenHoldings(base, WALLET, {
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ([
      { chain: "base", id: "base", raw_amount_hex_str: "0x1" },
      { chain: "base", id: "https://phish.example/token", raw_amount_hex_str: "0x2" },
      { chain: "base", id: "0xnot-a-contract", raw_amount_hex_str: "0x3" },
    ]) }),
  });
  assert.equal(result.checked, true);
  assert.deepEqual(result.discovered, []);
});

test("discoverTokenHoldings(): reports unknown when both Base candidates fail", async () => {
  const result = await discoverTokenHoldings(CHAINS.base, WALLET, {
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }),
  });
  assert.equal(result.checked, false);
  assert.equal("discovered" in result, false);
  assert.equal(result.attempts.length, 2);
});
