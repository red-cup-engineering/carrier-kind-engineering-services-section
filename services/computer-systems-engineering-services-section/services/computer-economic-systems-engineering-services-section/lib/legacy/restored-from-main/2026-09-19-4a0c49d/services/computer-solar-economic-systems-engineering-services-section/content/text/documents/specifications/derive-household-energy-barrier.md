# derive-household-energy-barrier
## Requirements
- `sums-heating-and-food-joules`: The operation converts a household's declared winter heating energy and food energy to joules and sums them into one `barrierJoules`-shaped record, composing `@red-cup-engineering/consumption-hedge-service`'s own `barrierJoulesForUnit` and `JOULES_PER_KWH` for every joule conversion this package already owns.
- `returns-sleeve-barrier-shape`: The operation returns exactly `@red-cup-engineering/position-sizing-service`'s `sleeve.barrierJoules` shape (`{amount, unit: "joules", usdPerKwh, asOf}`, `amount`/`usdPerKwh` plain decimal strings) plus the two convenience fields `kwh` and `usdTotal`, so the reading composes directly into a sleeve's sizing request without translation.
- `prices-at-declared-tariff`: `usdPerKwh` is read from `tariff.usdPerKwhTiers[0].usdPerKwh` and `usdTotal` is `kwh * usdPerKwh` computed as an exact decimal multiplication (`@red-cup-engineering/computer-ledger-system-services-section`'s own `multiplyDecimalStrings`), never a hand-rolled float multiply on money.
- `food-energy-in-joules-or-kcal`: `foodEnergy.unit` of `"JOULES"` passes the amount through unchanged; `"KCAL"` is converted by the thermochemical-calorie definition (`1 kcal = 4184 J` exactly, NIST/BIPM), a physical definitional constant this operation declares once as a module constant, the same way `consumption-hedge-service` itself declares `JOULES_PER_BTU`/`BTU_PER_GALLON_PROPANE` as physical constants rather than sourced parameters -- no house package publishes a KCAL/joule constant to compose instead.
## Prohibitions
- `no-estimated-energy`: The operation must never estimate or default a household's heating or food energy; `heatingEnergy` and `foodEnergy` are both required declared parameters.
- `no-unconvertible-unit-silently-priced`: A `heatingEnergy.unit` of `"DIESEL_GAL"` or `"CORD_WOOD"` must throw `TypeError` rather than being silently priced at zero or an invented factor -- `barrierJoulesForUnit` itself refuses any unit outside `PROPANE_GAL`/`KWH`, and this operation composes that refusal rather than adding its own conversion for those units.
- `no-second-joule-conversion`: The operation must not reimplement `JOULES_PER_GALLON_PROPANE`, `JOULES_PER_BTU`, or `JOULES_PER_KWH`; every one of those stays inside the composed `consumption-hedge-service`.
- `no-position-sizing-call`: The operation must not call `position-sizing-service`'s own `sizePosition`; sizing a position from this barrier is the caller's own later step.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to every joule conversion and decimal multiplication in this operation. | `barrierJoulesForUnit`/`JOULES_PER_KWH` (joule conversion) and `multiplyDecimalStrings` (exact decimal money math) each live once in `consumption-hedge-service@0.1.0` and `computer-ledger-system-services-section@0.6.0`; this operation composes both by exact pin instead of re-deriving either.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
- `survival-barrier-in-joules` | Soft Dyson specification, citing the fintech-under-energy-descent note section 2 | 2026-09-05 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-economic-systems-engineering-services-section/services/computer-solar-economic-systems-engineering-services-section/content/text/documents/articles/specifications/2026-09-05-soft-dyson-specification.md | Applies to the whole operation. | The survival barrier is denominated in joules so it is invariant under a currency regime change; this operation returns joules as the primary `amount`/`unit`, with `kwh`/`usdTotal` as derived convenience fields only.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
- `thermochemical-calorie` | Bureau International des Poids et Mesures (BIPM) / NIST Special Publication 811 | 1956 definition, NIST SP 811 (2008 ed.) | https://www.nist.gov/pml/special-publication-811 | Applies to the `JOULES_PER_KCAL` module constant. | The thermochemical calorie is defined as exactly 4.184 J, so 1 kcal (1000 thermochemical calories) is exactly 4184 J -- a fixed unit-conversion definition, not a measured or sourced market fact.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-household-energy-barrier-service","packageVersion":"0.1.0","license":"UNLICENSED","dependencies":{"@red-cup-engineering/consumption-hedge-service":"0.1.0","@red-cup-engineering/computer-ledger-system-services-section":"0.6.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-household-energy-barrier.mjs
#!/usr/bin/env node
import { JOULES_PER_KWH, barrierJoulesForUnit } from "@red-cup-engineering/consumption-hedge-service";
import { multiplyDecimalStrings } from "@red-cup-engineering/computer-ledger-system-services-section/src/decimal.mjs";

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
  if (process.argv.includes("--help")) {
    process.stdout.write("deriveHouseholdEnergyBarrier — Derives a household's winter survival barrier -- heating energy plus food energy -- as a position-sizing-service-shaped barrierJoules record, in joules, kilowatt-hours, and USD at the household's own tariff.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.trim().length > 0) process.stdout.write(`${JSON.stringify(deriveHouseholdEnergyBarrier(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/derive-household-energy-barrier.test.mjs
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
```
## Examples
```json name="sums propane heating and kcal food energy into one joule barrier"
{"input":{"heatingEnergy":{"amount":"0","unit":"JOULES"},"foodEnergy":{"amount":"3600000","unit":"JOULES"},"tariff":{"usdPerKwhTiers":[{"usdPerKwh":"0.1423"}]},"asOf":"2026-09-05"},"output":{"amount":"3600000.000","unit":"joules","kwh":"1.000000","usdPerKwh":"0.1423","usdTotal":"0.1423","asOf":"2026-09-05"}}
```
## Traceability
- `sums-heating-and-food-joules` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `survival-barrier-in-joules`
- `returns-sleeve-barrier-shape` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `survival-barrier-in-joules`
- `prices-at-declared-tariff` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
- `food-energy-in-joules-or-kcal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `thermochemical-calorie`
- `no-estimated-energy` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `survival-barrier-in-joules`, `node-esm-operation`
- `no-unconvertible-unit-silently-priced` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
- `no-second-joule-conversion` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `no-position-sizing-call` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `survival-barrier-in-joules`
