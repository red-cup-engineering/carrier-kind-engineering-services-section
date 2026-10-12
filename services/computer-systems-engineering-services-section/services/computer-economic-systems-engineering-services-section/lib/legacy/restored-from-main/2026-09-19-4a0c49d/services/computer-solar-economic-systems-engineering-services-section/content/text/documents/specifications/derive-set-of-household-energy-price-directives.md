# derive-set-of-household-energy-price-directives
## Requirements
- `derives-household-directives`: The operation derives Beancount `KWH`/`PROPANE_GAL`/`DIESEL_GAL` price directives for one household by composing `@red-cup-engineering/derive-set-of-energy-price-directives-service`'s own `deriveSetOfEnergyPriceDirectives`, calling it with `electricity` read from `household.energyTariff.usdPerKwhTiers[0].usdPerKwh`, `household.energyTariff.sourceUrl`, and `household.energyTariff.asOf`, so the household's own tariff record is the only source of the electricity price.
- `returns-composed-shape-unchanged`: The operation returns the composed operation's own `EnergyPriceDirectiveSet` (`{type,version,date,directiveCount,priced,unpriced}`) exactly, adding no field and renaming none.
- `propagates-unpriced-fuel`: A `propane` or `diesel` weekly series with no row at or before `date` is left unpriced by the composed operation and passed through in the returned `unpriced` array unchanged; this operation invents no fallback price.
## Prohibitions
- `no-fabricated-tariff`: The operation must never invent a `usdPerKwh`, `sourceUrl`, or `asOf` figure when `household.energyTariff` or one of those three fields is absent; it must throw `TypeError`, mirroring `deriveSetOfEnergyPriceDirectives`'s own strict-input posture on `input.electricity`.
- `no-second-price-directive-renderer`: The operation must not reimplement Beancount price-directive rendering, weekly-series parsing, or decimal division; every one of those stays inside the composed `derive-set-of-energy-price-directives-service`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to the whole operation. | `deriveSetOfEnergyPriceDirectives` (KWH/PROPANE_GAL/DIESEL_GAL pricing, forward and inverse directive rendering) lives once in `@red-cup-engineering/derive-set-of-energy-price-directives-service@0.1.0`; this operation composes it by exact pin instead of re-deriving any of its arithmetic or rendering.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
- `evidence-status-in-plain-words` | Soft Dyson specification | 2026-09-05 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-economic-systems-engineering-services-section/services/computer-solar-economic-systems-engineering-services-section/content/text/documents/articles/specifications/2026-09-05-soft-dyson-specification.md | Applies to the household's own tariff record feeding this operation. | Every claim carries its evidence status in plain words: a tariff carries its own `sourceUrl` and `asOf`, so a directive derived here is traceable to the household's declared rate schedule rather than an assumed one.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-set-of-household-energy-price-directives-service","packageVersion":"0.1.0","license":"UNLICENSED","dependencies":{"@red-cup-engineering/derive-set-of-energy-price-directives-service":"0.1.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-set-of-household-energy-price-directives.mjs
#!/usr/bin/env node
import { deriveSetOfEnergyPriceDirectives } from "@red-cup-engineering/derive-set-of-energy-price-directives-service";

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
  if (process.argv.includes("--help")) {
    process.stdout.write("deriveSetOfHouseholdEnergyPriceDirectives — Derives Beancount `KWH`/`PROPANE_GAL`/`DIESEL_GAL` price directives for one household from its own `energy-tariff` record and weekly fuel series, composing `@red-cup-engineering/derive-set-of-energy-price-directives-service` for all pricing and rendering.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.trim().length > 0) process.stdout.write(`${JSON.stringify(deriveSetOfHouseholdEnergyPriceDirectives(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/derive-set-of-household-energy-price-directives.test.mjs
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
```
## Examples
```json name="derives KWH from the household's tariff and PROPANE_GAL/DIESEL_GAL from the weekly series"
{"input":{"date":"2026-09-05","household":{"energyTariff":{"utility":"Example Coop","rateScheduleName":"Residential","usdPerKwhTiers":[{"usdPerKwh":"0.1423"}],"sourceUrl":"https://www.example-coop.coop/rates","asOf":"2026-07-01"}},"propane":{"sourceKind":"fixture","seriesText":"Date,Weekly Midwest (PADD 2) Propane Residential Price (Dollars per Gallon)\n08/25/2026,1.234\n09/01/2026,1.245\n"},"diesel":{"sourceKind":"fetched-csv","sourceUrl":"https://www.eia.gov/petroleum/gasdiesel/","seriesText":"Date,Weekly U.S. No 2 Diesel Retail Prices (Dollars per Gallon)\n2026-08-31,3.512\n"}},"output":{"type":"EnergyPriceDirectiveSet","version":1,"date":"2026-09-05","directiveCount":6,"priced":[{"commodity":"KWH","usdPrice":"0.1423","inversePrice":"7.0274068868","sourceKind":"declared","sourceUrl":"https://www.example-coop.coop/rates","observedDate":"2026-07-01","directive":"2026-09-05 price KWH 0.1423 USD\n  source_kind: \"declared\"\n  source_url: \"https://www.example-coop.coop/rates\"\n  observed_date: \"2026-07-01\"","inverseDirective":"2026-09-05 price USD 7.0274068868 KWH\n  source_kind: \"declared\"\n  source_url: \"https://www.example-coop.coop/rates\"\n  observed_date: \"2026-07-01\"\n  inverse_of: \"KWH\""},{"commodity":"PROPANE_GAL","usdPrice":"1.245","inversePrice":"0.8032128514","sourceKind":"fixture","sourceUrl":null,"observedDate":"2026-09-01","directive":"2026-09-05 price PROPANE_GAL 1.245 USD\n  source_kind: \"fixture\"\n  source_url: \"\"\n  observed_date: \"2026-09-01\"","inverseDirective":"2026-09-05 price USD 0.8032128514 PROPANE_GAL\n  source_kind: \"fixture\"\n  source_url: \"\"\n  observed_date: \"2026-09-01\"\n  inverse_of: \"PROPANE_GAL\""},{"commodity":"DIESEL_GAL","usdPrice":"3.512","inversePrice":"0.284738041","sourceKind":"fetched-csv","sourceUrl":"https://www.eia.gov/petroleum/gasdiesel/","observedDate":"2026-08-31","directive":"2026-09-05 price DIESEL_GAL 3.512 USD\n  source_kind: \"fetched-csv\"\n  source_url: \"https://www.eia.gov/petroleum/gasdiesel/\"\n  observed_date: \"2026-08-31\"","inverseDirective":"2026-09-05 price USD 0.284738041 DIESEL_GAL\n  source_kind: \"fetched-csv\"\n  source_url: \"https://www.eia.gov/petroleum/gasdiesel/\"\n  observed_date: \"2026-08-31\"\n  inverse_of: \"DIESEL_GAL\""}],"unpriced":[]}}
```
## Traceability
- `derives-household-directives` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `evidence-status-in-plain-words`
- `returns-composed-shape-unchanged` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
- `propagates-unpriced-fuel` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
- `no-fabricated-tariff` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `evidence-status-in-plain-words`, `node-esm-operation`
- `no-second-price-directive-renderer` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
