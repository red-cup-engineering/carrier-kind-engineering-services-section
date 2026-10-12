import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfFixedAssetRegistrations } from "../src/integrations/ledger/maintenance/fixed-assets.mjs";

function purchaseSet(purchases) {
  return { type: "CardPurchaseSet", version: 1, recordedAt: "2026-09-04", sourceId: "CARD-EMSENN-20260904", sourceStatus: "statement-lines-pending", purchases };
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
    () => deriveSetOfFixedAssetRegistrations({ purchaseSet: purchaseSet([]) }),
    /reportingEntity must be a non-empty string/u,
  );
});

test("a capitalize-treatment row registers an open directive plus a note on its own leaf account", () => {
  const result = deriveSetOfFixedAssetRegistrations({ reportingEntity: "561-group", purchaseSet: purchaseSet([CAPITALIZED_ITEM]) });
  assert.equal(result.registrationCount, 1);
  const [entry] = result.registrations;
  assert.equal(entry.account, "Assets:Property-and-Equipment:Computer-Equipment:FIELD-LAPTOP-001");
  assert.equal(entry.treatment, "capitalize");
  assert.match(entry.directive, /^2026-09-04 open Assets:Property-and-Equipment:Computer-Equipment:FIELD-LAPTOP-001\n\n2026-09-04 note Assets:Property-and-Equipment:Computer-Equipment:FIELD-LAPTOP-001 "Field laptop"/u);
  assert.match(entry.directive, /inventory: "fixed-asset"/u);
  assert.match(entry.directive, /asset_id: "FIELD-LAPTOP-001"/u);
  assert.match(entry.directive, /description: "A ruggedized field laptop\."/u);
  assert.match(entry.directive, /category: "computer-equipment"/u);
  assert.match(entry.directive, /ownership_source: "card-purchase-record"/u);
  assert.match(entry.directive, /paid_by: "emsenn"/u);
  assert.match(entry.directive, /purchase_id: "CARD-EMSENN-20260904-001"/u);
  assert.match(entry.directive, /control_status: "owned-and-in-service"/u);
  assert.match(entry.directive, /used_for: "field research"/u);
  assert.match(entry.directive, /historical_cost: "1200.5 USD"/u);
});

test("a null price yields status identified-pending-measurement and no historical_cost", () => {
  const unpriced = { ...CAPITALIZED_ITEM, price: null };
  const result = deriveSetOfFixedAssetRegistrations({ reportingEntity: "561-group", purchaseSet: purchaseSet([unpriced]) });
  assert.match(result.registrations[0].directive, /status: "identified-pending-measurement"/u);
  assert.doesNotMatch(result.registrations[0].directive, /historical_cost/u);
});

test("a priced row is measured", () => {
  const result = deriveSetOfFixedAssetRegistrations({ reportingEntity: "561-group", purchaseSet: purchaseSet([CAPITALIZED_ITEM]) });
  assert.match(result.registrations[0].directive, /status: "measured"/u);
});

test("an expense-treatment row registers only a note on the shared category account, no open", () => {
  const expensed = { ...CAPITALIZED_ITEM, purchaseId: "CARD-EMSENN-20260904-002", treatment: "expense", assetCategory: "other-equipment", assetId: "HEALTH-DEVICE-001" };
  const result = deriveSetOfFixedAssetRegistrations({ reportingEntity: "561-group", purchaseSet: purchaseSet([expensed]) });
  const [entry] = result.registrations;
  assert.equal(entry.account, "Assets:Property-and-Equipment:Other-Equipment");
  assert.equal(entry.treatment, "expense");
  assert.doesNotMatch(entry.directive, /open Assets/u);
  assert.match(entry.directive, /inventory: "expensed-equipment"/u);
});

test("a row owned by another party is skipped, never registered", () => {
  const other = { ...CAPITALIZED_ITEM, owner: "emsenn" };
  const result = deriveSetOfFixedAssetRegistrations({ reportingEntity: "561-group", purchaseSet: purchaseSet([other]) });
  assert.equal(result.registrationCount, 0);
  assert.deepEqual(result.skipped, [{ purchaseId: other.purchaseId, reason: "owned-by-other-party" }]);
});

test("a row lacking an assetId is skipped, never registered", () => {
  const noAsset = { ...CAPITALIZED_ITEM, assetId: undefined };
  const result = deriveSetOfFixedAssetRegistrations({ reportingEntity: "561-group", purchaseSet: purchaseSet([noAsset]) });
  assert.equal(result.registrationCount, 0);
  assert.deepEqual(result.skipped, [{ purchaseId: noAsset.purchaseId, reason: "missing-asset-id" }]);
});
