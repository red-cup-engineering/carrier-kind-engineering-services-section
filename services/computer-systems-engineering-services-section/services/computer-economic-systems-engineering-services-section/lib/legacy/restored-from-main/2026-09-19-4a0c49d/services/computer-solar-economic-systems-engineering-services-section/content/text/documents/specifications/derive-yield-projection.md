# derive-yield-projection
## Requirements
- `yield-projection-result`: Given a system's size, a place, a period length, and irradiance observations for that place, the operation sums the matching observations' daily GHI, multiplies by the system size and a performance ratio, and returns a `YieldProjection` record labeled `"projection"` and naming the dataset the irradiance observations came from.
- `declared-performance-ratio-default`: When `performanceRatio` is omitted, the operation uses a documented default (`0.80`) sourced to NREL's PVWatts Calculator system-loss guidance (https://pvwatts.nrel.gov/pvwatts.php), stated once as a commented module constant, never left unsourced.
- `pure-computation`: The operation performs no fetch, file read, or clock read; every input it needs (the observations, the system size, the ratio, the period) is a parameter, so it is deterministic and re-runnable against a fixture.
## Prohibitions
- `no-observation-for-place-refusal`: The operation must refuse as data, never throw, when `irradianceObservations` is empty or contains no row matching the requested `place`.
- `no-fetch`: The operation must not fetch irradiance data itself; that is `observe-irradiance`'s own job.
- `no-measurement-claim`: The operation must always label its output `"projection"` and must never claim the figure is a measurement.
## Laws
- `admitted-example-face-equivalence` | JSNode operation face-equivalence law | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-code-fabrication-services-section/services/javascript-node-code-fabrication-services-section/services/jsnode-package-services-section/README.md | Applies to the shared examples projected to the JSNode import and command faces. | Every admitted example has equivalent import and command outputs under the downstream JSNode face assay.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file that is eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-yield-projection-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-yield-projection.mjs
#!/usr/bin/env node
// NREL PVWatts Calculator (https://pvwatts.nrel.gov/pvwatts.php) documents a default
// system-loss-derived performance ratio in the 0.75-0.85 range; 0.80 is the declared
// mid-range default used when a caller does not state its own ratio.
const DEFAULT_PERFORMANCE_RATIO = "0.80";

function observationsForPlace(observations, place) {
  return observations.filter((observation) => observation.place.lat === place.lat && observation.place.lon === place.lon);
}

/**
 * Projects a system's kilowatt-hour yield over a period from a place's already-observed
 * irradiance, labeled a projection with its dataset named.
 * @param {object} request A record with place ({lat, lon}), irradianceObservations
 *   (IrradianceObservation[]), systemSizeKw, periodDays, and optional performanceRatio.
 * @returns {object} A YieldProjection record, or a no-observation-for-place refusal datum.
 * @throws {TypeError} When place, irradianceObservations, systemSizeKw, or periodDays is
 *   malformed.
 */
export function deriveYieldProjection(request) {
  if (typeof request?.place?.lat !== "number" || typeof request?.place?.lon !== "number") {
    throw new TypeError("place.lat and place.lon are required numbers");
  }
  if (!Array.isArray(request?.irradianceObservations)) {
    throw new TypeError("irradianceObservations must be an array");
  }
  if (typeof request?.systemSizeKw !== "string" || request.systemSizeKw.length === 0) {
    throw new TypeError("systemSizeKw is required");
  }
  if (!Number.isInteger(request?.periodDays)) {
    throw new TypeError("periodDays must be an integer");
  }
  const matched = observationsForPlace(request.irradianceObservations, request.place);
  if (matched.length === 0) {
    return { refused: true, reason: "no-observation-for-place" };
  }
  const performanceRatio = typeof request.performanceRatio === "string" ? request.performanceRatio : DEFAULT_PERFORMANCE_RATIO;
  const totalGhi = matched.reduce((sum, observation) => sum + Number(observation.dailyGhiKwhPerM2), 0);
  const projectedKwh = totalGhi * Number(request.systemSizeKw) * Number(performanceRatio);
  const latest = matched.reduce((a, b) => (a.asOf > b.asOf ? a : b));
  return {
    type: "YieldProjection",
    version: 1,
    label: "projection",
    projectedKwh: projectedKwh.toFixed(4),
    datasetName: latest.datasetName,
    datasetUrl: latest.datasetUrl,
    methodology: latest.methodology,
    asOf: latest.asOf,
  };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("deriveYieldProjection — Projects a system's kilowatt-hour yield over a period from a place's already-observed irradiance, labeled a projection with its dataset named.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.trim().length === 0) continue;
      process.stdout.write(`${JSON.stringify(deriveYieldProjection(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/derive-yield-projection.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { deriveYieldProjection } from "../scripts/derive-yield-projection.mjs";

const place = { lat: 43.02, lon: -102.55 };
const observations = [
  { place, dailyGhiKwhPerM2: "3.0", date: "2026-01-01", datasetName: "NASA POWER", datasetUrl: "https://power.larc.nasa.gov/api/temporal/daily/point", methodology: "satellite-reanalysis", asOf: "2026-09-05" },
  { place, dailyGhiKwhPerM2: "2.5", date: "2026-01-02", datasetName: "NASA POWER", datasetUrl: "https://power.larc.nasa.gov/api/temporal/daily/point", methodology: "satellite-reanalysis", asOf: "2026-09-05" },
];

test("projects yield from matching observations with the default performance ratio", () => {
  const result = deriveYieldProjection({ place, irradianceObservations: observations, systemSizeKw: "5", periodDays: 2 });
  assert.equal(result.type, "YieldProjection");
  assert.equal(result.label, "projection");
  assert.equal(result.projectedKwh, (5.5 * 5 * 0.8).toFixed(4));
  assert.equal(result.datasetName, "NASA POWER");
});

test("an explicit performanceRatio overrides the default", () => {
  const result = deriveYieldProjection({ place, irradianceObservations: observations, systemSizeKw: "5", periodDays: 2, performanceRatio: "0.9" });
  assert.equal(result.projectedKwh, (5.5 * 5 * 0.9).toFixed(4));
});

test("refuses as data on empty observations", () => {
  const result = deriveYieldProjection({ place, irradianceObservations: [], systemSizeKw: "5", periodDays: 2 });
  assert.deepEqual(result, { refused: true, reason: "no-observation-for-place" });
});

test("refuses as data when no observation matches the requested place", () => {
  const result = deriveYieldProjection({
    place: { lat: 1, lon: 1 },
    irradianceObservations: observations,
    systemSizeKw: "5",
    periodDays: 2,
  });
  assert.deepEqual(result, { refused: true, reason: "no-observation-for-place" });
});

test("refuses a missing systemSizeKw", () => {
  assert.throws(() => deriveYieldProjection({ place, irradianceObservations: observations, periodDays: 2 }), /systemSizeKw is required/u);
});
```
## Examples
```json name="projects yield with the default performance ratio"
{"input":{"place":{"lat":43.02,"lon":-102.55},"irradianceObservations":[{"place":{"lat":43.02,"lon":-102.55},"dailyGhiKwhPerM2":"3.0","date":"2026-01-01","datasetName":"NASA POWER","datasetUrl":"https://power.larc.nasa.gov/api/temporal/daily/point","methodology":"satellite-reanalysis","asOf":"2026-09-05"}],"systemSizeKw":"5","periodDays":1},"output":{"type":"YieldProjection","version":1,"label":"projection","projectedKwh":"12.0000","datasetName":"NASA POWER","datasetUrl":"https://power.larc.nasa.gov/api/temporal/daily/point","methodology":"satellite-reanalysis","asOf":"2026-09-05"}}
```
```json name="refuses as data on empty observations"
{"input":{"place":{"lat":43.02,"lon":-102.55},"irradianceObservations":[],"systemSizeKw":"5","periodDays":1},"output":{"refused":true,"reason":"no-observation-for-place"}}
```
## Traceability
- `yield-projection-result` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `declared-performance-ratio-default` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `pure-computation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-observation-for-place-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-fetch` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-measurement-claim` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
