#!/usr/bin/env node
import { JOULES_PER_KWH, barrierJoulesForUnit } from "@red-cup-engineering/consumption-hedge-service";
import { multiplyDecimalStrings } from "@red-cup-engineering/computer-ledger-system-services-section/src/decimal.mjs";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

const JOULES_PER_KCAL = 4184;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

function requireObject(value, context) {
  if (value === null || typeof value !== "object") throw new TypeError(`derive-household-energy-barrier: ${context} must be an object`);
  return value;
}

function requireAmountString(value, context) {
  if (typeof value !== "string" || value.length === 0 || !Number.isFinite(Number(value))) {
    throw new TypeError(`derive-household-energy-barrier: ${context} must be a non-empty numeric string`);
  }
  return value;
}

function requireDate(value, context) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) throw new TypeError(`derive-household-energy-barrier: ${context} must be a YYYY-MM-DD date string`);
  return value;
}

/**
 * Joules of heating energy for a declared amount and unit; `"JOULES"` passes through unchanged, `"PROPANE_GAL"`/`"KWH"` compose `consumption-hedge-service`'s own `barrierJoulesForUnit`, and any other unit (`"DIESEL_GAL"`, `"CORD_WOOD"`) is refused by that composed function's own strict-input posture.
 * @param {{amount: string, unit: "PROPANE_GAL"|"DIESEL_GAL"|"CORD_WOOD"|"KWH"|"JOULES"}} heatingEnergy
 * @returns {number}
 * @throws {TypeError} When `unit` is not convertible, mirroring `barrierJoulesForUnit`'s own refusal.
 */
function heatingJoules(heatingEnergy) {
  const amount = requireAmountString(heatingEnergy?.amount, "heatingEnergy.amount");
  if (heatingEnergy.unit === "JOULES") return Number(amount);
  return barrierJoulesForUnit(amount, heatingEnergy.unit);
}

/**
 * Joules of food energy for a declared amount and unit; `"JOULES"` passes through unchanged, `"KCAL"` is converted by the thermochemical-calorie definition (`JOULES_PER_KCAL`).
 * @param {{amount: string, unit: "JOULES"|"KCAL"}} foodEnergy
 * @returns {number}
 * @throws {TypeError} When `unit` is neither `"JOULES"` nor `"KCAL"`.
 */
function foodJoules(foodEnergy) {
  const amount = Number(requireAmountString(foodEnergy?.amount, "foodEnergy.amount"));
  if (foodEnergy.unit === "JOULES") return amount;
  if (foodEnergy.unit === "KCAL") return amount * JOULES_PER_KCAL;
  throw new TypeError(`derive-household-energy-barrier: foodEnergy.unit must be "JOULES" or "KCAL", got ${JSON.stringify(foodEnergy?.unit)}`);
}

function requireUsdPerKwh(tariff) {
  requireObject(tariff, "tariff");
  const usdPerKwh = tariff.usdPerKwhTiers?.[0]?.usdPerKwh;
  if (typeof usdPerKwh !== "string" || usdPerKwh.length === 0) throw new TypeError("derive-household-energy-barrier: tariff.usdPerKwhTiers[0].usdPerKwh must be a non-empty string");
  return usdPerKwh;
}

/**
 * Derives a household's winter survival barrier -- heating energy plus food energy -- as a `position-sizing-service`-shaped `barrierJoules` record, in joules, kilowatt-hours, and USD at the household's own tariff.
 * @param {{ heatingEnergy: { amount: string, unit: "PROPANE_GAL"|"DIESEL_GAL"|"CORD_WOOD"|"KWH"|"JOULES" }, foodEnergy: { amount: string, unit: "JOULES"|"KCAL" }, tariff: { usdPerKwhTiers: readonly { usdPerKwh: string }[] }, asOf: string }} request
 * @returns {{ amount: string, unit: "joules", kwh: string, usdPerKwh: string, usdTotal: string, asOf: string }} Exactly `position-sizing-service`'s `sleeve.barrierJoules` shape plus the two convenience fields `kwh`/`usdTotal`.
 * @throws {TypeError} On an unconvertible unit or a missing declared field, mirroring `consumption-hedge-service`'s own strict-input posture: nothing is estimated internally.
 */
export function deriveHouseholdEnergyBarrier(request) {
  requireObject(request, "request");
  const totalJoules = heatingJoules(requireObject(request.heatingEnergy, "heatingEnergy")) + foodJoules(requireObject(request.foodEnergy, "foodEnergy"));
  const usdPerKwh = requireUsdPerKwh(request.tariff);
  const asOf = requireDate(request.asOf, "asOf");
  const amount = totalJoules.toFixed(3);
  const kwh = (totalJoules / JOULES_PER_KWH).toFixed(6);
  const usdTotal = multiplyDecimalStrings(kwh, usdPerKwh, 6);
  return { amount, unit: "joules", kwh, usdPerKwh, usdTotal, asOf };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "derive-household-energy-barrier", description: "Derives a household's winter survival barrier -- heating energy plus food energy -- as a `position-sizing-service`-shaped `barrierJoules` record, in joules, kilowatt-hours, and USD at the household's own tariff.", operation: deriveHouseholdEnergyBarrier }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
