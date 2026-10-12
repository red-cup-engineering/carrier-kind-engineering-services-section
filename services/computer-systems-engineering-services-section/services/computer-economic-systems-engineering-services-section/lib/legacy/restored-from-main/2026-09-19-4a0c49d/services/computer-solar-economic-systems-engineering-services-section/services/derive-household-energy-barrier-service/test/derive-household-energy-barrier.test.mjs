import assert from "node:assert/strict";
import test from "node:test";
import { deriveHouseholdEnergyBarrier } from "../scripts/derive-household-energy-barrier.mjs";

const TARIFF = { usdPerKwhTiers: [{ usdPerKwh: "0.1423" }] };

test("sums propane heating joules and kcal food joules into one barrier", () => {
  const result = deriveHouseholdEnergyBarrier({
    heatingEnergy: { amount: "300", unit: "PROPANE_GAL" },
    foodEnergy: { amount: "2000", unit: "KCAL" },
    tariff: TARIFF,
    asOf: "2026-09-05",
  });
  assert.equal(result.unit, "joules");
  assert.equal(result.amount, (300 * 91500 * 1055 + 2000 * 4184).toFixed(3));
  assert.equal(result.usdPerKwh, "0.1423");
  assert.equal(result.asOf, "2026-09-05");
});

test("passes JOULES units through on both heating and food energy", () => {
  const result = deriveHouseholdEnergyBarrier({
    heatingEnergy: { amount: "1000000", unit: "JOULES" },
    foodEnergy: { amount: "500000", unit: "JOULES" },
    tariff: TARIFF,
    asOf: "2026-09-05",
  });
  assert.equal(result.amount, "1500000.000");
});

test("computes kwh and usdTotal as an exact decimal multiplication", () => {
  const result = deriveHouseholdEnergyBarrier({
    heatingEnergy: { amount: "0", unit: "KWH" },
    foodEnergy: { amount: "3600000", unit: "JOULES" },
    tariff: TARIFF,
    asOf: "2026-09-05",
  });
  assert.equal(result.kwh, "1.000000");
  assert.equal(result.usdTotal, "0.1423");
});

test("throws TypeError on an unconvertible heating unit rather than pricing it silently", () => {
  assert.throws(
    () => deriveHouseholdEnergyBarrier({ heatingEnergy: { amount: "10", unit: "DIESEL_GAL" }, foodEnergy: { amount: "0", unit: "JOULES" }, tariff: TARIFF, asOf: "2026-09-05" }),
    TypeError,
  );
  assert.throws(
    () => deriveHouseholdEnergyBarrier({ heatingEnergy: { amount: "10", unit: "CORD_WOOD" }, foodEnergy: { amount: "0", unit: "JOULES" }, tariff: TARIFF, asOf: "2026-09-05" }),
    TypeError,
  );
});

test("throws TypeError on an unrecognized food energy unit", () => {
  assert.throws(
    () => deriveHouseholdEnergyBarrier({ heatingEnergy: { amount: "0", unit: "JOULES" }, foodEnergy: { amount: "10", unit: "CALORIE" }, tariff: TARIFF, asOf: "2026-09-05" }),
    TypeError,
  );
});

test("throws TypeError when heatingEnergy or foodEnergy is absent", () => {
  assert.throws(() => deriveHouseholdEnergyBarrier({ foodEnergy: { amount: "0", unit: "JOULES" }, tariff: TARIFF, asOf: "2026-09-05" }), TypeError);
  assert.throws(() => deriveHouseholdEnergyBarrier({ heatingEnergy: { amount: "0", unit: "JOULES" }, tariff: TARIFF, asOf: "2026-09-05" }), TypeError);
});
