import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { canonicalJsonByteCarrier, encodeJsonByteCarrier } from "@red-cup-engineering/computer-data-engine/json";

export const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const ACTOR = "urn:ame:climate-research-enterprise";
export const CHANNEL = "urn:ame:climate-youtube-channel-enterprise";
export const MARKET = "urn:ame:climate-place-market-enterprise";
export const CATEGORY = "climate-research.packet-admission";
const MODELS = ["ACCESS-CM2", "MIROC6", "MPI-ESM1-2-HR"];
const NASA_HISTORY = "https://power.larc.nasa.gov/api/temporal/monthly/point";
const NASA_NEX_NCSS = "https://ds.nccs.nasa.gov/thredds/ncss/grid/AMES/NEX/GDDP-CMIP6";
const RESEARCH_METHOD_VERSION = 2;
function journal(options = {}) { return createSemanticRecordJournal({ root: resolve(options.dataRoot ?? join(NODE_ROOT, "data")), objectKind: "emsweb.climate-research.record" }); }
function records(category, options) { return journal(options).query({ category }).map(({ record }) => record); }
function record(category, value, at, options) { return journal(options).record({ category, recordedAt: at, record: value, charge: { support: true, refutation: false }, relation: { subject: ACTOR, predicate: "admits", object: value.id } }); }

export const canonical = canonicalJsonByteCarrier;
export function digest(value) { return `sha256:${createHash("sha256").update(value instanceof Uint8Array ? value : canonical(value)).digest("hex")}`; }
export function contentId(value) { return identifyJsonSemanticContent({ objectKind: "emsweb.climate-research.record", value: value, witnessRoot: EMPTY_WITNESS_ROOT }).token; }
function exact(value) { if (!value || typeof value !== "object" || Array.isArray(value)) return false; const { id, ...body } = value; return id === contentId(body); }
function mean(values) { const finite = values.filter(Number.isFinite); if (!finite.length) throw new TypeError("climate evidence contains no finite values"); return finite.reduce((sum, value) => sum + value, 0) / finite.length; }
function rounded(value, places = 2) { return value.toFixed(places); }
function placeCoordinates(place) { return { latitude: place.latitudeE6 / 1_000_000, longitude: place.longitudeE6 / 1_000_000 }; }
function activation(path = join(NODE_ROOT, "content/config/activation.json")) { const value = JSON.parse(readFileSync(path, "utf8")); if (value.status !== "active-public-reuse") throw new TypeError("climate research supplier is not active"); return value; }
function clearingValid(clearing) { return exact(clearing) && clearing.type === "ClimatePlaceDailyClearing" && clearing.market === MARKET && clearing.customer === CHANNEL && exact(clearing.place) && ["town", "city"].includes(clearing.place.kind) && Number.isSafeInteger(clearing.researchProcurementCeilingMicros) && clearing.researchProcurementCeilingMicros > 0; }
function deliver(packet, bytes) { const objectBody = { type: "ClimateResearchPacketDelivery", order: packet.order, packet, source: { ...packet.source }, byteCarrier: encodeJsonByteCarrier(bytes, { mediaType: packet.source.mediaType }) }, object = { id: contentId(objectBody), ...objectBody }, activityBody = { type: "Accept", actor: ACTOR, target: CHANNEL, object }; return { id: contentId(activityBody), ...activityBody }; }

export function formResearchOrder(clearing, requestedAt = new Date().toISOString()) {
  if (!clearingValid(clearing)) throw new TypeError("climate research order requires one exact place clearing");
  const body = { type: "ClimateResearchPacketOrder", methodVersion: RESEARCH_METHOD_VERSION, customer: CHANNEL, provider: ACTOR, marketClearing: clearing, maximumPriceMicros: clearing.researchProcurementCeilingMicros, accountingUnit: clearing.accountingUnit, requestedAt };
  return { id: contentId(body), ...body };
}

async function fetchJson(url, { fetchImpl = fetch, timeoutMs = 120000 } = {}) {
  const text = await fetchCarrier(url, { fetchImpl, timeoutMs, accept: "application/json", maximumBytes: 20 * 1024 * 1024 });
  if (text.length > 20 * 1024 * 1024) throw new TypeError("climate evidence response exceeded the bounded carrier");
  try { return JSON.parse(text); } catch { throw new TypeError("climate evidence provider returned non-JSON"); }
}

async function fetchText(url, { fetchImpl = fetch, timeoutMs = 120000 } = {}) {
  return fetchCarrier(url, { fetchImpl, timeoutMs, accept: "text/csv", maximumBytes: 5 * 1024 * 1024 });
}

async function fetchCarrier(url, { fetchImpl, timeoutMs, accept, maximumBytes }) {
  const target = new URL(url);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchImpl(target, { redirect: "error", headers: { accept, "user-agent": "emsWeb-Climate-Research/0.2 (+https://emsenn.net/)" }, signal: AbortSignal.timeout(timeoutMs) });
      const text = await response.text();
      if (text.length > maximumBytes) throw new TypeError("climate evidence response exceeded the bounded carrier");
      if (response.ok) return text;
      if (response.status < 500 && response.status !== 429) throw new Error(`climate evidence provider refused ${response.status}: ${text.slice(0, 300)}`);
      if (attempt === 3) throw new Error(`climate evidence provider refused ${response.status} after bounded retries`);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("bounded carrier")) throw error;
      if (attempt === 3) throw new Error(`climate evidence transport failed after bounded retries for ${target.pathname}: ${error.message}`, { cause: error });
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 750));
  }
  throw new Error("climate evidence retry loop ended unexpectedly");
}

function summarizeHistory(payload, startYear, endYear) {
  const parameters = payload?.properties?.parameter;
  if (!parameters?.T2M || !parameters?.T2M_MAX || !parameters?.PRECTOTCORR) throw new TypeError("NASA POWER history lacks required parameters");
  const annual = [];
  for (let year = startYear; year <= endYear; year += 1) {
    const key = `${year}13`, temperatureC = parameters.T2M[key], maximumTemperatureC = parameters.T2M_MAX[key], precipitationMmPerDay = parameters.PRECTOTCORR[key];
    if ([temperatureC, maximumTemperatureC, precipitationMmPerDay].every(Number.isFinite)) annual.push({ year, temperatureC, maximumTemperatureC, precipitationMmPerDay });
  }
  if (annual.length < 30) throw new TypeError("NASA POWER history is shorter than thirty complete annual summaries");
  const early = annual.slice(0, 10), recent = annual.slice(-10), xs = annual.map((_, index) => index), xMean = mean(xs), yMean = mean(annual.map((row) => row.temperatureC));
  const slope = xs.reduce((sum, x, index) => sum + (x - xMean) * (annual[index].temperatureC - yMean), 0) / xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
  return { sourceYears: [annual[0].year, annual.at(-1).year], annualRows: annual.length, earlyTenYearMeanTemperatureC: rounded(mean(early.map((row) => row.temperatureC))), recentTenYearMeanTemperatureC: rounded(mean(recent.map((row) => row.temperatureC))), earlyToRecentTemperatureChangeC: rounded(mean(recent.map((row) => row.temperatureC)) - mean(early.map((row) => row.temperatureC))), linearTemperatureTrendCPerDecade: rounded(slope * 10), recentTenYearMeanDailyPrecipitationMm: rounded(mean(recent.map((row) => row.precipitationMmPerDay))) };
}

export function nexPointUrl(model, experiment, year, coordinates) {
  if (!MODELS.includes(model) || !["historical", "ssp585"].includes(experiment) || !Number.isInteger(year)) throw new TypeError("NEX point request requires an admitted model, experiment, and year");
  const file = `tas_day_${model}_${experiment}_r1i1p1f1_gn_${year}_v2.0.nc`;
  const url = new URL(`${NASA_NEX_NCSS}/${model}/${experiment}/r1i1p1f1/tas/${file}`);
  url.search = new URLSearchParams({ var: "tas", latitude: String(coordinates.latitude), longitude: String(coordinates.longitude), time_start: `${year}-01-01T12:00:00Z`, time_end: `${year}-12-31T12:00:00Z`, accept: "csv" });
  return url;
}

export function parseNexPointCsv(text, model, year) {
  const lines = String(text).trim().split(/\r?\n/u);
  if (!lines[0]?.includes('tas[unit="K"]')) throw new TypeError(`NASA NEX response omitted Kelvin tas for ${model} ${year}`);
  const values = lines.slice(1).map((line) => Number(line.slice(line.lastIndexOf(",") + 1))).filter(Number.isFinite);
  const expected = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000;
  if (values.length !== expected) throw new TypeError(`NASA NEX response is incomplete for ${model} ${year}`);
  return values.map((value) => value - 273.15);
}

async function mapConcurrent(values, limit, operation) {
  const output = new Array(values.length); let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => { while (cursor < values.length) { const index = cursor; cursor += 1; output[index] = await operation(values[index], index); } }));
  return output;
}

async function nexPeriodSummary(coordinates, experiment, fromYear, throughYear, options) {
  const jobs = MODELS.flatMap((model) => Array.from({ length: throughYear - fromYear + 1 }, (_, index) => ({ model, year: fromYear + index })));
  const results = await mapConcurrent(jobs, options.projectionConcurrency ?? 6, async ({ model, year }) => ({ model, values: parseNexPointCsv(await fetchText(nexPointUrl(model, experiment, year, coordinates), options), model, year) }));
  return MODELS.map((model) => ({ model, meanTemperatureC: rounded(mean(results.filter((row) => row.model === model).flatMap((row) => row.values))) }));
}

function markdownV1({ order, clearing, packetCore, history, projection }) {
  const modelRows = projection.models.map((row) => `| ${row.model} | ${Number(row.baselineMeanTemperatureC).toFixed(2)} | ${Number(row.futureMeanTemperatureC).toFixed(2)} | ${Number(row.temperatureChangeC).toFixed(2)} |`).join("\n");
  return Buffer.from(`# ${clearing.place.name}, ${clearing.place.region}: climate history and conditional outlook\n\n## Why this place was researched\n\nThe Climate Place Market cleared **${clearing.place.name}, ${clearing.place.region}, ${clearing.place.countryCode}** for ${clearing.civilDay}. The winning coverage bid offered ${(clearing.coverageRevenueMicros / 1_000_000).toFixed(2)} USD and reserved ${(clearing.researchProcurementCeilingMicros / 1_000_000).toFixed(2)} USD for research. This market result selects attention; it is not climate evidence.\n\nCoordinates: ${(clearing.place.latitudeE6 / 1_000_000).toFixed(4)}, ${(clearing.place.longitudeE6 / 1_000_000).toFixed(4)}.\n\n## Reanalysis-backed history, ${history.sourceYears[0]}–${history.sourceYears[1]}\n\nNASA POWER's MERRA-2-backed monthly service reports an annual mean near-surface temperature of **${Number(history.earlyTenYearMeanTemperatureC).toFixed(2)} °C** for the first ten complete years and **${Number(history.recentTenYearMeanTemperatureC).toFixed(2)} °C** for the most recent ten. Their difference is **${Number(history.earlyToRecentTemperatureChangeC).toFixed(2)} °C**. A simple least-squares line through the ${history.annualRows} annual values is **${Number(history.linearTemperatureTrendCPerDecade).toFixed(2)} °C per decade**. Recent mean daily precipitation is **${Number(history.recentTenYearMeanDailyPrecipitationMm).toFixed(2)} mm/day**.\n\nThese are gridded reanalysis values, not a local station record. They describe the model grid cell containing the place coordinates and can differ from lived conditions, especially near water, mountains, dense urban surfaces, or sparse observing networks.\n\n## Conditional CMIP6 outlook\n\nThe comparison uses three HighResMIP/CMIP6 models processed and bias-corrected by Open-Meteo. Each model's 2040–2049 output is compared with its own 2011–2020 baseline. The available ensemble behaves approximately like a high-emissions pathway and is not a probability-weighted forecast.\n\n| Model | 2011–2020 mean °C | 2040–2049 mean °C | Change °C |\n|---|---:|---:|---:|\n${modelRows}\n\nAcross these three models, local mean-temperature change ranges from **${Number(projection.temperatureChangeRangeC[0]).toFixed(2)} to ${Number(projection.temperatureChangeRangeC[1]).toFixed(2)} °C**, with a median of **${Number(projection.medianTemperatureChangeC).toFixed(2)} °C**. This range is model spread within one processed ensemble, not a complete uncertainty interval.\n\n## What can and cannot be concluded\n\n- The historical calculation supports a directional account of change in the reanalysis grid cell; it does not prove why any single event happened.\n- The projection comparison is conditional on model structure, bias correction, spatial downscaling, and a high-emissions-like pathway.\n- City-scale heat can be amplified by land cover and urban form that these model grids do not fully resolve. Precipitation is especially uncertain at local and storm scales.\n- No model row is privileged as the prediction. The spread should remain visible in narration.\n\n## Sources and method\n\n1. NASA POWER monthly point API, backed by MERRA-2 meteorology: https://power.larc.nasa.gov/docs/services/api/temporal/\n2. NASA POWER meteorology methodology: https://power.larc.nasa.gov/docs/methodology/meteorology/\n3. NASA NEX-GDDP-CMIP6 dataset description and limitations: https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/\n4. Open-Meteo Climate API processing documentation: https://open-meteo.com/en/docs/climate-api\n\nData were retrieved at ${packetCore.asOf}. Research order: ${order.id}. Market clearing: ${clearing.id}. Correction identity: ${packetCore.correctionIdentity}.\n\n## NotebookLM brief\n\nCreate a clear explanatory video about ${clearing.place.name}'s climate history and conditional outlook. Begin with the place and why market demand selected it. Distinguish NASA POWER gridded reanalysis from station observations. Explain the early-versus-recent temperature comparison and the simple trend without implying causation from the regression alone. Compare all three CMIP6 model rows, preserve their spread, and describe the outlook as conditional rather than predictive. Explain what downscaling, scenario choice, local geography, and urban form leave unresolved. End with practical questions residents and local institutions could ask of higher-resolution local records and planning documents. Do not use disaster spectacle or claim certainty that the evidence does not support.\n`, "utf8");
}

function markdownV2({ order, clearing, packetCore, history, projection }) {
  const modelRows = projection.models.map((row) => `| ${row.model} | ${Number(row.baselineMeanTemperatureC).toFixed(2)} | ${Number(row.futureMeanTemperatureC).toFixed(2)} | ${Number(row.temperatureChangeC).toFixed(2)} |`).join("\n");
  return Buffer.from(`# ${clearing.place.name}, ${clearing.place.region}: climate history and conditional outlook

## Why this place was researched

The Climate Place Market cleared **${clearing.place.name}, ${clearing.place.region}, ${clearing.place.countryCode}** for ${clearing.civilDay}. The winning coverage bid offered ${(clearing.coverageRevenueMicros / 1_000_000).toFixed(2)} USD and reserved ${(clearing.researchProcurementCeilingMicros / 1_000_000).toFixed(2)} USD for research. This market result selects attention; it is not climate evidence.

Coordinates: ${(clearing.place.latitudeE6 / 1_000_000).toFixed(4)}, ${(clearing.place.longitudeE6 / 1_000_000).toFixed(4)}.

## Reanalysis-backed history, ${history.sourceYears[0]}–${history.sourceYears[1]}

NASA POWER's MERRA-2-backed monthly service reports an annual mean near-surface temperature of **${Number(history.earlyTenYearMeanTemperatureC).toFixed(2)} °C** for the first ten complete years and **${Number(history.recentTenYearMeanTemperatureC).toFixed(2)} °C** for the most recent ten. Their difference is **${Number(history.earlyToRecentTemperatureChangeC).toFixed(2)} °C**. A simple least-squares line through the ${history.annualRows} annual values is **${Number(history.linearTemperatureTrendCPerDecade).toFixed(2)} °C per decade**. Recent mean daily precipitation is **${Number(history.recentTenYearMeanDailyPrecipitationMm).toFixed(2)} mm/day**.

These are gridded reanalysis values, not a local station record. They describe the model grid cell containing the place coordinates and can differ from lived conditions, especially near water, mountains, dense urban surfaces, or sparse observing networks.

## Conditional NEX-GDDP-CMIP6 outlook

The comparison directly subsets NASA NEX-GDDP-CMIP6 daily near-surface air temperature at the nearest 0.25-degree grid point. Each model's 2040–2049 SSP5-8.5 output is compared with its own 2005–2014 historical baseline. SSP5-8.5 is a high-emissions scenario, not a probability-weighted forecast.

| Model | 2005–2014 mean °C | 2040–2049 mean °C | Change °C |
|---|---:|---:|---:|
${modelRows}

Across these three models, local mean-temperature change ranges from **${Number(projection.temperatureChangeRangeC[0]).toFixed(2)} to ${Number(projection.temperatureChangeRangeC[1]).toFixed(2)} °C**, with a median of **${Number(projection.medianTemperatureChangeC).toFixed(2)} °C**. This range is model spread within a small ensemble, not a complete uncertainty interval.

## What can and cannot be concluded

- The historical calculation supports a directional account of change in the reanalysis grid cell; it does not prove why any single event happened.
- The projection comparison is conditional on model structure, bias correction, statistical downscaling, and SSP5-8.5.
- City-scale heat can be amplified by land cover and urban form that the 0.25-degree model grid does not fully resolve. Precipitation is not projected in this bounded comparison.
- No model row is privileged as the prediction. The spread should remain visible in narration.

## Sources and method

1. NASA POWER monthly point API, backed by MERRA-2 meteorology: https://power.larc.nasa.gov/docs/services/api/temporal/
2. NASA POWER meteorology methodology: https://power.larc.nasa.gov/docs/methodology/meteorology/
3. NASA NEX-GDDP-CMIP6 description, subset method, and limitations: https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/
4. NASA NEX-GDDP-CMIP6 open-data registry and CC0 terms: https://registry.opendata.aws/nex-gddp-cmip6/

The research supplier requested only point-subset CSV carriers from NASA's NCCS THREDDS NetCDF Subset Service; it did not use a third-party climate-processing API. Data were retrieved at ${packetCore.asOf}. Research method version: ${packetCore.methodVersion}. Scenario: SSP5-8.5. Research order: ${order.id}. Market clearing: ${clearing.id}. Correction identity: ${packetCore.correctionIdentity}.

## NotebookLM brief

Create a clear explanatory video about ${clearing.place.name}'s climate history and conditional outlook. Begin with the place and why market demand selected it. Distinguish NASA POWER gridded reanalysis from station observations. Explain the early-versus-recent temperature comparison and the simple trend without implying causation from the regression alone. Compare all three directly subset NASA NEX-GDDP-CMIP6 model rows, preserve their spread, and describe SSP5-8.5 as conditional rather than predictive. Explain what downscaling, scenario choice, local geography, and urban form leave unresolved. End with practical questions residents and local institutions could ask of higher-resolution local records and planning documents. Do not use disaster spectacle or claim certainty that the evidence does not support.
`, "utf8");
}

function markdown(input) {
  return input.packetCore.methodVersion === RESEARCH_METHOD_VERSION ? markdownV2(input) : markdownV1(input);
}

export async function restoreRecordedSourceCarrier(order, options = {}) {
  if (!exact(order) || order.type !== "ClimateResearchPacketOrder" || order.customer !== CHANNEL || order.provider !== ACTOR || !clearingValid(order.marketClearing)) throw new TypeError("source carrier restoration requires one exact climate research order");
  const dataRoot = resolve(options.dataRoot ?? join(NODE_ROOT, "data"));
  const prior = records(CATEGORY, { ...options, dataRoot }).find((row) => row.order === order.id);
  if (!prior) throw new TypeError("source carrier restoration requires a recorded research packet");
  const bytes = markdown({ order, clearing: order.marketClearing, packetCore: prior, history: prior.history, projection: prior.projection });
  if (bytes.length !== prior.source.byteLength || digest(bytes) !== prior.source.digest) throw new TypeError("recorded research packet cannot reproduce its source carrier");
  const carrierRoot = join(dataRoot, "source-packets"), carrier = join(carrierRoot, `${prior.source.digest.slice(7)}.md`);
  mkdirSync(carrierRoot, { recursive: true });
  if (existsSync(carrier)) {
    const present = readFileSync(carrier);
    if (present.length !== bytes.length || digest(present) !== prior.source.digest) throw new TypeError("recorded research source carrier conflicts");
  } else writeFileSync(carrier, bytes, { flag: "wx", mode: 0o600 });
  return { order: order.id, packet: prior.id, path: carrier, digest: prior.source.digest, byteLength: bytes.length };
}

export async function fulfillResearchOrder(order, options = {}) {
  const at = options.at ?? new Date().toISOString(), config = activation(options.activationPath);
  if (!exact(order) || order.type !== "ClimateResearchPacketOrder" || order.methodVersion !== RESEARCH_METHOD_VERSION || order.customer !== CHANNEL || order.provider !== ACTOR || !clearingValid(order.marketClearing) || order.maximumPriceMicros !== order.marketClearing.researchProcurementCeilingMicros || order.accountingUnit !== "USD-micros") throw new TypeError("climate research order is not exact");
  if (!Number.isSafeInteger(config.priceMicros) || config.priceMicros <= 0 || config.priceMicros > order.maximumPriceMicros) throw new TypeError("climate research price does not clear the place budget");
  const dataRoot = resolve(options.dataRoot ?? join(NODE_ROOT, "data")), prior = records(CATEGORY, { ...options, dataRoot }).find((row) => row.order === order.id);
  if (prior) { const carrier = join(dataRoot, "source-packets", `${prior.source.digest.slice(7)}.md`); if (existsSync(carrier)) { const bytes = readFileSync(carrier); if (bytes.length !== prior.source.byteLength || digest(bytes) !== prior.source.digest) throw new TypeError("climate research replay carrier changed"); return deliver(prior, bytes); } }
  const clearing = order.marketClearing, coordinates = placeCoordinates(clearing.place), historyStartYear = Math.max(1981, clearing.historyStartYear), historyEndYear = Math.min(new Date(at).getUTCFullYear() - 1, 2025);
  if (historyEndYear - historyStartYear < 29) throw new TypeError("place clearing cannot support a thirty-year NASA POWER history");
  const nasa = new URL(NASA_HISTORY); nasa.search = new URLSearchParams({ parameters: "T2M,T2M_MAX,PRECTOTCORR", community: "AG", longitude: String(coordinates.longitude), latitude: String(coordinates.latitude), start: String(historyStartYear), end: String(historyEndYear), format: "JSON" });
  const evidenceOptions = { ...options, projectionConcurrency: options.projectionConcurrency ?? config.projectionConcurrency };
  const historyPayload = await fetchJson(nasa, options);
  const baseline = await nexPeriodSummary(coordinates, "historical", 2005, 2014, evidenceOptions);
  const future = await nexPeriodSummary(coordinates, "ssp585", 2040, 2049, evidenceOptions);
  const history = summarizeHistory(historyPayload, historyStartYear, historyEndYear);
  const models = MODELS.map((model) => { const before = baseline.find((row) => row.model === model), after = future.find((row) => row.model === model); return { model, baselineMeanTemperatureC: before.meanTemperatureC, futureMeanTemperatureC: after.meanTemperatureC, temperatureChangeC: rounded(Number(after.meanTemperatureC) - Number(before.meanTemperatureC)) }; });
  const changes = models.map((row) => Number(row.temperatureChangeC)).sort((a, b) => a - b), projection = { dataset: "NASA NEX-GDDP-CMIP6 v2.0", method: "NCCS THREDDS NCSS point subset", scenario: "ssp585", baseline: "2005-01-01/2014-12-31", future: "2040-01-01/2049-12-31", models, temperatureChangeRangeC: [rounded(changes[0]), rounded(changes.at(-1))], medianTemperatureChangeC: rounded(changes[Math.floor(changes.length / 2)]) };
  const correctionIdentity = contentId({ type: "ClimateResearchCorrectionLineage", place: clearing.place.id, methodVersion: RESEARCH_METHOD_VERSION });
  const packetCore = { type: "ClimateResearchPacketAdmission", methodVersion: RESEARCH_METHOD_VERSION, provider: ACTOR, customer: CHANNEL, order: order.id, marketClearing: clearing.id, place: clearing.place, historicalWindow: { startYear: history.sourceYears[0], endYear: history.sourceYears[1] }, forecastHorizon: { from: "2040-01-01", through: "2049-12-31" }, asOf: at, history, projection, citations: [{ id: "nasa-power-temporal", url: "https://power.larc.nasa.gov/docs/services/api/temporal/", title: "NASA POWER Temporal APIs", kind: "primary-official-data-service", retrievedAt: at, rights: "NASA public information" }, { id: "nasa-power-meteorology", url: "https://power.larc.nasa.gov/docs/methodology/meteorology/", title: "NASA POWER Meteorology Methodology", kind: "primary-official-methodology", retrievedAt: at, rights: "NASA public information" }, { id: "nasa-nex-gddp-cmip6", url: "https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/", title: "NASA NEX-GDDP-CMIP6 data access and subset method", kind: "primary-official-dataset-service", retrievedAt: at, rights: "NEX-GDDP-CMIP6 outputs are CC0" }, { id: "nasa-nex-gddp-cmip6-license", url: "https://registry.opendata.aws/nex-gddp-cmip6/", title: "NASA NEX-GDDP-CMIP6 Open Data Registry", kind: "primary-license-and-access-record", retrievedAt: at, rights: "CC0; unrestricted public and commercial reuse" }], reuseGrant: ["notebooklm-transformation", "public-youtube-release", "same-principal-research-reuse"], uncertainty: { observationalLimits: "NASA POWER is gridded MERRA-2-backed reanalysis rather than a local station record.", modelLimits: "Three 0.25-degree statistically downscaled models do not span all structural or local-scale uncertainty.", scenarioLimits: "SSP5-8.5 is a conditional high-emissions scenario and is not probability weighted." }, correctionIdentity, researchPriceMicros: config.priceMicros, accountingUnit: config.accountingUnit, settlementReceipt: null, source: null, notebookPrompt: `Explain ${clearing.place.name}'s reanalysis-backed climate history and conditional NASA NEX-GDDP-CMIP6 SSP5-8.5 multi-model outlook. Preserve the model spread and observational, model, scenario, and local-scale limits.`, status: "admitted-public-reuse", authorityWithheld: [...config.authorityWithheld], admittedAt: at };
  packetCore.notebookPromptDigest = digest(packetCore.notebookPrompt);
  const settlementBody = { type: "InternalResearchSettlementReceipt", payer: CHANNEL, payee: ACTOR, order: order.id, marketClearing: clearing.id, amountMicros: config.priceMicros, accountingUnit: config.accountingUnit, cashSettlementRequired: false, legalBodyRelation: "same-legal-body", status: "settled-internal-cost-allocation", settledAt: at };
  packetCore.settlementReceipt = { id: contentId(settlementBody), ...settlementBody };
  const bytes = markdown({ order, clearing, packetCore, history, projection }); packetCore.source = { title: `${clearing.place.name}, ${clearing.place.region}: climate history and conditional outlook`, mediaType: "text/markdown", byteLength: bytes.length, digest: digest(bytes) };
  const packet = { id: contentId(packetCore), ...packetCore }, carrierRoot = join(dataRoot, "source-packets"), carrier = join(carrierRoot, `${packet.source.digest.slice(7)}.md`); mkdirSync(carrierRoot, { recursive: true }); if (existsSync(carrier)) { const present = readFileSync(carrier); if (present.length !== bytes.length || digest(present) !== packet.source.digest) throw new TypeError("climate research source carrier conflicts"); } else writeFileSync(carrier, bytes, { flag: "wx", mode: 0o600 });
  if (prior) { if (prior.id !== packet.id) throw new TypeError("climate research order already has a different immutable result"); }
  else record(CATEGORY, { ...packet }, at, { ...options, dataRoot });
  return deliver(packet, bytes);
}
