import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfCardPurchaseTransactions } from "../src/integrations/ledger/maintenance/card-purchases.mjs";

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
