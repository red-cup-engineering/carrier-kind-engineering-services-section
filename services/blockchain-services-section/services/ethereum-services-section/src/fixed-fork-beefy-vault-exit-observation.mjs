import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Interface } from "ethers";

import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalWitnessJournalDocument, recordSettlementRecord } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { FIXED_FORK_BEEFY_VAULT_EXIT_OBSERVATION_CONTRACT }
  from "./fixed-fork-beefy-vault-exit-law.mjs";

const execFileAsync = promisify(execFile);
const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE = "org.emsenn.evm.fixed-fork-beefy-vault-exit-observation.v1";
const RECORD_CATEGORY = "ethereum-services.fixed-fork-beefy-vault-exit-observation";
const ACTOR = "urn:ame:ethereum-services-section";
const SETTLEMENT = "eip155:31337:0x9a1ace657ad8688fb1236291c0e30d934931290f";
const RPC_URL = "https://mainnet.base.org/";
const HASH = /^0x[0-9a-fA-F]{64}$/u;
const ROUTE_GAS_SAFETY_BPS = 12_000n;
const BPS_DENOMINATOR = 10_000n;
const INTRINSIC_AND_CALLDATA_GAS_CEIL = 64_728n;
const RPC_ATTEMPTS = 3;
const EVENT = new Interface(["event FixedForkRecoveryObserved(string candidateId,uint256 blockNumber,address vault,address lpToken,uint256 sharesBurned,uint256 lpBurned,address token0,uint256 amount0,address token1,uint256 amount1,uint256 gasUsed,uint256 gasUnitsCeil,uint256 baseFeePerGas,uint256 l1DataFeeWeiCeil,uint256 operatorFeeWeiCeil,uint256 transactionCount,uint256 unsignedTxSizeCeil)"]);
const EVENT_TOPIC = EVENT.getEvent("FixedForkRecoveryObserved").topicHash.toLowerCase();
const DEFINITIONS = Object.freeze({
  "yanagi-beefy-weeth-weth": Object.freeze({ test: "testYanagiBeefyWeethWethFixedForkExit()",
    vault: "0x47579c50c7aedea788d18927aed4c827fe34996a", lpToken: "0x91f0f34916ca4e2cce120116774b0e4fa0cdcaa8" }),
  "yanagi-beefy-sfrxeth-wsteth": Object.freeze({ test: "testYanagiBeefySfrxethWstethFixedForkExit()",
    vault: "0xdee327bf6b0182a1727caec9c6344a0d27d6da99", lpToken: "0x456c166e63634d75a4b49edec86cb51424d4c926" }),
});

function digest(value) { return semanticId(relationalWitnessJournalDocument(value)); }
function assertNoNumericOrTransactionMaterial(value, path = "input") {
  if (typeof value === "number" || typeof value === "bigint") {
    throw new TypeError(`${path} must encode integers as decimal text`);
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoNumericOrTransactionMaterial(entry, `${path}[${index}]`));
    return;
  }
  if (value == null || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (/^(calldata|data|mnemonic|privateKey|rawTransaction|rlp|secret|seed|signedTransaction|transactionRequest)$/iu.test(key)) {
      throw new TypeError(`${path}.${key} is secret or transaction material and is refused`);
    }
    assertNoNumericOrTransactionMaterial(entry, `${path}.${key}`);
  }
}
function serializable(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializable);
  if (value != null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializable(entry)]));
  }
  return value;
}
function text(name, value, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) throw new TypeError(`${name} is malformed`);
  return value;
}
function decimal(name, value) { text(name, value, /^(0|[1-9][0-9]*)$/u); return BigInt(value); }
function assertAuthority(authority) {
  if (authority?.fixedForkEvidenceOnly !== true || authority?.liveMutation !== false
    || authority?.signerMaterialPresent !== false || authority?.transactionAssembly !== false
    || authority?.signing !== false || authority?.broadcast !== false || authority?.chainMutation !== false
    || authority?.outputCalldata !== false) {
    throw new TypeError("authority must admit only fixed-fork evidence and no transaction authority");
  }
}

function normalize(input) {
  assertNoNumericOrTransactionMaterial(input);
  if (input?.profile !== PROFILE) throw new TypeError(`profile must equal ${PROFILE}`);
  assertAuthority(input.authority);
  if (input.chain !== "eip155:8453" || input.rpcUrl !== RPC_URL) throw new TypeError("exact official Base RPC is required");
  const block = decimal("block", input.block);
  if (block === 0n) throw new TypeError("block must be positive");
  const blockHash = text("blockHash", input.blockHash, HASH).toLowerCase();
  const timestamp = decimal("timestamp", input.timestamp);
  if (!Array.isArray(input.candidates) || input.candidates.length < 1 || input.candidates.length > 2) {
    throw new TypeError("candidates must contain one or two provider-reviewed exits");
  }
  const candidates = input.candidates.map((candidate) => text("candidate", candidate,
    /^(yanagi-beefy-weeth-weth|yanagi-beefy-sfrxeth-wsteth)$/u)).sort();
  if (new Set(candidates).size !== candidates.length) throw new TypeError("candidates must be unique");
  return { profile: PROFILE, authority: { ...input.authority }, chain: input.chain, rpcUrl: input.rpcUrl,
    block, blockHash, timestamp, candidates };
}

async function runForgeHarness(block) {
  const environment = { PATH: process.env.PATH, HOME: process.env.HOME,
    AGRODAO_BASE_RECOVERY_FORK: "true", AGRODAO_BASE_RECOVERY_BLOCK: block.toString() };
  const { stdout } = await execFileAsync("forge", ["test", "--match-contract", "BeefyLegacyRecoveryForkTest",
    "-vvvv", "--json"], { cwd: NODE_ROOT, env: environment, encoding: "utf8", maxBuffer: 12_000_000,
    timeout: 120_000 });
  return JSON.parse(stdout);
}

async function jsonRpcFeeRead(url, method, params, fetchImpl = fetch, wait = (milliseconds) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds))) {
  if (!["eth_getBlockByNumber", "eth_maxPriorityFeePerGas"].includes(method)) {
    throw new TypeError(`${method} is outside the fixed-fork fee observation law`);
  }
  for (let attempt = 1; attempt <= RPC_ATTEMPTS; attempt += 1) {
    const response = await fetchImpl(url, { method: "POST", headers: { "content-type": "application/json",
      "user-agent": "@red-cup-engineering/ethereum-services-section fixed-fork-fee-read" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(20_000) });
    if (response.ok) {
      const body = await response.json();
      if (body?.error) throw new Error(`JSON-RPC ${body.error.code}: ${body.error.message}`);
      return body?.result;
    }
    if (attempt === RPC_ATTEMPTS || (response.status !== 429 && response.status < 500)) {
      throw new Error(`JSON-RPC HTTP ${response.status}`);
    }
    await wait(250 * attempt);
  }
  throw new Error("JSON-RPC retry boundary exhausted");
}

function harnessContract(result) {
  const entry = Object.entries(result ?? {}).find(([name]) => name.endsWith(":BeefyLegacyRecoveryForkTest"));
  if (entry == null || entry[1]?.test_results == null) throw new TypeError("Foundry result lacks the exact recovery harness");
  return entry[1].test_results;
}

function parseCandidate(testResults, candidateId, block, blockBaseFeePerGas, priorityFeePerGasObserved) {
  const definition = DEFINITIONS[candidateId];
  const test = testResults[definition.test];
  if (test?.status !== "Success" || !Array.isArray(test.logs)) throw new TypeError(`${candidateId} fixed-fork test did not succeed`);
  const logs = test.logs.filter((log) => log?.topics?.[0]?.toLowerCase() === EVENT_TOPIC);
  if (logs.length !== 1) throw new TypeError(`${candidateId} must emit exactly one typed recovery observation`);
  const parsed = EVENT.parseLog(logs[0]);
  const args = parsed.args;
  const expectedGasUnitsCeil = (args.gasUsed * ROUTE_GAS_SAFETY_BPS + BPS_DENOMINATOR - 1n)
    / BPS_DENOMINATOR + INTRINSIC_AND_CALLDATA_GAS_CEIL;
  if (args.candidateId !== candidateId || args.blockNumber !== block
    || args.vault.toLowerCase() !== definition.vault || args.lpToken.toLowerCase() !== definition.lpToken
    || args.sharesBurned <= 0n || args.lpBurned <= 0n || args.amount0 <= 0n || args.amount1 <= 0n
    || args.gasUsed <= 0n || args.gasUnitsCeil !== expectedGasUnitsCeil
    || args.baseFeePerGas !== blockBaseFeePerGas || args.l1DataFeeWeiCeil <= 0n
    || args.transactionCount !== 3n || args.unsignedTxSizeCeil !== 256n
    || args.token0.toLowerCase() === args.token1.toLowerCase()) {
    throw new TypeError(`${candidateId} typed recovery observation contradicts its provider-reviewed definition`);
  }
  const priorityFeePerGasCeil = priorityFeePerGasObserved * 2n;
  const maxFeePerGasCeil = args.baseFeePerGas * 2n + priorityFeePerGasCeil;
  const l2ExecutionFeeWeiCeil = args.gasUnitsCeil * maxFeePerGasCeil;
  const totalFeeWeiCeil = l2ExecutionFeeWeiCeil + args.l1DataFeeWeiCeil + args.operatorFeeWeiCeil;
  return { candidateId, vault: definition.vault, lpToken: definition.lpToken,
    sharesBurned: args.sharesBurned.toString(), lpBurned: args.lpBurned.toString(),
    outputs: [{ token: args.token0.toLowerCase(), amount: args.amount0.toString() },
      { token: args.token1.toLowerCase(), amount: args.amount1.toString() }].sort((a, b) => a.token.localeCompare(b.token)),
    routeGasUsed: args.gasUsed.toString(), gasUnitsCeil: args.gasUnitsCeil.toString(),
    fee: { transactionCount: args.transactionCount.toString(), unsignedTxSizeCeil: args.unsignedTxSizeCeil.toString(),
      baseFeePerGas: args.baseFeePerGas.toString(), priorityFeePerGasObserved: priorityFeePerGasObserved.toString(),
      priorityFeePerGasCeil: priorityFeePerGasCeil.toString(), maxFeePerGasCeil: maxFeePerGasCeil.toString(),
      l2ExecutionFeeWeiCeil: l2ExecutionFeeWeiCeil.toString(),
      l1DataFeeWeiCeil: args.l1DataFeeWeiCeil.toString(), operatorFeeWeiCeil: args.operatorFeeWeiCeil.toString(),
      totalFeeWeiCeil: totalFeeWeiCeil.toString() },
    conservationVerified: true, outputVerified: true, feeCeilingComplete: true };
}

export async function observeFixedForkBeefyVaultExits(rawInput, options = {}) {
  const input = normalize(rawInput);
  const request = serializable(input);
  const rpc = options.rpc ?? ((url, method, params) =>
    jsonRpcFeeRead(url, method, params, options.fetchImpl, options.wait));
  const [rawBlock, rawPriorityFee] = await Promise.all([
    rpc(input.rpcUrl, "eth_getBlockByNumber", [`0x${input.block.toString(16)}`, false]),
    rpc(input.rpcUrl, "eth_maxPriorityFeePerGas", []),
  ]);
  if (rawBlock == null || BigInt(rawBlock.number ?? "-1") !== input.block
    || String(rawBlock.hash).toLowerCase() !== input.blockHash || BigInt(rawBlock.timestamp ?? "-1") !== input.timestamp) {
    throw new TypeError("official RPC block identity differs from the requested fixed fork");
  }
  const blockBaseFeePerGas = BigInt(rawBlock.baseFeePerGas ?? "-1");
  if (blockBaseFeePerGas <= 0n) throw new TypeError("official RPC block base fee is unavailable");
  const priorityFeePerGasObserved = BigInt(rawPriorityFee ?? "-1");
  if (priorityFeePerGasObserved <= 0n) throw new TypeError("official RPC priority fee recommendation is unavailable");
  const feeObservedAt = (options.now ?? (() => new Date().toISOString()))();
  if (!Number.isFinite(Date.parse(feeObservedAt))) throw new TypeError("fee observation time must be an ISO timestamp");
  const harness = await (options.runHarness ?? runForgeHarness)(input.block);
  const tests = harnessContract(harness);
  const candidates = input.candidates.map((candidateId) => parseCandidate(tests, candidateId, input.block,
    blockBaseFeePerGas, priorityFeePerGasObserved));
  const result = { profile: PROFILE, law: FIXED_FORK_BEEFY_VAULT_EXIT_OBSERVATION_CONTRACT,
    requestDigest: digest(request), outcome: "completed-fixed-fork-beefy-vault-exit-observation",
    chain: input.chain, block: input.block.toString(), blockHash: input.blockHash,
    timestamp: input.timestamp.toString(), feeObservedAt, feeSource: input.rpcUrl,
    candidateCount: String(candidates.length), candidates,
    gate: { fixedForkEvidenceOnly: true, publicAccountImpersonatedWithoutKey: true,
      outputVerified: true, routeGasObserved: true, gasEstimated: true, l1DataFeeEstimated: true,
      operatorFeeEstimated: true, feeCeilingComplete: true,
      priceEvidenceComplete: false, liveMutation: false, transactionAssembly: false, outputCalldata: false,
      signing: false, broadcast: false, chainMutation: false, executionAdmitted: false } };
  return { id: digest(result), ...result };
}

export async function recordFixedForkBeefyVaultExitObservation(input, result, options = {}) {
  const request = serializable(normalize(input));
  const { id, ...body } = result ?? {};
  if (result?.profile !== PROFILE || result?.law !== FIXED_FORK_BEEFY_VAULT_EXIT_OBSERVATION_CONTRACT
    || result?.requestDigest !== digest(request) || id !== digest(body) || result?.gate?.executionAdmitted !== false) {
    throw new TypeError("a valid request-bound fixed-fork Beefy exit observation is required");
  }
  const recordedAt = options.recordedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(recordedAt))) throw new TypeError("recordedAt must be an ISO timestamp");
  const record = { type: "FixedForkBeefyVaultExitObservationRecord", owner: ACTOR,
    observation: result, evidenceInput: request, recordedAt, decisionBoundary: result.gate };
  const projection = await (options.record ?? ((request) => recordSettlementRecord({
    agentUrl: options.agentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT, settlement: SETTLEMENT, actor: ACTOR, ...request,
  })))({ category: RECORD_CATEGORY, recordedAt, record });
  return { result, record, projection };
}

export const FIXED_FORK_BEEFY_VAULT_EXIT_PROFILE = PROFILE;
export const FIXED_FORK_BEEFY_VAULT_EXIT_RECORD_CATEGORY = RECORD_CATEGORY;
