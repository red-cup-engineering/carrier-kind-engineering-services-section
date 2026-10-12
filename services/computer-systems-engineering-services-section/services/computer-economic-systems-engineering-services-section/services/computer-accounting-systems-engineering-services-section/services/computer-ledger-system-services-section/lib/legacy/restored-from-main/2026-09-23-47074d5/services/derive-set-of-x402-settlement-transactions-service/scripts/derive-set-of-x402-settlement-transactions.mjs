#!/usr/bin/env node
import { divideDecimalStrings, multiplyDecimalStrings, negateDecimalString } from "@red-cup-engineering/computer-ledger-system-services-section/src/decimal.mjs";

const TRANSACTION_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/u;
const ATOMIC_AMOUNT_PATTERN = /^[0-9]+$/u;
const DEFAULT_NETWORK = "eip155:8453";
const USDC_ATOMIC_UNIT_SCALE = "1000000";
const USDC_DECIMALS = 6;
const BASE_USDC_ASSET_ACCOUNT = "Assets:Digital-Assets:EVM:Base:Tokens";
const BASE_USDC_COMMODITY = "USDC";
const INCOME_ACCOUNT_PREFIX = "Income:Sales:X402:";

function capitalizeAccountComponent(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function incomeAccountFor(gateway) {
  return `${INCOME_ACCOUNT_PREFIX}${capitalizeAccountComponent(gateway)}`;
}

function renderMetadataLines(metadata) {
  return Object.entries(metadata)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `  ${k}: "${v}"`);
}

function renderTransaction({ date, narration, metadata, postings }) {
  const lines = [`${date} * "${narration}"`, ...renderMetadataLines(metadata)];
  for (const p of postings) lines.push(`  ${p.account}  ${p.amount} ${p.commodity}`);
  return lines.join("\n");
}

function findUsdcPrice(priceDirectives, date) {
  const candidates = (Array.isArray(priceDirectives) ? priceDirectives : [])
    .filter((row) => row?.symbol === "USDC" && typeof row?.date === "string" && row.date <= date)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return candidates.length > 0 ? candidates[0].price : null;
}

function validateSettlement(settlement) {
  if (typeof settlement?.transactionHash !== "string" || !TRANSACTION_HASH_PATTERN.test(settlement.transactionHash)) {
    throw new TypeError("derive-set-of-x402-settlement-transactions: settlement.transactionHash must be a 0x-prefixed 32-byte hash");
  }
  if (typeof settlement.payer !== "string" || settlement.payer === "") {
    throw new TypeError("derive-set-of-x402-settlement-transactions: settlement.payer must be a non-empty string");
  }
  if (typeof settlement.amount !== "string" || !ATOMIC_AMOUNT_PATTERN.test(settlement.amount)) {
    throw new TypeError("derive-set-of-x402-settlement-transactions: settlement.amount must be a non-negative atomic-unit digit string");
  }
  if (typeof settlement.blockTime !== "string" || !ISO_DATETIME_PATTERN.test(settlement.blockTime)) {
    throw new TypeError("derive-set-of-x402-settlement-transactions: settlement.blockTime must be an ISO-8601 UTC timestamp");
  }
  if (settlement.network !== undefined && typeof settlement.network !== "string") {
    throw new TypeError("derive-set-of-x402-settlement-transactions: settlement.network must be a string when given");
  }
}

function normalizeHex(value, field) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]+$/u.test(value)) throw new TypeError(`derive-set-of-x402-settlement-transactions: ${field} must be hexadecimal`);
  return value.toLowerCase();
}

function normalizedLogIndex(value) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value === "string" && /^(0|[1-9][0-9]*|0x[0-9a-fA-F]+)$/u.test(value)) return BigInt(value).toString();
  throw new TypeError("derive-set-of-x402-settlement-transactions: settlement.logIndex must be a non-negative decimal or hexadecimal integer");
}

function recognitionOf(value) {
  if (!value || typeof value !== "object" || !["revenue", "advance", "receivable-collection"].includes(value.kind) || typeof value.account !== "string" || value.account === "") return null;
  if (value.kind === "revenue" && typeof value.contractId === "string" && value.contractId && typeof value.performanceId === "string" && value.performanceId) return value;
  if (value.kind === "advance" && typeof value.contractId === "string" && value.contractId) return value;
  if (value.kind === "receivable-collection" && typeof value.invoiceId === "string" && value.invoiceId) return value;
  return null;
}

/**
 * Derive Beancount transaction candidates for a set of chain-read x402 USDC settlements to one
 * gateway's receiver, converting each settlement's atomic USDC amount to an exact decimal and
 * posting it to that gateway's `Income:Sales:X402:<Gateway>` account against the shared Base
 * USDC asset account, `Assets:Digital-Assets:EVM:Base:Tokens`. A settlement is booked only when
 * it carries a second witness -- the `witnessGraphId` computed by
 * `@red-cup-engineering/x402-settlement-witness-identity` from its (network, transactionHash) --
 * beside the chain-read observation itself; a settlement missing that second witness is refused,
 * never booked and never treated as a zero amount. When `input.settlements` is empty, the
 * gateway's income account (and the shared asset account, when not already open) are still
 * derived for opening, dated `input.asOf`.
 * @param {{ settlements: readonly object[], receiver: string, gateway: string,
 *   priceDirectives?: readonly object[], openAccounts?: readonly string[], asOf?: string }} input
 * @returns {{ type: "X402SettlementTransactionSet", version: 1, gateway: string, receiver: string,
 *   assetAccount: string, incomeAccount: string, transactionCount: number,
 *   transactions: readonly object[], accountsToOpen: readonly object[], refusals: readonly object[] }}
 * @throws {TypeError} When `input.settlements` is not an array, `input.receiver`/`input.gateway`
 *   is not a non-empty string, or a settlement carrying a witness is otherwise malformed.
 * @throws {RangeError} When `input.settlements` is empty and `input.asOf` is not a `YYYY-MM-DD` string.
 */
export function deriveSetOfX402SettlementTransactions(input) {
  if (!input || typeof input !== "object" || !Array.isArray(input.settlements)) {
    throw new TypeError("derive-set-of-x402-settlement-transactions: input.settlements must be an array");
  }
  if (typeof input.receiver !== "string" || input.receiver === "") {
    throw new TypeError("derive-set-of-x402-settlement-transactions: input.receiver must be a non-empty string");
  }
  if (typeof input.gateway !== "string" || input.gateway === "") {
    throw new TypeError("derive-set-of-x402-settlement-transactions: input.gateway must be a non-empty string");
  }
  const openAccounts = new Set(Array.isArray(input.openAccounts) ? input.openAccounts : []);
  const incomeAccount = incomeAccountFor(input.gateway);
  const accountsToOpenByName = new Map();
  const noteOpen = (account, date) => {
    if (!openAccounts.has(account) && !accountsToOpenByName.has(account)) {
      accountsToOpenByName.set(account, { account, date, directive: `${date} open ${account}` });
    }
  };

  if (input.settlements.length === 0) {
    if (typeof input.asOf !== "string" || !DATE_PATTERN.test(input.asOf)) {
      throw new RangeError("derive-set-of-x402-settlement-transactions: input.asOf must be a YYYY-MM-DD string when input.settlements is empty");
    }
    noteOpen(incomeAccount, input.asOf);
    noteOpen(BASE_USDC_ASSET_ACCOUNT, input.asOf);
    return Object.freeze({
      type: "X402SettlementTransactionSet", version: 1, gateway: input.gateway, receiver: input.receiver,
      assetAccount: BASE_USDC_ASSET_ACCOUNT, incomeAccount, transactionCount: 0,
      transactions: Object.freeze([]), accountsToOpen: Object.freeze([...accountsToOpenByName.values()]),
      refusals: Object.freeze([]),
    });
  }

  const transactions = [];
  const refusals = [];
  for (const settlement of input.settlements) {
    if (typeof settlement?.witnessGraphId !== "string" || settlement.witnessGraphId === "") {
      refusals.push({ transactionHash: settlement?.transactionHash ?? null, reason: "missing-second-witness" });
      continue;
    }
    validateSettlement(settlement);
    const recognition = recognitionOf(settlement.recognition);
    if (!recognition || typeof settlement.evidenceId !== "string" || settlement.evidenceId === "") { refusals.push({ transactionHash: settlement.transactionHash, reason: "missing-recognition-or-evidence" }); continue; }
    const network = settlement.network ?? DEFAULT_NETWORK;
    if (network !== DEFAULT_NETWORK || normalizeHex(settlement.asset ?? "", "settlement.asset") !== "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" || normalizeHex(settlement.receiver ?? "", "settlement.receiver") !== normalizeHex(input.receiver, "receiver")) { refusals.push({ transactionHash: settlement.transactionHash, reason: "event-binding-mismatch" }); continue; }
    const logIndex = normalizedLogIndex(settlement.logIndex);
    const date = settlement.blockTime.slice(0, 10);
    const amount = divideDecimalStrings(settlement.amount, USDC_ATOMIC_UNIT_SCALE, USDC_DECIMALS);
    noteOpen(recognition.account, date);
    noteOpen(BASE_USDC_ASSET_ACCOUNT, date);
    const usdcPrice = findUsdcPrice(input.priceDirectives, date);
    const amountUsd = usdcPrice === null ? null : multiplyDecimalStrings(amount, usdcPrice, 2);
    const metadata = {
      source_id: `evm:${network}:${normalizeHex(settlement.asset, "settlement.asset")}:${normalizeHex(settlement.receiver, "settlement.receiver")}:${normalizeHex(settlement.transactionHash, "settlement.transactionHash")}:${logIndex}`, payer: settlement.payer, network,
      witness_graph_id: settlement.witnessGraphId, evidence_ids: JSON.stringify([settlement.evidenceId]), gateway: input.gateway, receiver: input.receiver, recognition: recognition.kind,
    };
    const postings = [
      { account: BASE_USDC_ASSET_ACCOUNT, amount, commodity: BASE_USDC_COMMODITY },
      { account: recognition.account, amount: negateDecimalString(amount), commodity: BASE_USDC_COMMODITY },
    ];
    const narration = `x402 ${recognition.kind} via ${input.gateway}`;
    const directive = renderTransaction({ date, narration, metadata, postings });
    transactions.push({
      date, narration, transactionHash: settlement.transactionHash, network, payer: settlement.payer,
      amount, amountUsd, witnessGraphId: settlement.witnessGraphId, directive,
    });
  }

  return Object.freeze({
    type: "X402SettlementTransactionSet", version: 1, gateway: input.gateway, receiver: input.receiver,
    assetAccount: BASE_USDC_ASSET_ACCOUNT, incomeAccount, transactionCount: transactions.length,
    transactions: Object.freeze(transactions), accountsToOpen: Object.freeze([...accountsToOpenByName.values()]),
    refusals: Object.freeze(refusals),
  });
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "deriveSetOfX402SettlementTransactions — Derive Beancount transaction candidates for a set of chain-read x402 USDC settlements to one gateway's receiver, converting each settlement's atomic USDC amount to an exact decimal and posting it to that gateway's `Income:Sales:X402:<Gateway>` account against the shared Base USDC asset account, `Assets:Digital-Assets:EVM:Base:Tokens`. A settlement is booked only when it carries a second witness -- the `witnessGraphId` computed by `@red-cup-engineering/x402-settlement-witness-identity` from its (network, transactionHash) -- beside the chain-read observation itself; a settlement missing that second witness is refused, never booked and never treated as a zero amount. When `input.settlements` is empty, the gateway's income account (and the shared asset account, when not already open) are still derived for opening, dated `input.asOf`.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    try {
      process.stdout.write(`${JSON.stringify(deriveSetOfX402SettlementTransactions(JSON.parse(text)), null, 2)}\n`);
    } catch (error) {
      process.stderr.write(`${JSON.stringify({ error: error.message })}\n`);
      process.exit(2);
    }
  }
}
