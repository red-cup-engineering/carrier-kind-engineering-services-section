import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfHouseholdEnergyPriceDirectives } from "../scripts/derive-set-of-household-energy-price-directives.mjs";

const PROPANE_SERIES = "Date,Weekly Midwest (PADD 2) Propane Residential Price (Dollars per Gallon)\n08/25/2026,1.234\n09/01/2026,1.245\n";
const DIESEL_SERIES = "Date,Weekly U.S. No 2 Diesel Retail Prices (Dollars per Gallon)\n2026-08-31,3.512\n";

test("derives KWH from the household's own tariff and PROPANE_GAL/DIESEL_GAL from the weekly series", () => {
  const result = deriveSetOfHouseholdEnergyPriceDirectives({
    date: "2026-09-05",
    household: { energyTariff: { utility: "Example Coop", rateScheduleName: "Residential", usdPerKwhTiers: [{ usdPerKwh: "0.1423" }], sourceUrl: "https://www.example-coop.coop/rates", asOf: "2026-07-01" } },
    propane: { sourceKind: "fixture", seriesText: PROPANE_SERIES },
    diesel: { sourceKind: "fetched-csv", sourceUrl: "https://www.eia.gov/petroleum/gasdiesel/", seriesText: DIESEL_SERIES },
  });
  assert.equal(result.type, "EnergyPriceDirectiveSet");
  assert.equal(result.priced.length, 3);
  assert.equal(result.priced[0].commodity, "KWH");
  assert.equal(result.priced[0].usdPrice, "0.1423");
  assert.equal(result.priced[0].sourceUrl, "https://www.example-coop.coop/rates");
  assert.equal(result.unpriced.length, 0);
});

test("leaves a fuel unpriced rather than fabricating a price, propagated unchanged", () => {
  const result = deriveSetOfHouseholdEnergyPriceDirectives({
    date: "2026-01-01",
    household: { energyTariff: { utility: "Example Coop", rateScheduleName: "Residential", usdPerKwhTiers: [{ usdPerKwh: "0.1423" }], sourceUrl: "https://www.example-coop.coop/rates", asOf: "2026-07-01" } },
    propane: { sourceKind: "fixture", seriesText: PROPANE_SERIES },
    diesel: { sourceKind: "fetched-csv", sourceUrl: "https://www.eia.gov/petroleum/gasdiesel/", seriesText: DIESEL_SERIES },
  });
  assert.equal(result.priced.length, 1);
  assert.equal(result.unpriced.length, 2);
});

test("throws TypeError rather than fabricating a figure when the tariff has no usdPerKwhTiers", () => {
  assert.throws(
    () => deriveSetOfHouseholdEnergyPriceDirectives({
      date: "2026-09-05",
      household: { energyTariff: { utility: "Example Coop", rateScheduleName: "Residential", usdPerKwhTiers: [], sourceUrl: "https://www.example-coop.coop/rates", asOf: "2026-07-01" } },
      propane: { sourceKind: "fixture", seriesText: PROPANE_SERIES },
      diesel: { sourceKind: "fetched-csv", sourceUrl: "https://www.eia.gov/petroleum/gasdiesel/", seriesText: DIESEL_SERIES },
    }),
    /usdPerKwhTiers\[0\]\.usdPerKwh/u,
  );
});

test("throws TypeError when household.energyTariff is absent entirely", () => {
  assert.throws(
    () => deriveSetOfHouseholdEnergyPriceDirectives({ date: "2026-09-05", household: {}, propane: { sourceKind: "fixture", seriesText: PROPANE_SERIES }, diesel: { sourceKind: "fixture", seriesText: DIESEL_SERIES } }),
    TypeError,
  );
});

test("throws TypeError when energyTariff lacks a sourceUrl", () => {
  assert.throws(
    () => deriveSetOfHouseholdEnergyPriceDirectives({
      date: "2026-09-05",
      household: { energyTariff: { utility: "Example Coop", rateScheduleName: "Residential", usdPerKwhTiers: [{ usdPerKwh: "0.1423" }], asOf: "2026-07-01" } },
      propane: { sourceKind: "fixture", seriesText: PROPANE_SERIES },
      diesel: { sourceKind: "fixture", seriesText: DIESEL_SERIES },
    }),
    /sourceUrl/u,
  );
});
