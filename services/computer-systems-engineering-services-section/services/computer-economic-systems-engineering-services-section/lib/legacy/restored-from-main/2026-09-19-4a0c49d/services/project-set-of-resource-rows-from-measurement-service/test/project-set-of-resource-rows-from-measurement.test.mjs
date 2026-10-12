import assert from "node:assert/strict";
import test from "node:test";
import { projectSetOfResourceRowsFromMeasurement } from "../scripts/project-set-of-resource-rows-from-measurement.mjs";

const EMPTY = { rows: [] };
const NO_BUY_FIELD_MAPPING = {
  product: "product",
  text: ["product", "capability", "normalized_value", "exact_source_language", "result"],
  sourceUrl: "source_url",
  observedAt: "observed_at",
  disclosureClass: "disclosure_class",
  requiresIdentity: "requiresIdentity",
  arena: "arena",
};
const TWO_RESOURCE_CATALOG = {
  economy: "test-economy",
  fieldMapping: NO_BUY_FIELD_MAPPING,
  resources: [
    { name: "HIVE", kind: "currency", rail: "Hive blockchain", unit: "HIVE", match: { type: "regex", pattern: "\\bHIVE\\b" } },
    { name: "identity slot", kind: "scarce-input", rail: "n/a (identity registry, not a settlement rail)", unit: "accounts per verified identity", match: { type: "requires-identity-present" } },
  ],
};

test("projects one row per catalog resource, in catalog order, when no rows match", () => {
  const result = projectSetOfResourceRowsFromMeasurement({ broadSurfaceMeasurement: EMPTY, providerAndIncumbentMeasurement: EMPTY, catalog: TWO_RESOURCE_CATALOG });
  assert.equal(result.type, "ResourceRowProjection");
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows.map((row) => row.identity.name), ["HIVE", "identity slot"]);
  for (const row of result.rows) {
    assert.equal(row.witnesses.length, 0);
    assert.equal(row.provenance.evidenceStatus, "unknown");
    assert.equal(row.custody, "unknown");
  }
});

test("a single first-party witness yields self-reported evidence, not measured", () => {
  const broadSurfaceMeasurement = {
    rows: [
      {
        product: "Hive (developers.hive.io)",
        capability: "paid account creation fee",
        normalized_value: 3,
        exact_source_language: "create accounts by paying an account creation fee of 3 HIVE",
        result: "Hive's own developer docs state the fee is 3 HIVE.",
        source_url: "https://developers.hive.io/tutorials-recipes/account-creation-process.html",
        observed_at: "2026-09-05T00:00:00Z",
        disclosure_class: "developer docs",
        requiresIdentity: "none",
        arena: "hive-account-creation",
      },
    ],
  };
  const result = projectSetOfResourceRowsFromMeasurement({ broadSurfaceMeasurement, providerAndIncumbentMeasurement: EMPTY, catalog: TWO_RESOURCE_CATALOG });
  const hive = result.rows.find((row) => row.identity.name === "HIVE");
  assert.equal(hive.witnesses.length, 1);
  assert.equal(hive.provenance.evidenceStatus, "self-reported");
  assert.equal(hive.identity.issuer, "Hive (developers.hive.io)");
  assert.equal(hive.identityCost.kycRequired, false);
});

test("two distinct-product witnesses yield measured evidence", () => {
  const row = (product, source_url) => ({
    product, capability: "earning HIVE", normalized_value: "unknown", exact_source_language: "HIVE reward",
    result: "HIVE mentioned", source_url, observed_at: "2026-09-05T00:00:00Z", disclosure_class: "docs", requiresIdentity: "unknown", arena: "hive-earning",
  });
  const broadSurfaceMeasurement = { rows: [row("Product A", "https://a.example/")] };
  const providerAndIncumbentMeasurement = { rows: [row("Product B", "https://b.example/")] };
  const result = projectSetOfResourceRowsFromMeasurement({ broadSurfaceMeasurement, providerAndIncumbentMeasurement, catalog: TWO_RESOURCE_CATALOG });
  const hive = result.rows.find((r) => r.identity.name === "HIVE");
  assert.equal(hive.witnesses.length, 2);
  assert.equal(hive.provenance.evidenceStatus, "measured");
  assert.equal(hive.identityCost.kycRequired, "unknown");
});

test("refuses a request missing either rows array", () => {
  assert.throws(() => projectSetOfResourceRowsFromMeasurement({ broadSurfaceMeasurement: EMPTY, catalog: TWO_RESOURCE_CATALOG }), /rows array/u);
  assert.throws(() => projectSetOfResourceRowsFromMeasurement({ catalog: TWO_RESOURCE_CATALOG }), /rows array/u);
});

test("refuses a request missing catalog.resources", () => {
  assert.throws(
    () => projectSetOfResourceRowsFromMeasurement({ broadSurfaceMeasurement: EMPTY, providerAndIncumbentMeasurement: EMPTY }),
    /catalog must carry a non-empty resources array/u,
  );
  assert.throws(
    () => projectSetOfResourceRowsFromMeasurement({ broadSurfaceMeasurement: EMPTY, providerAndIncumbentMeasurement: EMPTY, catalog: { economy: "x", fieldMapping: NO_BUY_FIELD_MAPPING, resources: [] } }),
    /catalog must carry a non-empty resources array/u,
  );
});

test("refuses a catalog missing fieldMapping", () => {
  assert.throws(
    () => projectSetOfResourceRowsFromMeasurement({ broadSurfaceMeasurement: EMPTY, providerAndIncumbentMeasurement: EMPTY, catalog: { economy: "x", resources: TWO_RESOURCE_CATALOG.resources } }),
    /catalog must carry a fieldMapping object/u,
  );
});

test("a differently field-shaped economy's measurement rows project through an explicit field mapping (the generalization this operation exists for)", () => {
  const solarFieldMapping = {
    product: "name",
    text: ["name", "whatItDoes", "pricing"],
    sourceUrl: "url",
    observedAt: "measuredOn",
    disclosureClass: "class",
    requiresIdentity: "requiresIdentity",
    arena: "arena",
  };
  const solarCatalog = {
    economy: "test-solar-economy",
    fieldMapping: solarFieldMapping,
    resources: [
      { name: "Electricity", kind: "commodity", rail: "the utility's own distribution grid", unit: "kWh", match: { type: "regex", pattern: "kWh|electricity", flags: "i" } },
    ],
  };
  const solarRow = {
    name: "Minnesota Power",
    class: "first-party utility rate page",
    arena: "electricity-tariff",
    url: "https://www.mnpower.com/ResidentialRates",
    measuredOn: "2026-09-05",
    pricing: "residential electricity is billed per kWh",
    whatItDoes: "serves residential electricity",
    requiresIdentity: "not found",
  };
  const result = projectSetOfResourceRowsFromMeasurement({
    broadSurfaceMeasurement: { rows: [solarRow] },
    providerAndIncumbentMeasurement: EMPTY,
    catalog: solarCatalog,
  });
  const electricity = result.rows[0];
  assert.equal(electricity.witnesses.length, 1);
  assert.equal(electricity.witnesses[0].sourceUrl, "https://www.mnpower.com/ResidentialRates");
  assert.equal(electricity.witnesses[0].observedOn, "2026-09-05");
  assert.equal(electricity.identity.issuer, "Minnesota Power");
  assert.equal(electricity.provenance.evidenceStatus, "self-reported");
});
