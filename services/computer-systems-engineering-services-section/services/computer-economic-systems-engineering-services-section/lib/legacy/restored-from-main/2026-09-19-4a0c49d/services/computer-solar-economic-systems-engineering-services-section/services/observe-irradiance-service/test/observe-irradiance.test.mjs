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
