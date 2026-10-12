import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { schemaCorpus, validateInstance } from "@red-cup-engineering/json-schema-services-section";
import { envConfiguration, buildPaymentBoundary, respond } from "../src/worker.mjs";
import { SEPOLIA_NETWORK, USDC_BASE_SEPOLIA, PUBLIC_TESTNET_FACILITATOR_URL } from "../src/network-constants.mjs";
import indexListing from "../402index-listing.json" with { type: "json" };
import { validateDiscoveryExtension } from "@x402/extensions/bazaar";
import { offers } from "../src/offers.mjs";

const PAY_TO = "0x1234567890123456789012345678901234567890";

function readSchema(relativePath) {
  return JSON.parse(readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8"));
}

const REQUEST_SCHEMA = readSchema("../../../data/records/schema/derive-value-chain-shares-request.schema.json");
const RESULT_SCHEMA = readSchema("../../../data/records/schema/derive-value-chain-shares-result.schema.json");
const TERRITORY_READOUT_REQUEST_SCHEMA = readSchema("../../../data/records/schema/derive-territory-readout-request.schema.json");
const TERRITORY_READOUT_RESULT_SCHEMA = readSchema("../../../data/records/schema/derive-territory-readout-result.schema.json");
const TERRITORY_CATALOG_ROW_SCHEMA = readSchema("../../../data/records/schema/territory-catalog-row.schema.json");
const RESOURCE_ROW_SCHEMA = readSchema("../../../../../data/records/schema/resource-row.schema.json");

function withPrice(name, unitPrice, sourceUrl = "https://example.test/a", sourceTitle = "Example row") {
  return { name, prices: [{ unitPrice, unit: "USD per kilogram", source: { sourceUrl, sourceTitle } }] };
}

// The science seat's cocaine-ladder fixture, from
// derive-value-chain-shares-service/test/derive-value-chain-shares.test.mjs
// ("five-position cocaine farm-to-street ladder, Medellín and Cali case,
// low ends of every stated range"); a figure the science cannot cite
// cannot enter a test, so this is not invented here.
const COCAINE_LADDER_REQUEST = {
  type: "PriceLadder",
  version: 1,
  positions: [
    withPrice("coca paste", "900", "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html", "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"),
    withPrice("Colombian export", "1654", "https://www.statista.com/statistics/1376841/average-price-of-cocaine-products-by-region-colombia/", "Colombia: average price of cocaine 2021, Statista"),
    withPrice("transit", "10000", "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html", "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"),
    withPrice("United States wholesale", "70000", "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html", "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"),
    withPrice("street-cut equivalent", "150000", "https://finance.yahoo.com/news/legendary-drug-lord-pablo-escobar-175200811.html", "Legendary drug lord Pablo Escobar lost $2.1 billion in cash each year — and it didn't matter, Yahoo Finance"),
  ],
};

const NORTH_SHORE_PATH = "lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section";
const NORTH_SHORE_NAME = "North Shore";

// The North Shore fixture from derive-territory-readout-service's own work
// order/tests (test/derive-territory-readout.test.mjs): the band's own
// region's real catalog rows -- manoomin, rivercane, Lake Superior lake
// trout, and Lake Superior agate (the hopeium capability specification's
// (ii), the first catalog records). Reused here, not reinvented, per the
// science-fixture convention already followed for the value-chain route.
const NORTH_SHORE_ROWS = [
  {
    "identity": { "name": "Lake Superior agate", "kind": "commodity", "issuer": "unknown", "rail": "unknown" },
    "denomination": { "unit": "unknown; sold by the piece or by weight, no standard unit found" },
    "custody": "unknown",
    "yieldForm": "none",
    "laborForm": "collected by rockhounding (surface collecting); at lapidary scale, tumbled, slabbed and polished, or face-polished for jewelry and collectibles (Minnesota DNR, 'Lake Superior Agate - Minnesota's State Gem')",
    "liquidity": { "exitPath": "unknown; no first-party seller or market page found this session", "exitsToRow": null },
    "extractionCeiling": { "cap": "unknown; no collecting limit found on the sources read", "resetPeriod": "unknown", "antiBotRule": "unknown" },
    "identityCost": { "kycRequired": "unknown", "perHumanSlot": "unknown" },
    "witnesses": [{ "source": "state regulator's first-party education page", "sourceUrl": "https://www.dnr.state.mn.us/education/geology/digging/agate.html", "observedOn": "2026-09-05" }],
    "provenance": { "sourceUrl": "https://www.dnr.state.mn.us/education/geology/digging/agate.html", "observedOn": "2026-09-05", "evidenceStatus": "measured" },
    "territory": { "path": NORTH_SHORE_PATH, "plainName": NORTH_SHORE_NAME },
    "material": { "scientificName": null, "commonName": "Lake Superior agate", "materialKind": "mineral" },
    "knownProducts": [{
      "product": "tumbled stones, cabochons, and face-polished specimens",
      "use": "jewelry (rings, bracelets, belt buckles) and mineral collectibles; designated Minnesota's official state gemstone in 1969",
      "citation": { "sourceUrl": "https://www.dnr.state.mn.us/education/geology/digging/agate.html", "sourceTitle": "Lake Superior Agate - Minnesota's State Gem", "accessedOn": "2026-09-05" },
    }],
    "markets": [],
    "chainPositionHeld": "unknown",
    "benefitSharingRecord": null,
    "observedAt": "2026-09-05",
  },
  {
    "identity": { "name": "Lake Superior lake trout", "kind": "commodity", "issuer": "unknown", "rail": "unknown" },
    "denomination": { "unit": "pound (round weight, commercial harvest)" },
    "custody": "unknown",
    "yieldForm": "none",
    "laborForm": "commercially gillnetted or trap-netted by a Minnesota-licensed Lake Superior commercial fisher; lake trout may not be commercially taken except by special permit, and incidentally-taken live lake trout, and untagged dead lake trout, must be returned to the water immediately (Minnesota DNR, commercial fishing license page)",
    "liquidity": { "exitPath": "sold to a licensed fish buyer or a lakeside fish market/smokehouse", "exitsToRow": null },
    "extractionCeiling": {
      "cap": "25 total Minnesota commercial fishing licenses for Lake Superior; lake trout commercial take is special-permit-only (no general commercial season); the co-managed cisco/lake herring quota is set annually at an estimated 10 percent of total biomass",
      "resetPeriod": "annual (license renewal; annual biomass-based quota for cisco/lake herring)",
      "antiBotRule": "a Minnesota commercial fishing license, limited to 25 total license-holders statewide for Lake Superior, with licensing criteria including apprenticeship experience with an existing licensed commercial fisherman and required equipment",
    },
    "identityCost": { "kycRequired": false, "perHumanSlot": true, "detail": "a state commercial fishing license, one of only 25 issued for Minnesota waters of Lake Superior" },
    "witnesses": [
      { "source": "state regulator's first-party licensing page", "sourceUrl": "https://www.dnr.state.mn.us/fishing/commercial/cf.html", "observedOn": "2026-09-05" },
      { "source": "state regulator's first-party species page", "sourceUrl": "https://www.dnr.state.mn.us/fish/cisco/index.html", "observedOn": "2026-09-05" },
    ],
    "provenance": { "sourceUrl": "https://www.dnr.state.mn.us/fishing/commercial/cf.html", "observedOn": "2026-09-05", "evidenceStatus": "measured" },
    "territory": { "path": NORTH_SHORE_PATH, "plainName": NORTH_SHORE_NAME },
    "material": { "scientificName": "Salvelinus namaycush", "commonName": "Lake Superior lake trout (co-managed with cisco/lake herring, Coregonus artedi, under the same Minnesota commercial-fishing license and species list)", "materialKind": "species" },
    "knownProducts": [
      {
        "product": "fresh and smoked lake trout, whitefish, and herring (cisco), sold whole or as fillets",
        "use": "food, sold fresh or smoked at North Shore fish markets",
        "citation": { "sourceUrl": "https://superiorinngrandmarais.com/dockside-fish-market/", "sourceTitle": "Dockside Fish Market", "accessedOn": "2026-09-05" },
      },
      {
        "product": "commercially netted cisco/lake herring",
        "use": "historically Lake Superior's largest commercial fishery, up to 19 million pounds annually in high-catch years; Minnesota harvested over 350,000 pounds in 2011-2012 before dropping below 250,000 pounds in recent years",
        "citation": { "sourceUrl": "https://www.dnr.state.mn.us/fish/cisco/index.html", "sourceTitle": "Cisco, Herring, Lake Herring and Tullibee | Minnesota DNR", "accessedOn": "2026-09-05" },
      },
    ],
    "markets": [
      { "buyer": "Dockside Fish Market, Grand Marais, Minnesota (North Shore)", "kind": "local fish market and smokehouse", "citation": { "sourceUrl": "https://superiorinngrandmarais.com/dockside-fish-market/", "sourceTitle": "Dockside Fish Market", "accessedOn": "2026-09-05" } },
      { "buyer": "the 25 Minnesota-licensed Lake Superior commercial fishers as a class", "kind": "state-licensed commercial harvest channel", "citation": { "sourceUrl": "https://www.dnr.state.mn.us/fishing/commercial/cf.html", "sourceTitle": "Commercial fishing license information | Minnesota DNR", "accessedOn": "2026-09-05" } },
    ],
    "chainPositionHeld": "unknown",
    "benefitSharingRecord": null,
    "observedAt": "2026-09-05",
  },
  {
    "identity": { "name": "manoomin (wild rice)", "kind": "commodity", "issuer": "unknown", "rail": "unknown" },
    "denomination": { "unit": "pound (finished, hand-parched grain)" },
    "custody": "unknown",
    "yieldForm": "none",
    "laborForm": "hand-harvested from a canoe using knocking sticks and a push pole, within the licensed statewide season (Minnesota DNR, 'Wild Rice Regulations')",
    "liquidity": { "exitPath": "sold directly to a buyer, through a state-licensed wild rice buyer, or processed and sold as a packaged food product by a tribally-owned foods enterprise", "exitsToRow": null },
    "extractionCeiling": {
      "cap": "unknown; no per-harvester poundage cap found for state waters, and reservation wild rice committees set their own harvest rules on reservation waters",
      "resetPeriod": "annual (statewide season runs August 15 to September 30, 9 a.m. to 3 p.m. daily; reservation committees set their own opening dates and hours no less than 24 hours before opening)",
      "antiBotRule": "a Minnesota wild-rice harvester license (season or one-day) is required for residents and nonresidents; members of a federally recognized Minnesota tribe with a valid tribal ID card are exempt from the state license",
    },
    "identityCost": { "kycRequired": false, "perHumanSlot": true, "detail": "a state wild-rice harvester license, or a tribal ID card for exempt tribal members; license and buyer-license fees are deposited in a dedicated wild-rice management account (Minnesota DNR, 'Wild Rice Regulations')" },
    "witnesses": [
      { "source": "state regulator's first-party regulation page", "sourceUrl": "https://www.dnr.state.mn.us/regulations/wildrice/index.html", "observedOn": "2026-09-05" },
      { "source": "tribally-owned foods enterprise's first-party site", "sourceUrl": "https://redlakenationfoods.com/home-1-2/", "observedOn": "2026-09-05" },
    ],
    "provenance": { "sourceUrl": "https://www.dnr.state.mn.us/aquatic_plants/emergent_plants/wildrice.html", "observedOn": "2026-09-05", "evidenceStatus": "measured" },
    "territory": { "path": NORTH_SHORE_PATH, "plainName": NORTH_SHORE_NAME },
    "material": { "scientificName": "Zizania palustris", "commonName": "manoomin (wild rice)", "materialKind": "species" },
    "knownProducts": [
      {
        "product": "hand-harvested raw wild rice grain, parched and finished for food",
        "use": "food; higher protein content than most cereal grains, a subsistence and cultural keystone for Anishinaabe communities of the Lake Superior basin, protected by 1837, 1842, and 1854 treaty harvesting rights",
        "citation": { "sourceUrl": "https://www.dnr.state.mn.us/aquatic_plants/emergent_plants/wildrice.html", "sourceTitle": "Wild Rice (Zizania palustris) | Minnesota DNR", "accessedOn": "2026-09-05" },
      },
      {
        "product": "packaged cultivated and hand-harvested wild rice, wild-fruit jellies, jams, and gift foods",
        "use": "retail food product sold under a tribally-owned brand; cited here as the reference-implementation market for Minnesota wild rice, not as evidence that this North Shore territory's own harvest reaches this specific enterprise (Red Lake Nation is a different band's reservation)",
        "citation": { "sourceUrl": "https://redlakenationfoods.com/home-1-2/", "sourceTitle": "Red Lake Nation Foods", "accessedOn": "2026-09-05" },
      },
    ],
    "markets": [
      { "buyer": "Red Lake Nation Foods (Red Lake Nation's tribally-owned enterprise), cited as the reference-implementation market for hand-harvested and cultivated Minnesota wild rice", "kind": "reference-implementation, tribally-owned food enterprise", "citation": { "sourceUrl": "https://redlakenationfoods.com/home-1-2/", "sourceTitle": "Red Lake Nation Foods", "accessedOn": "2026-09-05" } },
      { "buyer": "state-licensed wild rice buyers", "kind": "state-licensed buyer channel", "citation": { "sourceUrl": "https://www.dnr.state.mn.us/regulations/wildrice/index.html", "sourceTitle": "Wild Rice Regulations | Minnesota DNR", "accessedOn": "2026-09-05" } },
    ],
    "chainPositionHeld": "unknown",
    "benefitSharingRecord": null,
    "observedAt": "2026-09-05",
  },
  {
    "identity": { "name": "rivercane (Arundinaria gigantea)", "kind": "commodity", "issuer": "unknown", "rail": "unknown" },
    "denomination": { "unit": "unknown; no unit found for a North Shore/Lake Superior harvest, because none is documented (this territory has no established rivercane harvest; see provenance)" },
    "custody": "unknown",
    "yieldForm": "none",
    "laborForm": "unknown for this territory; in its native Southeastern range, rivercane is propagated and harvested by living-rhizome division and transplant, since it reproduces almost entirely vegetatively and cannot be recompiled from seed (561 Group Services Section, note on Phezí Ocháǧe, citing the rivercane ecology paper in botany-services-section)",
    "liquidity": { "exitPath": "unknown; no market found for a North Shore/Lake Superior source of rivercane", "exitsToRow": null },
    "extractionCeiling": { "cap": "unknown", "resetPeriod": "unknown", "antiBotRule": "unknown" },
    "identityCost": { "kycRequired": "unknown", "perHumanSlot": "unknown" },
    "witnesses": [
      { "source": "university extension first-party plant profile", "sourceUrl": "https://plants.ces.ncsu.edu/plants/arundinaria-gigantea/", "observedOn": "2026-09-05" },
      { "source": "federal agency first-party project page", "sourceUrl": "https://www.fws.gov/project/collaboration-river-cane-restoration", "observedOn": "2026-09-05" },
    ],
    "provenance": { "sourceUrl": "lib/emsenn/services/561-group/services/561-group-services-section/content/text/documents/articles/notes/2026/08/21/2026-08-21-note-on-phezi-ochage.md", "observedOn": "2026-08-21", "evidenceStatus": "self-reported" },
    "territory": { "path": NORTH_SHORE_PATH, "plainName": NORTH_SHORE_NAME },
    "material": {
      "scientificName": "Arundinaria gigantea",
      "commonName": "rivercane, catalogued here as the band's own structural kinship metaphor (Phíž ezí Ocháǧe), not as a plant native to or harvested in this territory",
      "materialKind": "knowledge",
    },
    "knownProducts": [
      {
        "product": "the founder's structural identification of the tiyóšpaye's kinship-form with the canebrake",
        "use": "a metaphysical/organizational reading, not a physical harvest: one genet with many culms as the kinship's living continuity; extension by living transplant, never by seed, as the model for huŋkápi (the making of relatives); persistence only in relationship; no synchronized all-or-nothing renewal (mautam); a reticulate, adoptive lineage held as one body; the remnant (over 98 percent of historical canebrakes gone) as irreplaceable. This note claims no part of the Cherokee and neighboring nations' inheritance of the plant itself; it claims kinship with the plant of the place actually lived on.",
        "citation": { "sourceUrl": "lib/emsenn/services/561-group/services/561-group-services-section/content/text/documents/articles/notes/2026/08/21/2026-08-21-note-on-phezi-ochage.md", "sourceTitle": "2026-08-21 note on Phíž ezí Ocháǧe", "accessedOn": "2026-09-05" },
      },
      {
        "product": "woven baskets, blowguns, fishing poles, musical instruments, home construction material, and erosion-control planting",
        "use": "traditional basketry, construction, crafts, and streambank stabilization, documented in the plant's native Southeastern range (the Eastern Band of Cherokee Indians and neighboring nations; also the founder's own hand-propagation along Crooked Creek in Durham, North Carolina) — a different territory than this North Shore/Lake Superior region, included here only to state what the material is, never as a claim it is used or grown here",
        "citation": { "sourceUrl": "https://plants.ces.ncsu.edu/plants/arundinaria-gigantea/", "sourceTitle": "River Cane - Arundinaria gigantea | NC State Extension Gardener Plant Toolbox", "accessedOn": "2026-09-05" },
      },
    ],
    "markets": [],
    "chainPositionHeld": "unknown",
    "benefitSharingRecord": null,
    "observedAt": "2026-09-05",
  },
];

const TERRITORY_READOUT_REQUEST = {
  type: "TerritoryReadoutRequest",
  version: 1,
  territory: { path: NORTH_SHORE_PATH, name: NORTH_SHORE_NAME },
  rows: NORTH_SHORE_ROWS,
};

const unpaidFacilitator = () => ({
  async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: SEPOLIA_NETWORK }], extensions: [], signers: {} }; },
  async verify() { throw new Error("an unpaid assay must never verify"); },
  async settle() { throw new Error("an unpaid assay must never settle"); },
});

// -- envConfiguration -------------------------------------------------------

test("envConfiguration defaults to Base Sepolia with the public facilitator and USDC-Sepolia", () => {
  const config = envConfiguration({ X402_PAY_TO: PAY_TO });
  assert.equal(config.network, SEPOLIA_NETWORK);
  assert.equal(config.asset, USDC_BASE_SEPOLIA.toLowerCase());
  assert.equal(config.facilitatorUrl, PUBLIC_TESTNET_FACILITATOR_URL);
  assert.equal(config.payTo, PAY_TO.toLowerCase());
});

test("envConfiguration requires X402_PAY_TO", () => {
  assert.throws(() => envConfiguration({}), /X402_PAY_TO/);
});

test("price belongs to the offer declaration, never to the deployment", () => {
  const config = envConfiguration({ X402_PAY_TO: PAY_TO, X402_PRICE_VALUE_CHAIN_SHARES: "12345" });
  assert.equal(config.priceAtomic, undefined);
  assert.deepEqual(offers.map((offer) => [offer.declaration.route, offer.declaration.price, offer.amount]), [
    ["/value-chain/shares", "$0.04", "40000"],
    ["/territory/readout", "$0.08", "80000"],
  ]);
});

test("every offer books to this gateway's own income account and names its markets", () => {
  for (const offer of offers) {
    assert.equal(offer.declaration.ledgerAccount, "Income:Sales:X402:Paid-value-chain-gateway");
    assert.equal(offer.beancountOpen({ date: "2026-09-08" }), "2026-09-08 open Income:Sales:X402:Paid-value-chain-gateway");
    assert.deepEqual([...offer.declaration.markets], ["x402-bazaar", "house-capability-market", "house-seller-catalog"]);
  }
});

test("each derived route carries a schema-valid Bazaar extension with its route template and method", () => {
  const rails = { network: SEPOLIA_NETWORK, asset: USDC_BASE_SEPOLIA, payTo: PAY_TO };
  for (const offer of offers) {
    const entry = offer.x402Route(rails)[`POST ${offer.declaration.route}`];
    assert.equal(entry.extensions.bazaar.routeTemplate, offer.declaration.route);
    assert.equal(entry.extensions.bazaar.info.input.method, "POST");
    assert.deepEqual(validateDiscoveryExtension(entry.extensions.bazaar), { valid: true });
  }
});

// -- GET / (free index listing) ----------------------------------------------

test("respond serves the index listing at GET / for free, without touching compute", async () => {
  const response = await respond(new Request("https://gateway.test/", { method: "GET" }), {
    deriveValueChainShares: () => { throw new Error("must not be called"); },
    deriveTerritoryReadout: () => { throw new Error("must not be called"); },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, indexListing);
  assert.equal(body.listings.length, 2);
  assert.deepEqual(body.listings.map((listing) => listing.title), ["Value-Chain Shares", "Territory Readout"]);
});

test("respond returns 404 for an unrecognized path", async () => {
  const response = await respond(new Request("https://gateway.test/nope"), {});
  assert.equal(response.status, 404);
});

// -- POST /value-chain/shares: the 402 challenge shape on an unpaid call ----

test("the boundary issues the official x402 402 challenge for POST /value-chain/shares with no payment", async () => {
  const config = envConfiguration({ X402_PAY_TO: PAY_TO });
  const boundary = buildPaymentBoundary(config, { facilitatorClient: unpaidFacilitator() });
  const response = await boundary.handle(
    new Request("https://gateway.test/value-chain/shares", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(COCAINE_LADDER_REQUEST),
    }),
    (req) => respond(req),
  );
  assert.equal(response.status, 402);
  const challenge = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));
  assert.equal(challenge.accepts[0].network, SEPOLIA_NETWORK);
  assert.equal(challenge.accepts[0].payTo.toLowerCase(), PAY_TO.toLowerCase());
  assert.equal(challenge.accepts[0].amount, "40000");
});

// -- POST /value-chain/shares: the paid path, facilitator stubbed -----------

test("a settled payment reaches compute and returns the exact ValueChainShareSet", async () => {
  const config = envConfiguration({ X402_PAY_TO: PAY_TO });
  const paidFacilitator = {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: SEPOLIA_NETWORK }], extensions: [], signers: {} }; },
    async verify() { return { isValid: true, payer: `0x${"33".repeat(20)}` }; },
    async settle() { return { success: true, network: SEPOLIA_NETWORK, transaction: `0x${"cd".repeat(32)}`, payer: `0x${"33".repeat(20)}` }; },
  };
  const boundary = buildPaymentBoundary(config, { facilitatorClient: paidFacilitator });

  const requestInit = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(COCAINE_LADDER_REQUEST),
  };
  const unpaid = await boundary.handle(new Request("https://gateway.test/value-chain/shares", requestInit), (req) => respond(req));
  const challenge = JSON.parse(Buffer.from(unpaid.headers.get("payment-required"), "base64").toString("utf8"));
  const paymentSignature = Buffer.from(JSON.stringify({ x402Version: 2, accepted: challenge.accepts[0], payload: { signature: "0xtest" } })).toString("base64");

  const response = await boundary.handle(
    new Request("https://gateway.test/value-chain/shares", { ...requestInit, headers: { ...requestInit.headers, "payment-signature": paymentSignature } }),
    (req) => respond(req),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.type, "ValueChainShareSet");
  assert.equal(body.positionCount, 5);
  assert.equal(body.retailPositionName, "street-cut equivalent");
  assert.deepEqual(body.positions[0].prices[0].share, { numerator: "3", denominator: "500" });
});

// -- schema check of the science seat's cocaine-ladder fixture ---------------

test("the cocaine-ladder fixture request validates against derive-value-chain-shares-request.schema.json", () => {
  const result = validateInstance(COCAINE_LADDER_REQUEST, REQUEST_SCHEMA, schemaCorpus([REQUEST_SCHEMA]));
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test("this worker's own computed result validates against derive-value-chain-shares-result.schema.json", async () => {
  const { deriveValueChainShares } = await import("@red-cup-engineering/derive-value-chain-shares-service");
  const computed = deriveValueChainShares(COCAINE_LADDER_REQUEST);
  const result = validateInstance(computed, RESULT_SCHEMA, schemaCorpus([RESULT_SCHEMA]));
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

// -- POST /territory/readout: the 402 challenge shape on an unpaid call -----

test("the boundary issues the official x402 402 challenge for POST /territory/readout with no payment", async () => {
  const config = envConfiguration({ X402_PAY_TO: PAY_TO });
  const boundary = buildPaymentBoundary(config, { facilitatorClient: unpaidFacilitator() });
  const response = await boundary.handle(
    new Request("https://gateway.test/territory/readout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(TERRITORY_READOUT_REQUEST),
    }),
    (req) => respond(req),
  );
  assert.equal(response.status, 402);
  const challenge = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));
  assert.equal(challenge.accepts[0].network, SEPOLIA_NETWORK);
  assert.equal(challenge.accepts[0].payTo.toLowerCase(), PAY_TO.toLowerCase());
  assert.equal(challenge.accepts[0].amount, "80000");
});

// -- POST /territory/readout: the paid path, facilitator stubbed ------------

test("a settled payment reaches compute and returns the exact TerritoryReadout for the North Shore fixture", async () => {
  const config = envConfiguration({ X402_PAY_TO: PAY_TO });
  const paidFacilitator = {
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: SEPOLIA_NETWORK }], extensions: [], signers: {} }; },
    async verify() { return { isValid: true, payer: `0x${"33".repeat(20)}` }; },
    async settle() { return { success: true, network: SEPOLIA_NETWORK, transaction: `0x${"cd".repeat(32)}`, payer: `0x${"33".repeat(20)}` }; },
  };
  const boundary = buildPaymentBoundary(config, { facilitatorClient: paidFacilitator });

  const requestInit = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(TERRITORY_READOUT_REQUEST),
  };
  const unpaid = await boundary.handle(new Request("https://gateway.test/territory/readout", requestInit), (req) => respond(req));
  const challenge = JSON.parse(Buffer.from(unpaid.headers.get("payment-required"), "base64").toString("utf8"));
  const paymentSignature = Buffer.from(JSON.stringify({ x402Version: 2, accepted: challenge.accepts[0], payload: { signature: "0xtest" } })).toString("base64");

  const response = await boundary.handle(
    new Request("https://gateway.test/territory/readout", { ...requestInit, headers: { ...requestInit.headers, "payment-signature": paymentSignature } }),
    (req) => respond(req),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.type, "TerritoryReadout");
  assert.equal(body.entries.length, 4);
  assert.equal(body.excluded, 0);
  assert.deepEqual(body.territory, { path: NORTH_SHORE_PATH, name: NORTH_SHORE_NAME });
  assert.ok(body.entries.every((entry) => entry.holder === "not named"));
});

// -- schema check of the North Shore fixture ---------------------------------

test("the North Shore fixture request validates against derive-territory-readout-request.schema.json", () => {
  const corpus = schemaCorpus([TERRITORY_READOUT_REQUEST_SCHEMA, TERRITORY_CATALOG_ROW_SCHEMA, RESOURCE_ROW_SCHEMA]);
  const result = validateInstance(TERRITORY_READOUT_REQUEST, TERRITORY_READOUT_REQUEST_SCHEMA, corpus);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test("this worker's own computed territory readout validates against derive-territory-readout-result.schema.json", async () => {
  const { deriveTerritoryReadout } = await import("@red-cup-engineering/derive-territory-readout-service");
  const computed = deriveTerritoryReadout(TERRITORY_READOUT_REQUEST);
  const result = validateInstance(computed, TERRITORY_READOUT_RESULT_SCHEMA, schemaCorpus([TERRITORY_READOUT_RESULT_SCHEMA]));
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});
