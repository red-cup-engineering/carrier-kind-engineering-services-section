import { addDecimalStrings, divideDecimalStrings, multiplyDecimalStrings, parseDecimal } from "@red-cup-engineering/exact-number-data-service/decimal-string";

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
