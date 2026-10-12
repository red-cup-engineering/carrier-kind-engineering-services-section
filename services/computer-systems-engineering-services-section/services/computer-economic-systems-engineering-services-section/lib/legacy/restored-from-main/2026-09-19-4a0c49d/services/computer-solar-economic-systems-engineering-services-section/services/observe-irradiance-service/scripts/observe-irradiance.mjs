#!/usr/bin/env node
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";
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
  const result = await runJavascriptNodeOperation({ name: "observe-irradiance", description: "Fetches one public irradiance dataset's daily GHI for a place and date range and returns it as irradiance-observation rows, or a refusal datum.", operation: observeIrradiance }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
