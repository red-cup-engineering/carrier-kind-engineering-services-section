import { formatScaled, parseDecimal } from "@red-cup-engineering/exact-number-data-service/decimal-string";

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
