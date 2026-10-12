import assert from "node:assert/strict";
import test from "node:test";
import {
  backfillSetOfX402Settlements,
  estimateBlockForTimestamp,
  observeSetOfX402Settlements,
} from "../scripts/observe-set-of-x402-settlements.mjs";

const RECEIVER = "0x0000000000000000000000000000000000000ea1";
const TX_HASH = `0x${"c".repeat(64)}`;
const HASH = `0x${"b".repeat(64)}`;
const LOG = Object.freeze({
  address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", transactionHash: TX_HASH, logIndex: "0x0",
  blockHash: HASH, blockNumber: "0x2a", removed: false, data: `0x${"7a120".padStart(64, "0")}`,
  topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    `0x${"0".repeat(24)}${"a".repeat(40)}`, `0x${"0".repeat(24)}${RECEIVER.slice(2)}`],
});
function pool({ firstLogs = [LOG], secondLogs = [LOG], sameEndpoint = false } = {}) {
  const providers = [{ id: "a", url: "https://a.example/" }, { id: "b", url: sameEndpoint ? "https://a.example/" : "https://b.example/" }];
  return { chain: { id: 8453 }, providers,
    async requestAtBoundary({ operation }) { return { provider: providers[0], value: await operation({ boundary: { chainId: 8453, blockNumber: "42", blockHash: HASH, blockTimestamp: "100" } }) }; },
    async readLogs({ providerIds } = {}) { const first = providerIds == null || providerIds.includes("a"); const provider = first ? providers[0] : providers[1]; return { provider, boundary: { chainId: 8453, blockNumber: "42", blockHash: HASH, blockTimestamp: "100" }, value: first ? firstLogs : secondLogs, attempts: [], failures: [] }; },
    async readBlockHeader() { return { provider: providers[0], boundary: { chainId: 8453, blockNumber: "42", blockHash: HASH, blockTimestamp: "100" }, value: { chainId: 8453, blockNumber: "42", blockHash: HASH, blockTimestamp: "100" } }; },
  };
}
test("refuses a missing receiver without a reader call", async () => {
  assert.deepEqual(await observeSetOfX402Settlements({}), { ok: false, reason: "input.receiver must be a non-empty string" });
});
test("two distinct endpoints agreeing on the complete event identity produce one receiver-transfer candidate", async () => {
  const result = await observeSetOfX402Settlements({ receiver: RECEIVER, fromBlock: 10, toBlock: 42, readPool: pool() });
  assert.equal(result.ok, true);
  assert.equal(result.receiverTransferCandidates.length, 1);
  assert.equal(result.disagreements.length, 0);
  assert.equal(result.receiverTransferCandidates[0].amount, "500000");
  assert.equal(result.receiverTransferCandidates[0].x402EvidenceRequired, true);
  assert.ok(!JSON.stringify(result).includes(RECEIVER));
});
test("a same transaction/log index with a different block hash is a disagreement", async () => {
  const result = await observeSetOfX402Settlements({ receiver: RECEIVER, fromBlock: 10, toBlock: 42,
    readPool: pool({ secondLogs: [{ ...LOG, blockHash: `0x${"d".repeat(64)}` }] }) });
  assert.equal(result.receiverTransferCandidates.length, 0);
  assert.equal(result.disagreements.length, 1);
});
test("duplicate endpoint identity is refused rather than counted as two votes", async () => {
  const result = await observeSetOfX402Settlements({ receiver: RECEIVER, fromBlock: 10, toBlock: 42, readPool: pool({ sameEndpoint: true }) });
  assert.equal(result.ok, false);
  assert.match(result.reason, /same endpoint/);
});
test("a duplicate event key is a disagreement, never an arbitrarily selected settlement", async () => {
  const result = await observeSetOfX402Settlements({ receiver: RECEIVER, fromBlock: 10, toBlock: 42, readPool: pool({ firstLogs: [LOG, LOG] }) });
  assert.equal(result.receiverTransferCandidates.length, 0);
  assert.equal(result.disagreements[0].reason, "duplicate-event-key");
});
test("an arbitrary network cannot relabel Base observation evidence", async () => {
  const result = await observeSetOfX402Settlements({ receiver: RECEIVER, network: "eip155:1", readPool: pool() });
  assert.deepEqual(result, { ok: false, reason: "only Base eip155:8453 observations are supported" });
});

// -- backfillSetOfX402Settlements -------------------------------------------------------

function memoryCursor() {
  let stored = null;
  return {
    reads: [],
    writes: [],
    readCursor: async (path) => { memoryCursor.lastPath = path; return stored; },
    writeCursor: async (path, cursor) => { stored = cursor; },
    get current() { return stored; },
  };
}

// A stubbed `observe` that only agrees when the requested chunk is <= `maxAccepted` blocks
// wide, mimicking a provider pair whose agreed window is bounded below the full span.
function chunkBoundedObserve({ maxAccepted, candidatesByChunk = new Map() } = {}) {
  const calls = [];
  return {
    calls,
    fn: async ({ receiver, fromBlock, toBlock, windowBlocks }) => {
      calls.push({ receiver, fromBlock, toBlock, windowBlocks });
      if (windowBlocks === 1 && fromBlock == null && toBlock == null) {
        return { ok: true, network: "eip155:8453", fromBlock: 0, toBlock: 1099, receiverTransferCandidates: [], disagreements: [] };
      }
      const width = toBlock - fromBlock + 1;
      if (width > maxAccepted) return { ok: false, reason: "too large" };
      return {
        ok: true, network: "eip155:8453", fromBlock, toBlock,
        receiverTransferCandidates: candidatesByChunk.get(fromBlock) ?? [],
        disagreements: [],
      };
    },
  };
}

test("backfillSetOfX402Settlements requires a non-empty receiver", async () => {
  assert.deepEqual(await backfillSetOfX402Settlements({}), { ok: false, reason: "input.receiver must be a non-empty string" });
});

test("backfillSetOfX402Settlements requires fromBlock when no cursor is persisted", async () => {
  const cursor = memoryCursor();
  const observe = chunkBoundedObserve({ maxAccepted: 1000 });
  const result = await backfillSetOfX402Settlements({
    receiver: RECEIVER, observe: observe.fn, readCursor: cursor.readCursor, writeCursor: cursor.writeCursor,
  });
  assert.deepEqual(result, { ok: false, reason: "fromBlock is required when no cursor is persisted yet" });
});

test("chunks a contiguous range within the accepted window, largest-first, aggregating candidates in order", async () => {
  const cursor = memoryCursor();
  const observe = chunkBoundedObserve({
    maxAccepted: 100,
    candidatesByChunk: new Map([[0, [{ transactionHash: "0xa" }]], [100, [{ transactionHash: "0xb" }]]]),
  });
  const result = await backfillSetOfX402Settlements({
    receiver: RECEIVER, fromBlock: 0, toBlock: 199, observe: observe.fn,
    readCursor: cursor.readCursor, writeCursor: cursor.writeCursor, now: () => new Date("2026-09-08T00:00:00.000Z"),
  });
  assert.equal(result.ok, true);
  assert.equal(result.chunkCount, 2);
  assert.deepEqual(result.chunks.map((c) => [c.fromBlock, c.toBlock]), [[0, 99], [100, 199]]);
  assert.deepEqual(result.receiverTransferCandidates.map((c) => c.transactionHash), ["0xa", "0xb"]);
  // The ladder tried every larger candidate before the accepted 100/99-block chunk each time.
  assert.ok(observe.calls.some((c) => c.windowBlocks === undefined && c.toBlock - c.fromBlock + 1 > 100));
  assert.equal(cursor.current.nextFromBlock, 200);
  assert.equal(cursor.current.lastCompletedAt, "2026-09-08T00:00:00.000Z");
});

test("resumes from a persisted cursor when fromBlock is not given", async () => {
  const cursor = memoryCursor();
  cursor.writeCursor("ignored-path", { nextFromBlock: 150, receiver: RECEIVER, lastCompletedAt: "2026-09-07T00:00:00.000Z" });
  const observe = chunkBoundedObserve({ maxAccepted: 1000 });
  const result = await backfillSetOfX402Settlements({
    receiver: RECEIVER, toBlock: 199, observe: observe.fn, readCursor: cursor.readCursor, writeCursor: cursor.writeCursor,
  });
  assert.equal(result.ok, true);
  assert.equal(result.fromBlock, 150);
  assert.deepEqual(result.chunks.map((c) => [c.fromBlock, c.toBlock]), [[150, 199]]);
});

test("defaults toBlock to the current tip when not given", async () => {
  const cursor = memoryCursor();
  const observe = chunkBoundedObserve({ maxAccepted: 10000 });
  const result = await backfillSetOfX402Settlements({
    receiver: RECEIVER, fromBlock: 1000, observe: observe.fn, readCursor: cursor.readCursor, writeCursor: cursor.writeCursor,
  });
  assert.equal(result.ok, true);
  assert.equal(result.toBlock, 1099);
});

test("reports failure with the attempt ledger when no window is accepted by both providers", async () => {
  const cursor = memoryCursor();
  const observe = { fn: async () => ({ ok: false, reason: "refused" }) };
  const result = await backfillSetOfX402Settlements({
    receiver: RECEIVER, fromBlock: 0, toBlock: 10, observe: observe.fn, readCursor: cursor.readCursor, writeCursor: cursor.writeCursor,
    windowCandidates: [5, 2],
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "no window was accepted by both providers for this chunk");
  assert.equal(result.lastAttempts.length, 2);
});

// -- estimateBlockForTimestamp -----------------------------------------------------------

function tipPool(tip) {
  return { chain: { id: 8453 }, providers: [{ id: "a" }, { id: "b" }],
    readLogs: async () => { throw new Error("unused"); }, readBlockHeader: async () => { throw new Error("unused"); },
    async requestAtBoundary({ operation }) { return { provider: { id: "a" }, value: await operation({ boundary: tip }) }; },
  };
}

test("estimateBlockForTimestamp derives a block number from the tip header and ~2s block time", async () => {
  const tip = { chainId: 8453, blockNumber: "1000", blockHash: HASH, blockTimestamp: String(1000) };
  const result = await estimateBlockForTimestamp({ readPool: tipPool(tip), targetTimestamp: new Date(1000000 - 200000).toISOString() });
  assert.equal(result.ok, true);
  assert.equal(result.tipBlockNumber, 1000);
  // 200 seconds before the tip, at ~2s/block, is 100 blocks before the tip.
  assert.equal(result.blockNumber, 900);
});

test("estimateBlockForTimestamp refuses an unparseable timestamp without reading the chain", async () => {
  const result = await estimateBlockForTimestamp({ targetTimestamp: "not-a-date" });
  assert.deepEqual(result, { ok: false, reason: "targetTimestamp must be a parseable date/time string" });
});
