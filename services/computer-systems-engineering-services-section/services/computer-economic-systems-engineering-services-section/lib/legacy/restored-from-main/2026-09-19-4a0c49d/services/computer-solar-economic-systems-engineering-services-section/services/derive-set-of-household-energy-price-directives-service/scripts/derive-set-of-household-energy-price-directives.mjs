#!/usr/bin/env node
import { deriveSetOfEnergyPriceDirectives } from "@red-cup-engineering/derive-set-of-energy-price-directives-service";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

function requireEnergyTariffField(energyTariff, field) {
  if (energyTariff === null || typeof energyTariff !== "object") {
    throw new TypeError("derive-set-of-household-energy-price-directives: household.energyTariff must be an object");
  }
  const value = field === "usdPerKwh" ? energyTariff.usdPerKwhTiers?.[0]?.usdPerKwh : energyTariff[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`derive-set-of-household-energy-price-directives: household.energyTariff.${field === "usdPerKwh" ? "usdPerKwhTiers[0].usdPerKwh" : field} must be a non-empty string`);
  }
  return value;
}

/**
 * Derives Beancount `KWH`/`PROPANE_GAL`/`DIESEL_GAL` price directives for one household from its own `energy-tariff` record and weekly fuel series, composing `@red-cup-engineering/derive-set-of-energy-price-directives-service` for all pricing and rendering.
 * @param {{ date: string, household: { energyTariff: { usdPerKwhTiers: readonly { usdPerKwh: string }[], sourceUrl: string, asOf: string } }, propane: { sourceKind: "fetched-csv"|"fixture", sourceUrl?: string, seriesText: string }, diesel: { sourceKind: "fetched-csv"|"fixture", sourceUrl?: string, seriesText: string } }} request A record with the reporting date, the household's own `energy-tariff` record, and each weekly series' already-obtained CSV text.
 * @returns {object} The composed operation's own `EnergyPriceDirectiveSet`, unchanged.
 * @throws {TypeError} When `request.household.energyTariff` is absent, or lacks a `usdPerKwhTiers[0].usdPerKwh`, `sourceUrl`, or `asOf`.
 */
export function deriveSetOfHouseholdEnergyPriceDirectives(request) {
  if (request === null || typeof request !== "object") {
    throw new TypeError("derive-set-of-household-energy-price-directives: request must be an object");
  }
  const energyTariff = request.household?.energyTariff;
  const usdPerKwh = requireEnergyTariffField(energyTariff, "usdPerKwh");
  const sourceUrl = requireEnergyTariffField(energyTariff, "sourceUrl");
  const asOf = requireEnergyTariffField(energyTariff, "asOf");
  return deriveSetOfEnergyPriceDirectives({
    date: request.date,
    electricity: { usdPerKwh, sourceUrl, asOf },
    propane: request.propane,
    diesel: request.diesel,
  });
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "derive-set-of-household-energy-price-directives", description: "Derives Beancount `KWH`/`PROPANE_GAL`/`DIESEL_GAL` price directives for one household from its own `energy-tariff` record and weekly fuel series, composing `@red-cup-engineering/derive-set-of-energy-price-directives-service` for all pricing and rendering.", operation: deriveSetOfHouseholdEnergyPriceDirectives }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
