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
