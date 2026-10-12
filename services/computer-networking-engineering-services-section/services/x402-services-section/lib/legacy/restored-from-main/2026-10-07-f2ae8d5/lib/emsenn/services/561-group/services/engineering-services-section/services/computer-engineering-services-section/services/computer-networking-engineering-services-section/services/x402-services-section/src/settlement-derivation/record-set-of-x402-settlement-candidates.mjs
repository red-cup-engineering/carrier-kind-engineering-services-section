#!/usr/bin/env node
// Records one x402 settlement observation cycle: chain-reads Base USDC settlements to the
// receiver named by X402_SETTLEMENT_OBSERVER_RECEIVER (discovering the largest window the
// public read pool currently accepts when --window is not given), derives Beancount
// transaction candidates for market.561.group (a receiver-level observation that cannot prove
// an individual catalog gateway), and journals one
// dated record of the result through @red-cup-engineering/eavt/semantic-record,
// mirrored as a dated JSON file under data/settlement-derivation/records for human legibility.
import { parseArgs } from "node:util";
import { writeFileText } from "@red-cup-engineering/file-services/write-file";
import { fileURLToPath as projectFileUrlFilepath } from "node:url";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { settlementWitnessGraphId } from "../../scripts/x402-settlement-witness-identity.mjs";
import { BASE_USDC } from "../market-observation/settlement.mjs";
import { deriveSetOfX402SettlementTransactions, incomeAccountFor } from "./derive-set-of-x402-settlement-transactions.mjs";
import { observeSetOfX402Settlements } from "./observe-set-of-x402-settlements.mjs";

// A receiver transfer proves market revenue, never a particular catalog grouping. Keeping the
// common market as the accounting carrier prevents a retired seller from receiving every sale.
export const GATEWAY = "market-561-group";
export const RECORD_CATEGORY = "x402-settlement-candidates";
export const RECORD_OBJECT_KIND = "X402SettlementCandidateRecord";

// Windows to try, largest first, when the caller does not name one explicitly. The public
// read pool enforces a hard 20,000-block span at the library layer (never try above that);
// beneath it, each free-tier public endpoint refuses a range past its own, undocumented,
// non-archive threshold. Trying largest-first and keeping the first success is how "the
// largest window the public read pool accepts" gets discovered empirically, run over run,
// without hand-tuning a constant against a policy some provider can change unannounced.
export const DEFAULT_WINDOW_CANDIDATES = Object.freeze([
  50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1,
]);

const GATEWAY_ATTRIBUTION_LIMITATION =
  `The receiver settles for several market.561.group catalog groups through one payout address; ` +
  `this chain read can establish market revenue only, not a gateway, operation, or SKU. Every ` +
  `observed settlement is therefore carried by "${GATEWAY}" until an application witness supplies ` +
  `the finer attribution.`;

const RECOGNITION_LIMITATION =
  `deriveSetOfX402SettlementTransactions books a settlement only when it carries a revenue` +
  `-recognition classification and an evidenceId beside its chain-read witness. This recorder` +
  ` supplies the minimal honest classification a chain-only observation can support: every` +
  ` settlement is recognized as spot revenue ("kind":"revenue") into gateway "${GATEWAY}"'s` +
  ` own income account, with the settling transaction itself standing as both the contract` +
  ` and the performance obligation (a walk-up x402 call has no separate standing contract) and` +
  ` as the evidenceId (the on-chain transfer two providers agreed on is the only evidence a` +
  ` chain read has). No amount, payer, or timestamp is invented -- those come from the chain` +
  ` read unchanged; only the accounting classification is supplied here.`;

/**
 * The minimal, honest revenue-recognition classification a chain-only settlement observation
 * can support: this settlement is its own contract and its own performance obligation, and its
 * own on-chain evidence, so deriveSetOfX402SettlementTransactions's recognition gate is
 * satisfied without inventing any business fact the chain read did not already establish.
 * @param {{transactionHash: string, gateway: string}} settlement
 * @returns {{kind: "revenue", account: string, contractId: string, performanceId: string}}
 */
function spotSaleRecognition({ transactionHash, gateway }) {
  return { kind: "revenue", account: incomeAccountFor(gateway), contractId: transactionHash, performanceId: transactionHash };
}

function usageText() {
  return [
    `record-set-of-x402-settlement-candidates -- observe Base USDC settlements to the receiver`,
    `named by X402_SETTLEMENT_OBSERVER_RECEIVER (never a flag), derive Beancount transaction`,
    `candidates for gateway "${GATEWAY}", and journal one dated record of the result.`,
    ``,
    `Options:`,
    `  --window <blocks>   Use exactly this many blocks instead of discovering the largest`,
    `                      window the public read pool currently accepts.`,
    `  --dry-run           Observe and derive, but do not write the journal record.`,
    `  --help              Print this message.`,
  ].join("\n");
}

// This module lives at <packageRoot>/src/settlement-derivation/<name>.mjs.
function packageRoot() {
  return projectFileUrlFilepath(import.meta.url).split("/").slice(0, -3).join("/");
}

async function defaultWriteDatedRecord(payload, { recordsDir, filename }) {
  await writeFileText(`${recordsDir}/${filename}`, `${JSON.stringify(payload, null, 2)}\n`);
}

function datedRecordFilename(observedAt) {
  const safe = observedAt.replace(/[:.]/gu, "-");
  return `${safe}-x402-settlement-candidates.json`;
}

// Try candidate windows largest-first against `observe`, keeping the first that reports
// `ok: true`. Returns the winning window and result (or the last, failing, result when every
// candidate is refused), plus the full attempt ledger for the caller to surface.
async function discoverWindow(observe, receiver, candidates) {
  const attempts = [];
  let lastResult = null;
  for (const windowBlocks of candidates) {
    const result = await observe({ receiver, windowBlocks });
    lastResult = result;
    attempts.push({ windowBlocks, ok: result.ok === true, reason: result.ok === true ? null : result.reason });
    if (result.ok === true) return { windowBlocks, result, attempts };
  }
  return { windowBlocks: candidates.at(-1) ?? null, result: lastResult, attempts };
}

/**
 * Run one observe -> derive -> journal cycle. All effectful collaborators are injectable so
 * this can be exercised with a stubbed observer and journal in tests; the CLI entrypoint below
 * wires the real ones.
 *
 * @returns {{ok: boolean, exitCode: number, summary: object, record?: object}}
 */
export async function recordSetOfX402SettlementCandidates({
  argv = process.argv.slice(2),
  env = process.env,
  observe = observeSetOfX402Settlements,
  derive = deriveSetOfX402SettlementTransactions,
  witnessGraphIdFor = settlementWitnessGraphId,
  createJournal = createSemanticRecordJournal,
  windowCandidates = DEFAULT_WINDOW_CANDIDATES,
  now = () => new Date(),
  writeDatedRecord = defaultWriteDatedRecord,
  root = packageRoot(),
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  const { values } = parseArgs({
    args: argv,
    options: {
      window: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    stdout.write(`${usageText()}\n`);
    return { ok: true, exitCode: 0, summary: null };
  }

  const receiver = env.X402_SETTLEMENT_OBSERVER_RECEIVER;
  if (!receiver) {
    const summary = { ok: false, reason: "X402_SETTLEMENT_OBSERVER_RECEIVER env var is required" };
    stderr.write(`${JSON.stringify(summary)}\n`);
    return { ok: false, exitCode: 1, summary };
  }

  let windowBlocks;
  let observed;
  let windowDiscovery;
  if (values.window != null) {
    windowBlocks = Number(values.window);
    if (!Number.isSafeInteger(windowBlocks) || windowBlocks < 1) {
      const summary = { ok: false, reason: "--window must be a positive integer" };
      stderr.write(`${JSON.stringify(summary)}\n`);
      return { ok: false, exitCode: 1, summary };
    }
    observed = await observe({ receiver, windowBlocks });
    windowDiscovery = [{ windowBlocks, ok: observed.ok === true, reason: observed.ok === true ? null : observed.reason }];
  } else {
    const discovery = await discoverWindow(observe, receiver, windowCandidates);
    windowBlocks = discovery.windowBlocks;
    observed = discovery.result;
    windowDiscovery = discovery.attempts;
  }

  if (!observed || observed.ok !== true) {
    const summary = {
      ok: false,
      reason: observed?.reason ?? "observer produced no result",
      windowDiscovery,
    };
    stderr.write(`${JSON.stringify(summary)}\n`);
    return { ok: false, exitCode: 1, summary };
  }

  const observedAt = now().toISOString();
  const settlements = observed.receiverTransferCandidates.map((candidate) => ({
    transactionHash: candidate.transactionHash,
    payer: candidate.payer,
    amount: candidate.amount,
    blockTime: candidate.blockTime,
    network: candidate.network,
    asset: BASE_USDC,
    receiver,
    logIndex: candidate.logIndex,
    witnessGraphId: witnessGraphIdFor({ network: candidate.network, transaction: candidate.transactionHash }),
    evidenceId: `evm:${candidate.network}:tx:${candidate.transactionHash}`,
    recognition: spotSaleRecognition({ transactionHash: candidate.transactionHash, gateway: GATEWAY }),
  }));

  const derived = derive({
    settlements,
    receiver,
    gateway: GATEWAY,
    asOf: observedAt.slice(0, 10),
  });

  const record = {
    type: RECORD_OBJECT_KIND,
    version: 1,
    observedAt,
    network: observed.network,
    gateway: GATEWAY,
    receiver,
    fromBlock: observed.fromBlock,
    toBlock: observed.toBlock,
    windowBlocks,
    windowDiscovery,
    settlementCount: settlements.length,
    disagreements: observed.disagreements,
    settlements: settlements.map(({ transactionHash, payer, amount, blockTime, witnessGraphId, evidenceId, recognition }) => (
      { hash: transactionHash, payer, amount, blockTime, witnessGraphId, evidenceId, recognition }
    )),
    transactionCount: derived.transactionCount,
    refusals: derived.refusals,
    beancountTransactionCandidates: derived.transactions.map((transaction) => transaction.directive),
    gatewayAttributionLimitation: GATEWAY_ATTRIBUTION_LIMITATION,
    recognitionLimitation: RECOGNITION_LIMITATION,
  };

  let journaled = null;
  if (values["dry-run"] !== true) {
    const journal = createJournal({ root, objectKind: RECORD_OBJECT_KIND });
    journaled = journal.record({
      category: RECORD_CATEGORY,
      record,
      recordedAt: observedAt,
      told: { for: true, against: observed.disagreements.length > 0 },
    });
    await writeDatedRecord(
      { ...record, journalId: journaled.id },
      { recordsDir: `${root}/data/settlement-derivation/records`, filename: datedRecordFilename(observedAt) },
    );
  }

  const summary = {
    ok: true,
    observedAt,
    network: observed.network,
    windowBlocks,
    fromBlock: observed.fromBlock,
    toBlock: observed.toBlock,
    settlementCount: settlements.length,
    disagreements: observed.disagreements.length,
    transactionCount: derived.transactionCount,
    refusals: derived.refusals.length,
    journaled: journaled != null,
    recordId: journaled?.id ?? null,
  };
  stdout.write(`${JSON.stringify(summary)}\n`);
  return { ok: true, exitCode: 0, summary, record };
}

if (import.meta.main) {
  const { exitCode } = await recordSetOfX402SettlementCandidates();
  process.exitCode = exitCode;
}
