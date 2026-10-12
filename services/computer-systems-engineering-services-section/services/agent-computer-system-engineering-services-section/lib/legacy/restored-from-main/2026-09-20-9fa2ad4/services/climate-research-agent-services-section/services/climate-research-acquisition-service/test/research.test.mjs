import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { admitLegacyPilotPublicReuseRectification, LEGACY_RECTIFICATION_CATEGORY } from "../src/legacy-pilot-rectification.mjs";
import { ACTOR, CATEGORY, CHANNEL, contentId, formResearchOrder, nexPointUrl, parseNexPointCsv } from "../src/research.mjs";
function exact(body) { return { id: contentId(body), ...body }; }
test("research orders bind the exact active place clearing and ceiling", () => {
  const place = exact({ type: "GeoPlaceIdentity", sourceId: "geonames:4887398", kind: "city", name: "Chicago", region: "Illinois", countryCode: "US", latitudeE6: 41880000, longitudeE6: -87630000, timezone: "America/Chicago" });
  const clearing = exact({ type: "ClimatePlaceDailyClearing", market: "urn:ame:climate-place-market-enterprise", customer: "urn:ame:climate-youtube-channel-enterprise", civilDay: "2026-07-22", timezone: "America/Chicago", winningBid: "urn:bid", bidder: "urn:ame:turntide-islands", place, coverageRevenueMicros: 900000, researchProcurementCeilingMicros: 500000, grossSurplusMicros: 400000, accountingUnit: "USD-micros", historyStartYear: 1900, forecastHorizonYear: 2050, demandSignals: [], selectionRule: ["coverageBidMicros-desc"], status: "cleared-research-not-procured", authorityWithheld: [], clearedAt: "2026-07-22T08:00:00.000Z" });
  const order = formResearchOrder(clearing, "2026-07-22T08:00:01.000Z");
  assert.equal(order.marketClearing.id, clearing.id); assert.equal(order.methodVersion, 2); assert.equal(order.maximumPriceMicros, 500000); assert.equal(order.id, contentId(Object.fromEntries(Object.entries(order).filter(([key]) => key !== "id"))));
});

test("research method directly requests bounded NASA NEX point subsets and parses Kelvin daily values", () => {
  const url = nexPointUrl("ACCESS-CM2", "ssp585", 2040, { latitude: 41.88, longitude: -87.63 });
  assert.equal(url.hostname, "ds.nccs.nasa.gov");
  assert.match(url.pathname, /NEX\/GDDP-CMIP6\/ACCESS-CM2\/ssp585/u);
  assert.equal(url.searchParams.get("accept"), "csv");
  assert.equal(url.searchParams.get("var"), "tas");
  const header = 'time,station,latitude[unit="degrees_north"],longitude[unit="degrees_east"],tas[unit="K"]';
  const rows = Array.from({ length: 366 }, (_, day) => `2040-01-01T12:00:00Z,point,41.875,-87.625,${273.15 + day / 100}`);
  const parsed = parseNexPointCsv([header, ...rows].join("\n"), "ACCESS-CM2", 2040);
  assert.equal(parsed.length, 366);
  assert.ok(Math.abs(parsed[0]) < 1e-9);
  assert.ok(Math.abs(parsed.at(-1) - 3.65) < 1e-9);
});

test("legacy pilot reuse is an append-only attributed exception and does not rewrite either research packet", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "climate-legacy-research-")); t.after(() => rmSync(root, { recursive: true, force: true }));
  const at = "2096-07-22T16:00:00.000Z", place = exact({ type: "GeoPlaceIdentity", name: "Chicago", region: "Illinois" });
  const legacyPacket = exact({ type: "ClimateResearchPacketAdmission", provider: ACTOR, customer: CHANNEL, marketClearing: "urn:clearing", place, status: "admitted-private-pilot-public-reuse-audit-pending", reuseGrant: ["notebooklm-transformation", "private-youtube-pilot"], citations: [{ id: "open-meteo-climate-api" }], projection: { baseline: "2011-01-01/2020-12-31", future: "2040-01-01/2049-12-31" }, source: { digest: "sha256:legacy" } });
  const currentPacket = exact({ type: "ClimateResearchPacketAdmission", methodVersion: 2, provider: ACTOR, customer: CHANNEL, marketClearing: "urn:clearing", place, status: "admitted-public-reuse", reuseGrant: ["public-youtube-release"], citations: [{ id: "nasa-nex-gddp-cmip6-license" }], source: { digest: "sha256:current" } });
  const journal = createSemanticRecordJournal({ root, objectKind: "emsweb.climate-research.record" }); for (const row of [legacyPacket, currentPacket]) journal.record({ category: CATEGORY, recordedAt: at, record: { ...row }, charge: { support: true, refutation: false } });
  const options = { dataRoot: root, at }, first = await admitLegacyPilotPublicReuseRectification({ legacyPacket: { ...legacyPacket }, currentPacket: { ...currentPacket } }, options), second = await admitLegacyPilotPublicReuseRectification({ legacyPacket: { ...legacyPacket }, currentPacket: { ...currentPacket } }, options);
  assert.equal(first.id, second.id); assert.equal(first.monetization, "withheld-pending-separate-commercial-use-admission"); assert.match(first.publicDescriptionAddendum, /Open-Meteo\.com/u); assert.equal(first.futureLegacyProductionAuthority, "withheld");
  assert.equal(journal.query({ category: LEGACY_RECTIFICATION_CATEGORY }).length, 1);});
