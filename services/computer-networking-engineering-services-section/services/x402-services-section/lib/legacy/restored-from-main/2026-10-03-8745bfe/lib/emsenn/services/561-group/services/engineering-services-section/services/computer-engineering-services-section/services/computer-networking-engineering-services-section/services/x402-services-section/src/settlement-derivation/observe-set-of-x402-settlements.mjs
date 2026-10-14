#!/usr/bin/env node
import { parseArgs } from "node:util";
import { BASE_USDC } from "../market-observation/settlement.mjs";
import { readFileText } from "@red-cup-engineering/file-services/read-file";
import { writeFileText } from "@red-cup-engineering/file-services/write-file";
import { fileURLToPath as projectFileUrlFilepath } from "node:url";

const DEFAULT_WINDOW_BLOCKS = 2000;
// Backfill chunk sizes to try, largest first, per contiguous range: the two-provider
// agreement in observeSetOfX402Settlements is bounded by whichever of the two endpoints
// a given call lands on -- base-rpc.publicnode.com accepts roughly 100 non-archive blocks,
// base.drpc.org roughly 1000, mainnet.base.org roughly 10000 -- and those thresholds are
// undocumented and provider-controlled, so each chunk discovers its own largest accepted
// size empirically (mirroring record-set-of-x402-settlement-candidates.mjs's own ladder)
// rather than assuming a fixed worst case for every chunk.
export const DEFAULT_CHUNK_WINDOW_CANDIDATES = Object.freeze([10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1]);
const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
function receiverTopic(address) {
  if (typeof address !== "string" || !/^0x[0-9a-fA-F]{40}$/u.test(address)) throw new TypeError("input.receiver must be a 20-byte address");
  return `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;
}
// The Base provider pool is a network effect owner; every caller in this script's own tests
// injects a readPool, so the import is deferred here rather than paid at module load for
// callers that never need it.
let ethereumEngineeringModulePromise;
function loadEthereumEngineering() {
  ethereumEngineeringModulePromise ??= import("@red-cup-engineering/ethereum-engineering-services-section/public-evm-read");
  return ethereumEngineeringModulePromise;
}
async function baseReadPool() {
  const { BASE_PUBLIC_EVM_CHAIN, BASE_PUBLIC_EVM_PROVIDERS, createPublicEvmReadPool } = await loadEthereumEngineering();
  return createPublicEvmReadPool({ chain: BASE_PUBLIC_EVM_CHAIN, providers: BASE_PUBLIC_EVM_PROVIDERS });
}
async function requireBaseReadPool(value) {
  const readPool = value ?? (await baseReadPool());
  if (readPool?.chain?.id !== 8453 || !Array.isArray(readPool.providers) || typeof readPool.readLogs !== "function"
    || typeof readPool.readBlockHeader !== "function" || typeof readPool.requestAtBoundary !== "function") {
    throw new TypeError("readPool must be a Base public EVM read pool with logs and headers");
  }
  return readPool;
}
function eventKey(log) { return `${log.transactionHash.toLowerCase()}:${log.logIndex.toLowerCase()}`; }
function sameEvent(a, b) {
  return a.transactionHash.toLowerCase() === b.transactionHash.toLowerCase() && a.logIndex.toLowerCase() === b.logIndex.toLowerCase()
    && a.blockHash.toLowerCase() === b.blockHash.toLowerCase() && a.blockNumber.toLowerCase() === b.blockNumber.toLowerCase()
    && a.address.toLowerCase() === b.address.toLowerCase() && a.data.toLowerCase() === b.data.toLowerCase()
    && a.removed === b.removed && JSON.stringify(a.topics.map((topic) => topic.toLowerCase())) === JSON.stringify(b.topics.map((topic) => topic.toLowerCase()));
}
function singleByKey(logs) {
  const grouped = new Map();
  for (const log of logs) {
    const key = eventKey(log);
    const values = grouped.get(key) ?? [];
    values.push(log); grouped.set(key, values);
  }
  return grouped;
}
function decimalTime(header) {
  if (header.blockTimestamp == null) throw new Error("block header has no timestamp");
  return new Date(Number(header.blockTimestamp) * 1000).toISOString();
}
function isExactTransfer(log) {
  return log?.topics?.length === 3 && log.topics[0] === ERC20_TRANSFER_TOPIC
    && /^0x0{24}[0-9a-f]{40}$/u.test(log.topics[1]) && /^0x0{24}[0-9a-f]{40}$/u.test(log.topics[2])
    && /^0x[0-9a-f]{64}$/u.test(log.data);
}
async function latestBlock(readPool) {
  const result = await readPool.requestAtBoundary({ operation: ({ boundary }) => boundary });
  return Number(result.value.blockNumber);
}
/**
 * Observe Base-USDC receiver-transfer candidates. It keeps the receiver only in the request filter,
 * obtains two log observations from distinct actual endpoints, and reports disagreements rather
 * than silently dropping unmatched or non-identical events. A range is not a cryptographic snapshot.
 */
export async function observeSetOfX402Settlements(input = {}) {
  if (typeof input.receiver !== "string" || input.receiver === "") return { ok: false, reason: "input.receiver must be a non-empty string" };
  if (input.network != null && input.network !== "eip155:8453") return { ok: false, reason: "only Base eip155:8453 observations are supported" };
  if (input.asset != null && input.asset.toLowerCase() !== BASE_USDC.toLowerCase()) return { ok: false, reason: "only Base USDC receiver-transfer candidates are supported" };
  let readPool;
  try { readPool = await requireBaseReadPool(input.readPool); }
  catch (error) { return { ok: false, reason: String(error.message ?? error) }; }
  let toBlock = input.toBlock;
  try {
    if (toBlock == null) toBlock = await latestBlock(readPool);
    if (!Number.isSafeInteger(toBlock) || toBlock < 0) throw new RangeError("toBlock must be a non-negative safe integer");
    const windowBlocks = input.windowBlocks ?? DEFAULT_WINDOW_BLOCKS;
    if (!Number.isSafeInteger(windowBlocks) || windowBlocks < 1) throw new RangeError("windowBlocks must be a positive safe integer");
    const fromBlock = input.fromBlock ?? Math.max(0, toBlock - windowBlocks + 1);
    if (!Number.isSafeInteger(fromBlock) || fromBlock < 0 || fromBlock > toBlock) throw new RangeError("fromBlock must be within the observed range");
    const filter = { address: input.asset ?? BASE_USDC, topics: [ERC20_TRANSFER_TOPIC, null, receiverTopic(input.receiver)], fromBlock, toBlock };
    const first = await readPool.readLogs({ filter });
    const remainingProviderIds = readPool.providers.filter(({ id }) => id !== first.provider.id).map(({ id }) => id);
    if (remainingProviderIds.length === 0) return { ok: false, reason: "two distinct public EVM endpoints are required" };
    const second = await readPool.readLogs({ filter, providerIds: remainingProviderIds });
    if (first.provider.url === second.provider.url || first.provider.id === second.provider.id) return { ok: false, reason: "two log observations resolved to the same endpoint" };
    const firstByKey = singleByKey(first.value), secondByKey = singleByKey(second.value);
    const keys = new Set([...firstByKey.keys(), ...secondByKey.keys()]);
    const candidates = [], disagreements = [], headers = new Map();
    for (const key of keys) {
      const left = firstByKey.get(key), right = secondByKey.get(key);
      if (left?.length !== 1 || right?.length !== 1 || !sameEvent(left[0], right[0]) || left[0].removed) {
        disagreements.push({ key, foundOnFirstNode: left?.length === 1, foundOnSecondNode: right?.length === 1, reason: left?.length !== 1 || right?.length !== 1 ? "duplicate-event-key" : "event-identity-mismatch" });
        continue;
      }
      const log = left[0];
      if (!isExactTransfer(log)) {
        disagreements.push({ key, reason: "event-refused: invalid-erc20-transfer-shape" });
        continue;
      }
      let header = headers.get(log.blockHash);
      if (header == null) {
        try {
          const byHash = await readPool.readBlockHeader({ block: { blockHash: log.blockHash }, providerIds: [first.provider.id] });
          const byNumber = await readPool.readBlockHeader({ block: { blockNumber: Number(BigInt(log.blockNumber)) }, providerIds: [first.provider.id] });
          if (BigInt(byHash.value.blockNumber) !== BigInt(log.blockNumber) || byNumber.value.blockHash !== log.blockHash) {
            throw new Error("header identity does not match the log block");
          }
          header = byHash.value; headers.set(log.blockHash, header);
        } catch (error) { disagreements.push({ key, reason: `header-read-failed: ${String(error.message ?? error)}` }); continue; }
      }
      try {
        candidates.push({ transactionHash: log.transactionHash, network: "eip155:8453", blockTime: decimalTime(header),
          payer: `0x${log.topics[1].slice(26)}`.toLowerCase(), amount: BigInt(log.data).toString(10),
          x402EvidenceRequired: true,
          blockHash: log.blockHash, blockNumber: log.blockNumber, logIndex: log.logIndex,
          evidence: { rangeObservation: true, firstEndpoint: first.provider.url, secondEndpoint: second.provider.url,
            firstAttempts: first.attempts ?? [], secondAttempts: second.attempts ?? [] } });
      } catch (error) { disagreements.push({ key, reason: `event-refused: ${String(error.message ?? error)}` }); }
    }
    const candidateCounts = new Map();
    for (const candidate of candidates) candidateCounts.set(candidate.transactionHash, (candidateCounts.get(candidate.transactionHash) ?? 0) + 1);
    const eligibleCandidates = candidates.filter((candidate) => candidateCounts.get(candidate.transactionHash) === 1);
    for (const candidate of candidates) {
      if (candidateCounts.get(candidate.transactionHash) > 1) disagreements.push({ key: candidate.transactionHash, reason: "multiple-receiver-transfers-in-one-transaction" });
    }
    return { ok: true, network: "eip155:8453", fromBlock, toBlock, receiverTransferCandidates: eligibleCandidates, disagreements,
      provenance: { rangeObservation: true, firstEndpoint: first.provider.url, secondEndpoint: second.provider.url } };
  } catch (error) { return { ok: false, reason: String(error.message ?? error) }; }
}
// This module lives at <packageRoot>/src/settlement-derivation/<name>.mjs.
function packageRoot() {
  return projectFileUrlFilepath(import.meta.url).split("/").slice(0, -3).join("/");
}

function defaultCursorPath(root) {
  return `${root}/data/settlement-derivation/state/x402-settlement-backfill-cursor.json`;
}

async function defaultReadCursor(path) {
  try { return JSON.parse(await readFileText(path)); }
  catch (error) { if (error?.code === "ENOENT") return null; throw error; }
}

async function defaultWriteCursor(path, cursor) {
  await writeFileText(path, `${JSON.stringify(cursor, null, 2)}\n`);
}

// Try candidate chunk sizes largest-first, each bounded to the remaining span, until one
// call to `observe` reports two providers agreeing on that exact [fromBlock, toBlock].
async function observeOneChunk(observe, receiver, fromBlock, maxToBlock, windowCandidates) {
  const attempts = [];
  for (const window of windowCandidates) {
    const toBlock = Math.min(fromBlock + window - 1, maxToBlock);
    const result = await observe({ receiver, fromBlock, toBlock });
    attempts.push({ fromBlock, toBlock, windowBlocks: toBlock - fromBlock + 1, ok: result.ok === true, reason: result.ok === true ? null : result.reason });
    if (result.ok === true) return { result, attempts };
  }
  return { result: null, attempts };
}

/**
 * Backfill a contiguous Base-USDC receiver-transfer range by chunking within whichever
 * window each pair of providers currently accepts (largest-first, per chunk), still
 * requiring two providers to agree on every chunk exactly as `observeSetOfX402Settlements`
 * does. Persists `{nextFromBlock}` to `cursorPath` after every completed chunk, so a run
 * started with no explicit `fromBlock` resumes where the previous run's cursor left off
 * (a timer's `OnUnitActiveSec` firing again is exactly that case).
 * @param {{receiver: string, fromBlock?: number, toBlock?: number, observe?: Function,
 *   windowCandidates?: readonly number[], root?: string, cursorPath?: string,
 *   readCursor?: Function, writeCursor?: Function, now?: () => Date}} input
 * @returns {Promise<{ok: boolean, reason?: string, network?: string, fromBlock?: number,
 *   toBlock?: number, chunkCount?: number, chunks?: object[],
 *   receiverTransferCandidates?: object[], disagreements?: object[]}>}
 */
export async function backfillSetOfX402Settlements({
  receiver,
  fromBlock,
  toBlock,
  observe = observeSetOfX402Settlements,
  windowCandidates = DEFAULT_CHUNK_WINDOW_CANDIDATES,
  root = packageRoot(),
  cursorPath,
  readCursor = defaultReadCursor,
  writeCursor = defaultWriteCursor,
  now = () => new Date(),
} = {}) {
  if (typeof receiver !== "string" || receiver === "") return { ok: false, reason: "input.receiver must be a non-empty string" };
  const resolvedCursorPath = cursorPath ?? defaultCursorPath(root);
  const cursor = await readCursor(resolvedCursorPath);
  const start = fromBlock ?? cursor?.nextFromBlock;
  if (start == null) return { ok: false, reason: "fromBlock is required when no cursor is persisted yet" };
  if (!Number.isSafeInteger(start) || start < 0) return { ok: false, reason: "fromBlock must be a non-negative safe integer" };

  let end = toBlock;
  if (end == null) {
    const tip = await observe({ receiver, windowBlocks: 1 });
    if (tip.ok !== true) return { ok: false, reason: tip.reason };
    end = tip.toBlock;
  }
  if (!Number.isSafeInteger(end) || end < start) return { ok: false, reason: "toBlock must be a safe integer >= fromBlock" };

  const chunks = [];
  let cursorBlock = start;
  while (cursorBlock <= end) {
    const { result, attempts } = await observeOneChunk(observe, receiver, cursorBlock, end, windowCandidates);
    if (result == null) {
      return { ok: false, reason: "no window was accepted by both providers for this chunk", fromBlock: cursorBlock, toBlock: end, chunkCount: chunks.length, chunks, lastAttempts: attempts };
    }
    chunks.push({
      fromBlock: result.fromBlock, toBlock: result.toBlock, attempts,
      receiverTransferCandidates: result.receiverTransferCandidates, disagreements: result.disagreements,
    });
    cursorBlock = result.toBlock + 1;
    await writeCursor(resolvedCursorPath, { nextFromBlock: cursorBlock, receiver, lastCompletedAt: now().toISOString() });
  }
  return {
    ok: true, network: "eip155:8453", fromBlock: start, toBlock: end, chunkCount: chunks.length, chunks,
    receiverTransferCandidates: chunks.flatMap((chunk) => chunk.receiverTransferCandidates),
    disagreements: chunks.flatMap((chunk) => chunk.disagreements),
  };
}

/**
 * Estimate the Base block number at or before `targetTimestamp`, from the chain tip's own
 * header timestamp and Base's ~2-second block time -- a starting point for a backfill's
 * `--from-block`, never a claim of exact block-time linearity.
 * @param {{readPool?: object, targetTimestamp: string, blockTimeSeconds?: number}} input
 * @returns {Promise<{ok: boolean, reason?: string, blockNumber?: number, tipBlockNumber?: number, tipBlockTime?: string}>}
 */
export async function estimateBlockForTimestamp({ readPool: readPoolInput, targetTimestamp, blockTimeSeconds = 2 } = {}) {
  const targetMs = Date.parse(targetTimestamp);
  if (!Number.isFinite(targetMs)) return { ok: false, reason: "targetTimestamp must be a parseable date/time string" };
  let readPool;
  try { readPool = await requireBaseReadPool(readPoolInput); }
  catch (error) { return { ok: false, reason: String(error.message ?? error) }; }
  const tip = await readPool.requestAtBoundary({ operation: ({ boundary }) => boundary });
  const tipBlockNumber = Number(tip.value.blockNumber);
  const tipBlockTime = decimalTime(tip.value);
  const secondsAgo = (Date.parse(tipBlockTime) - targetMs) / 1000;
  const blocksAgo = Math.round(secondsAgo / blockTimeSeconds);
  const blockNumber = Math.max(0, tipBlockNumber - blocksAgo);
  return { ok: true, blockNumber, tipBlockNumber, tipBlockTime };
}

function backfillCliOptions() {
  return {
    "from-block": { type: "string" },
    "to-block": { type: "string" },
  };
}

if (import.meta.main) {
  const receiver = process.env.X402_SETTLEMENT_OBSERVER_RECEIVER;
  if (!receiver) { process.stderr.write(JSON.stringify({ error: "X402_SETTLEMENT_OBSERVER_RECEIVER env var is required" }) + "\n"); process.exit(2); }
  const { values } = parseArgs({ args: process.argv.slice(2), options: backfillCliOptions() });
  if (values["from-block"] != null || values["to-block"] != null) {
    const fromBlock = values["from-block"] != null ? Number(values["from-block"]) : undefined;
    const toBlock = values["to-block"] != null ? Number(values["to-block"]) : undefined;
    const result = await backfillSetOfX402Settlements({ receiver, fromBlock, toBlock });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (!result.ok) process.exit(1);
  } else {
    const result = await observeSetOfX402Settlements({ receiver });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (!result.ok) process.exit(1);
  }
}
