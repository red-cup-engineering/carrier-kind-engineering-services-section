import { formatScaled, parseDecimal } from "@red-cup-engineering/computer-data-engineering-services-section/number/decimal-string";

const CASH_INSTRUMENTS = new Set(["cash", "bank-transfer"]);
const CATEGORY_COMPONENTS = { "computer-equipment": "Computer-Equipment", "other-equipment": "Other-Equipment" };

/**
 * Capitalize each hyphen- or space-separated word of a party, label, or category name into one
 * Beancount account component (e.g. `"emsenn"` -> `"Emsenn"`, `"561-group"` -> `"561-Group"`,
 * `"personal card"` -> `"Personal-Card"`), leaving a word that starts with a digit unchanged.
 * @param {string} text
 * @returns {string}
 */
function toAccountComponent(text) {
  return String(text)
    .trim()
    .split(/[\s-]+/u)
    .filter(Boolean)
    .map((word) => (/^\d/u.test(word) ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`))
    .join("-");
}

/**
 * The exact negation of a plain decimal string, via `parseDecimal`/`formatScaled` so the sign
 * flip never touches a floating-point number.
 * @param {string} text
 * @returns {string}
 */
function negateDecimalString(text) {
  const { negative, whole, frac } = parseDecimal(text);
  const magnitude = BigInt(`${whole}${frac}`);
  if (magnitude === 0n) return formatScaled(0n, frac.length);
  return formatScaled(negative ? magnitude : -magnitude, frac.length);
}

/**
 * Canonicalize a plain decimal string through `parseDecimal`/`formatScaled` (never a float).
 * @param {string} text
 * @returns {string}
 */
function canonicalDecimalString(text) {
  const { negative, whole, frac } = parseDecimal(text);
  const magnitude = BigInt(`${whole}${frac}`);
  return formatScaled(negative ? -magnitude : magnitude, frac.length);
}

function renderTransactionDirective({
  date, narration, metadata, debitAccount, debitAmount, creditAccount, creditAmount, currency,
}) {
  const lines = [`${date} * "${narration}"`];
  for (const [key, value] of Object.entries(metadata)) lines.push(`  ${key}: "${value}"`);
  lines.push(`  ${debitAccount}  ${debitAmount} ${currency}`);
  lines.push(`  ${creditAccount}  ${creditAmount} ${currency}`);
  return lines.join("\n");
}

/**
 * The Beancount account this reporting entity's book debits for one purchase's cost, per the
 * two-book law: capitalized to the fixed-asset register when this entity owns the item,
 * expensed when this entity owns it but does not capitalize it, or booked as a related-party
 * receivable when this entity paid for an item another party owns.
 * @param {import("../data/records/schema/card-purchase-set.schema.json").CardPurchase} purchase
 * @param {string} reportingEntity
 * @returns {string}
 * @throws {TypeError} When a capitalize-treatment row for this reporting entity lacks `assetId`
 *   or a recognized `assetCategory`.
 */
function debitAccountFor(purchase, reportingEntity) {
  if (purchase.owner !== reportingEntity) {
    return `Assets:Due-from-Related-Parties:${toAccountComponent(purchase.owner)}`;
  }
  if (purchase.treatment === "expense") return purchase.expenseAccount ?? "Expenses:Equipment";
  if (!purchase.assetId) {
    throw new TypeError(`derive-set-of-card-purchase-transactions: capitalize treatment on ${purchase.purchaseId} requires assetId`);
  }
  const categoryComponent = CATEGORY_COMPONENTS[purchase.assetCategory];
  if (!categoryComponent) {
    throw new TypeError(`derive-set-of-card-purchase-transactions: capitalize treatment on ${purchase.purchaseId} requires a recognized assetCategory`);
  }
  return `Assets:Property-and-Equipment:${categoryComponent}:${purchase.assetId}`;
}

/**
 * The Beancount account this reporting entity's book credits for one purchase's payment, per
 * the two-book law: the entity's own liability or cash account when it paid, or a related-party
 * payable when another party paid on this book's behalf.
 * @param {import("../data/records/schema/card-purchase-set.schema.json").CardPurchase} purchase
 * @param {string} reportingEntity
 * @returns {string}
 */
function creditAccountFor(purchase, reportingEntity) {
  const { paymentMethod } = purchase;
  if (paymentMethod.party !== reportingEntity) {
    return `Liabilities:Due-to-Related-Parties:${toAccountComponent(paymentMethod.party)}`;
  }
  if (CASH_INSTRUMENTS.has(paymentMethod.instrument)) return "Assets:Cash:Operating";
  return `Liabilities:Credit-Cards:${toAccountComponent(paymentMethod.label)}`;
}

/**
 * Derive one candidate Beancount transaction per in-boundary, priced card-purchase row, applying
 * the two-book law: a purchase owned and paid by parties other than `reportingEntity` falls
 * outside this book's boundary; a purchase with no price yet is pending; otherwise one
 * transaction is posted between a rule-chosen debit account (the fixed-asset register, an
 * expense account, or a related-party receivable) and a rule-chosen credit account (a cash or
 * credit-card liability account, or a related-party payable), carrying the row's source, purchase,
 * owner, and payer identity as metadata.
 * @param {{ reportingEntity: string, purchaseSet: import("../data/records/schema/card-purchase-set.schema.json").CardPurchaseSet,
 *   openAccounts?: readonly string[] }} input
 * @returns {{ type: "CardPurchaseTransactionSet", version: 1, transactionCount: number,
 *   transactions: readonly object[], accountsToOpen: readonly object[], pending: readonly object[],
 *   outsideBoundary: readonly object[] }}
 * @throws {TypeError} When `input.reportingEntity` or `input.purchaseSet.purchases` is missing or
 *   malformed, or a capitalize-treatment row lacks `assetId`/`assetCategory`.
 */
export function deriveSetOfCardPurchaseTransactions(input) {
  if (!input || typeof input.reportingEntity !== "string" || input.reportingEntity.length === 0) {
    throw new TypeError("derive-set-of-card-purchase-transactions: input.reportingEntity must be a non-empty string");
  }
  const { reportingEntity, purchaseSet } = input;
  if (!purchaseSet || !Array.isArray(purchaseSet.purchases)) {
    throw new TypeError("derive-set-of-card-purchase-transactions: input.purchaseSet.purchases must be an array");
  }
  const openAccounts = new Set(Array.isArray(input.openAccounts) ? input.openAccounts : []);
  const transactions = [];
  const pending = [];
  const outsideBoundary = [];
  const accountsToOpenByName = new Map();

  const noteAccountUse = (account, date) => {
    if (openAccounts.has(account)) return;
    const existing = accountsToOpenByName.get(account);
    if (!existing || date < existing.date) accountsToOpenByName.set(account, { account, date });
  };

  for (const purchase of purchaseSet.purchases) {
    if (purchase.owner !== reportingEntity && purchase.paymentMethod.party !== reportingEntity) {
      outsideBoundary.push({
        purchaseId: purchase.purchaseId, owner: purchase.owner, paidBy: purchase.paymentMethod.party,
        reason: "owned-and-paid-by-other-parties",
      });
      continue;
    }
    if (purchase.price === null) {
      pending.push({ purchaseId: purchase.purchaseId, orderDate: purchase.orderDate, owner: purchase.owner, reason: "amount-missing" });
      continue;
    }
    const sourceId = purchase.sourceId ?? purchaseSet.sourceId;
    const amount = canonicalDecimalString(purchase.price.value);
    const currency = purchase.price.currency;
    const debitAccount = debitAccountFor(purchase, reportingEntity);
    const creditAccount = creditAccountFor(purchase, reportingEntity);
    noteAccountUse(debitAccount, purchase.orderDate);
    noteAccountUse(creditAccount, purchase.orderDate);
    const metadata = {
      source_id: sourceId,
      purchase_id: purchase.purchaseId,
      paid_by: purchase.paymentMethod.party,
      owner: purchase.owner,
      ...(purchase.assetId ? { asset_id: purchase.assetId } : {}),
    };
    const narration = `Purchase ${purchase.orderedItem.name}`;
    transactions.push({
      date: purchase.orderDate,
      narration,
      purchaseId: purchase.purchaseId,
      sourceId,
      owner: purchase.owner,
      paidBy: purchase.paymentMethod.party,
      debitAccount,
      debitAmount: amount,
      creditAccount,
      creditAmount: negateDecimalString(amount),
      currency,
      directive: renderTransactionDirective({
        date: purchase.orderDate, narration, metadata, debitAccount, debitAmount: amount,
        creditAccount, creditAmount: negateDecimalString(amount), currency,
      }),
    });
  }

  const accountsToOpen = [...accountsToOpenByName.values()]
    .sort((a, b) => a.account.localeCompare(b.account))
    .map(({ account, date }) => ({ account, date, directive: `${date} open ${account}` }));

  return Object.freeze({
    type: "CardPurchaseTransactionSet",
    version: 1,
    transactionCount: transactions.length,
    transactions: Object.freeze(transactions),
    accountsToOpen: Object.freeze(accountsToOpen),
    pending: Object.freeze(pending),
    outsideBoundary: Object.freeze(outsideBoundary),
  });
}
