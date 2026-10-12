# derive-set-of-fill-transactions
## Requirements
- `fifo-cost-basis-lots`: The operation must maintain a FIFO cost-basis lot ledger keyed by custody-account and base-commodity across the chronologically ordered input fills: a `buy` fill opens a new lot whose total cost equals `quoteAmount`; a `sell` fill consumes lots oldest-first, prorating a partially-consumed lot's cost exactly by quantity.
- `total-cost-lot-syntax`: Every posting that opens or reduces a cost-basis lot must use Beancount's total-cost `{{...}}` syntax with the lot's exact total cost, never a per-unit cost computed by division, so no lot ever fails to reduce for want of an exact per-unit match.
- `realized-gain-or-loss-posting`: A `sell` fill must post the exact difference between `quoteAmount` and the FIFO cost consumed to `realizedGainAccount` (default `Income:Investment:Realized-Gains`) when non-negative, or to `realizedLossAccount` (default `Expenses:Investment:Realized-Losses`) when negative, with the income-account sign convention (a gain posts as a negative amount).
- `separate-fee-posting`: When a fill's `feeAmount` is nonzero, the operation must post it as two additional postings (a debit or credit on `custodyAccount` and the mirroring posting on `feeAccount`) distinct from `quoteAmount`, never netted into `quoteAmount` or the realized gain/loss.
- `witness-refusal`: A fill carrying two or more `witnesses` whose `databaseHash` values disagree must be refused (listed under `refusals` with reason `witness-disagreement`) and never booked or allowed to affect any lot.
- `source-and-witness-metadata`: Every booked transaction must carry the fill's `fillId` as `source_id`, plus `venue`, `account`, `mandate_id`, and, when present, `witness_block`, `witness_nodes`, and `witness_database_hash` metadata lines.
- `open-only-when-missing`: The operation must emit an `open` directive for any account it posts to (custody, fee, or realized gain/loss) only when that account's name is absent from the input's `openAccounts` list, never for an account already open, and never twice for the same account.
## Prohibitions
- `no-float-arithmetic`: The operation must not convert any decimal amount through a JavaScript floating-point number; all arithmetic reuses `@red-cup-engineering/computer-ledger-system-services-section`'s exact BigInt-scaled decimal functions.
- `no-cost-capitalization-of-explicit-fees`: A nonzero `feeAmount` must never be added into or subtracted from a lot's total cost or from the realized gain/loss computation; it is booked purely as the two additional fee postings.
- `no-booking-past-insufficient-inventory`: The operation must throw a `RangeError` rather than emit a partial or negative-quantity posting when a `sell` fill's `baseQuantity` exceeds the open lot inventory for its custody account and base commodity.
## Laws
- `beancount-total-cost-lots` | Beancount cost-basis and booking semantics | v3 | https://beancount.github.io/docs/the_double_entry_counting_method.html#cost-basis | Applies to `total-cost-lot-syntax` and `fifo-cost-basis-lots`. | A posting's total cost, given as `{{total}}`, is what Beancount matches against an existing lot on reduction; a reducing posting's balancing weight is computed from that cost, never from an accompanying `@` price, which is recorded for reporting only.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation. | The operation depends only on Node's ESM runtime and the published `@red-cup-engineering/computer-ledger-system-services-section` decimal module.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-set-of-fill-transactions-service","packageVersion":"0.1.0","license":"UNLICENSED","dependencies":{"@red-cup-engineering/computer-ledger-system-services-section":"0.3.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-set-of-fill-transactions.mjs
#!/usr/bin/env node
import { addDecimalStrings, divideDecimalStrings, multiplyDecimalStrings, parseDecimal } from "@red-cup-engineering/computer-ledger-system-services-section/src/decimal.mjs";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const ZERO_PATTERN = /^0(\.0+)?$/u;
const REALIZED_GAIN_ACCOUNT_DEFAULT = "Income:Investment:Realized-Gains";
const REALIZED_LOSS_ACCOUNT_DEFAULT = "Expenses:Investment:Realized-Losses";

function isZero(text) {
  return ZERO_PATTERN.test(text.startsWith("-") ? text.slice(1) : text);
}

function negate(text) {
  if (isZero(text)) return text;
  return text.startsWith("-") ? text.slice(1) : `-${text}`;
}

function isNonNegativeDecimal(text) {
  try {
    const { negative } = parseDecimal(text);
    return !negative || isZero(text);
  } catch {
    return false;
  }
}

function renderMetadataLines(metadata) {
  return Object.entries(metadata)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `  ${k}: "${v}"`);
}

function witnessesAgree(witnesses) {
  if (!Array.isArray(witnesses) || witnesses.length < 2) return true;
  const first = witnesses[0].databaseHash;
  return witnesses.every((w) => w.databaseHash === first);
}

function validateFill(fill) {
  const required = [
    "venue", "account", "fillId", "date", "side", "baseCommodity", "quoteCommodity",
    "baseQuantity", "quoteAmount", "custodyAccount", "mandateId",
  ];
  for (const key of required) {
    if (typeof fill[key] !== "string" || fill[key] === "") {
      throw new TypeError(`derive-set-of-fill-transactions: fill.${key} must be a non-empty string`);
    }
  }
  if (fill.side !== "buy" && fill.side !== "sell") {
    throw new TypeError(`derive-set-of-fill-transactions: fill.side must be "buy" or "sell", got ${JSON.stringify(fill.side)}`);
  }
  if (!DATE_PATTERN.test(fill.date)) {
    throw new TypeError(`derive-set-of-fill-transactions: fill.date must be YYYY-MM-DD, got ${JSON.stringify(fill.date)}`);
  }
  if (!isNonNegativeDecimal(fill.baseQuantity) || isZero(fill.baseQuantity)) {
    throw new TypeError(`derive-set-of-fill-transactions: fill.baseQuantity must be a positive decimal string`);
  }
  if (!isNonNegativeDecimal(fill.quoteAmount) || isZero(fill.quoteAmount)) {
    throw new TypeError(`derive-set-of-fill-transactions: fill.quoteAmount must be a positive decimal string`);
  }
  const feeAmount = fill.feeAmount ?? "0";
  if (!isNonNegativeDecimal(feeAmount)) {
    throw new TypeError(`derive-set-of-fill-transactions: fill.feeAmount must be a non-negative decimal string`);
  }
  if (!isZero(feeAmount) && typeof fill.feeCommodity !== "string") {
    throw new TypeError(`derive-set-of-fill-transactions: fill.feeCommodity is required when fill.feeAmount is nonzero`);
  }
  if (!isZero(feeAmount) && typeof fill.feeAccount !== "string") {
    throw new TypeError(`derive-set-of-fill-transactions: fill.feeAccount is required when fill.feeAmount is nonzero`);
  }
}

function renderCostAnnotation(cost, costCommodity) {
  const open = "{".concat("{");
  const close = "}".concat("}");
  return " ".concat(open, cost, " ", costCommodity, close);
}

function renderTransaction({ date, narration, metadata, postings }) {
  const lines = [`${date} * "${narration}"`, ...renderMetadataLines(metadata)];
  for (const p of postings) {
    const priceSuffix = p.price ? ` @ ${p.price} ${p.priceCommodity}` : "";
    lines.push(p.cost
      ? `  ${p.account}  ${p.amount} ${p.commodity}${renderCostAnnotation(p.cost, p.costCommodity)}${priceSuffix}`
      : `  ${p.account}  ${p.amount} ${p.commodity}`);
  }
  return lines.join("\n");
}

/**
 * Derive Beancount transactions for a chronologically ordered set of venue fills, opening a
 * FIFO cost-basis lot per custody-account/base-commodity pair on each buy, consuming lots
 * exactly on each sell and posting the realized gain or loss against the settled proceeds, and
 * refusing any fill whose supplied witness nodes disagree on `databaseHash` without booking it.
 * @param {{ fills: readonly object[], openAccounts?: readonly string[],
 *   realizedGainAccount?: string, realizedLossAccount?: string }} input
 * @returns {{ type: "VenueFillTransactionSet", version: 1, transactionCount: number,
 *   transactions: readonly object[], accountsToOpen: readonly object[], refusals: readonly object[] }}
 * @throws {TypeError} When `input.fills` is not an array or a fill is malformed.
 * @throws {RangeError} When a sell fill's `baseQuantity` exceeds the open lot inventory for its custody account and base commodity.
 */
export function deriveSetOfFillTransactions(input) {
  if (!input || typeof input !== "object" || !Array.isArray(input.fills)) {
    throw new TypeError("derive-set-of-fill-transactions: input.fills must be an array");
  }
  const openAccounts = new Set(Array.isArray(input.openAccounts) ? input.openAccounts : []);
  const realizedGainAccount = input.realizedGainAccount ?? REALIZED_GAIN_ACCOUNT_DEFAULT;
  const realizedLossAccount = input.realizedLossAccount ?? REALIZED_LOSS_ACCOUNT_DEFAULT;
  const accountsToOpenByName = new Map();
  const noteOpen = (account, date) => {
    if (!openAccounts.has(account) && !accountsToOpenByName.has(account)) {
      accountsToOpenByName.set(account, { account, date, directive: `${date} open ${account}` });
    }
  };
  const lotsByKey = new Map();
  const transactions = [];
  const refusals = [];

  for (const fill of input.fills) {
    if (!witnessesAgree(fill.witnesses)) {
      refusals.push({ fillId: fill.fillId, reason: "witness-disagreement", witnesses: fill.witnesses });
      continue;
    }
    validateFill(fill);
    const feeAmount = fill.feeAmount ?? "0";
    const key = `${fill.custodyAccount}::${fill.baseCommodity}::${fill.quoteCommodity}`;
    const metadata = {
      source_id: fill.fillId,
      venue: fill.venue,
      account: fill.account,
      mandate_id: fill.mandateId,
      witness_block: fill.witnessBlock,
      witness_nodes: Array.isArray(fill.witnesses) ? fill.witnesses.map((w) => w.node).join(",") : undefined,
      witness_database_hash: Array.isArray(fill.witnesses) && fill.witnesses.length > 0 ? fill.witnesses[0].databaseHash : undefined,
    };

    if (fill.side === "buy") {
      noteOpen(fill.custodyAccount, fill.date);
      const postings = [
        { account: fill.custodyAccount, amount: negate(fill.quoteAmount), commodity: fill.quoteCommodity },
      ];
      if (!isZero(feeAmount)) {
        noteOpen(fill.feeAccount, fill.date);
        postings.push({ account: fill.custodyAccount, amount: negate(feeAmount), commodity: fill.feeCommodity });
        postings.push({ account: fill.feeAccount, amount: feeAmount, commodity: fill.feeCommodity });
      }
      postings.push({
        account: fill.custodyAccount, amount: fill.baseQuantity, commodity: fill.baseCommodity,
        cost: fill.quoteAmount, costCommodity: fill.quoteCommodity,
      });
      const narration = fill.narration ?? `${fill.venue} ${fill.side} ${fill.baseCommodity} for ${fill.quoteCommodity}`;
      const directive = renderTransaction({ date: fill.date, narration, metadata, postings });
      const lots = lotsByKey.get(key) ?? [];
      lots.push({ quantity: fill.baseQuantity, totalCost: fill.quoteAmount, fillId: fill.fillId, date: fill.date });
      lotsByKey.set(key, lots);
      transactions.push({
        date: fill.date, narration, fillId: fill.fillId, side: fill.side,
        baseCommodity: fill.baseCommodity, quoteCommodity: fill.quoteCommodity,
        baseQuantity: fill.baseQuantity, quoteAmount: fill.quoteAmount, directive,
      });
      continue;
    }

    // sell: consume FIFO lots for `key`
    const lots = lotsByKey.get(key) ?? [];
    let remaining = fill.baseQuantity;
    let totalCostConsumed = "0";
    const consumedLots = [];
    while (!isZero(remaining) && lots.length > 0) {
      const lot = lots[0];
      // sign of (lot.quantity - remaining) decides whether this lot fully covers the remainder
      const lotCoversRemainder = (() => {
        const diff = addDecimalStrings([lot.quantity, negate(remaining)]);
        return diff.startsWith("-") || isZero(diff);
      })();
      if (lotCoversRemainder) {
        totalCostConsumed = addDecimalStrings([totalCostConsumed, lot.totalCost]);
        consumedLots.push({ fillId: lot.fillId, quantity: lot.quantity, cost: lot.totalCost });
        remaining = addDecimalStrings([remaining, negate(lot.quantity)]);
        lots.shift();
      } else {
        const costPerUnit = divideDecimalStrings(lot.totalCost, lot.quantity, 12);
        const partialCost = multiplyDecimalStrings(costPerUnit, remaining, 12);
        totalCostConsumed = addDecimalStrings([totalCostConsumed, partialCost]);
        consumedLots.push({ fillId: lot.fillId, quantity: remaining, cost: partialCost });
        lot.quantity = addDecimalStrings([lot.quantity, negate(remaining)]);
        lot.totalCost = addDecimalStrings([lot.totalCost, negate(partialCost)]);
        remaining = "0";
      }
    }
    if (!isZero(remaining)) {
      throw new RangeError(`derive-set-of-fill-transactions: insufficient lot inventory for ${key}: short by ${remaining}`);
    }
    lotsByKey.set(key, lots);

    const realized = addDecimalStrings([fill.quoteAmount, negate(totalCostConsumed)]);
    const gainAccount = realized.startsWith("-") ? realizedLossAccount : realizedGainAccount;
    const gainPostingAmount = negate(realized);
    noteOpen(gainAccount, fill.date);
    const price = divideDecimalStrings(fill.quoteAmount, fill.baseQuantity, 8);

    const postings = [
      {
        account: fill.custodyAccount, amount: negate(fill.baseQuantity), commodity: fill.baseCommodity,
        cost: totalCostConsumed, costCommodity: fill.quoteCommodity, price, priceCommodity: fill.quoteCommodity,
      },
      { account: fill.custodyAccount, amount: fill.quoteAmount, commodity: fill.quoteCommodity },
    ];
    if (!isZero(feeAmount)) {
      noteOpen(fill.feeAccount, fill.date);
      postings.push({ account: fill.custodyAccount, amount: negate(feeAmount), commodity: fill.feeCommodity });
      postings.push({ account: fill.feeAccount, amount: feeAmount, commodity: fill.feeCommodity });
    }
    postings.push({ account: gainAccount, amount: gainPostingAmount, commodity: fill.quoteCommodity });
    const narration = fill.narration ?? `${fill.venue} ${fill.side} ${fill.baseCommodity} for ${fill.quoteCommodity}`;
    const directive = renderTransaction({ date: fill.date, narration, metadata, postings });
    transactions.push({
      date: fill.date, narration, fillId: fill.fillId, side: fill.side,
      baseCommodity: fill.baseCommodity, quoteCommodity: fill.quoteCommodity,
      baseQuantity: fill.baseQuantity, quoteAmount: fill.quoteAmount,
      costBasisConsumed: totalCostConsumed, realized, realizedAccount: gainAccount,
      consumedLots, directive,
    });
  }

  return Object.freeze({
    type: "VenueFillTransactionSet",
    version: 1,
    transactionCount: transactions.length,
    transactions: Object.freeze(transactions),
    accountsToOpen: Object.freeze([...accountsToOpenByName.values()]),
    refusals: Object.freeze(refusals),
  });
}

if (import.meta.main) {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  try {
    process.stdout.write(`${JSON.stringify(deriveSetOfFillTransactions(JSON.parse(text)), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ error: error.message })}\n`);
    process.exit(2);
  }
}
```
## Tests
```mjs path=test/derive-set-of-fill-transactions.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfFillTransactions } from "../scripts/derive-set-of-fill-transactions.mjs";

test("refuses a non-array fills input", () => {
  assert.throws(() => deriveSetOfFillTransactions({}), /input\.fills must be an array/u);
});

test("a buy opens a cost-basis lot and a sell against it posts the realized gain", () => {
  const result = deriveSetOfFillTransactions({
    openAccounts: ["Assets:X", "Income:Investment:Realized-Gains"],
    fills: [
      {
        venue: "hive-engine", account: "michael561", fillId: "BUY-1", date: "2026-09-05", side: "buy",
        baseCommodity: "GLD", quoteCommodity: "SWAP.HIVE", baseQuantity: "4.1917", quoteAmount: "0.99502065",
        custodyAccount: "Assets:X", mandateId: "manual",
      },
      {
        venue: "hive-engine", account: "michael561", fillId: "SELL-1", date: "2026-09-05", side: "sell",
        baseCommodity: "GLD", quoteCommodity: "SWAP.HIVE", baseQuantity: "4.1917", quoteAmount: "1.02172637",
        custodyAccount: "Assets:X", mandateId: "manual",
      },
    ],
  });
  assert.equal(result.transactionCount, 2);
  const [buy, sell] = result.transactions;
  assert.match(buy.directive, /Assets:X {2}4\.1917 GLD \{\{0\.99502065 SWAP\.HIVE\}\}/u);
  assert.equal(sell.costBasisConsumed, "0.99502065");
  assert.equal(sell.realized, "0.02670572");
  assert.equal(sell.realizedAccount, "Income:Investment:Realized-Gains");
  assert.match(sell.directive, /Income:Investment:Realized-Gains {2}-0\.02670572 SWAP\.HIVE/u);
});

test("a loss on a closing fill posts to the loss account", () => {
  const result = deriveSetOfFillTransactions({
    fills: [
      { venue: "v", account: "a", fillId: "B1", date: "2026-09-01", side: "buy",
        baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "10",
        custodyAccount: "Assets:X", mandateId: "m" },
      { venue: "v", account: "a", fillId: "S1", date: "2026-09-02", side: "sell",
        baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "7",
        custodyAccount: "Assets:X", mandateId: "m" },
    ],
  });
  const sell = result.transactions[1];
  assert.equal(sell.realized, "-3");
  assert.equal(sell.realizedAccount, "Expenses:Investment:Realized-Losses");
  assert.match(sell.directive, /Expenses:Investment:Realized-Losses {2}3 USD/u);
});

test("an explicit fee posts to the fee account on both sides without altering the cost basis of the other leg", () => {
  const buy = deriveSetOfFillTransactions({
    fills: [{
      venue: "alpaca", account: "esther", fillId: "F1", date: "2026-09-05", side: "buy",
      baseCommodity: "AAPL", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "100",
      feeAmount: "1", feeCommodity: "USD", feeAccount: "Expenses:Investment:Fees:Alpaca",
      custodyAccount: "Assets:Brk", mandateId: "m",
    }],
  }).transactions[0];
  assert.match(buy.directive, /Expenses:Investment:Fees:Alpaca {2}1 USD/u);

  const sell = deriveSetOfFillTransactions({
    fills: [
      { venue: "alpaca", account: "esther", fillId: "F1", date: "2026-09-05", side: "buy",
        baseCommodity: "AAPL", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "100",
        custodyAccount: "Assets:Brk", mandateId: "m" },
      { venue: "alpaca", account: "esther", fillId: "F2", date: "2026-09-06", side: "sell",
        baseCommodity: "AAPL", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "110",
        feeAmount: "1", feeCommodity: "USD", feeAccount: "Expenses:Investment:Fees:Alpaca",
        custodyAccount: "Assets:Brk", mandateId: "m" },
    ],
  }).transactions[1];
  assert.equal(sell.realized, "10");
  assert.match(sell.directive, /Assets:Brk {2}110 USD/u);
  assert.match(sell.directive, /Expenses:Investment:Fees:Alpaca {2}1 USD/u);
});

test("a sell exceeding the open lot inventory throws", () => {
  assert.throws(() => deriveSetOfFillTransactions({
    fills: [{ venue: "v", account: "a", fillId: "S1", date: "2026-09-05", side: "sell",
      baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "1",
      custodyAccount: "Assets:X", mandateId: "m" }],
  }), /insufficient lot inventory/u);
});

test("a sell partially consumes across two FIFO lots, prorating cost exactly", () => {
  const result = deriveSetOfFillTransactions({
    fills: [
      { venue: "v", account: "a", fillId: "B1", date: "2026-09-01", side: "buy",
        baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "2", quoteAmount: "20",
        custodyAccount: "Assets:X", mandateId: "m" },
      { venue: "v", account: "a", fillId: "B2", date: "2026-09-02", side: "buy",
        baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "3", quoteAmount: "33",
        custodyAccount: "Assets:X", mandateId: "m" },
      { venue: "v", account: "a", fillId: "S1", date: "2026-09-03", side: "sell",
        baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "3", quoteAmount: "36",
        custodyAccount: "Assets:X", mandateId: "m" },
    ],
  });
  const sell = result.transactions[2];
  assert.equal(sell.costBasisConsumed, "31");
  assert.equal(sell.realized, "5");
  assert.deepEqual(sell.consumedLots, [
    { fillId: "B1", quantity: "2", cost: "20" },
    { fillId: "B2", quantity: "1", cost: "11" },
  ]);
});

test("witness disagreement refuses the fill without booking or opening any account", () => {
  const result = deriveSetOfFillTransactions({
    fills: [{
      venue: "hive-engine", account: "a", fillId: "X", date: "2026-09-05", side: "buy",
      baseCommodity: "GLD", quoteCommodity: "SWAP.HIVE", baseQuantity: "1", quoteAmount: "1",
      custodyAccount: "Assets:X", mandateId: "m",
      witnesses: [{ node: "n1", databaseHash: "aaa" }, { node: "n2", databaseHash: "bbb" }],
    }],
  });
  assert.equal(result.transactionCount, 0);
  assert.equal(result.accountsToOpen.length, 0);
  assert.deepEqual(result.refusals, [{
    fillId: "X", reason: "witness-disagreement",
    witnesses: [{ node: "n1", databaseHash: "aaa" }, { node: "n2", databaseHash: "bbb" }],
  }]);
});

test("agreeing witnesses book normally", () => {
  const result = deriveSetOfFillTransactions({
    fills: [{
      venue: "hive-engine", account: "a", fillId: "X", date: "2026-09-05", side: "buy",
      baseCommodity: "GLD", quoteCommodity: "SWAP.HIVE", baseQuantity: "1", quoteAmount: "1",
      custodyAccount: "Assets:X", mandateId: "m",
      witnesses: [{ node: "n1", databaseHash: "aaa" }, { node: "n2", databaseHash: "aaa" }],
    }],
  });
  assert.equal(result.transactionCount, 1);
  assert.equal(result.refusals.length, 0);
});

test("a missing required field throws TypeError", () => {
  assert.throws(() => deriveSetOfFillTransactions({ fills: [{}] }), TypeError);
});

test("an unrecognized side throws TypeError", () => {
  assert.throws(() => deriveSetOfFillTransactions({
    fills: [{
      venue: "v", account: "a", fillId: "X", date: "2026-09-05", side: "hold",
      baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "1",
      custodyAccount: "Assets:X", mandateId: "m",
    }],
  }), /side must be "buy" or "sell"/u);
});

test("a missing counter account for the realized-gain leg is listed once under accountsToOpen", () => {
  const result = deriveSetOfFillTransactions({
    fills: [
      { venue: "v", account: "a", fillId: "B1", date: "2026-09-01", side: "buy",
        baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "10",
        custodyAccount: "Assets:X", mandateId: "m" },
      { venue: "v", account: "a", fillId: "S1", date: "2026-09-02", side: "sell",
        baseCommodity: "X", quoteCommodity: "USD", baseQuantity: "1", quoteAmount: "12",
        custodyAccount: "Assets:X", mandateId: "m" },
    ],
    openAccounts: [],
  });
  const accounts = result.accountsToOpen.map((a) => a.account);
  assert.ok(accounts.includes("Assets:X"));
  assert.ok(accounts.includes("Income:Investment:Realized-Gains"));
});
```
## Examples
```json name="a buy then a sell of the same GLD lot books a FIFO realized gain against the exact settled amounts"
{"input":{"openAccounts":["Assets:Digital-Assets:HiveEngine:Unclassified","Income:Investment:Realized-Gains"],"fills":[{"venue":"hive-engine","account":"michael561","fillId":"a6308f23ba5026f1e670e61cea257eaf62524322-0","date":"2026-09-05","side":"buy","baseCommodity":"GLD","quoteCommodity":"SWAP.HIVE","baseQuantity":"4.1917","quoteAmount":"0.99502065","custodyAccount":"Assets:Digital-Assets:HiveEngine:Unclassified","mandateId":"manual-michael561-gld-round-trip"},{"venue":"hive-engine","account":"michael561","fillId":"5f6ff58a3be67498734d57ba0c9e5ef4230fa26f","date":"2026-09-05","side":"sell","baseCommodity":"GLD","quoteCommodity":"SWAP.HIVE","baseQuantity":"4.1917","quoteAmount":"1.02172637","custodyAccount":"Assets:Digital-Assets:HiveEngine:Unclassified","mandateId":"manual-michael561-gld-round-trip"}]},"output":{"type":"VenueFillTransactionSet","version":1,"transactionCount":2,"transactions":[{"date":"2026-09-05","narration":"hive-engine buy GLD for SWAP.HIVE","fillId":"a6308f23ba5026f1e670e61cea257eaf62524322-0","side":"buy","baseCommodity":"GLD","quoteCommodity":"SWAP.HIVE","baseQuantity":"4.1917","quoteAmount":"0.99502065","directive":"2026-09-05 * \"hive-engine buy GLD for SWAP.HIVE\"\n  source_id: \"a6308f23ba5026f1e670e61cea257eaf62524322-0\"\n  venue: \"hive-engine\"\n  account: \"michael561\"\n  mandate_id: \"manual-michael561-gld-round-trip\"\n  Assets:Digital-Assets:HiveEngine:Unclassified  -0.99502065 SWAP.HIVE\n  Assets:Digital-Assets:HiveEngine:Unclassified  4.1917 GLD {{0.99502065 SWAP.HIVE}}"},{"date":"2026-09-05","narration":"hive-engine sell GLD for SWAP.HIVE","fillId":"5f6ff58a3be67498734d57ba0c9e5ef4230fa26f","side":"sell","baseCommodity":"GLD","quoteCommodity":"SWAP.HIVE","baseQuantity":"4.1917","quoteAmount":"1.02172637","costBasisConsumed":"0.99502065","realized":"0.02670572","realizedAccount":"Income:Investment:Realized-Gains","consumedLots":[{"fillId":"a6308f23ba5026f1e670e61cea257eaf62524322-0","quantity":"4.1917","cost":"0.99502065"}],"directive":"2026-09-05 * \"hive-engine sell GLD for SWAP.HIVE\"\n  source_id: \"5f6ff58a3be67498734d57ba0c9e5ef4230fa26f\"\n  venue: \"hive-engine\"\n  account: \"michael561\"\n  mandate_id: \"manual-michael561-gld-round-trip\"\n  Assets:Digital-Assets:HiveEngine:Unclassified  -4.1917 GLD {{0.99502065 SWAP.HIVE}} @ 0.24374987 SWAP.HIVE\n  Assets:Digital-Assets:HiveEngine:Unclassified  1.02172637 SWAP.HIVE\n  Income:Investment:Realized-Gains  -0.02670572 SWAP.HIVE"}],"accountsToOpen":[],"refusals":[]}}
```
## Traceability
- `fifo-cost-basis-lots` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `beancount-total-cost-lots`, `node-esm-operation`
- `total-cost-lot-syntax` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `beancount-total-cost-lots`
- `realized-gain-or-loss-posting` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `separate-fee-posting` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `witness-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `source-and-witness-metadata` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `open-only-when-missing` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-float-arithmetic` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-cost-capitalization-of-explicit-fees` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-booking-past-insufficient-inventory` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
