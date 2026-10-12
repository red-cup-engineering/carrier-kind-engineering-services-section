# derive-set-of-x402-settlement-transactions
## Requirements
- `two-witness-settlement`: A settlement without a non-empty `witnessGraphId` -- the settlement-witness identity computed by `@red-cup-engineering/x402-settlement-witness-identity` from its `(network, transactionHash)` pair -- must be refused (listed under `refusals` with reason `missing-second-witness`) and never booked. The chain-read entry itself is the first witness; an entry present in `input.settlements` without its witness identity is one witness short of settled and must never be treated as a zero amount or silently dropped.
- `exact-atomic-usdc-conversion`: Every settlement's atomic-unit `amount` (a base-10 digit string, USDC's 6 decimals) must be converted to a plain decimal string via `@red-cup-engineering/computer-ledger-system-services-section`'s `divideDecimalStrings(amount, "1000000", 6)`, never through a JavaScript floating-point number.
- `gateway-income-posting`: A booked settlement must post its exact decimal USDC amount to `Income:Sales:X402:<Gateway>` (the gateway id with only its first character capitalized, matching `settle-hbd-purchase-service`'s existing `Income:Sales:X402:*` convention) against the shared Base USDC asset account `Assets:Digital-Assets:EVM:Base:Tokens` (the account this ledger already books Base USDC balances under).
- `open-only-when-missing`: The operation must emit an `open` directive for `Income:Sales:X402:<Gateway>` and for `Assets:Digital-Assets:EVM:Base:Tokens` only when each account name is absent from `input.openAccounts`, never for an account already listed there, and never twice for the same account.
- `derive-accounts-without-settlements`: When `input.settlements` is empty, the operation must still derive the canonical accounts a live gateway needs open (its income account, and the shared Base USDC asset account when not already open), dated `input.asOf`, so the books can be opened the day a gateway goes live even before its first sale.
- `settlement-metadata`: Every booked transaction's directive must carry `source_id` (the settlement's `transactionHash`), `payer`, `network`, `witness_graph_id`, `gateway`, and `receiver` as quoted string metadata lines.
- `usd-equivalent-when-priced`: When `input.priceDirectives` includes a `{symbol: "USDC", date, price}` row at or before a settlement's date, the operation must attach that settlement's `amountUsd` (via `multiplyDecimalStrings`, exact, 2 decimals) as informational data on the transaction record; it must never be posted as a second ledger leg, since USDC settles natively in its own commodity.
## Prohibitions
- `no-float-arithmetic`: The operation must not convert any decimal or atomic-unit amount through a JavaScript floating-point number; all arithmetic reuses `@red-cup-engineering/computer-ledger-system-services-section`'s exact BigInt-scaled decimal functions.
- `no-implicit-zero-on-missing-witness`: A settlement's missing second witness must never be represented as a zero-amount posting, and must never be dropped without a named entry under `refusals`.
- `no-open-without-asof`: The operation must throw a `RangeError` rather than silently open accounts undated or date them from the current clock (no `Date.now()` read inside the operation) when `input.settlements` is empty and `input.asOf` is not a valid `YYYY-MM-DD` string.
## Laws
- `eip-3009-authorization-settlement` | EIP-3009: Transfer with Authorization | final | https://eips.ethereum.org/EIPS/eip-3009 | Applies to `two-witness-settlement`, `no-implicit-zero-on-missing-witness`. | `transferWithAuthorization`'s `AuthorizationUsed` event is the settlement primitive x402's `exact` scheme uses on Base; the chain read of that event is one witness, and this operation additionally requires the settlement-witness identity computed from the same `(network, transaction)` pair before booking -- one witness never settles a payment.
- `beancount-total-cost-lots` | Beancount double-entry counting method | v3 | https://beancount.github.io/docs/the_double_entry_counting_method.html | Applies to `gateway-income-posting`, `open-only-when-missing`. | Every posted amount balances to zero across its transaction's postings, and an account must be opened by name before it is posted to.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation. | The operation depends only on Node's ESM runtime and the published `@red-cup-engineering/computer-ledger-system-services-section` decimal module.
- `caip-2-chain-id` | CAIP-2: Blockchain ID Specification | v1 | https://chainagnostic.org/CAIPs/caip-2 | Applies to the `network` field. | Base mainnet is named `eip155:8453`, the operation's default when a settlement omits `network`.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-set-of-x402-settlement-transactions-service","packageVersion":"0.1.0","license":"UNLICENSED","dependencies":{"@red-cup-engineering/computer-ledger-system-services-section":"0.6.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-set-of-x402-settlement-transactions.mjs
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

function incomeAccountFor(gateway) {
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
    const network = settlement.network ?? DEFAULT_NETWORK;
    const date = settlement.blockTime.slice(0, 10);
    const amount = divideDecimalStrings(settlement.amount, USDC_ATOMIC_UNIT_SCALE, USDC_DECIMALS);
    noteOpen(incomeAccount, date);
    noteOpen(BASE_USDC_ASSET_ACCOUNT, date);
    const usdcPrice = findUsdcPrice(input.priceDirectives, date);
    const amountUsd = usdcPrice === null ? null : multiplyDecimalStrings(amount, usdcPrice, 2);
    const metadata = {
      source_id: settlement.transactionHash, payer: settlement.payer, network,
      witness_graph_id: settlement.witnessGraphId, gateway: input.gateway, receiver: input.receiver,
    };
    const postings = [
      { account: BASE_USDC_ASSET_ACCOUNT, amount, commodity: BASE_USDC_COMMODITY },
      { account: incomeAccount, amount: negateDecimalString(amount), commodity: BASE_USDC_COMMODITY },
    ];
    const narration = `x402 sale via ${input.gateway}`;
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
```
## Tests
```mjs path=test/derive-set-of-x402-settlement-transactions.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfX402SettlementTransactions } from "../scripts/derive-set-of-x402-settlement-transactions.mjs";

const WITNESS_ID = "ni:///sha-256;abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHI";
const TX_HASH = `0x${"a".repeat(64)}`;

test("refuses a non-array settlements input", () => {
  assert.throws(() => deriveSetOfX402SettlementTransactions({ receiver: "r", gateway: "g" }), /input\.settlements must be an array/u);
});

test("throws when receiver is missing", () => {
  assert.throws(() => deriveSetOfX402SettlementTransactions({ settlements: [], gateway: "g", asOf: "2026-09-05" }), /input\.receiver must be a non-empty string/u);
});

test("throws when gateway is missing", () => {
  assert.throws(() => deriveSetOfX402SettlementTransactions({ settlements: [], receiver: "r", asOf: "2026-09-05" }), /input\.gateway must be a non-empty string/u);
});

test("throws a RangeError when settlements is empty and asOf is missing", () => {
  assert.throws(() => deriveSetOfX402SettlementTransactions({ settlements: [], receiver: "r", gateway: "public-solar" }), RangeError);
});

test("an empty settlement set still derives the gateway's income and shared asset accounts to open, dated asOf", () => {
  const result = deriveSetOfX402SettlementTransactions({ settlements: [], receiver: "r", gateway: "public-solar", asOf: "2026-09-05" });
  assert.equal(result.transactionCount, 0);
  assert.deepEqual(result.refusals, []);
  const accounts = result.accountsToOpen.map((a) => a.account);
  assert.ok(accounts.includes("Income:Sales:X402:Salt-pan-solar"));
  assert.ok(accounts.includes("Assets:Digital-Assets:EVM:Base:Tokens"));
  assert.ok(result.accountsToOpen.every((a) => a.date === "2026-09-05"));
});

test("an already-open shared asset account is not re-opened when settlements is empty", () => {
  const result = deriveSetOfX402SettlementTransactions({
    settlements: [], receiver: "r", gateway: "public-solar", asOf: "2026-09-05",
    openAccounts: ["Assets:Digital-Assets:EVM:Base:Tokens"],
  });
  const accounts = result.accountsToOpen.map((a) => a.account);
  assert.deepEqual(accounts, ["Income:Sales:X402:Salt-pan-solar"]);
});

test("a settlement missing witnessGraphId is refused, never booked, and opens no account", () => {
  const result = deriveSetOfX402SettlementTransactions({
    receiver: "r", gateway: "public-solar",
    settlements: [{ transactionHash: TX_HASH, payer: "0xpayer", amount: "510000", blockTime: "2026-09-05T14:00:00Z" }],
  });
  assert.equal(result.transactionCount, 0);
  assert.equal(result.accountsToOpen.length, 0);
  assert.deepEqual(result.refusals, [{ transactionHash: TX_HASH, reason: "missing-second-witness" }]);
});

test("a two-witness settlement books the exact decimal amount against the shared Base USDC account", () => {
  const result = deriveSetOfX402SettlementTransactions({
    receiver: "r", gateway: "public-solar", openAccounts: ["Assets:Digital-Assets:EVM:Base:Tokens"],
    settlements: [{ transactionHash: TX_HASH, payer: "0xpayer", amount: "510000", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID }],
  });
  assert.equal(result.transactionCount, 1);
  assert.deepEqual(result.refusals, []);
  const [tx] = result.transactions;
  assert.equal(tx.amount, "0.51");
  assert.equal(tx.date, "2026-09-05");
  assert.match(tx.directive, /Assets:Digital-Assets:EVM:Base:Tokens {2}0\.51 USDC/u);
  assert.match(tx.directive, /Income:Sales:X402:Salt-pan-solar {2}-0\.51 USDC/u);
  assert.deepEqual(result.accountsToOpen.map((a) => a.account), ["Income:Sales:X402:Salt-pan-solar"]);
});

test("every booked transaction carries source_id, payer, network, witness_graph_id, gateway, and receiver metadata", () => {
  const result = deriveSetOfX402SettlementTransactions({
    receiver: "base:0xreceiver", gateway: "public-solar",
    settlements: [{ transactionHash: TX_HASH, payer: "0xpayer", amount: "1000000", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID }],
  });
  const [tx] = result.transactions;
  for (const line of [
    `source_id: "${TX_HASH}"`, 'payer: "0xpayer"', 'network: "eip155:8453"',
    `witness_graph_id: "${WITNESS_ID}"`, 'gateway: "public-solar"', 'receiver: "base:0xreceiver"',
  ]) assert.ok(tx.directive.includes(line), `expected directive to include ${line}`);
});

test("a settlement's own network overrides the eip155:8453 default", () => {
  const result = deriveSetOfX402SettlementTransactions({
    receiver: "r", gateway: "g",
    settlements: [{ transactionHash: TX_HASH, payer: "p", amount: "1000000", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID, network: "eip155:1" }],
  });
  assert.equal(result.transactions[0].network, "eip155:1");
});

test("a matching USDC price directive attaches amountUsd without a second posting", () => {
  const result = deriveSetOfX402SettlementTransactions({
    receiver: "r", gateway: "g",
    settlements: [{ transactionHash: TX_HASH, payer: "p", amount: "2000000", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID }],
    priceDirectives: [{ symbol: "USDC", date: "2026-09-01", price: "1.00" }],
  });
  const [tx] = result.transactions;
  assert.equal(tx.amountUsd, "2");
  assert.equal((tx.directive.match(/USDC/gu) ?? []).length, 2);
});

test("no matching price directive leaves amountUsd null", () => {
  const result = deriveSetOfX402SettlementTransactions({
    receiver: "r", gateway: "g",
    settlements: [{ transactionHash: TX_HASH, payer: "p", amount: "2000000", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID }],
  });
  assert.equal(result.transactions[0].amountUsd, null);
});

test("a malformed transactionHash on a witnessed settlement throws TypeError", () => {
  assert.throws(() => deriveSetOfX402SettlementTransactions({
    receiver: "r", gateway: "g",
    settlements: [{ transactionHash: "not-a-hash", payer: "p", amount: "1", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID }],
  }), /transactionHash must be a 0x-prefixed 32-byte hash/u);
});

test("a non-digit amount on a witnessed settlement throws TypeError", () => {
  assert.throws(() => deriveSetOfX402SettlementTransactions({
    receiver: "r", gateway: "g",
    settlements: [{ transactionHash: TX_HASH, payer: "p", amount: "1.5", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID }],
  }), /amount must be a non-negative atomic-unit digit string/u);
});

test("accountsToOpen is deduplicated across multiple settlements to the same gateway", () => {
  const result = deriveSetOfX402SettlementTransactions({
    receiver: "r", gateway: "g",
    settlements: [
      { transactionHash: TX_HASH, payer: "p", amount: "1000000", blockTime: "2026-09-05T14:00:00Z", witnessGraphId: WITNESS_ID },
      { transactionHash: `0x${"b".repeat(64)}`, payer: "p", amount: "2000000", blockTime: "2026-09-06T14:00:00Z", witnessGraphId: WITNESS_ID },
    ],
  });
  assert.equal(result.transactionCount, 2);
  assert.equal(result.accountsToOpen.length, 2);
});
```
## Examples
```json name="a two-witness $0.51 USDC settlement books against the gateway's income account"
{"input":{"receiver":"base:0x0000000000000000000000000000000000EXA1","gateway":"public-solar","openAccounts":["Assets:Digital-Assets:EVM:Base:Tokens"],"settlements":[{"transactionHash":"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","payer":"0xpayer000000000000000000000000000000000","amount":"510000","blockTime":"2026-09-05T14:00:00Z","witnessGraphId":"ni:///sha-256;abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHI"}]},"output":{"type":"X402SettlementTransactionSet","version":1,"gateway":"public-solar","receiver":"base:0x0000000000000000000000000000000000EXA1","assetAccount":"Assets:Digital-Assets:EVM:Base:Tokens","incomeAccount":"Income:Sales:X402:Salt-pan-solar","transactionCount":1,"transactions":[{"date":"2026-09-05","narration":"x402 sale via public-solar","transactionHash":"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","network":"eip155:8453","payer":"0xpayer000000000000000000000000000000000","amount":"0.51","amountUsd":null,"witnessGraphId":"ni:///sha-256;abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHI","directive":"2026-09-05 * \"x402 sale via public-solar\"\n  source_id: \"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"\n  payer: \"0xpayer000000000000000000000000000000000\"\n  network: \"eip155:8453\"\n  witness_graph_id: \"ni:///sha-256;abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHI\"\n  gateway: \"public-solar\"\n  receiver: \"base:0x0000000000000000000000000000000000EXA1\"\n  Assets:Digital-Assets:EVM:Base:Tokens  0.51 USDC\n  Income:Sales:X402:Salt-pan-solar  -0.51 USDC"}],"accountsToOpen":[{"account":"Income:Sales:X402:Salt-pan-solar","date":"2026-09-05","directive":"2026-09-05 open Income:Sales:X402:Salt-pan-solar"}],"refusals":[]}}
```
## Traceability
- `two-witness-settlement` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eip-3009-authorization-settlement`
- `exact-atomic-usdc-conversion` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `gateway-income-posting` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `beancount-total-cost-lots`
- `open-only-when-missing` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `beancount-total-cost-lots`
- `derive-accounts-without-settlements` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `settlement-metadata` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `caip-2-chain-id`
- `usd-equivalent-when-priced` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-float-arithmetic` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-implicit-zero-on-missing-witness` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eip-3009-authorization-settlement`
- `no-open-without-asof` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `beancount-total-cost-lots`
