# derive-set-of-card-purchase-transactions
## Requirements
- `two-book-boundary`: The operation must apply the two-book law: a purchase whose `owner` and `paymentMethod.party` are both different from `reportingEntity` falls outside this book's boundary and produces no directive, listed under `outsideBoundary` with reason `owned-and-paid-by-other-parties`.
- `pending-on-missing-price`: The operation must list an in-boundary purchase whose `price` is `null` under `pending` with reason `amount-missing`, and must not emit a transaction for it.
- `rule-chosen-debit-account`: For an in-boundary, priced purchase, the operation must debit `Assets:Property-and-Equipment:<Category>:<assetId>` when `owner === reportingEntity` and `treatment` is `capitalize`, the purchase's `expenseAccount` (default `Expenses:Equipment`) when `owner === reportingEntity` and `treatment` is `expense`, or `Assets:Due-from-Related-Parties:<Owner>` when `owner !== reportingEntity` (this book paid for another party's item).
- `rule-chosen-credit-account`: The operation must credit `Assets:Cash:Operating` when `paymentMethod.party === reportingEntity` and `paymentMethod.instrument` is `cash` or `bank-transfer`, `Liabilities:Credit-Cards:<Label>` when `paymentMethod.party === reportingEntity` with any other instrument, or `Liabilities:Due-to-Related-Parties:<Party>` when `paymentMethod.party !== reportingEntity`.
- `account-component-capitalization`: The operation must render an account component from a party, label, or category name by capitalizing each hyphen- or space-separated word (e.g. `"emsenn"` -> `"Emsenn"`, `"561-group"` -> `"561-Group"`, `"personal card"` -> `"Personal-Card"`), leaving a word starting with a digit unchanged.
- `witnessed-metadata`: Every posted transaction must carry `source_id` (the row's own `sourceId` or the set's `sourceId`), `purchase_id`, `paid_by`, `owner`, and `asset_id` when present, and the rendered directive text must be included on each transaction.
- `open-only-when-missing`: The operation must emit an `open` directive for a used account only when that account's name is absent from the input's `openAccounts` list, deduplicated once per account and dated the earliest `orderDate` that uses it.
## Prohibitions
- `no-float-arithmetic`: The operation must not convert any price amount through a JavaScript floating-point number; amounts are parsed and formatted only through `src/decimal.mjs`'s `parseDecimal`/`formatScaled`.
- `no-capitalize-without-asset-identity`: The operation must throw a `TypeError` for a `capitalize`-treatment row on this reporting entity's own book that lacks `assetId` or a recognized `assetCategory`, never silently default the fixed-asset account.
## Laws
- `entity-perspective` | Equity as claim and asset (561 Group accounting note) | 2026-08-27 | content/text/documents/articles/notes/2026/08/27/2026-08-27-note-on-equity-as-claim-and-asset.md (accounting-services-section) | Applies to the two-book law. | Every ledger is read from the perspective of its reporting entity; the same event is recorded once on each side's own books, from that side's own perspective, never copied across.
- `beancount-double-entry` | Beancount double-entry counting method | v3 | https://beancount.github.io/docs/the_double_entry_counting_method.html | Applies to the debit/credit account choice and exact-amount posting. | Every transaction's postings must sum to zero within a commodity; amounts are exact, never floating-point.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation. | The package uses one executable ESM operation source file, importing only `../src/decimal.mjs` from this section.
- `schema-org-order` | schema.org Order/OrderItem/PriceSpecification | schema.org (live) | https://schema.org/Order | Applies to the input record's field names. | `orderDate`, `paymentMethod`, `orderedItem`, and `price`/`priceCurrency` name the same properties schema.org's Order vocabulary defines.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-set-of-card-purchase-transactions-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-set-of-card-purchase-transactions.mjs
#!/usr/bin/env node
import { formatScaled, parseDecimal } from "../src/decimal.mjs";

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

if (import.meta.main) {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  try {
    process.stdout.write(`${JSON.stringify(deriveSetOfCardPurchaseTransactions(JSON.parse(text)), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ error: error.message })}\n`);
    process.exit(2);
  }
}
```
## Tests
```mjs path=test/derive-set-of-card-purchase-transactions.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfCardPurchaseTransactions } from "../scripts/derive-set-of-card-purchase-transactions.mjs";

function purchaseSet(purchases, overrides = {}) {
  return { type: "CardPurchaseSet", version: 1, recordedAt: "2026-09-04", sourceId: "CARD-EMSENN-20260904", sourceStatus: "statement-lines-pending", purchases, ...overrides };
}

const CAPITALIZED_ITEM = {
  purchaseId: "CARD-EMSENN-20260904-001",
  orderDate: "2026-09-04",
  orderedItem: { name: "Field laptop", description: "A ruggedized field laptop.", quantity: 1 },
  price: { value: "1200.5", currency: "USD" },
  paymentMethod: { party: "emsenn", instrument: "credit-card", label: "personal card" },
  owner: "561-group",
  treatment: "capitalize",
  assetId: "FIELD-LAPTOP-001",
  assetCategory: "computer-equipment",
  usedFor: "field research",
};

test("refuses input without a reportingEntity", () => {
  assert.throws(
    () => deriveSetOfCardPurchaseTransactions({ purchaseSet: purchaseSet([]) }),
    /reportingEntity must be a non-empty string/u,
  );
});

test("refuses a purchaseSet without a purchases array", () => {
  assert.throws(
    () => deriveSetOfCardPurchaseTransactions({ reportingEntity: "561-group", purchaseSet: {} }),
    /purchases must be an array/u,
  );
});

test("two-book law, owner's book: owner === reportingEntity capitalizes to the fixed-asset register and credits the payer as a related party", () => {
  const result = deriveSetOfCardPurchaseTransactions({
    reportingEntity: "561-group",
    purchaseSet: purchaseSet([CAPITALIZED_ITEM]),
  });
  assert.equal(result.transactionCount, 1);
  assert.equal(result.outsideBoundary.length, 0);
  assert.equal(result.pending.length, 0);
  const [txn] = result.transactions;
  assert.equal(txn.debitAccount, "Assets:Property-and-Equipment:Computer-Equipment:FIELD-LAPTOP-001");
  assert.equal(txn.debitAmount, "1200.5");
  assert.equal(txn.creditAccount, "Liabilities:Due-to-Related-Parties:Emsenn");
  assert.equal(txn.creditAmount, "-1200.5");
  assert.equal(txn.narration, "Purchase Field laptop");
  assert.match(txn.directive, /purchase_id: "CARD-EMSENN-20260904-001"/u);
  assert.match(txn.directive, /asset_id: "FIELD-LAPTOP-001"/u);
});

test("two-book law, payer's book: paymentMethod.party === reportingEntity debits a related-party receivable and credits its own credit card", () => {
  const result = deriveSetOfCardPurchaseTransactions({
    reportingEntity: "emsenn",
    purchaseSet: purchaseSet([CAPITALIZED_ITEM]),
  });
  assert.equal(result.transactionCount, 1);
  assert.equal(result.outsideBoundary.length, 0);
  const [txn] = result.transactions;
  assert.equal(txn.debitAccount, "Assets:Due-from-Related-Parties:561-Group");
  assert.equal(txn.debitAmount, "1200.5");
  assert.equal(txn.creditAccount, "Liabilities:Credit-Cards:Personal-Card");
  assert.equal(txn.creditAmount, "-1200.5");
});

test("a purchase owned and paid by other parties falls outside this book's boundary", () => {
  const outsider = { ...CAPITALIZED_ITEM, owner: "561-group", paymentMethod: { party: "561-group", instrument: "credit-card", label: "corporate card" } };
  const result = deriveSetOfCardPurchaseTransactions({
    reportingEntity: "emsenn",
    purchaseSet: purchaseSet([outsider]),
  });
  assert.equal(result.transactionCount, 0);
  assert.deepEqual(result.outsideBoundary, [{ purchaseId: outsider.purchaseId, owner: "561-group", paidBy: "561-group", reason: "owned-and-paid-by-other-parties" }]);
});

test("a null price is listed under pending, never posted", () => {
  const unpriced = { ...CAPITALIZED_ITEM, price: null };
  const result = deriveSetOfCardPurchaseTransactions({
    reportingEntity: "561-group",
    purchaseSet: purchaseSet([unpriced]),
  });
  assert.equal(result.transactionCount, 0);
  assert.deepEqual(result.pending, [{ purchaseId: unpriced.purchaseId, orderDate: "2026-09-04", owner: "561-group", reason: "amount-missing" }]);
});

test("an expense-treatment row debits Expenses:Equipment by default and a cash payment credits Assets:Cash:Operating", () => {
  const expensed = {
    ...CAPITALIZED_ITEM,
    purchaseId: "CARD-EMSENN-20260904-002",
    treatment: "expense",
    assetCategory: "other-equipment",
    assetId: "OTHER-002",
    paymentMethod: { party: "561-group", instrument: "cash", label: "petty cash" },
  };
  const result = deriveSetOfCardPurchaseTransactions({
    reportingEntity: "561-group",
    purchaseSet: purchaseSet([expensed]),
  });
  const [txn] = result.transactions;
  assert.equal(txn.debitAccount, "Expenses:Equipment");
  assert.equal(txn.creditAccount, "Assets:Cash:Operating");
});

test("an expense-treatment row honors an explicit expenseAccount", () => {
  const expensed = {
    ...CAPITALIZED_ITEM,
    purchaseId: "CARD-EMSENN-20260904-003",
    treatment: "expense",
    expenseAccount: "Expenses:Office-and-Supplies",
    paymentMethod: { party: "561-group", instrument: "bank-transfer", label: "operating account" },
  };
  const result = deriveSetOfCardPurchaseTransactions({
    reportingEntity: "561-group",
    purchaseSet: purchaseSet([expensed]),
  });
  assert.equal(result.transactions[0].debitAccount, "Expenses:Office-and-Supplies");
  assert.equal(result.transactions[0].creditAccount, "Assets:Cash:Operating");
});

test("accountsToOpen lists each missing account once, dated the earliest orderDate that uses it", () => {
  const first = {
    ...CAPITALIZED_ITEM,
    purchaseId: "CARD-EMSENN-20260904-004",
    treatment: "expense",
    orderDate: "2026-09-06",
    paymentMethod: { party: "561-group", instrument: "cash", label: "petty cash" },
  };
  const second = {
    ...CAPITALIZED_ITEM,
    purchaseId: "CARD-EMSENN-20260904-005",
    treatment: "expense",
    orderDate: "2026-09-05",
    paymentMethod: { party: "561-group", instrument: "cash", label: "petty cash" },
  };
  const result = deriveSetOfCardPurchaseTransactions({
    reportingEntity: "561-group",
    purchaseSet: purchaseSet([first, second]),
  });
  assert.equal(result.accountsToOpen.length, 2);
  const cash = result.accountsToOpen.find((entry) => entry.account === "Assets:Cash:Operating");
  assert.equal(cash.date, "2026-09-05");
  assert.equal(cash.directive, "2026-09-05 open Assets:Cash:Operating");
});

test("accountsToOpen omits an account already present in openAccounts", () => {
  const result = deriveSetOfCardPurchaseTransactions({
    reportingEntity: "561-group",
    purchaseSet: purchaseSet([CAPITALIZED_ITEM]),
    openAccounts: ["Assets:Property-and-Equipment:Computer-Equipment:FIELD-LAPTOP-001", "Liabilities:Due-to-Related-Parties:Emsenn"],
  });
  assert.equal(result.accountsToOpen.length, 0);
});

test("capitalize treatment without an assetId throws", () => {
  const noAsset = { ...CAPITALIZED_ITEM, assetId: undefined };
  assert.throws(
    () => deriveSetOfCardPurchaseTransactions({ reportingEntity: "561-group", purchaseSet: purchaseSet([noAsset]) }),
    /requires assetId/u,
  );
});
```
## Examples
```json name="one in-boundary, capitalize-treatment, priced purchase produces one dated, source-witnessed transaction"
{"input":{"reportingEntity":"561-group","purchaseSet":{"type":"CardPurchaseSet","version":1,"recordedAt":"2026-09-04","sourceId":"CARD-EMSENN-20260904","sourceStatus":"statement-lines-pending","purchases":[{"purchaseId":"CARD-EMSENN-20260904-001","orderDate":"2026-09-04","orderedItem":{"name":"Field laptop","description":"A ruggedized field laptop.","quantity":1},"price":{"value":"1200.5","currency":"USD"},"paymentMethod":{"party":"emsenn","instrument":"credit-card","label":"personal card"},"owner":"561-group","treatment":"capitalize","assetId":"FIELD-LAPTOP-001","assetCategory":"computer-equipment","usedFor":"field research"}]},"openAccounts":[]},"output":{"type":"CardPurchaseTransactionSet","version":1,"transactionCount":1,"transactions":[{"date":"2026-09-04","narration":"Purchase Field laptop","purchaseId":"CARD-EMSENN-20260904-001","sourceId":"CARD-EMSENN-20260904","owner":"561-group","paidBy":"emsenn","debitAccount":"Assets:Property-and-Equipment:Computer-Equipment:FIELD-LAPTOP-001","debitAmount":"1200.5","creditAccount":"Liabilities:Due-to-Related-Parties:Emsenn","creditAmount":"-1200.5","currency":"USD","directive":"2026-09-04 * \"Purchase Field laptop\"\n  source_id: \"CARD-EMSENN-20260904\"\n  purchase_id: \"CARD-EMSENN-20260904-001\"\n  paid_by: \"emsenn\"\n  owner: \"561-group\"\n  asset_id: \"FIELD-LAPTOP-001\"\n  Assets:Property-and-Equipment:Computer-Equipment:FIELD-LAPTOP-001  1200.5 USD\n  Liabilities:Due-to-Related-Parties:Emsenn  -1200.5 USD"}],"accountsToOpen":[{"account":"Assets:Property-and-Equipment:Computer-Equipment:FIELD-LAPTOP-001","date":"2026-09-04","directive":"2026-09-04 open Assets:Property-and-Equipment:Computer-Equipment:FIELD-LAPTOP-001"},{"account":"Liabilities:Due-to-Related-Parties:Emsenn","date":"2026-09-04","directive":"2026-09-04 open Liabilities:Due-to-Related-Parties:Emsenn"}],"pending":[],"outsideBoundary":[]}}
```
## Traceability
- `two-book-boundary` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `entity-perspective`
- `pending-on-missing-price` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `rule-chosen-debit-account` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `entity-perspective`, `beancount-double-entry`
- `rule-chosen-credit-account` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `entity-perspective`, `beancount-double-entry`
- `account-component-capitalization` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `witnessed-metadata` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `schema-org-order`
- `open-only-when-missing` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `beancount-double-entry`
- `no-float-arithmetic` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `beancount-double-entry`
- `no-capitalize-without-asset-identity` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `entity-perspective`
