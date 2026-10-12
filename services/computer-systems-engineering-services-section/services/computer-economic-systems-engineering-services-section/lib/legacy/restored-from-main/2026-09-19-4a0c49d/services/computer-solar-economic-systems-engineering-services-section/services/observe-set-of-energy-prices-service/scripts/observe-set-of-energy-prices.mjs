#!/usr/bin/env node
import { deriveSetOfEnergyPriceDirectives } from "@red-cup-engineering/derive-set-of-energy-price-directives-service";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

const DEFAULT_PROPANE_URL = "https://www.eia.gov/dnav/pet/hist_xls/W_EPLLPA_PRS_R20_DPGw.xls";
const DEFAULT_DIESEL_URL = "https://www.eia.gov/dnav/pet/hist_xls/EMD_EPD2D_PTE_NUS_DPGw.xls";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const CFB_SIGNATURE = 0xd0cf11e0a1b11ae1n;
const CFB_END_OF_CHAIN = 0xfffffffe;
const CFB_FREE_SECTOR = 0xffffffff;
const CFB_HEADER_SIZE = 512;
const BIFF_RECORD_TYPE = Object.freeze({ CONTINUE: 0x003c, EOF: 0x000a, BOUNDSHEET: 0x0085, SST: 0x00fc, LABELSST: 0x00fd, LABEL: 0x0204, NUMBER: 0x0203, RK: 0x027e, MULRK: 0x00bd });

function requireDate(value, context) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) throw new TypeError(`observe-set-of-energy-prices: ${context} must be a YYYY-MM-DD date string`);
  return value;
}

function requireNonEmptyString(value, context) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`observe-set-of-energy-prices: ${context} must be a non-empty string`);
  return value;
}

/**
 * Reads a Microsoft Compound File Binary (CFB/OLE2) container's directory and, for a named
 * stream, its full byte content read off the container's regular sector chain (the mini-FAT
 * stream is not supported: every workbook stream this operation reads is well over the
 * mini-stream cutoff, so a stream that size-qualifies for the mini stream is a malformed input).
 * @param {Buffer} buffer A whole `.xls` file's bytes.
 * @param {string} streamName e.g. `"Workbook"` or the pre-BIFF5 name `"Book"`.
 * @returns {Buffer|null} The named stream's bytes, or `null` when no such stream exists.
 * @throws {TypeError} if `buffer` does not carry the CFB signature, or the named stream requires the unsupported mini-FAT
 */
function readCompoundFileStream(buffer, streamName) {
  if (buffer.length < CFB_HEADER_SIZE || buffer.readBigUInt64BE(0) !== CFB_SIGNATURE) {
    throw new TypeError("observe-set-of-energy-prices: workbook download is not a Compound File Binary (.xls) document");
  }
  const sectorSize = 1 << buffer.readUInt16LE(30);
  const numFatSectors = buffer.readUInt32LE(44);
  const firstDirSector = buffer.readUInt32LE(48);
  const miniStreamCutoff = buffer.readUInt32LE(56);
  const firstDifatSector = buffer.readUInt32LE(68);

  const sectorOffset = (sector) => CFB_HEADER_SIZE + sector * sectorSize;
  const readSector = (sector) => buffer.subarray(sectorOffset(sector), sectorOffset(sector) + sectorSize);

  const fatSectorIndices = [];
  for (let i = 0; i < 109 && fatSectorIndices.length < numFatSectors; i++) fatSectorIndices.push(buffer.readUInt32LE(76 + i * 4));
  let difatSector = firstDifatSector;
  while (difatSector !== CFB_END_OF_CHAIN && difatSector !== CFB_FREE_SECTOR && fatSectorIndices.length < numFatSectors) {
    const sector = readSector(difatSector);
    const entriesPerSector = sectorSize / 4 - 1;
    for (let i = 0; i < entriesPerSector && fatSectorIndices.length < numFatSectors; i++) fatSectorIndices.push(sector.readUInt32LE(i * 4));
    difatSector = sector.readUInt32LE(sectorSize - 4);
  }
  const fat = [];
  for (const fatSector of fatSectorIndices) {
    const sector = readSector(fatSector);
    for (let i = 0; i < sectorSize / 4; i++) fat.push(sector.readUInt32LE(i * 4));
  }

  function readChain(startSector, knownSize) {
    const chunks = [];
    let sector = startSector;
    let remaining = knownSize;
    const visited = new Set();
    while (sector !== CFB_END_OF_CHAIN && sector !== CFB_FREE_SECTOR) {
      if (visited.has(sector)) throw new TypeError("observe-set-of-energy-prices: workbook download's compound file has a cyclic sector chain");
      visited.add(sector);
      const raw = readSector(sector);
      chunks.push(remaining === undefined ? raw : raw.subarray(0, Math.min(sectorSize, remaining)));
      if (remaining !== undefined) remaining -= sectorSize;
      sector = fat[sector];
    }
    return Buffer.concat(chunks);
  }

  const directory = readChain(firstDirSector);
  const entryCount = Math.floor(directory.length / 128);
  for (let i = 0; i < entryCount; i++) {
    const offset = i * 128;
    const nameLength = directory.readUInt16LE(offset + 64);
    if (nameLength === 0) continue;
    const name = directory.subarray(offset, offset + nameLength - 2).toString("utf16le");
    const type = directory.readUInt8(offset + 66);
    if (type !== 2 || name !== streamName) continue;
    const startSector = directory.readUInt32LE(offset + 116);
    const size = directory.readUInt32LE(offset + 120);
    if (size < miniStreamCutoff) throw new TypeError(`observe-set-of-energy-prices: stream ${JSON.stringify(streamName)} is mini-FAT-resident (${size} bytes), which this operation does not support`);
    return readChain(startSector, size);
  }
  return null;
}

/**
 * Scans a BIFF (Binary Interchange File Format) byte stream into `{type, data}` records,
 * merging each `CONTINUE` record's bytes into the immediately preceding record's `data` (BIFF's
 * own mechanism for a record, most often `SST`, that overflows its 8224-byte length field).
 * @param {Buffer} buffer
 * @returns {{type: number, data: Buffer}[]}
 */
function scanBiffRecords(buffer) {
  const records = [];
  let offset = 0;
  while (offset + 4 <= buffer.length) {
    const type = buffer.readUInt16LE(offset);
    const length = buffer.readUInt16LE(offset + 2);
    const data = buffer.subarray(offset + 4, offset + 4 + length);
    if (type === BIFF_RECORD_TYPE.CONTINUE && records.length > 0) {
      records[records.length - 1].data = Buffer.concat([records[records.length - 1].data, data]);
    } else {
      records.push({ type, data });
    }
    offset += 4 + length;
  }
  return records;
}

/**
 * Reads one BIFF8 unicode string (a 1-byte `grbit` flag, bit 0 set when the text is UTF-16LE
 * rather than Latin-1/compressed) of `charCount` characters starting at `offset`.
 * @param {Buffer} buffer
 * @param {number} offset
 * @param {number} charCount
 * @returns {{text: string, nextOffset: number}}
 */
function readBiff8UnicodeString(buffer, offset, charCount) {
  const wide = (buffer.readUInt8(offset) & 0x1) !== 0;
  const start = offset + 1;
  if (wide) return { text: buffer.subarray(start, start + charCount * 2).toString("utf16le"), nextOffset: start + charCount * 2 };
  return { text: buffer.subarray(start, start + charCount).toString("latin1"), nextOffset: start + charCount };
}

/**
 * Reads the workbook globals' Shared String Table (`SST` record, plus any `CONTINUE`
 * continuations already merged into it) into its ordered string array, indexed exactly as
 * `LABELSST` cell records reference it.
 * @param {{type: number, data: Buffer}[]} records
 * @returns {readonly string[]}
 */
function readSharedStringTable(records) {
  const sst = records.find((record) => record.type === BIFF_RECORD_TYPE.SST);
  if (!sst) return [];
  const strings = [];
  let offset = 8;
  const count = sst.data.readUInt32LE(4);
  for (let i = 0; i < count; i++) {
    const charCount = sst.data.readUInt16LE(offset);
    const { text, nextOffset } = readBiff8UnicodeString(sst.data, offset + 2, charCount);
    strings.push(text);
    offset = nextOffset;
  }
  return strings;
}

/**
 * Decodes an `RK` (or one `MULRK` slot's) 4-byte compact-encoded number: bit 0 set means the
 * true value is this decoding divided by 100; bit 1 set means the top 30 bits are a plain
 * signed integer, otherwise they are the high 30 bits of an IEEE-754 double (its low 34 bits
 * always zero).
 * @param {number} rk A signed 32-bit RK field, as `Buffer#readInt32LE` returns it.
 * @returns {number}
 */
function decodeRkNumber(rk) {
  const isPercent100 = (rk & 0x1) !== 0;
  const isInteger = (rk & 0x2) !== 0;
  let value;
  if (isInteger) {
    value = rk >> 2;
  } else {
    const doubleBytes = Buffer.alloc(8);
    doubleBytes.writeUInt32LE(rk & 0xfffffffc, 4);
    value = doubleBytes.readDoubleLE(0);
  }
  return isPercent100 ? value / 100 : value;
}

/**
 * Converts an Excel 1900-epoch date serial (the base every date in these workbooks is stored
 * as) to a `YYYY-MM-DD` string. `Date.UTC(1899, 11, 30)` is the well-known anchor that already
 * absorbs Excel's historical "1900 is a leap year" bug for every serial past day 60, which is
 * the only range these weekly series (1990-present) ever carry.
 * @param {number} serial
 * @returns {string}
 */
function excelSerialToIsoDate(serial) {
  const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Reads one BOUNDSHEET record (`{ streamOffset, name }`) naming a worksheet and the byte offset
 * of its own `BOF` within the whole `Workbook` stream.
 * @param {Buffer} data
 * @returns {{streamOffset: number, name: string}}
 */
function readBoundsheet(data) {
  const streamOffset = data.readUInt32LE(0);
  const charCount = data.readUInt8(6);
  const { text } = readBiff8UnicodeString(data, 7, charCount);
  return { streamOffset, name: text };
}

/**
 * Reads every `{row, col}` cell this operation cares about (`LABEL`, `LABELSST`, `NUMBER`,
 * `RK`, `MULRK`) out of one worksheet's own BIFF substream, stopping at that substream's `EOF`.
 * @param {{type: number, data: Buffer}[]} sheetRecords Records scanned starting at the sheet's own `BOF`.
 * @param {readonly string[]} sharedStrings The workbook's Shared String Table.
 * @returns {Map<string, string|number>} Keyed `"row,col"`.
 */
function readWorksheetCells(sheetRecords, sharedStrings) {
  const cells = new Map();
  for (const record of sheetRecords) {
    if (record.type === BIFF_RECORD_TYPE.EOF) break;
    if (record.type === BIFF_RECORD_TYPE.LABELSST) {
      cells.set(`${record.data.readUInt16LE(0)},${record.data.readUInt16LE(2)}`, sharedStrings[record.data.readUInt32LE(6)]);
    } else if (record.type === BIFF_RECORD_TYPE.LABEL) {
      const { text } = readBiff8UnicodeString(record.data, 8, record.data.readUInt16LE(6));
      cells.set(`${record.data.readUInt16LE(0)},${record.data.readUInt16LE(2)}`, text);
    } else if (record.type === BIFF_RECORD_TYPE.NUMBER) {
      cells.set(`${record.data.readUInt16LE(0)},${record.data.readUInt16LE(2)}`, record.data.readDoubleLE(6));
    } else if (record.type === BIFF_RECORD_TYPE.RK) {
      cells.set(`${record.data.readUInt16LE(0)},${record.data.readUInt16LE(2)}`, decodeRkNumber(record.data.readInt32LE(6)));
    } else if (record.type === BIFF_RECORD_TYPE.MULRK) {
      const row = record.data.readUInt16LE(0);
      const firstCol = record.data.readUInt16LE(2);
      const slotCount = (record.data.length - 6) / 6;
      for (let i = 0; i < slotCount; i++) cells.set(`${row},${firstCol + i}`, decodeRkNumber(record.data.readInt32LE(4 + i * 6 + 2)));
    }
  }
  return cells;
}

/**
 * Reads an EIA keyless weekly-series workbook buffer (`.xls`, Compound File Binary containing a
 * BIFF8 `Workbook` stream: a `Data 1` worksheet whose row 2 header names the series, then one
 * date/value row per week starting at row 3) into the two-column `date,value` CSV text
 * `@red-cup-engineering/derive-set-of-energy-price-directives-service` already parses.
 * @param {Buffer} buffer
 * @param {string} context
 * @returns {string}
 * @throws {TypeError} if the buffer is not a `.xls` Compound File Binary document, carries no `Workbook` stream, no worksheet, or no parseable weekly row
 */
function readEiaWeeklyWorkbookAsCsv(buffer, context) {
  const workbookStream = readCompoundFileStream(buffer, "Workbook") ?? readCompoundFileStream(buffer, "Book");
  if (!workbookStream) throw new TypeError(`observe-set-of-energy-prices: ${context} carries no Workbook stream`);
  const globalRecords = scanBiffRecords(workbookStream);
  const sharedStrings = readSharedStringTable(globalRecords);
  const boundsheets = globalRecords.filter((record) => record.type === BIFF_RECORD_TYPE.BOUNDSHEET).map((record) => readBoundsheet(record.data));
  if (boundsheets.length === 0) throw new TypeError(`observe-set-of-energy-prices: ${context} workbook names no worksheet`);
  const chosen = boundsheets.find((sheet) => sheet.name.startsWith("Data")) ?? boundsheets.at(-1);
  const sheetRecords = scanBiffRecords(workbookStream.subarray(chosen.streamOffset));
  const cells = readWorksheetCells(sheetRecords, sharedStrings);
  const seriesLabel = typeof cells.get("2,1") === "string" ? cells.get("2,1") : chosen.name;

  const rows = [];
  for (let row = 3; ; row++) {
    const dateCell = cells.get(`${row},0`);
    const valueCell = cells.get(`${row},1`);
    if (dateCell === undefined || valueCell === undefined) break;
    const date = typeof dateCell === "number" ? excelSerialToIsoDate(dateCell) : String(dateCell);
    rows.push({ date, value: String(valueCell) });
  }
  if (rows.length === 0) throw new TypeError(`observe-set-of-energy-prices: ${context} workbook has no parseable weekly row`);
  return `Date,${seriesLabel}\n${rows.map((row) => `${row.date},${row.value}`).join("\n")}\n`;
}

/**
 * Fetches one EIA weekly-series workbook and reads it into CSV text, or a fetch-failure datum
 * naming the URL and, when the transport itself answered, its HTTP status. When `fixtureSeriesText`
 * is given (already-obtained CSV text standing in for the live read, for deterministic replay
 * and for the worked example this specification's own assay executes), no fetch is made at all.
 * @param {string} url
 * @param {typeof fetch} fetchImpl
 * @param {string|undefined} fixtureSeriesText
 * @returns {Promise<{ok: true, url: string, seriesText: string} | {ok: false, url: string, status: number|null, error: string|null}>}
 */
async function fetchEiaWeeklySeries(url, fetchImpl, fixtureSeriesText) {
  if (typeof fixtureSeriesText === "string") return { ok: true, url, seriesText: fixtureSeriesText };
  let response;
  try {
    response = await fetchImpl(url);
  } catch (error) {
    return { ok: false, url, status: null, error: error instanceof Error ? error.message : String(error) };
  }
  if (!response.ok) return { ok: false, url, status: response.status, error: null };
  try {
    const buffer = Buffer.from(await response.arrayBuffer());
    return { ok: true, url, seriesText: readEiaWeeklyWorkbookAsCsv(buffer, url) };
  } catch (error) {
    return { ok: false, url, status: response.status, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * One priced-or-unpriced weekly-fuel row for `commodity`, read off `directiveSet` (the shared,
 * place-independent `deriveSetOfEnergyPriceDirectives` result) when the fetch succeeded, or a
 * fetch-failure datum naming the URL and status when it did not.
 * @param {"PROPANE_GAL"|"DIESEL_GAL"} commodity
 * @param {{ok: boolean, url: string, status?: number|null, error?: string|null}} fetched
 * @param {{priced: readonly object[], unpriced: readonly object[]}} directiveSet
 * @param {string} asOf
 * @returns {object} An `EnergyPriceRow` for `commodity`, without its `place` field.
 */
function fuelRow(commodity, fetched, directiveSet, asOf) {
  if (!fetched.ok) {
    return {
      commodity, usdPerUnit: null, unit: "USD/gal", source: fetched.url, asOf, method: "eia-weekly-series-fetch-failed",
      reason: fetched.error !== null && fetched.error !== undefined ? `fetch failed: ${fetched.error}` : `HTTP ${fetched.status} from ${fetched.url}`,
    };
  }
  const priced = directiveSet.priced.find((entry) => entry.commodity === commodity);
  if (priced !== undefined) {
    return { commodity, usdPerUnit: priced.usdPrice, unit: "USD/gal", source: priced.sourceUrl, asOf: priced.observedDate, method: "eia-weekly-series-latest-at-or-before" };
  }
  const unpriced = directiveSet.unpriced.find((entry) => entry.commodity === commodity);
  return {
    commodity, usdPerUnit: null, unit: "USD/gal", source: fetched.url, asOf, method: "eia-weekly-series-latest-at-or-before",
    reason: unpriced?.reason ?? `no weekly observation at or before ${asOf}`,
  };
}

/**
 * One `KWH` row for a place: its declared tariff's first tier when `place.energyTariff` is
 * given, or an explicit unpriced row carrying `place.kwhUnpriced.reason` otherwise.
 * @param {object} place A `PlaceEnergyPriceRequest`.
 * @param {string} asOf
 * @returns {object} An `EnergyPriceRow` for `KWH`, without its `place` field.
 * @throws {TypeError} when neither or both of `energyTariff`/`kwhUnpriced` are given, or a given
 *   `energyTariff` lacks `usdPerKwhTiers[0].usdPerKwh`, `sourceUrl`, or `asOf`
 */
function kwhRow(place, asOf) {
  const hasTariff = place.energyTariff !== undefined && place.energyTariff !== null;
  const hasUnpriced = place.kwhUnpriced !== undefined && place.kwhUnpriced !== null;
  if (hasTariff === hasUnpriced) throw new TypeError(`observe-set-of-energy-prices: place ${JSON.stringify(place.place)} must declare exactly one of energyTariff or kwhUnpriced`);
  if (hasUnpriced) {
    const reason = requireNonEmptyString(place.kwhUnpriced.reason, `place ${JSON.stringify(place.place)}.kwhUnpriced.reason`);
    return {
      commodity: "KWH", usdPerUnit: null, unit: "USD/kWh",
      source: typeof place.kwhUnpriced.source === "string" ? place.kwhUnpriced.source : null,
      asOf: typeof place.kwhUnpriced.asOf === "string" ? place.kwhUnpriced.asOf : asOf,
      method: "no-declared-tariff", reason,
    };
  }
  const tariff = place.energyTariff;
  const usdPerKwh = requireNonEmptyString(tariff?.usdPerKwhTiers?.[0]?.usdPerKwh, `place ${JSON.stringify(place.place)}.energyTariff.usdPerKwhTiers[0].usdPerKwh`);
  const sourceUrl = requireNonEmptyString(tariff.sourceUrl, `place ${JSON.stringify(place.place)}.energyTariff.sourceUrl`);
  const tariffAsOf = requireDate(tariff.asOf, `place ${JSON.stringify(place.place)}.energyTariff.asOf`);
  const method = typeof place.kwhMethod === "string" && place.kwhMethod.length > 0
    ? place.kwhMethod
    : `declared tariff (${typeof tariff.rateScheduleName === "string" && tariff.rateScheduleName.length > 0 ? tariff.rateScheduleName : "rate schedule not named"})`;
  return { commodity: "KWH", usdPerUnit: usdPerKwh, unit: "USD/kWh", source: sourceUrl, asOf: tariffAsOf, method };
}

/**
 * @typedef {Object} EnergyPriceRow
 * @property {string} place
 * @property {"KWH"|"PROPANE_GAL"|"DIESEL_GAL"} commodity
 * @property {string|null} usdPerUnit
 * @property {string} unit
 * @property {string|null} source
 * @property {string} asOf
 * @property {string} method
 * @property {string} [reason]
 * @typedef {Object} EnergyPriceSeries
 * @property {"EnergyPriceSeries"} type
 * @property {1} version
 * @property {string} asOf
 * @property {readonly EnergyPriceRow[]} rows
 */

/**
 * Observes one dated, place-by-place series of the price of delivered energy: a `KWH` row per
 * place from its own declared `energy-tariff` record (or an explicit unpriced reason when none
 * is declared), and a `PROPANE_GAL` and `DIESEL_GAL` row per place from the EIA's own keyless
 * weekly retail-price workbooks, fetched once and shared across every place, composing
 * `@red-cup-engineering/derive-set-of-energy-price-directives-service`'s own
 * latest-row-at-or-before selection rather than re-deriving it. A commodity with no qualifying
 * source (no declared tariff, a fetch failure, or a weekly series with no row at or before
 * `asOf`) is a row with `usdPerUnit: null` and a `reason`, never a fabricated price.
 * @param {{places: readonly {place: string, energyTariff?: {utility?: string, rateScheduleName?: string, usdPerKwhTiers: readonly {usdPerKwh: string}[], sourceUrl: string, asOf: string}, kwhMethod?: string, kwhUnpriced?: {reason: string, source?: string, asOf?: string}}[], asOf: string, eia?: {propaneUrl?: string, dieselUrl?: string, propaneFixtureSeriesText?: string, dieselFixtureSeriesText?: string}, fetchImpl?: typeof fetch}} request A record naming each place's own tariff or unpriced reason, the reporting date, and optionally the two EIA workbook URLs, already-obtained fixture CSV text standing in for either live read, and an injectable fetch implementation.
 * @returns {Promise<EnergyPriceSeries>} The dated place-by-place `KWH`/`PROPANE_GAL`/`DIESEL_GAL` price series.
 * @throws {TypeError} when `request.places` is not a non-empty array, `request.asOf` is not a `YYYY-MM-DD` date, or one place's `energyTariff`/`kwhUnpriced` declaration is malformed
 */
export async function observeSetOfEnergyPrices(request) {
  if (request === null || typeof request !== "object") throw new TypeError("observe-set-of-energy-prices: request must be an object");
  const asOf = requireDate(request.asOf, "request.asOf");
  if (!Array.isArray(request.places) || request.places.length === 0) throw new TypeError("observe-set-of-energy-prices: request.places must be a non-empty array");
  const places = request.places.map((place, index) => {
    if (place === null || typeof place !== "object") throw new TypeError(`observe-set-of-energy-prices: request.places[${index}] must be an object`);
    requireNonEmptyString(place.place, `request.places[${index}].place`);
    return place;
  });
  const eia = request.eia ?? {};
  const propaneUrl = typeof eia.propaneUrl === "string" && eia.propaneUrl.length > 0 ? eia.propaneUrl : DEFAULT_PROPANE_URL;
  const dieselUrl = typeof eia.dieselUrl === "string" && eia.dieselUrl.length > 0 ? eia.dieselUrl : DEFAULT_DIESEL_URL;
  const fetchImpl = typeof request.fetchImpl === "function" ? request.fetchImpl : fetch;

  const [propane, diesel] = await Promise.all([
    fetchEiaWeeklySeries(propaneUrl, fetchImpl, eia.propaneFixtureSeriesText),
    fetchEiaWeeklySeries(dieselUrl, fetchImpl, eia.dieselFixtureSeriesText),
  ]);
  const directiveSet = deriveSetOfEnergyPriceDirectives({
    date: asOf,
    electricity: { usdPerKwh: "1", sourceUrl: "urn:observe-set-of-energy-prices:electricity-priced-per-place", asOf },
    propane: propane.ok ? { sourceKind: "fetched-csv", sourceUrl: propane.url, seriesText: propane.seriesText } : { sourceKind: "fixture", seriesText: "Date,unused\n" },
    diesel: diesel.ok ? { sourceKind: "fetched-csv", sourceUrl: diesel.url, seriesText: diesel.seriesText } : { sourceKind: "fixture", seriesText: "Date,unused\n" },
  });

  const rows = [];
  for (const place of places) {
    rows.push({ place: place.place, ...kwhRow(place, asOf) });
    rows.push({ place: place.place, ...fuelRow("PROPANE_GAL", propane, directiveSet, asOf) });
    rows.push({ place: place.place, ...fuelRow("DIESEL_GAL", diesel, directiveSet, asOf) });
  }

  return Object.freeze({ type: "EnergyPriceSeries", version: 1, asOf, rows: Object.freeze(rows) });
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "observe-set-of-energy-prices", description: "Observes one dated, place-by-place series of the price of delivered energy: a `KWH` row per place from its own declared `energy-tariff` record (or an explicit unpriced reason when none is declared), and a `PROPANE_GAL` and `DIESEL_GAL` row per place from the EIA's own keyless weekly retail-price workbooks, fetched once and shared across every place, composing `@red-cup-engineering/derive-set-of-energy-price-directives-service`'s own latest-row-at-or-before selection rather than re-deriving it.", operation: observeSetOfEnergyPrices }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
