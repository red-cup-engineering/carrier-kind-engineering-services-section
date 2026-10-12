# observe-irradiance
## Requirements
- `irradiance-observation-result`: For the admitted, implemented `nasa-power` dataset, the operation fetches daily `ALLSKY_SFC_SW_DWN` GHI for a place and date range from the NASA POWER daily point API and returns one `IrradianceObservation` row per day, each carrying the place, the daily GHI in kWh/m², the dataset name and URL, its methodology, and an `asOf` date.
- `pvgis-declared-refused`: The `pvgis` dataset value is admitted by the specification but not yet implemented by this operation; requesting it returns a refusal datum naming reason `dataset-not-implemented`, never a thrown error and never a silent empty result.
- `dataset-not-admitted-refusal`: A `dataset` value outside `nasa-power`/`pvgis` returns a refusal datum naming reason `dataset-not-admitted` and the requested dataset.
- `fetch-failure-refusal`: An HTTP or network fetch failure against the NASA POWER API returns a refusal datum naming the URL and the HTTP status (or `null` for a network exception with no response), never a thrown error.
- `injected-fetch-parameter`: The operation calls only an injected `fetchImpl` parameter (defaulting to the global `fetch`), never a `node:http`/`node:https` import directly, so it is testable against a fixture with no real network access.
## Prohibitions
- `no-yield-derivation`: The operation must not compute or return a yield projection; that is `derive-yield-projection`'s own job.
- `no-api-key-parameter`: The operation must not accept or require an API-key parameter for the keyless `nasa-power` dataset.
- `no-silent-retry`: The operation must not retry a failed fetch silently past the dataset's own documented rate limit.
## Laws
- `admitted-example-face-equivalence` | JSNode operation face-equivalence law | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-code-fabrication-services-section/services/javascript-node-code-fabrication-services-section/services/jsnode-package-services-section/README.md | Applies to the shared examples projected to the JSNode import and command faces. | Every admitted example has equivalent import and command outputs under the downstream JSNode face assay.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file that is eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/observe-irradiance-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/observe-irradiance.mjs
#!/usr/bin/env node
const ADMITTED_DATASETS = Object.freeze(["nasa-power", "pvgis"]);
const NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point";

function toNasaPowerDate(isoDate) {
  return isoDate.replaceAll("-", "");
}

function fromNasaPowerDate(compactDate) {
  return `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}`;
}

/**
 * Fetches one public irradiance dataset's daily GHI for a place and date range and returns it
 * as irradiance-observation rows, or a refusal datum.
 * @param {object} request A record with place ({lat, lon}), startDate, endDate, dataset, and
 *   optional fetchImpl (injected fetch function, defaults to global fetch) and now (ISO date,
 *   defaults to today).
 * @returns {Promise<object[]|object>} An array of IrradianceObservation rows, or
 *   {refused: true, reason, ...}.
 * @throws {TypeError} When place, startDate, endDate, or dataset is malformed.
 */
export async function observeIrradiance(request) {
  if (typeof request?.dataset !== "string" || request.dataset.length === 0) {
    throw new TypeError("dataset is required");
  }
  if (typeof request?.place?.lat !== "number" || typeof request?.place?.lon !== "number") {
    throw new TypeError("place.lat and place.lon are required numbers");
  }
  if (typeof request?.startDate !== "string" || typeof request?.endDate !== "string") {
    throw new TypeError("startDate and endDate are required date strings");
  }
  if (!ADMITTED_DATASETS.includes(request.dataset)) {
    return { refused: true, reason: "dataset-not-admitted", dataset: request.dataset };
  }
  if (request.dataset === "pvgis") {
    return { refused: true, reason: "dataset-not-implemented", dataset: "pvgis" };
  }
  const now = typeof request.now === "string" ? request.now : new Date().toISOString().slice(0, 10);
  const fetchImpl = typeof request.fetchImpl === "function" ? request.fetchImpl : fetch;
  const url = `${NASA_POWER_URL}?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${request.place.lon}&latitude=${request.place.lat}&start=${toNasaPowerDate(request.startDate)}&end=${toNasaPowerDate(request.endDate)}&format=JSON`;
  let response;
  try {
    response = await fetchImpl(url);
  } catch {
    return { refused: true, reason: "fetch-failed", url, status: null };
  }
  if (!response.ok) {
    return { refused: true, reason: "fetch-failed", url, status: response.status };
  }
  const body = await response.json();
  const series = body?.properties?.parameter?.ALLSKY_SFC_SW_DWN ?? {};
  return Object.entries(series).map(([compactDate, value]) => ({
    place: { lat: request.place.lat, lon: request.place.lon },
    dailyGhiKwhPerM2: String(value),
    date: fromNasaPowerDate(compactDate),
    datasetName: "NASA POWER",
    datasetUrl: NASA_POWER_URL,
    methodology: "satellite-reanalysis",
    asOf: now,
  }));
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("observeIrradiance — Fetches one public irradiance dataset's daily GHI for a place and date range and returns it as irradiance-observation rows, or a refusal datum.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.trim().length === 0) continue;
      process.stdout.write(`${JSON.stringify(await observeIrradiance(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/observe-irradiance.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { observeIrradiance } from "../scripts/observe-irradiance.mjs";

function fixtureFetch(payload, { ok = true, status = 200 } = {}) {
  return async () => ({ ok, status, json: async () => payload });
}

test("nasa-power returns one IrradianceObservation row per day", async () => {
  const fetchImpl = fixtureFetch({
    properties: { parameter: { ALLSKY_SFC_SW_DWN: { "20260101": 3.45, "20260102": 3.1 } } },
  });
  const rows = await observeIrradiance({
    place: { lat: 43.02, lon: -102.55 },
    startDate: "2026-01-01",
    endDate: "2026-01-02",
    dataset: "nasa-power",
    fetchImpl,
    now: "2026-09-05",
  });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    place: { lat: 43.02, lon: -102.55 },
    dailyGhiKwhPerM2: "3.45",
    date: "2026-01-01",
    datasetName: "NASA POWER",
    datasetUrl: "https://power.larc.nasa.gov/api/temporal/daily/point",
    methodology: "satellite-reanalysis",
    asOf: "2026-09-05",
  });
});

test("pvgis is declared admitted but refuses as not-yet-implemented", async () => {
  const result = await observeIrradiance({
    place: { lat: 43.02, lon: -102.55 },
    startDate: "2026-01-01",
    endDate: "2026-01-02",
    dataset: "pvgis",
  });
  assert.deepEqual(result, { refused: true, reason: "dataset-not-implemented", dataset: "pvgis" });
});

test("an unadmitted dataset refuses as data", async () => {
  const result = await observeIrradiance({
    place: { lat: 43.02, lon: -102.55 },
    startDate: "2026-01-01",
    endDate: "2026-01-02",
    dataset: "open-meteo",
  });
  assert.deepEqual(result, { refused: true, reason: "dataset-not-admitted", dataset: "open-meteo" });
});

test("a non-ok response refuses naming the url and status, never throws", async () => {
  const fetchImpl = fixtureFetch({}, { ok: false, status: 429 });
  const result = await observeIrradiance({
    place: { lat: 43.02, lon: -102.55 },
    startDate: "2026-01-01",
    endDate: "2026-01-02",
    dataset: "nasa-power",
    fetchImpl,
  });
  assert.equal(result.refused, true);
  assert.equal(result.reason, "fetch-failed");
  assert.equal(result.status, 429);
});

test("a network exception refuses with a null status, never throws", async () => {
  const fetchImpl = async () => { throw new Error("network unreachable"); };
  const result = await observeIrradiance({
    place: { lat: 43.02, lon: -102.55 },
    startDate: "2026-01-01",
    endDate: "2026-01-02",
    dataset: "nasa-power",
    fetchImpl,
  });
  assert.deepEqual(result, {
    refused: true,
    reason: "fetch-failed",
    url: result.url,
    status: null,
  });
});

test("refuses a missing dataset", async () => {
  await assert.rejects(
    () => observeIrradiance({ place: { lat: 1, lon: 1 }, startDate: "2026-01-01", endDate: "2026-01-02" }),
    /dataset is required/u,
  );
});
```
## Examples
```json name="pvgis is declared but refused until implemented"
{"input":{"place":{"lat":43.02,"lon":-102.55},"startDate":"2026-01-01","endDate":"2026-01-01","dataset":"pvgis"},"output":{"refused":true,"reason":"dataset-not-implemented","dataset":"pvgis"}}
```
```json name="an unadmitted dataset refuses as data"
{"input":{"place":{"lat":43.02,"lon":-102.55},"startDate":"2026-01-01","endDate":"2026-01-01","dataset":"open-meteo"},"output":{"refused":true,"reason":"dataset-not-admitted","dataset":"open-meteo"}}
```
## Traceability
- `irradiance-observation-result` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `pvgis-declared-refused` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `dataset-not-admitted-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `fetch-failure-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `injected-fetch-parameter` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-yield-derivation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-api-key-parameter` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-silent-retry` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
