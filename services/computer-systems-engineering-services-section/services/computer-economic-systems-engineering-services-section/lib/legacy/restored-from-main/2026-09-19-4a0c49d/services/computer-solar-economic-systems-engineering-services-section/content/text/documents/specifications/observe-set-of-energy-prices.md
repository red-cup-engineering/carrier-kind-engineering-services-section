# observe-set-of-energy-prices
## Requirements
- `place-by-place-kwh-from-declared-tariff`: For each place, the operation must price `KWH` only from that place's own declared `energy-tariff` record's first `usdPerKwhTiers` entry, never a fetched or inferred value, because utility tariffs are published as PDFs/HTML pages the operation cannot parse.
- `explicit-kwh-unpriced`: A place that declares no `energyTariff` must instead declare a `kwhUnpriced.reason`, and the operation must emit a `KWH` row with `usdPerUnit: null` and that reason, never fabricating a rate.
- `shared-weekly-fuel-fetch`: The operation must fetch each of the EIA's keyless weekly `PROPANE_GAL` and `DIESEL_GAL` workbooks exactly once per call and reuse the same reading across every place in the request, never refetching per place.
- `compose-latest-row-selection`: The operation must select each fuel's priced row (or unpriced reason) by composing `@red-cup-engineering/derive-set-of-energy-price-directives-service`'s own latest-row-at-or-before rule, never re-deriving that selection.
- `row-shape`: Every row must carry `{place, commodity, usdPerUnit, unit, source, asOf, method}`, plus `reason` when `usdPerUnit` is `null`.
- `fetch-failure-is-datum`: A failed fetch (a non-2xx HTTP response, a rejected fetch call, or a downloaded document that is not a well-formed Compound File Binary workbook) for a weekly workbook must produce a `PROPANE_GAL`/`DIESEL_GAL` row naming the URL and, when the transport answered, its HTTP status, never a thrown error.
- `fixture-series-text-bypasses-fetch`: The operation must accept already-obtained `PROPANE_GAL`/`DIESEL_GAL` CSV text (`request.eia.propaneFixtureSeriesText`/`dieselFixtureSeriesText`) standing in for the live fetch, so a fully-fixtured request never touches the network, for deterministic replay and for this specification's own worked example.
## Prohibitions
- `no-fabricated-price`: The operation must never invent a `usdPerUnit` for a commodity it cannot price from a declared tariff, a successfully fetched and parsed weekly workbook, or that workbook's own qualifying row; every such case is a row with `usdPerUnit: null` and a `reason`.
- `no-network-io-beyond-declared-sources`: The operation must fetch only the two EIA weekly-workbook URLs (`request.eia.propaneUrl`/`dieselUrl`, or their declared defaults), and only when the caller has not already supplied that commodity's fixture CSV text; it performs no other network call.
- `no-float-arithmetic`: The operation performs no arithmetic on any price; every `usdPerUnit` is copied verbatim (via `String`, never rounded) from its declared tariff, from a workbook cell's own decoded number, or from the composed operation's own decimal-string output.
- `no-eia-api-key`: The operation reads only the EIA's keyless per-series workbook download; it accepts no API key field and calls no keyed EIA endpoint.
- `no-third-party-spreadsheet-parser`: The operation reads the workbook's Compound File Binary container and BIFF8 records itself; it must not depend on a third-party spreadsheet-parsing package, because the only such packages available (`xlsx`/SheetJS and its derivatives) stopped receiving security patches on the public npm registry after their last-ever published version (the exact version otherwise available), which still carries unpatched prototype-pollution and ReDoS advisories (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9).
- `place-declares-exactly-one-kwh-source`: The operation must refuse (`TypeError`) a place that declares both `energyTariff` and `kwhUnpriced`, or neither.
## Laws
- `mechanism-at-earth-scale-benchmark` | Solar product hypotheses | 2026-09-05 | lib/emsenn/services/561-group/services/science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/economics-science-services-section/services/solar-economics-science-services-section/content/text/documents/articles/notes/2026/09/05/2026-09-05-note-on-soft-dyson-product-hypotheses.md | Applies to the whole operation. | The benchmark is the price of a delivered kilowatt-hour, place by place, published as an open dated series; this operation is the first instrument that observes it.
- `pure-data-transformation-and-io-law` | The language law (owner-stated 2026-08-30) | v1 | .claude/rules/org-layering.md | Applies to the operation's one network fetch and its otherwise-pure row construction. | I/O with a system and data transformation are both written in Node; the operation's only I/O is fetching the two declared EIA URLs.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
- `iso-8601-date` | ISO 8601 | 2019 | https://www.iso.org/iso-8601-date-and-time-format.html | Applies to every date field. | Dates are YYYY-MM-DD calendar-date strings; a weekly workbook's own Excel 1900-epoch date serial is normalized to this before comparison.
- `eia-weekly-petroleum-price-series` | U.S. Energy Information Administration, Weekly Petroleum Status Report data series | current | https://www.eia.gov/petroleum/gasdiesel/ | Applies to the two fetched workbooks. | `W_EPLLPA_PRS_R20_DPG` (Weekly Midwest PADD 2 Propane Residential Price) and `EMD_EPD2D_PTE_NUS_DPG` (Weekly U.S. No 2 Diesel Retail Prices) are EIA's own keyless per-series workbook downloads.
- `ms-cfb-and-ms-xls` | [MS-CFB] Compound File Binary File Format and [MS-XLS] Excel Binary File Format | current | https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-cfb/ and https://learn.microsoft.com/en-us/openspecs/office_standards/ms-xls/ | Applies to `readCompoundFileStream` and the BIFF8 record reader. | The EIA's `.xls` weekly-series download is a Compound File Binary container whose `Workbook` stream is a BIFF8 record stream (`BOF`/`EOF`, `BOUNDSHEET`, `SST`, `LABELSST`, `LABEL`, `NUMBER`, `RK`, `MULRK`); the operation reads exactly these published record shapes.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/observe-set-of-energy-prices-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/derive-set-of-energy-price-directives-service":"0.1.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/observe-set-of-energy-prices.mjs
#!/usr/bin/env node
import { deriveSetOfEnergyPriceDirectives } from "@red-cup-engineering/derive-set-of-energy-price-directives-service";

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
  if (process.argv.includes("--help")) {
    process.stdout.write("observeSetOfEnergyPrices — Observes one dated, place-by-place series of the price of delivered energy: a `KWH` row per place from its own declared `energy-tariff` record (or an explicit unpriced reason when none is declared), and a `PROPANE_GAL` and `DIESEL_GAL` row per place from the EIA's own keyless weekly retail-price workbooks, fetched once and shared across every place, composing `@red-cup-engineering/derive-set-of-energy-price-directives-service`'s own latest-row-at-or-before selection rather than re-deriving it. A commodity with no qualifying source (no declared tariff, a fetch failure, or a weekly series with no row at or before `asOf`) is a row with `usdPerUnit: null` and a `reason`, never a fabricated price.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.trim().length === 0) continue;
      try {
        process.stdout.write(`${JSON.stringify(await observeSetOfEnergyPrices(JSON.parse(line)))}\n`);
      } catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
      }
    }
  }
}
```
## Tests
```mjs path=test/observe-set-of-energy-prices.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { observeSetOfEnergyPrices } from "../scripts/observe-set-of-energy-prices.mjs";

const CFB_ENDOFCHAIN = 0xfffffffe, CFB_FREESECT = 0xffffffff, CFB_FATSECT = 0xfffffffd, CFB_SECTOR_SIZE = 512;

function biffRecord(type, data) {
  const header = Buffer.alloc(4);
  header.writeUInt16LE(type, 0);
  header.writeUInt16LE(data.length, 2);
  return Buffer.concat([header, data]);
}
function biff8String(text) { return Buffer.concat([Buffer.from([0]), Buffer.from(text, "latin1")]); }
function bofRecord() { return biffRecord(0x0809, Buffer.alloc(16)); }
function eofRecord() { return biffRecord(0x000a, Buffer.alloc(0)); }
function sstRecord(strings) {
  const head = Buffer.alloc(8);
  head.writeUInt32LE(strings.length, 0);
  head.writeUInt32LE(strings.length, 4);
  const body = strings.map((text) => {
    const cch = Buffer.alloc(2);
    cch.writeUInt16LE(text.length, 0);
    return Buffer.concat([cch, biff8String(text)]);
  });
  return biffRecord(0x00fc, Buffer.concat([head, ...body]));
}
function labelSstRecord(row, col, isst) {
  const data = Buffer.alloc(10);
  data.writeUInt16LE(row, 0); data.writeUInt16LE(col, 2); data.writeUInt16LE(0, 4); data.writeUInt32LE(isst, 6);
  return biffRecord(0x00fd, data);
}
function labelRecord(row, col, text) {
  const head = Buffer.alloc(8);
  head.writeUInt16LE(row, 0); head.writeUInt16LE(col, 2); head.writeUInt16LE(0, 4); head.writeUInt16LE(text.length, 6);
  return biffRecord(0x0204, Buffer.concat([head, biff8String(text)]));
}
function numberRecord(row, col, num) {
  const data = Buffer.alloc(14);
  data.writeUInt16LE(row, 0); data.writeUInt16LE(col, 2); data.writeUInt16LE(0, 4); data.writeDoubleLE(num, 6);
  return biffRecord(0x0203, data);
}
/** Exact for any value with at most 2 fractional digits: an RK integer scaled by 100 with the "divide by 100" flag set. */
function rkPercent100Record(row, col, value) {
  const rk = ((Math.round(value * 100) << 2) | 0x3) | 0;
  const data = Buffer.alloc(10);
  data.writeUInt16LE(row, 0); data.writeUInt16LE(col, 2); data.writeUInt16LE(0, 4); data.writeInt32LE(rk, 6);
  return biffRecord(0x027e, data);
}
/** One MULRK row of exact 2-decimal RK-percent100 slots starting at `colFirst`. */
function mulRkRecord(row, colFirst, values) {
  const slots = values.map((value) => {
    const rk = ((Math.round(value * 100) << 2) | 0x3) | 0;
    const slot = Buffer.alloc(6);
    slot.writeUInt16LE(0, 0);
    slot.writeInt32LE(rk, 2);
    return slot;
  });
  const head = Buffer.alloc(4);
  head.writeUInt16LE(row, 0); head.writeUInt16LE(colFirst, 2);
  const tail = Buffer.alloc(2);
  tail.writeUInt16LE(colFirst + values.length - 1, 0);
  return biffRecord(0x00bd, Buffer.concat([head, ...slots, tail]));
}
function boundsheetRecord(streamOffset, name) {
  const head = Buffer.alloc(7);
  head.writeUInt32LE(streamOffset, 0); head.writeUInt8(0, 4); head.writeUInt8(0, 5); head.writeUInt8(name.length, 6);
  return biffRecord(0x0085, Buffer.concat([head, biff8String(name)]));
}

/**
 * Builds a minimal, valid Compound-File-Binary `.xls` fixture with one "Data 1" worksheet, in
 * the exact shape this operation reads: header rows (`headerMode` picks `LABELSST`+`SST` or
 * plain `LABEL`, both of which real EIA workbooks use across their record types), then whatever
 * data-row records `cellRows(startRow)` supplies.
 */
function buildXlsFixture({ seriesLabel, headerMode = "labelsst", cellRows }) {
  const headerTexts = ["Back to Contents", `Data 1: ${seriesLabel}`, "Sourcekey", "TEST_SERIES", "Date", seriesLabel];
  const headerRecords = headerMode === "labelsst"
    ? [sstRecord(headerTexts), ...headerTexts.map((_, i) => labelSstRecord(Math.floor(i / 2), i % 2, i))]
    : headerTexts.map((text, i) => labelRecord(Math.floor(i / 2), i % 2, text));
  const globalsBof = bofRecord();
  const globalsEof = eofRecord();
  const boundsheetLength = 4 + 7 + 1 + "Data 1".length;
  const sheetOffset = globalsBof.length + headerRecords.reduce((sum, r) => sum + r.length, 0) + boundsheetLength + globalsEof.length;
  const workbookStream = Buffer.concat([
    globalsBof, ...headerRecords, boundsheetRecord(sheetOffset, "Data 1"), globalsEof,
    bofRecord(), ...cellRows(3), eofRecord(),
  ]);
  return wrapInCompoundFile(workbookStream);
}

function wrapInCompoundFile(workbookStream) {
  const streamSectorCount = Math.ceil(workbookStream.length / CFB_SECTOR_SIZE);
  const fatSectorIndex = 0, dirSectorIndex = 1, streamStartSector = 2;
  const fat = new Array(2 + streamSectorCount).fill(CFB_FREESECT);
  fat[fatSectorIndex] = CFB_FATSECT;
  fat[dirSectorIndex] = CFB_ENDOFCHAIN;
  for (let i = 0; i < streamSectorCount; i++) fat[streamStartSector + i] = i === streamSectorCount - 1 ? CFB_ENDOFCHAIN : streamStartSector + i + 1;

  function dirEntry(name, type, startSector, size) {
    const buf = Buffer.alloc(128);
    Buffer.from(name, "utf16le").copy(buf, 0);
    buf.writeUInt16LE(Buffer.from(name, "utf16le").length + 2, 64);
    buf.writeUInt8(type, 66);
    buf.writeUInt8(1, 67);
    buf.writeUInt32LE(0xffffffff, 68); buf.writeUInt32LE(0xffffffff, 72); buf.writeUInt32LE(0xffffffff, 76);
    buf.writeUInt32LE(startSector, 116); buf.writeUInt32LE(size, 120); buf.writeUInt32LE(0, 124);
    return buf;
  }
  const dirSector = Buffer.concat([
    dirEntry("Root Entry", 5, CFB_ENDOFCHAIN, 0),
    dirEntry("Workbook", 2, streamStartSector, workbookStream.length),
    Buffer.alloc(128), Buffer.alloc(128),
  ]);
  const fatSectorBuf = Buffer.alloc(CFB_SECTOR_SIZE, 0xff);
  for (let i = 0; i < fat.length; i++) fatSectorBuf.writeUInt32LE(fat[i] >>> 0, i * 4);

  const header = Buffer.alloc(512);
  Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]).copy(header, 0);
  header.writeUInt16LE(0x003e, 24); header.writeUInt16LE(0x0003, 26); header.writeUInt16LE(0xfffe, 28);
  header.writeUInt16LE(9, 30); header.writeUInt16LE(6, 32);
  header.writeUInt32LE(1, 44); header.writeUInt32LE(dirSectorIndex, 48);
  header.writeUInt32LE(0, 56); // mini-stream cutoff 0: every stream in this fixture reads via the regular FAT chain
  header.writeUInt32LE(CFB_ENDOFCHAIN, 60); header.writeUInt32LE(0, 64);
  header.writeUInt32LE(CFB_ENDOFCHAIN, 68); header.writeUInt32LE(0, 72);
  for (let i = 0; i < 109; i++) header.writeUInt32LE(i === 0 ? fatSectorIndex : CFB_FREESECT, 76 + i * 4);

  const streamPadded = Buffer.concat([workbookStream, Buffer.alloc(streamSectorCount * CFB_SECTOR_SIZE - workbookStream.length)]);
  return Buffer.concat([header, fatSectorBuf, dirSector, streamPadded]);
}

const PROPANE_BUFFER = buildXlsFixture({
  seriesLabel: "Weekly Midwest (PADD 2) Propane Residential Price  (Dollars per Gallon)",
  headerMode: "labelsst",
  cellRows: (row) => [
    numberRecord(row, 0, 46259), rkPercent100Record(row, 1, 2.10), // 2026-08-25
    numberRecord(row + 1, 0, 46266), rkPercent100Record(row + 1, 1, 2.15), // 2026-09-01
    numberRecord(row + 2, 0, 46275), rkPercent100Record(row + 2, 1, 2.30), // 2026-09-10 (future row)
  ],
});
const DIESEL_BUFFER = buildXlsFixture({
  seriesLabel: "Weekly U.S. No 2 Diesel Retail Prices  (Dollars per Gallon)",
  headerMode: "label",
  cellRows: (row) => [
    numberRecord(row, 0, 46258), mulRkRecord(row, 1, [5.45]), // 2026-08-24
    numberRecord(row + 1, 0, 46265), mulRkRecord(row + 1, 1, [5.60]), // 2026-08-31
  ],
});

function fakeFetch({ propane = { ok: true, buffer: PROPANE_BUFFER }, diesel = { ok: true, buffer: DIESEL_BUFFER } } = {}) {
  return async (url) => {
    const outcome = url.includes("PRS") ? propane : diesel;
    if (outcome.throws) throw new Error(outcome.throws);
    if (!outcome.ok) return { ok: false, status: outcome.status ?? 500 };
    return { ok: true, status: 200, arrayBuffer: async () => outcome.buffer };
  };
}

test("prices KWH from a place's declared tariff and PROPANE_GAL/DIESEL_GAL from the shared EIA weekly workbooks (LABELSST/SST and plain LABEL headers, NUMBER date serials, RK and MULRK values), picking each fuel's latest row at or before asOf", async () => {
  const result = await observeSetOfEnergyPrices({
    asOf: "2026-09-05",
    fetchImpl: fakeFetch(),
    places: [{
      place: "Minnesota Power",
      energyTariff: { utility: "Minnesota Power", rateScheduleName: "Residential", usdPerKwhTiers: [{ usdPerKwh: "0.10772" }], sourceUrl: "https://www.mnpower.com/ResidentialRates", asOf: "2026-01-01" },
    }],
  });
  assert.equal(result.type, "EnergyPriceSeries");
  assert.equal(result.asOf, "2026-09-05");
  assert.equal(result.rows.length, 3);
  const byCommodity = Object.fromEntries(result.rows.map((row) => [row.commodity, row]));

  assert.equal(byCommodity.KWH.usdPerUnit, "0.10772");
  assert.equal(byCommodity.KWH.unit, "USD/kWh");
  assert.equal(byCommodity.KWH.source, "https://www.mnpower.com/ResidentialRates");
  assert.equal(byCommodity.KWH.asOf, "2026-01-01");
  assert.equal(byCommodity.KWH.method, "declared tariff (Residential)");

  // 2026-09-01 is the latest PROPANE_GAL row at or before 2026-09-05; 2026-09-10 is a future row and must never be picked.
  assert.equal(byCommodity.PROPANE_GAL.usdPerUnit, "2.15");
  assert.equal(byCommodity.PROPANE_GAL.asOf, "2026-09-01");
  assert.equal(byCommodity.PROPANE_GAL.unit, "USD/gal");
  assert.equal(byCommodity.PROPANE_GAL.method, "eia-weekly-series-latest-at-or-before");

  assert.equal(byCommodity.DIESEL_GAL.usdPerUnit, "5.6");
  assert.equal(byCommodity.DIESEL_GAL.asOf, "2026-08-31");
});

test("an undeclared tariff is an explicit unpriced KWH row, never a fabricated price", async () => {
  const result = await observeSetOfEnergyPrices({
    asOf: "2026-09-05",
    fetchImpl: fakeFetch(),
    places: [{ place: "LaCreek Electric Association", kwhUnpriced: { reason: "no residential $/kWh rate found on the fetched billing page", source: "https://www.lacreek.com/billing", asOf: "2026-09-05" } }],
  });
  const kwh = result.rows.find((row) => row.commodity === "KWH");
  assert.equal(kwh.usdPerUnit, null);
  assert.equal(kwh.reason, "no residential $/kWh rate found on the fetched billing page");
  assert.equal(kwh.source, "https://www.lacreek.com/billing");
});

test("a download that is not a Compound File Binary document is a fetch-failure datum, never a thrown error or a fabricated row", async () => {
  const result = await observeSetOfEnergyPrices({
    asOf: "2026-09-05",
    fetchImpl: fakeFetch({ diesel: { ok: true, buffer: Buffer.from("not an xls file") } }),
    places: [{ place: "Test Place", kwhUnpriced: { reason: "test" } }],
  });
  const diesel = result.rows.find((row) => row.commodity === "DIESEL_GAL");
  assert.equal(diesel.usdPerUnit, null);
  assert.equal(diesel.method, "eia-weekly-series-fetch-failed");
  assert.match(diesel.reason, /not a Compound File Binary/u);
});

test("a weekly series with no row at or before asOf is unpriced, never fabricated", async () => {
  const staleOnlyDiesel = buildXlsFixture({
    seriesLabel: "Weekly U.S. No 2 Diesel Retail Prices  (Dollars per Gallon)",
    headerMode: "labelsst",
    cellRows: (row) => [numberRecord(row, 0, 43831), rkPercent100Record(row, 1, 2.0)], // 2020-01-01
  });
  const staleResult = await observeSetOfEnergyPrices({
    asOf: "2019-01-01",
    fetchImpl: fakeFetch({ diesel: { ok: true, buffer: staleOnlyDiesel } }),
    places: [{ place: "Test Place", kwhUnpriced: { reason: "test" } }],
  });
  const diesel = staleResult.rows.find((row) => row.commodity === "DIESEL_GAL");
  assert.equal(diesel.usdPerUnit, null);
  assert.match(diesel.reason, /no weekly observation at or before 2019-01-01/u);
});

test("a fetch failure is a datum naming the URL and HTTP status, never a thrown error", async () => {
  const result = await observeSetOfEnergyPrices({
    asOf: "2026-09-05",
    fetchImpl: fakeFetch({ propane: { ok: false, status: 503 } }),
    places: [{ place: "Test Place", kwhUnpriced: { reason: "test" } }],
  });
  const propane = result.rows.find((row) => row.commodity === "PROPANE_GAL");
  assert.equal(propane.usdPerUnit, null);
  assert.equal(propane.method, "eia-weekly-series-fetch-failed");
  assert.match(propane.reason, /HTTP 503/u);
});

test("a fetch that throws (network error) is also a datum, never a thrown error", async () => {
  const result = await observeSetOfEnergyPrices({
    asOf: "2026-09-05",
    fetchImpl: fakeFetch({ diesel: { throws: "getaddrinfo ENOTFOUND www.eia.gov" } }),
    places: [{ place: "Test Place", kwhUnpriced: { reason: "test" } }],
  });
  const diesel = result.rows.find((row) => row.commodity === "DIESEL_GAL");
  assert.equal(diesel.usdPerUnit, null);
  assert.match(diesel.reason, /fetch failed: getaddrinfo ENOTFOUND/u);
});

test("refuses a place declaring both energyTariff and kwhUnpriced, or neither", async () => {
  await assert.rejects(
    observeSetOfEnergyPrices({ asOf: "2026-09-05", fetchImpl: fakeFetch(), places: [{ place: "X" }] }),
    /must declare exactly one of energyTariff or kwhUnpriced/u,
  );
  await assert.rejects(
    observeSetOfEnergyPrices({
      asOf: "2026-09-05", fetchImpl: fakeFetch(),
      places: [{ place: "X", kwhUnpriced: { reason: "r" }, energyTariff: { usdPerKwhTiers: [{ usdPerKwh: "0.1" }], sourceUrl: "https://x", asOf: "2026-01-01" } }],
    }),
    /must declare exactly one of energyTariff or kwhUnpriced/u,
  );
});

test("an already-obtained fixture CSV text stands in for the live fetch, touching no network at all", async () => {
  const result = await observeSetOfEnergyPrices({
    asOf: "2026-09-05",
    places: [{ place: "Test Place", kwhUnpriced: { reason: "test" } }],
    eia: {
      propaneFixtureSeriesText: "Date,Weekly Midwest (PADD 2) Propane Residential Price (Dollars per Gallon)\n08/25/2026,2.100\n09/01/2026,2.150\n",
      dieselFixtureSeriesText: "Date,Weekly U.S. No 2 Diesel Retail Prices (Dollars per Gallon)\n2026-08-24,5.454\n2026-08-31,5.599\n",
    },
    fetchImpl: () => { throw new Error("must not be called when both fixtures are given"); },
  });
  const byCommodity = Object.fromEntries(result.rows.map((row) => [row.commodity, row]));
  assert.equal(byCommodity.PROPANE_GAL.usdPerUnit, "2.150");
  assert.equal(byCommodity.PROPANE_GAL.asOf, "2026-09-01");
  assert.equal(byCommodity.DIESEL_GAL.usdPerUnit, "5.599");
  assert.equal(byCommodity.DIESEL_GAL.asOf, "2026-08-31");
});

test("refuses a malformed request", async () => {
  await assert.rejects(observeSetOfEnergyPrices({ places: [{ place: "X", kwhUnpriced: { reason: "r" } }] }), /request.asOf must be a YYYY-MM-DD date string/u);
  await assert.rejects(observeSetOfEnergyPrices({ asOf: "2026-09-05", places: [] }), /request.places must be a non-empty array/u);
});
```
## Examples
```json name="observe-set-of-energy-prices example (fixture CSV text, no network)"
{"input":{"asOf":"2026-09-05","places":[{"place":"Minnesota Power","energyTariff":{"utility":"Minnesota Power","rateScheduleName":"Residential","usdPerKwhTiers":[{"usdPerKwh":"0.10772"}],"sourceUrl":"https://www.mnpower.com/ResidentialRates","asOf":"2026-01-01"}},{"place":"LaCreek Electric Association","kwhUnpriced":{"reason":"no residential $/kWh rate found on the fetched billing page","source":"https://www.lacreek.com/billing","asOf":"2026-09-05"}}],"eia":{"propaneFixtureSeriesText":"Date,Weekly Midwest (PADD 2) Propane Residential Price (Dollars per Gallon)\n08/25/2026,2.100\n09/01/2026,2.150\n","dieselFixtureSeriesText":"Date,Weekly U.S. No 2 Diesel Retail Prices (Dollars per Gallon)\n2026-08-24,5.454\n2026-08-31,5.599\n"}},"output":{"type":"EnergyPriceSeries","version":1,"asOf":"2026-09-05","rows":[{"place":"Minnesota Power","commodity":"KWH","usdPerUnit":"0.10772","unit":"USD/kWh","source":"https://www.mnpower.com/ResidentialRates","asOf":"2026-01-01","method":"declared tariff (Residential)"},{"place":"Minnesota Power","commodity":"PROPANE_GAL","usdPerUnit":"2.150","unit":"USD/gal","source":"https://www.eia.gov/dnav/pet/hist_xls/W_EPLLPA_PRS_R20_DPGw.xls","asOf":"2026-09-01","method":"eia-weekly-series-latest-at-or-before"},{"place":"Minnesota Power","commodity":"DIESEL_GAL","usdPerUnit":"5.599","unit":"USD/gal","source":"https://www.eia.gov/dnav/pet/hist_xls/EMD_EPD2D_PTE_NUS_DPGw.xls","asOf":"2026-08-31","method":"eia-weekly-series-latest-at-or-before"},{"place":"LaCreek Electric Association","commodity":"KWH","usdPerUnit":null,"unit":"USD/kWh","source":"https://www.lacreek.com/billing","asOf":"2026-09-05","method":"no-declared-tariff","reason":"no residential $/kWh rate found on the fetched billing page"},{"place":"LaCreek Electric Association","commodity":"PROPANE_GAL","usdPerUnit":"2.150","unit":"USD/gal","source":"https://www.eia.gov/dnav/pet/hist_xls/W_EPLLPA_PRS_R20_DPGw.xls","asOf":"2026-09-01","method":"eia-weekly-series-latest-at-or-before"},{"place":"LaCreek Electric Association","commodity":"DIESEL_GAL","usdPerUnit":"5.599","unit":"USD/gal","source":"https://www.eia.gov/dnav/pet/hist_xls/EMD_EPD2D_PTE_NUS_DPGw.xls","asOf":"2026-08-31","method":"eia-weekly-series-latest-at-or-before"}]}}
```
## Traceability
- `place-by-place-kwh-from-declared-tariff` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `mechanism-at-earth-scale-benchmark`
- `explicit-kwh-unpriced` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `mechanism-at-earth-scale-benchmark`
- `shared-weekly-fuel-fetch` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eia-weekly-petroleum-price-series`
- `compose-latest-row-selection` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `pure-data-transformation-and-io-law`
- `row-shape` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `basis-book-alternative-data`
- `fetch-failure-is-datum` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `ms-cfb-and-ms-xls`
- `fixture-series-text-bypasses-fetch` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `pure-data-transformation-and-io-law`
- `no-fabricated-price` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `mechanism-at-earth-scale-benchmark`
- `no-network-io-beyond-declared-sources` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `pure-data-transformation-and-io-law`
- `no-float-arithmetic` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `pure-data-transformation-and-io-law`
- `no-eia-api-key` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `eia-weekly-petroleum-price-series`
- `no-third-party-spreadsheet-parser` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `ms-cfb-and-ms-xls`
- `place-declares-exactly-one-kwh-source` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `basis-book-alternative-data`
