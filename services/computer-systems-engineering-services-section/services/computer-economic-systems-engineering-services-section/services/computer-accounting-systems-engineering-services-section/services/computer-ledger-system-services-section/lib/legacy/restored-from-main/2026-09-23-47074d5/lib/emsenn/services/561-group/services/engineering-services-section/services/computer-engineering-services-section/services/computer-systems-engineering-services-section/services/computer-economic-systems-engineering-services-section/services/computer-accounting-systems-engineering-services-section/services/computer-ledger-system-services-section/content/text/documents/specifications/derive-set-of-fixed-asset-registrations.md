# derive-set-of-fixed-asset-registrations
## Requirements
- `one-registration-per-owned-asset`: The operation must derive one fixed-asset register entry per purchase whose `owner === reportingEntity` and which carries an `assetId`.
- `capitalize-opens-its-own-account`: For a `capitalize`-treatment row, the operation must emit an `open` directive for `Assets:Property-and-Equipment:<Category>:<assetId>` plus a register `note` on that same leaf account.
- `expense-notes-the-category-account`: For an `expense`-treatment row, the operation must emit only a register `note` on the shared `Assets:Property-and-Equipment:<Category>` account, never an `open` directive for it.
- `register-note-metadata`: Every register `note` must mirror the ledger's own `BCF-LAPTOP-001` register-note convention: `inventory` (`fixed-asset` for capitalize, `expensed-equipment` for expense), `asset_id`, `description`, `category`, `ownership_source` (`card-purchase-record`), `paid_by`, `purchase_id`, `control_status` (`owned-and-in-service`), `status` (`identified-pending-measurement` when `price` is `null`, else `measured`), `used_for`, and `historical_cost` (`"<value> <currency>"`) only when `price` is present.
- `skip-out-of-scope-rows`: The operation must list a row owned by another party under `skipped` with reason `owned-by-other-party`, and a row lacking `assetId` under `skipped` with reason `missing-asset-id`, never registering either.
## Prohibitions
- `no-float-arithmetic`: The operation must not convert `historical_cost`'s price amount through a JavaScript floating-point number; it is parsed and formatted only through `src/decimal.mjs`'s `parseDecimal`/`formatScaled`.
- `no-open-for-expense-category`: The operation must not emit an `open` directive for the shared category account of an `expense`-treatment row; that account is already open in the chart of accounts.
- `no-unrecognized-category`: The operation must throw a `TypeError` for a row whose `assetCategory` is not `computer-equipment` or `other-equipment`, never guess an account.
## Laws
- `entity-perspective` | Equity as claim and asset (561 Group accounting note) | 2026-08-27 | content/text/documents/articles/notes/2026/08/27/2026-08-27-note-on-equity-as-claim-and-asset.md (accounting-services-section) | Applies to the owner-only registration scope. | Every ledger is read from the perspective of its reporting entity; a fixed asset is registered on the books of the entity that owns it, never on a payer's book that merely settled the payment.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation. | The package uses one executable ESM operation source file, importing only `../src/decimal.mjs` from this section.
- `schema-org-order` | schema.org Order/OrderItem/PriceSpecification | schema.org (live) | https://schema.org/Order | Applies to the input record's field names. | `orderedItem`, `price`, and `priceCurrency` name the same properties schema.org's Order vocabulary defines.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-set-of-fixed-asset-registrations-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-set-of-fixed-asset-registrations.mjs
#!/usr/bin/env node
import { formatScaled, parseDecimal } from "../src/decimal.mjs";

const CATEGORY_COMPONENTS = { "computer-equipment": "Computer-Equipment", "other-equipment": "Other-Equipment" };

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

function renderMetadata(metadata) {
  return Object.entries(metadata).map(([key, value]) => `  ${key}: "${value}"`).join("\n");
}

function renderNoteDirective(date, account, narration, metadata) {
  return [`${date} note ${account} "${narration}"`, renderMetadata(metadata)].join("\n");
}

/**
 * The fixed-asset register metadata for one card-purchase row, mirroring the ledger's own
 * `BCF-LAPTOP-001` register-note convention.
 * @param {import("../data/records/schema/card-purchase-set.schema.json").CardPurchase} purchase
 * @param {"fixed-asset" | "expensed-equipment"} inventory
 * @returns {Record<string, string>}
 */
function registrationMetadata(purchase, inventory) {
  const metadata = {
    inventory,
    asset_id: purchase.assetId,
    description: purchase.orderedItem.description,
    category: purchase.assetCategory,
    ownership_source: "card-purchase-record",
    paid_by: purchase.paymentMethod.party,
    purchase_id: purchase.purchaseId,
    control_status: "owned-and-in-service",
    status: purchase.price === null ? "identified-pending-measurement" : "measured",
    used_for: purchase.usedFor,
  };
  if (purchase.price !== null) {
    metadata.historical_cost = `${canonicalDecimalString(purchase.price.value)} ${purchase.price.currency}`;
  }
  return metadata;
}

/**
 * Derive one fixed-asset register entry per card-purchase row owned by `reportingEntity` and
 * carrying an `assetId`: a capitalize-treatment row gets an `open` directive for its own
 * `Assets:Property-and-Equipment:<Category>:<assetId>` account plus a register `note` on that
 * account; an expense-treatment row gets only a register `note` on the shared
 * `Assets:Property-and-Equipment:<Category>` account. A row owned by another party or lacking an
 * `assetId` is listed under `skipped` instead.
 * @param {{ reportingEntity: string, purchaseSet: import("../data/records/schema/card-purchase-set.schema.json").CardPurchaseSet,
 *   openAccounts?: readonly string[] }} input
 * @returns {{ type: "FixedAssetRegistrationSet", version: 1, registrationCount: number,
 *   registrations: readonly object[], skipped: readonly object[] }}
 * @throws {TypeError} When `input.reportingEntity` or `input.purchaseSet.purchases` is missing or
 *   malformed, or a capitalize-treatment row carries an unrecognized `assetCategory`.
 */
export function deriveSetOfFixedAssetRegistrations(input) {
  if (!input || typeof input.reportingEntity !== "string" || input.reportingEntity.length === 0) {
    throw new TypeError("derive-set-of-fixed-asset-registrations: input.reportingEntity must be a non-empty string");
  }
  const { reportingEntity, purchaseSet } = input;
  if (!purchaseSet || !Array.isArray(purchaseSet.purchases)) {
    throw new TypeError("derive-set-of-fixed-asset-registrations: input.purchaseSet.purchases must be an array");
  }

  const registrations = [];
  const skipped = [];

  for (const purchase of purchaseSet.purchases) {
    if (purchase.owner !== reportingEntity) {
      skipped.push({ purchaseId: purchase.purchaseId, reason: "owned-by-other-party" });
      continue;
    }
    if (!purchase.assetId) {
      skipped.push({ purchaseId: purchase.purchaseId, reason: "missing-asset-id" });
      continue;
    }
    const categoryComponent = CATEGORY_COMPONENTS[purchase.assetCategory];
    if (!categoryComponent) {
      throw new TypeError(`derive-set-of-fixed-asset-registrations: ${purchase.purchaseId} requires a recognized assetCategory`);
    }
    const categoryAccount = `Assets:Property-and-Equipment:${categoryComponent}`;
    const narration = purchase.orderedItem.name;

    if (purchase.treatment === "capitalize") {
      const account = `${categoryAccount}:${purchase.assetId}`;
      const metadata = registrationMetadata(purchase, "fixed-asset");
      const directive = [
        `${purchase.orderDate} open ${account}`,
        renderNoteDirective(purchase.orderDate, account, narration, metadata),
      ].join("\n\n");
      registrations.push({ purchaseId: purchase.purchaseId, assetId: purchase.assetId, account, treatment: purchase.treatment, directive });
    } else {
      const metadata = registrationMetadata(purchase, "expensed-equipment");
      const directive = renderNoteDirective(purchase.orderDate, categoryAccount, narration, metadata);
      registrations.push({ purchaseId: purchase.purchaseId, assetId: purchase.assetId, account: categoryAccount, treatment: purchase.treatment, directive });
    }
  }

  return Object.freeze({
    type: "FixedAssetRegistrationSet",
    version: 1,
    registrationCount: registrations.length,
    registrations: Object.freeze(registrations),
    skipped: Object.freeze(skipped),
  });
}

if (import.meta.main) {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  try {
    process.stdout.write(`${JSON.stringify(deriveSetOfFixedAssetRegistrations(JSON.parse(text)), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ error: error.message })}\n`);
    process.exit(2);
  }
}
```
## Tests
```mjs path=test/derive-set-of-fixed-asset-registrations.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfFixedAssetRegistrations } from "../scripts/derive-set-of-fixed-asset-registrations.mjs";

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
```
## Examples
```json name="an owned, assetId-carrying, expense-treatment, unpriced row registers a note without an open directive"
{"input":{"reportingEntity":"561-group","purchaseSet":{"type":"CardPurchaseSet","version":1,"recordedAt":"2026-09-04","sourceId":"CARD-EMSENN-20260904","sourceStatus":"statement-lines-pending","purchases":[{"purchaseId":"CARD-EMSENN-20260904-001","orderDate":"2026-09-04","orderedItem":{"name":"Acupressure yoga mat (Kuznetsov applicator)","description":"Spiked mat, gold variant, for cutaneous mechanical stimulation and recovery.","quantity":1},"price":null,"paymentMethod":{"party":"emsenn","instrument":"credit-card","label":"personal card"},"owner":"561-group","treatment":"expense","expenseAccount":"Expenses:Equipment","assetId":"HEALTH-DEVICE-001","assetCategory":"other-equipment","usedFor":"561 Group medical program: device research for public-health-services-section and the medical-technology science sections."}]}},"output":{"type":"FixedAssetRegistrationSet","version":1,"registrationCount":1,"registrations":[{"purchaseId":"CARD-EMSENN-20260904-001","assetId":"HEALTH-DEVICE-001","account":"Assets:Property-and-Equipment:Other-Equipment","treatment":"expense","directive":"2026-09-04 note Assets:Property-and-Equipment:Other-Equipment \"Acupressure yoga mat (Kuznetsov applicator)\"\n  inventory: \"expensed-equipment\"\n  asset_id: \"HEALTH-DEVICE-001\"\n  description: \"Spiked mat, gold variant, for cutaneous mechanical stimulation and recovery.\"\n  category: \"other-equipment\"\n  ownership_source: \"card-purchase-record\"\n  paid_by: \"emsenn\"\n  purchase_id: \"CARD-EMSENN-20260904-001\"\n  control_status: \"owned-and-in-service\"\n  status: \"identified-pending-measurement\"\n  used_for: \"561 Group medical program: device research for public-health-services-section and the medical-technology science sections.\""}],"skipped":[]}}
```
## Traceability
- `one-registration-per-owned-asset` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `entity-perspective`
- `capitalize-opens-its-own-account` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `expense-notes-the-category-account` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `entity-perspective`
- `register-note-metadata` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `schema-org-order`
- `skip-out-of-scope-rows` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `entity-perspective`
- `no-float-arithmetic` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-open-for-expense-category` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-unrecognized-category` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `entity-perspective`
