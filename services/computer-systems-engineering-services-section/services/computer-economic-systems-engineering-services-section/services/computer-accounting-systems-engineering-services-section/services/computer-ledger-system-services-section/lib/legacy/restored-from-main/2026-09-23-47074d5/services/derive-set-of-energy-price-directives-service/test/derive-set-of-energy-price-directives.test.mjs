import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfEnergyPriceDirectives } from "../scripts/derive-set-of-energy-price-directives.mjs";

const ELECTRICITY = { usdPerKwh: "0.1423", sourceUrl: "https://www.example-coop.coop/rates", asOf: "2026-07-01" };
const PROPANE_CSV = "Date,Weekly Midwest (PADD 2) Propane Residential Price (Dollars per Gallon)\n08/25/2026,1.234\n09/01/2026,1.245\n09/10/2026,1.3\n";
const DIESEL_CSV = "Date,Weekly U.S. No 2 Diesel Retail Prices (Dollars per Gallon)\n2026-08-31,3.512\n2026-09-10,3.6\n";

test("derives forward and inverse directives for KWH, PROPANE_GAL, and DIESEL_GAL, picking each weekly series' latest row at or before the reporting date (both MM/DD/YYYY and YYYY-MM-DD, never a future row)", () => {
  const result = deriveSetOfEnergyPriceDirectives({
    date: "2026-09-05",
    electricity: ELECTRICITY,
    propane: { sourceKind: "fixture", seriesText: PROPANE_CSV },
    diesel: { sourceKind: "fetched-csv", sourceUrl: "https://www.eia.gov/petroleum/gasdiesel/", seriesText: DIESEL_CSV },
  });
  assert.equal(result.type, "EnergyPriceDirectiveSet");
  assert.equal(result.directiveCount, 6);
  assert.equal(result.unpriced.length, 0);
  const byCommodity = Object.fromEntries(result.priced.map((p) => [p.commodity, p]));

  assert.equal(byCommodity.KWH.usdPrice, "0.1423");
  assert.equal(byCommodity.KWH.inversePrice, "7.0274068868");
  assert.equal(byCommodity.KWH.sourceKind, "declared");
  assert.equal(byCommodity.KWH.observedDate, "2026-07-01");
  assert.equal(byCommodity.KWH.directive, "2026-09-05 price KWH 0.1423 USD\n  source_kind: \"declared\"\n  source_url: \"https://www.example-coop.coop/rates\"\n  observed_date: \"2026-07-01\"");
  assert.equal(byCommodity.KWH.inverseDirective, "2026-09-05 price USD 7.0274068868 KWH\n  source_kind: \"declared\"\n  source_url: \"https://www.example-coop.coop/rates\"\n  observed_date: \"2026-07-01\"\n  inverse_of: \"KWH\"");

  // 09/01/2026 (MM/DD/YYYY) is the latest PROPANE_GAL row at or before 2026-09-05; 09/10/2026 is a future row and must never be picked.
  assert.equal(byCommodity.PROPANE_GAL.usdPrice, "1.245");
  assert.equal(byCommodity.PROPANE_GAL.observedDate, "2026-09-01");
  assert.equal(byCommodity.PROPANE_GAL.sourceKind, "fixture");
  assert.equal(byCommodity.PROPANE_GAL.sourceUrl, null);
  assert.equal(byCommodity.PROPANE_GAL.inverseDirective, "2026-09-05 price USD 0.8032128514 PROPANE_GAL\n  source_kind: \"fixture\"\n  source_url: \"\"\n  observed_date: \"2026-09-01\"\n  inverse_of: \"PROPANE_GAL\"");

  // 2026-08-31 (YYYY-MM-DD) is the latest DIESEL_GAL row at or before 2026-09-05; 2026-09-10 is a future row and must never be picked.
  assert.equal(byCommodity.DIESEL_GAL.usdPrice, "3.512");
  assert.equal(byCommodity.DIESEL_GAL.observedDate, "2026-08-31");
  assert.equal(byCommodity.DIESEL_GAL.sourceKind, "fetched-csv");
  assert.match(byCommodity.DIESEL_GAL.inverseDirective, /price USD 0\.284738041 DIESEL_GAL/u);
});

test("a weekly series with no row at or before the reporting date is unpriced, never fabricated", () => {
  const result = deriveSetOfEnergyPriceDirectives({
    date: "2026-08-01",
    electricity: ELECTRICITY,
    propane: { sourceKind: "fixture", seriesText: PROPANE_CSV },
    diesel: { sourceKind: "fixture", seriesText: DIESEL_CSV },
  });
  assert.deepEqual(result.unpriced, [
    { commodity: "PROPANE_GAL", reason: "no weekly observation at or before 2026-08-01" },
    { commodity: "DIESEL_GAL", reason: "no weekly observation at or before 2026-08-01" },
  ]);
  assert.equal(result.priced.length, 1);
  assert.equal(result.directiveCount, 2);
});

test("refuses a malformed electricity declaration", () => {
  assert.throws(() => deriveSetOfEnergyPriceDirectives({
    date: "2026-09-05", electricity: { sourceUrl: "https://x", asOf: "2026-07-01" },
    propane: { sourceKind: "fixture", seriesText: PROPANE_CSV }, diesel: { sourceKind: "fixture", seriesText: DIESEL_CSV },
  }), /electricity.usdPerKwh must be a plain decimal string/u);
});

test("refuses an apiKey field on a weekly source, keyless surfaces only", () => {
  assert.throws(() => deriveSetOfEnergyPriceDirectives({
    date: "2026-09-05", electricity: ELECTRICITY,
    propane: { sourceKind: "fixture", seriesText: PROPANE_CSV, apiKey: "secret" },
    diesel: { sourceKind: "fixture", seriesText: DIESEL_CSV },
  }), /apiKey is refused/u);
});

test("refuses an unrecognized sourceKind", () => {
  assert.throws(() => deriveSetOfEnergyPriceDirectives({
    date: "2026-09-05", electricity: ELECTRICITY,
    propane: { sourceKind: "live-api", seriesText: PROPANE_CSV }, diesel: { sourceKind: "fixture", seriesText: DIESEL_CSV },
  }), /sourceKind must be one of/u);
});

test("refuses a weekly-series row that is not \"date,value\"", () => {
  assert.throws(() => deriveSetOfEnergyPriceDirectives({
    date: "2026-09-05", electricity: ELECTRICITY,
    propane: { sourceKind: "fixture", seriesText: "Date,X\nnotarow\n" }, diesel: { sourceKind: "fixture", seriesText: DIESEL_CSV },
  }), /row is not "date,value"/u);
});
