# derive-territory-readout
## Requirements
- `entries-for-matching-territory`: The operation must return one entry for every input row whose territory.path equals the request's territory.path or names an ancestor of it, where a row's path is an ancestor of the request's path exactly when the request's territory.path starts with the row's territory.path followed by a path separator.
- `entry-carries-material-identity`: Each returned entry must carry the row's material.commonName, material.scientificName, and material.materialKind unchanged.
- `entry-carries-known-products-and-markets`: Each returned entry must carry the row's knownProducts and markets arrays, with every product, market, and citation field intact.
- `entry-carries-chain-position`: Each returned entry must carry the row's chainPositionHeld value unchanged as chainPosition, whether the literal string "unknown" or a position/evidence record.
- `holder-hidden-without-benefit-sharing-record`: The operation must render an entry's holder as the literal string "not named" whenever the row's benefitSharingRecord is null, and must render the row's identity.issuer as the holder only when benefitSharingRecord is not null.
- `entries-ordered-by-kind-then-name`: The operation must order returned entries first by material.materialKind and then by material.commonName, both compared by the ECMAScript string relational comparison operator.
- `entry-carries-not-found-field-paths`: Each returned entry must carry a notFound array naming, as dotted field paths, every field anywhere in that row whose value is the literal string "unknown" or a string beginning with "unknown" followed by a non-letter character or the end of the string, sorted by the ECMAScript string relational comparison operator so the array's order never depends on the row's own JSON key order.
- `result-carries-excluded-count`: The operation must return an excluded count equal to the number of input rows whose territory.path neither equals nor names an ancestor of the request's territory.path.
## Prohibitions
- `no-holder-without-benefit-sharing-record`: The operation must never return a holder other than the literal string "not named" for a row whose benefitSharingRecord is null, regardless of what the row's identity.issuer states.
- `no-cross-territory-entries`: The operation must never return an entry for a row whose territory.path is neither equal to nor an ancestor of the request's territory.path.
- `no-mutation-of-input`: The operation must not mutate the input request, its territory, or any of its rows.
- `no-clock-no-io`: The operation must not read the system clock or perform any file, network, or process I/O.
- `no-invalid-request-type`: The operation must not accept an input whose type is not TerritoryReadoutRequest or whose version is not 1.
## Laws
- `nagoya-protocol-access-benefit-sharing` | Secretariat of the Convention on Biological Diversity | 2010 | https://www.cbd.int/abs/ | Applies to holder-hidden-without-benefit-sharing-record, no-holder-without-benefit-sharing-record. | The Nagoya Protocol on Access to Genetic Resources and the Fair and Equitable Sharing of Benefits Arising from their Utilization requires prior informed consent and a benefit-sharing agreement before a genetic resource's origin or holder may be disclosed or its benefits distributed; a reading may not name a holder absent the register record evidencing that agreement.
## Standards
- `ecmascript-string-relational-comparison` | Ecma International | ECMA-262, 16th edition (2025) | https://tc39.es/ecma262/#sec-abstract-relational-comparison | Applies to entries-ordered-by-kind-then-name, entry-carries-not-found-field-paths. | ECMAScript's abstract relational comparison operator totally orders strings by UTF-16 code unit sequence, deterministic and locale-independent, used here instead of a locale-collation comparator.
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to entries-for-matching-territory, entry-carries-not-found-field-paths, no-clock-no-io. | The package uses one executable ESM operation source file with no runtime dependencies, reading and transforming its JSON input with no I/O.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-territory-readout-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-territory-readout.mjs
#!/usr/bin/env node
const UNKNOWN_LEADING_PATTERN = /^unknown(?:[^a-zA-Z]|$)/u;

function nonEmptyString(value, context) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`derive-territory-readout: ${context} must be a nonempty string`);
  }
  return value;
}

function plainObject(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`derive-territory-readout: ${context} must be an object`);
  }
  return value;
}

function validateRequestTerritory(territory, context) {
  plainObject(territory, context);
  nonEmptyString(territory.path, `${context}.path`);
  nonEmptyString(territory.name, `${context}.name`);
  return territory;
}

function validateRowTerritory(territory, context) {
  plainObject(territory, context);
  nonEmptyString(territory.path, `${context}.path`);
  nonEmptyString(territory.plainName, `${context}.plainName`);
  return territory;
}

function validateMaterial(material, context) {
  plainObject(material, context);
  nonEmptyString(material.commonName, `${context}.commonName`);
  if (material.scientificName !== null) nonEmptyString(material.scientificName, `${context}.scientificName`);
  nonEmptyString(material.materialKind, `${context}.materialKind`);
  return material;
}

function validateCitation(citation, context) {
  plainObject(citation, context);
  nonEmptyString(citation.sourceUrl, `${context}.sourceUrl`);
  nonEmptyString(citation.sourceTitle, `${context}.sourceTitle`);
  nonEmptyString(citation.accessedOn, `${context}.accessedOn`);
  return citation;
}

function validateKnownProduct(entry, context) {
  plainObject(entry, context);
  nonEmptyString(entry.product, `${context}.product`);
  nonEmptyString(entry.use, `${context}.use`);
  validateCitation(entry.citation, `${context}.citation`);
  return entry;
}

function validateMarket(entry, context) {
  plainObject(entry, context);
  nonEmptyString(entry.buyer, `${context}.buyer`);
  nonEmptyString(entry.kind, `${context}.kind`);
  validateCitation(entry.citation, `${context}.citation`);
  return entry;
}

function validateChainPositionHeld(value, context) {
  if (value === "unknown") return value;
  plainObject(value, context);
  nonEmptyString(value.position, `${context}.position`);
  nonEmptyString(value.evidence, `${context}.evidence`);
  return value;
}

function validateRow(row, index) {
  const context = `rows[${index}]`;
  plainObject(row, context);
  validateRowTerritory(row.territory, `${context}.territory`);
  validateMaterial(row.material, `${context}.material`);
  if (!Array.isArray(row.knownProducts)) throw new TypeError(`derive-territory-readout: ${context}.knownProducts must be an array`);
  row.knownProducts.forEach((entry, entryIndex) => validateKnownProduct(entry, `${context}.knownProducts[${entryIndex}]`));
  if (!Array.isArray(row.markets)) throw new TypeError(`derive-territory-readout: ${context}.markets must be an array`);
  row.markets.forEach((entry, entryIndex) => validateMarket(entry, `${context}.markets[${entryIndex}]`));
  validateChainPositionHeld(row.chainPositionHeld, `${context}.chainPositionHeld`);
  if (row.benefitSharingRecord !== null) nonEmptyString(row.benefitSharingRecord, `${context}.benefitSharingRecord`);
  plainObject(row.identity, `${context}.identity`);
  nonEmptyString(row.identity.issuer, `${context}.identity.issuer`);
  return row;
}

function isTerritoryMatch(rowPath, requestPath) {
  return rowPath === requestPath || requestPath.startsWith(`${rowPath}/`);
}

function collectUnknownFieldPaths(value, prefix, found) {
  if (value === null || value === undefined) return found;
  if (typeof value === "string") {
    if (UNKNOWN_LEADING_PATTERN.test(value)) found.push(prefix);
    return found;
  }
  if (typeof value !== "object") return found;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUnknownFieldPaths(item, `${prefix}[${index}]`, found));
    return found;
  }
  for (const [key, sub] of Object.entries(value)) {
    collectUnknownFieldPaths(sub, prefix.length === 0 ? key : `${prefix}.${key}`, found);
  }
  return found;
}

function compareStrings(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Derives one place's territory readout from the Turtle Island taxonomy: every catalogued material
 * whose row belongs to that place or one of its ancestors, each with its known products and markets
 * (citations intact), its currently held chain position, a holder rendered as the literal "not named"
 * whenever the row carries no benefit-sharing record (never the row's own issuer in that case), and
 * a notFound listing of every field anywhere in that row the row itself marks unknown, sorted so the
 * listing never depends on the row's own JSON key order. Pure, no I/O, no clock. Entries are ordered
 * by material kind then common name, and notFound paths are sorted, by the ECMAScript string
 * relational comparison (never locale collation); rows outside the requested territory are excluded
 * and counted.
 * @param {{ type: "TerritoryReadoutRequest", version: 1, territory: { path: string, name: string },
 *   rows: readonly object[] }} input The place being read (its taxonomy path and plain name) and the
 *   territory catalog rows to read it against; each row is a territory-catalog-row record (this
 *   section's schema): `territory: {path, plainName}`, `material: {commonName, scientificName,
 *   materialKind}`, `knownProducts`, `markets`, `chainPositionHeld`, `benefitSharingRecord`,
 *   `identity: {issuer, ...}`, and any other resource-row field.
 * @returns {{ type: "TerritoryReadout", version: 1, territory: { path: string, name: string },
 *   entries: readonly { material: { commonName: string, scientificName: (string|null),
 *   materialKind: string }, knownProducts: readonly object[], markets: readonly object[],
 *   chainPosition: ("unknown" | { position: string, evidence: string }), holder: string,
 *   notFound: readonly string[] }[], excluded: number }} The requested territory, one entry per
 *   matching row (ordered by material kind then common name), and the count of rows excluded for
 *   lying outside that territory and its ancestors.
 * @throws {TypeError} When `input` is not a `TerritoryReadoutRequest`, or a territory or row field is
 *   malformed.
 */
export function deriveTerritoryReadout(input) {
  if (!input || typeof input !== "object" || input.type !== "TerritoryReadoutRequest" || input.version !== 1) {
    throw new TypeError("derive-territory-readout: input must be a TerritoryReadoutRequest@1 record");
  }
  const territory = validateRequestTerritory(input.territory, "input.territory");
  if (!Array.isArray(input.rows)) {
    throw new TypeError("derive-territory-readout: input.rows must be an array");
  }
  input.rows.forEach((row, index) => validateRow(row, index));

  let excluded = 0;
  const matchedRows = [];
  for (const row of input.rows) {
    if (isTerritoryMatch(row.territory.path, territory.path)) {
      matchedRows.push(row);
    } else {
      excluded += 1;
    }
  }

  const entries = matchedRows
    .map((row) => Object.freeze({
      material: Object.freeze({
        commonName: row.material.commonName,
        scientificName: row.material.scientificName,
        materialKind: row.material.materialKind,
      }),
      knownProducts: Object.freeze(row.knownProducts.map((entry) => Object.freeze({ product: entry.product, use: entry.use, citation: Object.freeze({ ...entry.citation }) }))),
      markets: Object.freeze(row.markets.map((entry) => Object.freeze({ buyer: entry.buyer, kind: entry.kind, citation: Object.freeze({ ...entry.citation }) }))),
      chainPosition: row.chainPositionHeld === "unknown" ? "unknown" : Object.freeze({ position: row.chainPositionHeld.position, evidence: row.chainPositionHeld.evidence }),
      holder: row.benefitSharingRecord === null ? "not named" : row.identity.issuer,
      notFound: Object.freeze(collectUnknownFieldPaths(row, "", []).sort(compareStrings)),
    }))
    .sort((a, b) => compareStrings(a.material.materialKind, b.material.materialKind) || compareStrings(a.material.commonName, b.material.commonName));

  return Object.freeze({
    type: "TerritoryReadout",
    version: 1,
    territory: Object.freeze({ path: territory.path, name: territory.name }),
    entries: Object.freeze(entries),
    excluded,
  });
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "deriveTerritoryReadout — Derives one place's territory readout from the Turtle Island taxonomy: every catalogued material whose row belongs to that place or one of its ancestors, each with its known products and markets (citations intact), its currently held chain position, a holder rendered as the literal \"not named\" whenever the row carries no benefit-sharing record (never the row's own issuer in that case), and a notFound listing of every field anywhere in that row the row itself marks unknown, sorted so the listing never depends on the row's own JSON key order. Pure, no I/O, no clock. Entries are ordered by material kind then common name, and notFound paths are sorted, by the ECMAScript string relational comparison (never locale collation); rows outside the requested territory are excluded and counted.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length === 0) continue;
      try {
        process.stdout.write(`${JSON.stringify(deriveTerritoryReadout(JSON.parse(line)))}\n`);
      } catch (error) {
        process.stderr.write(`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`);
        process.exitCode = 1;
      }
    }
  }
}
```
## Tests
```mjs path=test/derive-territory-readout.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { deriveTerritoryReadout } from "../scripts/derive-territory-readout.mjs";

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeysDeep(value[key])]));
  }
  return value;
}

// The band's own region's real catalog rows: manoomin, rivercane, and Lake Superior fish and agate (the hopeium capability specification's (ii), the first catalog records).
const NORTH_SHORE_ROWS = [
  {
    "identity": {
      "name": "Lake Superior agate",
      "kind": "commodity",
      "issuer": "unknown",
      "rail": "unknown"
    },
    "denomination": {
      "unit": "unknown; sold by the piece or by weight, no standard unit found"
    },
    "custody": "unknown",
    "yieldForm": "none",
    "laborForm": "collected by rockhounding (surface collecting); at lapidary scale, tumbled, slabbed and polished, or face-polished for jewelry and collectibles (Minnesota DNR, 'Lake Superior Agate - Minnesota's State Gem')",
    "liquidity": {
      "exitPath": "unknown; no first-party seller or market page found this session",
      "exitsToRow": null
    },
    "extractionCeiling": {
      "cap": "unknown; no collecting limit found on the sources read",
      "resetPeriod": "unknown",
      "antiBotRule": "unknown"
    },
    "identityCost": {
      "kycRequired": "unknown",
      "perHumanSlot": "unknown"
    },
    "witnesses": [
      {
        "source": "state regulator's first-party education page",
        "sourceUrl": "https://www.dnr.state.mn.us/education/geology/digging/agate.html",
        "observedOn": "2026-09-05"
      }
    ],
    "provenance": {
      "sourceUrl": "https://www.dnr.state.mn.us/education/geology/digging/agate.html",
      "observedOn": "2026-09-05",
      "evidenceStatus": "measured"
    },
    "territory": {
      "path": "lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section",
      "plainName": "North Shore"
    },
    "material": {
      "scientificName": null,
      "commonName": "Lake Superior agate",
      "materialKind": "mineral"
    },
    "knownProducts": [
      {
        "product": "tumbled stones, cabochons, and face-polished specimens",
        "use": "jewelry (rings, bracelets, belt buckles) and mineral collectibles; designated Minnesota's official state gemstone in 1969",
        "citation": {
          "sourceUrl": "https://www.dnr.state.mn.us/education/geology/digging/agate.html",
          "sourceTitle": "Lake Superior Agate - Minnesota's State Gem",
          "accessedOn": "2026-09-05"
        }
      }
    ],
    "markets": [],
    "chainPositionHeld": "unknown",
    "benefitSharingRecord": null,
    "observedAt": "2026-09-05"
  },
  {
    "identity": {
      "name": "Lake Superior lake trout",
      "kind": "commodity",
      "issuer": "unknown",
      "rail": "unknown"
    },
    "denomination": {
      "unit": "pound (round weight, commercial harvest)"
    },
    "custody": "unknown",
    "yieldForm": "none",
    "laborForm": "commercially gillnetted or trap-netted by a Minnesota-licensed Lake Superior commercial fisher; lake trout may not be commercially taken except by special permit, and incidentally-taken live lake trout, and untagged dead lake trout, must be returned to the water immediately (Minnesota DNR, commercial fishing license page)",
    "liquidity": {
      "exitPath": "sold to a licensed fish buyer or a lakeside fish market/smokehouse",
      "exitsToRow": null
    },
    "extractionCeiling": {
      "cap": "25 total Minnesota commercial fishing licenses for Lake Superior; lake trout commercial take is special-permit-only (no general commercial season); the co-managed cisco/lake herring quota is set annually at an estimated 10 percent of total biomass",
      "resetPeriod": "annual (license renewal; annual biomass-based quota for cisco/lake herring)",
      "antiBotRule": "a Minnesota commercial fishing license, limited to 25 total license-holders statewide for Lake Superior, with licensing criteria including apprenticeship experience with an existing licensed commercial fisherman and required equipment"
    },
    "identityCost": {
      "kycRequired": false,
      "perHumanSlot": true,
      "detail": "a state commercial fishing license, one of only 25 issued for Minnesota waters of Lake Superior"
    },
    "witnesses": [
      {
        "source": "state regulator's first-party licensing page",
        "sourceUrl": "https://www.dnr.state.mn.us/fishing/commercial/cf.html",
        "observedOn": "2026-09-05"
      },
      {
        "source": "state regulator's first-party species page",
        "sourceUrl": "https://www.dnr.state.mn.us/fish/cisco/index.html",
        "observedOn": "2026-09-05"
      }
    ],
    "provenance": {
      "sourceUrl": "https://www.dnr.state.mn.us/fishing/commercial/cf.html",
      "observedOn": "2026-09-05",
      "evidenceStatus": "measured"
    },
    "territory": {
      "path": "lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section",
      "plainName": "North Shore"
    },
    "material": {
      "scientificName": "Salvelinus namaycush",
      "commonName": "Lake Superior lake trout (co-managed with cisco/lake herring, Coregonus artedi, under the same Minnesota commercial-fishing license and species list)",
      "materialKind": "species"
    },
    "knownProducts": [
      {
        "product": "fresh and smoked lake trout, whitefish, and herring (cisco), sold whole or as fillets",
        "use": "food, sold fresh or smoked at North Shore fish markets",
        "citation": {
          "sourceUrl": "https://superiorinngrandmarais.com/dockside-fish-market/",
          "sourceTitle": "Dockside Fish Market",
          "accessedOn": "2026-09-05"
        }
      },
      {
        "product": "commercially netted cisco/lake herring",
        "use": "historically Lake Superior's largest commercial fishery, up to 19 million pounds annually in high-catch years; Minnesota harvested over 350,000 pounds in 2011-2012 before dropping below 250,000 pounds in recent years",
        "citation": {
          "sourceUrl": "https://www.dnr.state.mn.us/fish/cisco/index.html",
          "sourceTitle": "Cisco, Herring, Lake Herring and Tullibee | Minnesota DNR",
          "accessedOn": "2026-09-05"
        }
      }
    ],
    "markets": [
      {
        "buyer": "Dockside Fish Market, Grand Marais, Minnesota (North Shore)",
        "kind": "local fish market and smokehouse",
        "citation": {
          "sourceUrl": "https://superiorinngrandmarais.com/dockside-fish-market/",
          "sourceTitle": "Dockside Fish Market",
          "accessedOn": "2026-09-05"
        }
      },
      {
        "buyer": "the 25 Minnesota-licensed Lake Superior commercial fishers as a class",
        "kind": "state-licensed commercial harvest channel",
        "citation": {
          "sourceUrl": "https://www.dnr.state.mn.us/fishing/commercial/cf.html",
          "sourceTitle": "Commercial fishing license information | Minnesota DNR",
          "accessedOn": "2026-09-05"
        }
      }
    ],
    "chainPositionHeld": "unknown",
    "benefitSharingRecord": null,
    "observedAt": "2026-09-05"
  },
  {
    "identity": {
      "name": "manoomin (wild rice)",
      "kind": "commodity",
      "issuer": "unknown",
      "rail": "unknown"
    },
    "denomination": {
      "unit": "pound (finished, hand-parched grain)"
    },
    "custody": "unknown",
    "yieldForm": "none",
    "laborForm": "hand-harvested from a canoe using knocking sticks and a push pole, within the licensed statewide season (Minnesota DNR, 'Wild Rice Regulations')",
    "liquidity": {
      "exitPath": "sold directly to a buyer, through a state-licensed wild rice buyer, or processed and sold as a packaged food product by a tribally-owned foods enterprise",
      "exitsToRow": null
    },
    "extractionCeiling": {
      "cap": "unknown; no per-harvester poundage cap found for state waters, and reservation wild rice committees set their own harvest rules on reservation waters",
      "resetPeriod": "annual (statewide season runs August 15 to September 30, 9 a.m. to 3 p.m. daily; reservation committees set their own opening dates and hours no less than 24 hours before opening)",
      "antiBotRule": "a Minnesota wild-rice harvester license (season or one-day) is required for residents and nonresidents; members of a federally recognized Minnesota tribe with a valid tribal ID card are exempt from the state license"
    },
    "identityCost": {
      "kycRequired": false,
      "perHumanSlot": true,
      "detail": "a state wild-rice harvester license, or a tribal ID card for exempt tribal members; license and buyer-license fees are deposited in a dedicated wild-rice management account (Minnesota DNR, 'Wild Rice Regulations')"
    },
    "witnesses": [
      {
        "source": "state regulator's first-party regulation page",
        "sourceUrl": "https://www.dnr.state.mn.us/regulations/wildrice/index.html",
        "observedOn": "2026-09-05"
      },
      {
        "source": "tribally-owned foods enterprise's first-party site",
        "sourceUrl": "https://redlakenationfoods.com/home-1-2/",
        "observedOn": "2026-09-05"
      }
    ],
    "provenance": {
      "sourceUrl": "https://www.dnr.state.mn.us/aquatic_plants/emergent_plants/wildrice.html",
      "observedOn": "2026-09-05",
      "evidenceStatus": "measured"
    },
    "territory": {
      "path": "lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section",
      "plainName": "North Shore"
    },
    "material": {
      "scientificName": "Zizania palustris",
      "commonName": "manoomin (wild rice)",
      "materialKind": "species"
    },
    "knownProducts": [
      {
        "product": "hand-harvested raw wild rice grain, parched and finished for food",
        "use": "food; higher protein content than most cereal grains, a subsistence and cultural keystone for Anishinaabe communities of the Lake Superior basin, protected by 1837, 1842, and 1854 treaty harvesting rights",
        "citation": {
          "sourceUrl": "https://www.dnr.state.mn.us/aquatic_plants/emergent_plants/wildrice.html",
          "sourceTitle": "Wild Rice (Zizania palustris) | Minnesota DNR",
          "accessedOn": "2026-09-05"
        }
      },
      {
        "product": "packaged cultivated and hand-harvested wild rice, wild-fruit jellies, jams, and gift foods",
        "use": "retail food product sold under a tribally-owned brand; cited here as the reference-implementation market for Minnesota wild rice, not as evidence that this North Shore territory's own harvest reaches this specific enterprise (Red Lake Nation is a different band's reservation)",
        "citation": {
          "sourceUrl": "https://redlakenationfoods.com/home-1-2/",
          "sourceTitle": "Red Lake Nation Foods",
          "accessedOn": "2026-09-05"
        }
      }
    ],
    "markets": [
      {
        "buyer": "Red Lake Nation Foods (Red Lake Nation's tribally-owned enterprise), cited as the reference-implementation market for hand-harvested and cultivated Minnesota wild rice",
        "kind": "reference-implementation, tribally-owned food enterprise",
        "citation": {
          "sourceUrl": "https://redlakenationfoods.com/home-1-2/",
          "sourceTitle": "Red Lake Nation Foods",
          "accessedOn": "2026-09-05"
        }
      },
      {
        "buyer": "state-licensed wild rice buyers",
        "kind": "state-licensed buyer channel",
        "citation": {
          "sourceUrl": "https://www.dnr.state.mn.us/regulations/wildrice/index.html",
          "sourceTitle": "Wild Rice Regulations | Minnesota DNR",
          "accessedOn": "2026-09-05"
        }
      }
    ],
    "chainPositionHeld": "unknown",
    "benefitSharingRecord": null,
    "observedAt": "2026-09-05"
  },
  {
    "identity": {
      "name": "rivercane (Arundinaria gigantea)",
      "kind": "commodity",
      "issuer": "unknown",
      "rail": "unknown"
    },
    "denomination": {
      "unit": "unknown; no unit found for a North Shore/Lake Superior harvest, because none is documented (this territory has no established rivercane harvest; see provenance)"
    },
    "custody": "unknown",
    "yieldForm": "none",
    "laborForm": "unknown for this territory; in its native Southeastern range, rivercane is propagated and harvested by living-rhizome division and transplant, since it reproduces almost entirely vegetatively and cannot be recompiled from seed (561 Group Services Section, note on Phezí Ocháǧe, citing the rivercane ecology paper in botany-services-section)",
    "liquidity": {
      "exitPath": "unknown; no market found for a North Shore/Lake Superior source of rivercane",
      "exitsToRow": null
    },
    "extractionCeiling": {
      "cap": "unknown",
      "resetPeriod": "unknown",
      "antiBotRule": "unknown"
    },
    "identityCost": {
      "kycRequired": "unknown",
      "perHumanSlot": "unknown"
    },
    "witnesses": [
      {
        "source": "university extension first-party plant profile",
        "sourceUrl": "https://plants.ces.ncsu.edu/plants/arundinaria-gigantea/",
        "observedOn": "2026-09-05"
      },
      {
        "source": "federal agency first-party project page",
        "sourceUrl": "https://www.fws.gov/project/collaboration-river-cane-restoration",
        "observedOn": "2026-09-05"
      }
    ],
    "provenance": {
      "sourceUrl": "lib/emsenn/services/561-group/services/561-group-services-section/content/text/documents/articles/notes/2026/08/21/2026-08-21-note-on-phezi-ochage.md",
      "observedOn": "2026-08-21",
      "evidenceStatus": "self-reported"
    },
    "territory": {
      "path": "lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section",
      "plainName": "North Shore"
    },
    "material": {
      "scientificName": "Arundinaria gigantea",
      "commonName": "rivercane, catalogued here as the band's own structural kinship metaphor (Phíž ezí Ocháǧe), not as a plant native to or harvested in this territory",
      "materialKind": "knowledge"
    },
    "knownProducts": [
      {
        "product": "the founder's structural identification of the tiyóšpaye's kinship-form with the canebrake",
        "use": "a metaphysical/organizational reading, not a physical harvest: one genet with many culms as the kinship's living continuity; extension by living transplant, never by seed, as the model for huŋkápi (the making of relatives); persistence only in relationship; no synchronized all-or-nothing renewal (mautam); a reticulate, adoptive lineage held as one body; the remnant (over 98 percent of historical canebrakes gone) as irreplaceable. This note claims no part of the Cherokee and neighboring nations' inheritance of the plant itself; it claims kinship with the plant of the place actually lived on.",
        "citation": {
          "sourceUrl": "lib/emsenn/services/561-group/services/561-group-services-section/content/text/documents/articles/notes/2026/08/21/2026-08-21-note-on-phezi-ochage.md",
          "sourceTitle": "2026-08-21 note on Phíž ezí Ocháǧe",
          "accessedOn": "2026-09-05"
        }
      },
      {
        "product": "woven baskets, blowguns, fishing poles, musical instruments, home construction material, and erosion-control planting",
        "use": "traditional basketry, construction, crafts, and streambank stabilization, documented in the plant's native Southeastern range (the Eastern Band of Cherokee Indians and neighboring nations; also the founder's own hand-propagation along Crooked Creek in Durham, North Carolina) — a different territory than this North Shore/Lake Superior region, included here only to state what the material is, never as a claim it is used or grown here",
        "citation": {
          "sourceUrl": "https://plants.ces.ncsu.edu/plants/arundinaria-gigantea/",
          "sourceTitle": "River Cane - Arundinaria gigantea | NC State Extension Gardener Plant Toolbox",
          "accessedOn": "2026-09-05"
        }
      }
    ],
    "markets": [],
    "chainPositionHeld": "unknown",
    "benefitSharingRecord": null,
    "observedAt": "2026-09-05"
  }
];

const NORTH_SHORE_PATH = "lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section";
const NORTH_SHORE_NAME = "North Shore";
const SIBLING_REGION_PATH = "lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-great-plains-regional-ecological-adaptation-services-section";

test("refuses a non-TerritoryReadoutRequest input", () => {
  assert.throws(() => deriveTerritoryReadout({}), /must be a TerritoryReadoutRequest/u);
  assert.throws(() => deriveTerritoryReadout({ type: "TerritoryReadoutRequest", version: 2, territory: { path: "a", name: "A" }, rows: [] }), /must be a TerritoryReadoutRequest/u);
});

test("refuses a request whose rows field is not an array", () => {
  assert.throws(() => deriveTerritoryReadout({ type: "TerritoryReadoutRequest", version: 1, territory: { path: "a", name: "A" }, rows: "nope" }), /input.rows must be an array/u);
});

test("reads the four real North Shore rows against their own node: all four included, none excluded", () => {
  const result = deriveTerritoryReadout({
    type: "TerritoryReadoutRequest", version: 1,
    territory: { path: NORTH_SHORE_PATH, name: NORTH_SHORE_NAME },
    rows: NORTH_SHORE_ROWS,
  });
  assert.equal(result.entries.length, 4);
  assert.equal(result.excluded, 0);
  assert.deepEqual(result.territory, { path: NORTH_SHORE_PATH, name: NORTH_SHORE_NAME });
});

test("orders entries by material kind then common name (knowledge, mineral, species/species)", () => {
  const result = deriveTerritoryReadout({
    type: "TerritoryReadoutRequest", version: 1,
    territory: { path: NORTH_SHORE_PATH, name: NORTH_SHORE_NAME },
    rows: NORTH_SHORE_ROWS,
  });
  assert.deepEqual(result.entries.map((entry) => entry.material.materialKind), ["knowledge", "mineral", "species", "species"]);
  assert.deepEqual(result.entries.map((entry) => entry.material.commonName), [
    "rivercane, catalogued here as the band's own structural kinship metaphor (Phíž ezí Ocháǧe), not as a plant native to or harvested in this territory",
    "Lake Superior agate",
    "Lake Superior lake trout (co-managed with cisco/lake herring, Coregonus artedi, under the same Minnesota commercial-fishing license and species list)",
    "manoomin (wild rice)",
  ]);
});

test("never shows a holder for any of the four real rows, since none carries a benefit-sharing record", () => {
  const result = deriveTerritoryReadout({
    type: "TerritoryReadoutRequest", version: 1,
    territory: { path: NORTH_SHORE_PATH, name: NORTH_SHORE_NAME },
    rows: NORTH_SHORE_ROWS,
  });
  assert.ok(result.entries.every((entry) => entry.holder === "not named"));
});

test("carries every unknown-marked field of the agate row in that entry's notFound, named as dotted paths and sorted", () => {
  const result = deriveTerritoryReadout({
    type: "TerritoryReadoutRequest", version: 1,
    territory: { path: NORTH_SHORE_PATH, name: NORTH_SHORE_NAME },
    rows: NORTH_SHORE_ROWS,
  });
  const agate = result.entries.find((entry) => entry.material.commonName === "Lake Superior agate");
  assert.deepEqual(agate.notFound, [
    "chainPositionHeld", "custody", "denomination.unit", "extractionCeiling.antiBotRule",
    "extractionCeiling.cap", "extractionCeiling.resetPeriod", "identity.issuer", "identity.rail",
    "identityCost.kycRequired", "identityCost.perHumanSlot", "liquidity.exitPath",
  ]);
});

test("orders notFound independently of the row's own JSON key order (canonical-JSON round trip agrees with direct import)", () => {
  const reordered = sortKeysDeep(NORTH_SHORE_ROWS[0]);
  const direct = deriveTerritoryReadout({
    type: "TerritoryReadoutRequest", version: 1,
    territory: { path: NORTH_SHORE_PATH, name: NORTH_SHORE_NAME },
    rows: [NORTH_SHORE_ROWS[0]],
  });
  const fromReordered = deriveTerritoryReadout({
    type: "TerritoryReadoutRequest", version: 1,
    territory: { path: NORTH_SHORE_PATH, name: NORTH_SHORE_NAME },
    rows: [reordered],
  });
  assert.deepEqual(direct.entries[0].notFound, fromReordered.entries[0].notFound);
});

test("excludes all four real rows, counted, when read against a sibling regional node", () => {
  const result = deriveTerritoryReadout({
    type: "TerritoryReadoutRequest", version: 1,
    territory: { path: SIBLING_REGION_PATH, name: "Great Plains" },
    rows: NORTH_SHORE_ROWS,
  });
  assert.equal(result.entries.length, 0);
  assert.equal(result.excluded, 4);
});

test("includes a row catalogued at an ancestor of the requested path", () => {
  const ancestorPath = "lib/emsenn/services/turtle-island";
  const descendantPath = "lib/emsenn/services/turtle-island/north-shore";
  const row = {
    identity: { issuer: "unknown" },
    territory: { path: ancestorPath, plainName: "Turtle Island" },
    material: { commonName: "a material", scientificName: null, materialKind: "mineral" },
    knownProducts: [], markets: [],
    chainPositionHeld: "unknown",
    benefitSharingRecord: null,
  };
  const result = deriveTerritoryReadout({
    type: "TerritoryReadoutRequest", version: 1,
    territory: { path: descendantPath, name: "North Shore" },
    rows: [row],
  });
  assert.equal(result.entries.length, 1);
  assert.equal(result.excluded, 0);
});

test("excludes a row catalogued at a strict descendant of the requested path (a descendant is not an ancestor)", () => {
  const ancestorPath = "lib/emsenn/services/turtle-island";
  const descendantPath = "lib/emsenn/services/turtle-island/north-shore";
  const row = {
    identity: { issuer: "unknown" },
    territory: { path: descendantPath, plainName: "North Shore" },
    material: { commonName: "a material", scientificName: null, materialKind: "mineral" },
    knownProducts: [], markets: [],
    chainPositionHeld: "unknown",
    benefitSharingRecord: null,
  };
  const result = deriveTerritoryReadout({
    type: "TerritoryReadoutRequest", version: 1,
    territory: { path: ancestorPath, name: "Turtle Island" },
    rows: [row],
  });
  assert.equal(result.entries.length, 0);
  assert.equal(result.excluded, 1);
});

test("renders the holder as the literal not-named string even when identity.issuer names a holder, when benefitSharingRecord is null", () => {
  const row = {
    identity: { issuer: "a named holder" },
    territory: { path: "a", plainName: "A" },
    material: { commonName: "a material", scientificName: null, materialKind: "mineral" },
    knownProducts: [], markets: [],
    chainPositionHeld: "unknown",
    benefitSharingRecord: null,
  };
  const result = deriveTerritoryReadout({
    type: "TerritoryReadoutRequest", version: 1,
    territory: { path: "a", name: "A" },
    rows: [row],
  });
  assert.equal(result.entries[0].holder, "not named");
});

test("renders the holder as the row's issuer only when benefitSharingRecord is not null", () => {
  const row = {
    identity: { issuer: "a named holder" },
    territory: { path: "a", plainName: "A" },
    material: { commonName: "a material", scientificName: null, materialKind: "mineral" },
    knownProducts: [], markets: [],
    chainPositionHeld: "unknown",
    benefitSharingRecord: "561-group.territorial-economy.benefit-sharing-record/a-record",
  };
  const result = deriveTerritoryReadout({
    type: "TerritoryReadoutRequest", version: 1,
    territory: { path: "a", name: "A" },
    rows: [row],
  });
  assert.equal(result.entries[0].holder, "a named holder");
});

test("does not mutate the input request, its territory, or its rows", () => {
  const request = {
    type: "TerritoryReadoutRequest", version: 1,
    territory: { path: NORTH_SHORE_PATH, name: NORTH_SHORE_NAME },
    rows: NORTH_SHORE_ROWS,
  };
  const before = JSON.stringify(request);
  deriveTerritoryReadout(request);
  assert.equal(JSON.stringify(request), before);
});

test("carries the position/evidence chain position record unchanged when one is known", () => {
  const row = {
    identity: { issuer: "unknown" },
    territory: { path: "a", plainName: "A" },
    material: { commonName: "a material", scientificName: null, materialKind: "mineral" },
    knownProducts: [], markets: [],
    chainPositionHeld: { position: "wholesale", evidence: "a state licensing record" },
    benefitSharingRecord: null,
  };
  const result = deriveTerritoryReadout({
    type: "TerritoryReadoutRequest", version: 1,
    territory: { path: "a", name: "A" },
    rows: [row],
  });
  assert.deepEqual(result.entries[0].chainPosition, { position: "wholesale", evidence: "a state licensing record" });
});
```
## Examples
```json name="the four real North Shore catalog rows (manoomin, rivercane, Lake Superior lake trout, Lake Superior agate) read against their own North Shore node: all four included"
{"input":{"type":"TerritoryReadoutRequest","version":1,"territory":{"path":"lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section","name":"North Shore"},"rows":[{"identity":{"name":"Lake Superior agate","kind":"commodity","issuer":"unknown","rail":"unknown"},"denomination":{"unit":"unknown; sold by the piece or by weight, no standard unit found"},"custody":"unknown","yieldForm":"none","laborForm":"collected by rockhounding (surface collecting); at lapidary scale, tumbled, slabbed and polished, or face-polished for jewelry and collectibles (Minnesota DNR, 'Lake Superior Agate - Minnesota's State Gem')","liquidity":{"exitPath":"unknown; no first-party seller or market page found this session","exitsToRow":null},"extractionCeiling":{"cap":"unknown; no collecting limit found on the sources read","resetPeriod":"unknown","antiBotRule":"unknown"},"identityCost":{"kycRequired":"unknown","perHumanSlot":"unknown"},"witnesses":[{"source":"state regulator's first-party education page","sourceUrl":"https://www.dnr.state.mn.us/education/geology/digging/agate.html","observedOn":"2026-09-05"}],"provenance":{"sourceUrl":"https://www.dnr.state.mn.us/education/geology/digging/agate.html","observedOn":"2026-09-05","evidenceStatus":"measured"},"territory":{"path":"lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section","plainName":"North Shore"},"material":{"scientificName":null,"commonName":"Lake Superior agate","materialKind":"mineral"},"knownProducts":[{"product":"tumbled stones, cabochons, and face-polished specimens","use":"jewelry (rings, bracelets, belt buckles) and mineral collectibles; designated Minnesota's official state gemstone in 1969","citation":{"sourceUrl":"https://www.dnr.state.mn.us/education/geology/digging/agate.html","sourceTitle":"Lake Superior Agate - Minnesota's State Gem","accessedOn":"2026-09-05"}}],"markets":[],"chainPositionHeld":"unknown","benefitSharingRecord":null,"observedAt":"2026-09-05"},{"identity":{"name":"Lake Superior lake trout","kind":"commodity","issuer":"unknown","rail":"unknown"},"denomination":{"unit":"pound (round weight, commercial harvest)"},"custody":"unknown","yieldForm":"none","laborForm":"commercially gillnetted or trap-netted by a Minnesota-licensed Lake Superior commercial fisher; lake trout may not be commercially taken except by special permit, and incidentally-taken live lake trout, and untagged dead lake trout, must be returned to the water immediately (Minnesota DNR, commercial fishing license page)","liquidity":{"exitPath":"sold to a licensed fish buyer or a lakeside fish market/smokehouse","exitsToRow":null},"extractionCeiling":{"cap":"25 total Minnesota commercial fishing licenses for Lake Superior; lake trout commercial take is special-permit-only (no general commercial season); the co-managed cisco/lake herring quota is set annually at an estimated 10 percent of total biomass","resetPeriod":"annual (license renewal; annual biomass-based quota for cisco/lake herring)","antiBotRule":"a Minnesota commercial fishing license, limited to 25 total license-holders statewide for Lake Superior, with licensing criteria including apprenticeship experience with an existing licensed commercial fisherman and required equipment"},"identityCost":{"kycRequired":false,"perHumanSlot":true,"detail":"a state commercial fishing license, one of only 25 issued for Minnesota waters of Lake Superior"},"witnesses":[{"source":"state regulator's first-party licensing page","sourceUrl":"https://www.dnr.state.mn.us/fishing/commercial/cf.html","observedOn":"2026-09-05"},{"source":"state regulator's first-party species page","sourceUrl":"https://www.dnr.state.mn.us/fish/cisco/index.html","observedOn":"2026-09-05"}],"provenance":{"sourceUrl":"https://www.dnr.state.mn.us/fishing/commercial/cf.html","observedOn":"2026-09-05","evidenceStatus":"measured"},"territory":{"path":"lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section","plainName":"North Shore"},"material":{"scientificName":"Salvelinus namaycush","commonName":"Lake Superior lake trout (co-managed with cisco/lake herring, Coregonus artedi, under the same Minnesota commercial-fishing license and species list)","materialKind":"species"},"knownProducts":[{"product":"fresh and smoked lake trout, whitefish, and herring (cisco), sold whole or as fillets","use":"food, sold fresh or smoked at North Shore fish markets","citation":{"sourceUrl":"https://superiorinngrandmarais.com/dockside-fish-market/","sourceTitle":"Dockside Fish Market","accessedOn":"2026-09-05"}},{"product":"commercially netted cisco/lake herring","use":"historically Lake Superior's largest commercial fishery, up to 19 million pounds annually in high-catch years; Minnesota harvested over 350,000 pounds in 2011-2012 before dropping below 250,000 pounds in recent years","citation":{"sourceUrl":"https://www.dnr.state.mn.us/fish/cisco/index.html","sourceTitle":"Cisco, Herring, Lake Herring and Tullibee | Minnesota DNR","accessedOn":"2026-09-05"}}],"markets":[{"buyer":"Dockside Fish Market, Grand Marais, Minnesota (North Shore)","kind":"local fish market and smokehouse","citation":{"sourceUrl":"https://superiorinngrandmarais.com/dockside-fish-market/","sourceTitle":"Dockside Fish Market","accessedOn":"2026-09-05"}},{"buyer":"the 25 Minnesota-licensed Lake Superior commercial fishers as a class","kind":"state-licensed commercial harvest channel","citation":{"sourceUrl":"https://www.dnr.state.mn.us/fishing/commercial/cf.html","sourceTitle":"Commercial fishing license information | Minnesota DNR","accessedOn":"2026-09-05"}}],"chainPositionHeld":"unknown","benefitSharingRecord":null,"observedAt":"2026-09-05"},{"identity":{"name":"manoomin (wild rice)","kind":"commodity","issuer":"unknown","rail":"unknown"},"denomination":{"unit":"pound (finished, hand-parched grain)"},"custody":"unknown","yieldForm":"none","laborForm":"hand-harvested from a canoe using knocking sticks and a push pole, within the licensed statewide season (Minnesota DNR, 'Wild Rice Regulations')","liquidity":{"exitPath":"sold directly to a buyer, through a state-licensed wild rice buyer, or processed and sold as a packaged food product by a tribally-owned foods enterprise","exitsToRow":null},"extractionCeiling":{"cap":"unknown; no per-harvester poundage cap found for state waters, and reservation wild rice committees set their own harvest rules on reservation waters","resetPeriod":"annual (statewide season runs August 15 to September 30, 9 a.m. to 3 p.m. daily; reservation committees set their own opening dates and hours no less than 24 hours before opening)","antiBotRule":"a Minnesota wild-rice harvester license (season or one-day) is required for residents and nonresidents; members of a federally recognized Minnesota tribe with a valid tribal ID card are exempt from the state license"},"identityCost":{"kycRequired":false,"perHumanSlot":true,"detail":"a state wild-rice harvester license, or a tribal ID card for exempt tribal members; license and buyer-license fees are deposited in a dedicated wild-rice management account (Minnesota DNR, 'Wild Rice Regulations')"},"witnesses":[{"source":"state regulator's first-party regulation page","sourceUrl":"https://www.dnr.state.mn.us/regulations/wildrice/index.html","observedOn":"2026-09-05"},{"source":"tribally-owned foods enterprise's first-party site","sourceUrl":"https://redlakenationfoods.com/home-1-2/","observedOn":"2026-09-05"}],"provenance":{"sourceUrl":"https://www.dnr.state.mn.us/aquatic_plants/emergent_plants/wildrice.html","observedOn":"2026-09-05","evidenceStatus":"measured"},"territory":{"path":"lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section","plainName":"North Shore"},"material":{"scientificName":"Zizania palustris","commonName":"manoomin (wild rice)","materialKind":"species"},"knownProducts":[{"product":"hand-harvested raw wild rice grain, parched and finished for food","use":"food; higher protein content than most cereal grains, a subsistence and cultural keystone for Anishinaabe communities of the Lake Superior basin, protected by 1837, 1842, and 1854 treaty harvesting rights","citation":{"sourceUrl":"https://www.dnr.state.mn.us/aquatic_plants/emergent_plants/wildrice.html","sourceTitle":"Wild Rice (Zizania palustris) | Minnesota DNR","accessedOn":"2026-09-05"}},{"product":"packaged cultivated and hand-harvested wild rice, wild-fruit jellies, jams, and gift foods","use":"retail food product sold under a tribally-owned brand; cited here as the reference-implementation market for Minnesota wild rice, not as evidence that this North Shore territory's own harvest reaches this specific enterprise (Red Lake Nation is a different band's reservation)","citation":{"sourceUrl":"https://redlakenationfoods.com/home-1-2/","sourceTitle":"Red Lake Nation Foods","accessedOn":"2026-09-05"}}],"markets":[{"buyer":"Red Lake Nation Foods (Red Lake Nation's tribally-owned enterprise), cited as the reference-implementation market for hand-harvested and cultivated Minnesota wild rice","kind":"reference-implementation, tribally-owned food enterprise","citation":{"sourceUrl":"https://redlakenationfoods.com/home-1-2/","sourceTitle":"Red Lake Nation Foods","accessedOn":"2026-09-05"}},{"buyer":"state-licensed wild rice buyers","kind":"state-licensed buyer channel","citation":{"sourceUrl":"https://www.dnr.state.mn.us/regulations/wildrice/index.html","sourceTitle":"Wild Rice Regulations | Minnesota DNR","accessedOn":"2026-09-05"}}],"chainPositionHeld":"unknown","benefitSharingRecord":null,"observedAt":"2026-09-05"},{"identity":{"name":"rivercane (Arundinaria gigantea)","kind":"commodity","issuer":"unknown","rail":"unknown"},"denomination":{"unit":"unknown; no unit found for a North Shore/Lake Superior harvest, because none is documented (this territory has no established rivercane harvest; see provenance)"},"custody":"unknown","yieldForm":"none","laborForm":"unknown for this territory; in its native Southeastern range, rivercane is propagated and harvested by living-rhizome division and transplant, since it reproduces almost entirely vegetatively and cannot be recompiled from seed (561 Group Services Section, note on Phezí Ocháǧe, citing the rivercane ecology paper in botany-services-section)","liquidity":{"exitPath":"unknown; no market found for a North Shore/Lake Superior source of rivercane","exitsToRow":null},"extractionCeiling":{"cap":"unknown","resetPeriod":"unknown","antiBotRule":"unknown"},"identityCost":{"kycRequired":"unknown","perHumanSlot":"unknown"},"witnesses":[{"source":"university extension first-party plant profile","sourceUrl":"https://plants.ces.ncsu.edu/plants/arundinaria-gigantea/","observedOn":"2026-09-05"},{"source":"federal agency first-party project page","sourceUrl":"https://www.fws.gov/project/collaboration-river-cane-restoration","observedOn":"2026-09-05"}],"provenance":{"sourceUrl":"lib/emsenn/services/561-group/services/561-group-services-section/content/text/documents/articles/notes/2026/08/21/2026-08-21-note-on-phezi-ochage.md","observedOn":"2026-08-21","evidenceStatus":"self-reported"},"territory":{"path":"lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section","plainName":"North Shore"},"material":{"scientificName":"Arundinaria gigantea","commonName":"rivercane, catalogued here as the band's own structural kinship metaphor (Phíž ezí Ocháǧe), not as a plant native to or harvested in this territory","materialKind":"knowledge"},"knownProducts":[{"product":"the founder's structural identification of the tiyóšpaye's kinship-form with the canebrake","use":"a metaphysical/organizational reading, not a physical harvest: one genet with many culms as the kinship's living continuity; extension by living transplant, never by seed, as the model for huŋkápi (the making of relatives); persistence only in relationship; no synchronized all-or-nothing renewal (mautam); a reticulate, adoptive lineage held as one body; the remnant (over 98 percent of historical canebrakes gone) as irreplaceable. This note claims no part of the Cherokee and neighboring nations' inheritance of the plant itself; it claims kinship with the plant of the place actually lived on.","citation":{"sourceUrl":"lib/emsenn/services/561-group/services/561-group-services-section/content/text/documents/articles/notes/2026/08/21/2026-08-21-note-on-phezi-ochage.md","sourceTitle":"2026-08-21 note on Phíž ezí Ocháǧe","accessedOn":"2026-09-05"}},{"product":"woven baskets, blowguns, fishing poles, musical instruments, home construction material, and erosion-control planting","use":"traditional basketry, construction, crafts, and streambank stabilization, documented in the plant's native Southeastern range (the Eastern Band of Cherokee Indians and neighboring nations; also the founder's own hand-propagation along Crooked Creek in Durham, North Carolina) — a different territory than this North Shore/Lake Superior region, included here only to state what the material is, never as a claim it is used or grown here","citation":{"sourceUrl":"https://plants.ces.ncsu.edu/plants/arundinaria-gigantea/","sourceTitle":"River Cane - Arundinaria gigantea | NC State Extension Gardener Plant Toolbox","accessedOn":"2026-09-05"}}],"markets":[],"chainPositionHeld":"unknown","benefitSharingRecord":null,"observedAt":"2026-09-05"}]},"output":{"type":"TerritoryReadout","version":1,"territory":{"path":"lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section","name":"North Shore"},"entries":[{"material":{"commonName":"rivercane, catalogued here as the band's own structural kinship metaphor (Phíž ezí Ocháǧe), not as a plant native to or harvested in this territory","scientificName":"Arundinaria gigantea","materialKind":"knowledge"},"knownProducts":[{"product":"the founder's structural identification of the tiyóšpaye's kinship-form with the canebrake","use":"a metaphysical/organizational reading, not a physical harvest: one genet with many culms as the kinship's living continuity; extension by living transplant, never by seed, as the model for huŋkápi (the making of relatives); persistence only in relationship; no synchronized all-or-nothing renewal (mautam); a reticulate, adoptive lineage held as one body; the remnant (over 98 percent of historical canebrakes gone) as irreplaceable. This note claims no part of the Cherokee and neighboring nations' inheritance of the plant itself; it claims kinship with the plant of the place actually lived on.","citation":{"sourceUrl":"lib/emsenn/services/561-group/services/561-group-services-section/content/text/documents/articles/notes/2026/08/21/2026-08-21-note-on-phezi-ochage.md","sourceTitle":"2026-08-21 note on Phíž ezí Ocháǧe","accessedOn":"2026-09-05"}},{"product":"woven baskets, blowguns, fishing poles, musical instruments, home construction material, and erosion-control planting","use":"traditional basketry, construction, crafts, and streambank stabilization, documented in the plant's native Southeastern range (the Eastern Band of Cherokee Indians and neighboring nations; also the founder's own hand-propagation along Crooked Creek in Durham, North Carolina) — a different territory than this North Shore/Lake Superior region, included here only to state what the material is, never as a claim it is used or grown here","citation":{"sourceUrl":"https://plants.ces.ncsu.edu/plants/arundinaria-gigantea/","sourceTitle":"River Cane - Arundinaria gigantea | NC State Extension Gardener Plant Toolbox","accessedOn":"2026-09-05"}}],"markets":[],"chainPosition":"unknown","holder":"not named","notFound":["chainPositionHeld","custody","denomination.unit","extractionCeiling.antiBotRule","extractionCeiling.cap","extractionCeiling.resetPeriod","identity.issuer","identity.rail","identityCost.kycRequired","identityCost.perHumanSlot","laborForm","liquidity.exitPath"]},{"material":{"commonName":"Lake Superior agate","scientificName":null,"materialKind":"mineral"},"knownProducts":[{"product":"tumbled stones, cabochons, and face-polished specimens","use":"jewelry (rings, bracelets, belt buckles) and mineral collectibles; designated Minnesota's official state gemstone in 1969","citation":{"sourceUrl":"https://www.dnr.state.mn.us/education/geology/digging/agate.html","sourceTitle":"Lake Superior Agate - Minnesota's State Gem","accessedOn":"2026-09-05"}}],"markets":[],"chainPosition":"unknown","holder":"not named","notFound":["chainPositionHeld","custody","denomination.unit","extractionCeiling.antiBotRule","extractionCeiling.cap","extractionCeiling.resetPeriod","identity.issuer","identity.rail","identityCost.kycRequired","identityCost.perHumanSlot","liquidity.exitPath"]},{"material":{"commonName":"Lake Superior lake trout (co-managed with cisco/lake herring, Coregonus artedi, under the same Minnesota commercial-fishing license and species list)","scientificName":"Salvelinus namaycush","materialKind":"species"},"knownProducts":[{"product":"fresh and smoked lake trout, whitefish, and herring (cisco), sold whole or as fillets","use":"food, sold fresh or smoked at North Shore fish markets","citation":{"sourceUrl":"https://superiorinngrandmarais.com/dockside-fish-market/","sourceTitle":"Dockside Fish Market","accessedOn":"2026-09-05"}},{"product":"commercially netted cisco/lake herring","use":"historically Lake Superior's largest commercial fishery, up to 19 million pounds annually in high-catch years; Minnesota harvested over 350,000 pounds in 2011-2012 before dropping below 250,000 pounds in recent years","citation":{"sourceUrl":"https://www.dnr.state.mn.us/fish/cisco/index.html","sourceTitle":"Cisco, Herring, Lake Herring and Tullibee | Minnesota DNR","accessedOn":"2026-09-05"}}],"markets":[{"buyer":"Dockside Fish Market, Grand Marais, Minnesota (North Shore)","kind":"local fish market and smokehouse","citation":{"sourceUrl":"https://superiorinngrandmarais.com/dockside-fish-market/","sourceTitle":"Dockside Fish Market","accessedOn":"2026-09-05"}},{"buyer":"the 25 Minnesota-licensed Lake Superior commercial fishers as a class","kind":"state-licensed commercial harvest channel","citation":{"sourceUrl":"https://www.dnr.state.mn.us/fishing/commercial/cf.html","sourceTitle":"Commercial fishing license information | Minnesota DNR","accessedOn":"2026-09-05"}}],"chainPosition":"unknown","holder":"not named","notFound":["chainPositionHeld","custody","identity.issuer","identity.rail"]},{"material":{"commonName":"manoomin (wild rice)","scientificName":"Zizania palustris","materialKind":"species"},"knownProducts":[{"product":"hand-harvested raw wild rice grain, parched and finished for food","use":"food; higher protein content than most cereal grains, a subsistence and cultural keystone for Anishinaabe communities of the Lake Superior basin, protected by 1837, 1842, and 1854 treaty harvesting rights","citation":{"sourceUrl":"https://www.dnr.state.mn.us/aquatic_plants/emergent_plants/wildrice.html","sourceTitle":"Wild Rice (Zizania palustris) | Minnesota DNR","accessedOn":"2026-09-05"}},{"product":"packaged cultivated and hand-harvested wild rice, wild-fruit jellies, jams, and gift foods","use":"retail food product sold under a tribally-owned brand; cited here as the reference-implementation market for Minnesota wild rice, not as evidence that this North Shore territory's own harvest reaches this specific enterprise (Red Lake Nation is a different band's reservation)","citation":{"sourceUrl":"https://redlakenationfoods.com/home-1-2/","sourceTitle":"Red Lake Nation Foods","accessedOn":"2026-09-05"}}],"markets":[{"buyer":"Red Lake Nation Foods (Red Lake Nation's tribally-owned enterprise), cited as the reference-implementation market for hand-harvested and cultivated Minnesota wild rice","kind":"reference-implementation, tribally-owned food enterprise","citation":{"sourceUrl":"https://redlakenationfoods.com/home-1-2/","sourceTitle":"Red Lake Nation Foods","accessedOn":"2026-09-05"}},{"buyer":"state-licensed wild rice buyers","kind":"state-licensed buyer channel","citation":{"sourceUrl":"https://www.dnr.state.mn.us/regulations/wildrice/index.html","sourceTitle":"Wild Rice Regulations | Minnesota DNR","accessedOn":"2026-09-05"}}],"chainPosition":"unknown","holder":"not named","notFound":["chainPositionHeld","custody","extractionCeiling.cap","identity.issuer","identity.rail"]}],"excluded":0}}
```
```json name="the same four real North Shore catalog rows read against a sibling regional taxonomy node (Great Plains): all four excluded"
{"input":{"type":"TerritoryReadoutRequest","version":1,"territory":{"path":"lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-great-plains-regional-ecological-adaptation-services-section","name":"Great Plains"},"rows":[{"identity":{"name":"Lake Superior agate","kind":"commodity","issuer":"unknown","rail":"unknown"},"denomination":{"unit":"unknown; sold by the piece or by weight, no standard unit found"},"custody":"unknown","yieldForm":"none","laborForm":"collected by rockhounding (surface collecting); at lapidary scale, tumbled, slabbed and polished, or face-polished for jewelry and collectibles (Minnesota DNR, 'Lake Superior Agate - Minnesota's State Gem')","liquidity":{"exitPath":"unknown; no first-party seller or market page found this session","exitsToRow":null},"extractionCeiling":{"cap":"unknown; no collecting limit found on the sources read","resetPeriod":"unknown","antiBotRule":"unknown"},"identityCost":{"kycRequired":"unknown","perHumanSlot":"unknown"},"witnesses":[{"source":"state regulator's first-party education page","sourceUrl":"https://www.dnr.state.mn.us/education/geology/digging/agate.html","observedOn":"2026-09-05"}],"provenance":{"sourceUrl":"https://www.dnr.state.mn.us/education/geology/digging/agate.html","observedOn":"2026-09-05","evidenceStatus":"measured"},"territory":{"path":"lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section","plainName":"North Shore"},"material":{"scientificName":null,"commonName":"Lake Superior agate","materialKind":"mineral"},"knownProducts":[{"product":"tumbled stones, cabochons, and face-polished specimens","use":"jewelry (rings, bracelets, belt buckles) and mineral collectibles; designated Minnesota's official state gemstone in 1969","citation":{"sourceUrl":"https://www.dnr.state.mn.us/education/geology/digging/agate.html","sourceTitle":"Lake Superior Agate - Minnesota's State Gem","accessedOn":"2026-09-05"}}],"markets":[],"chainPositionHeld":"unknown","benefitSharingRecord":null,"observedAt":"2026-09-05"},{"identity":{"name":"Lake Superior lake trout","kind":"commodity","issuer":"unknown","rail":"unknown"},"denomination":{"unit":"pound (round weight, commercial harvest)"},"custody":"unknown","yieldForm":"none","laborForm":"commercially gillnetted or trap-netted by a Minnesota-licensed Lake Superior commercial fisher; lake trout may not be commercially taken except by special permit, and incidentally-taken live lake trout, and untagged dead lake trout, must be returned to the water immediately (Minnesota DNR, commercial fishing license page)","liquidity":{"exitPath":"sold to a licensed fish buyer or a lakeside fish market/smokehouse","exitsToRow":null},"extractionCeiling":{"cap":"25 total Minnesota commercial fishing licenses for Lake Superior; lake trout commercial take is special-permit-only (no general commercial season); the co-managed cisco/lake herring quota is set annually at an estimated 10 percent of total biomass","resetPeriod":"annual (license renewal; annual biomass-based quota for cisco/lake herring)","antiBotRule":"a Minnesota commercial fishing license, limited to 25 total license-holders statewide for Lake Superior, with licensing criteria including apprenticeship experience with an existing licensed commercial fisherman and required equipment"},"identityCost":{"kycRequired":false,"perHumanSlot":true,"detail":"a state commercial fishing license, one of only 25 issued for Minnesota waters of Lake Superior"},"witnesses":[{"source":"state regulator's first-party licensing page","sourceUrl":"https://www.dnr.state.mn.us/fishing/commercial/cf.html","observedOn":"2026-09-05"},{"source":"state regulator's first-party species page","sourceUrl":"https://www.dnr.state.mn.us/fish/cisco/index.html","observedOn":"2026-09-05"}],"provenance":{"sourceUrl":"https://www.dnr.state.mn.us/fishing/commercial/cf.html","observedOn":"2026-09-05","evidenceStatus":"measured"},"territory":{"path":"lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section","plainName":"North Shore"},"material":{"scientificName":"Salvelinus namaycush","commonName":"Lake Superior lake trout (co-managed with cisco/lake herring, Coregonus artedi, under the same Minnesota commercial-fishing license and species list)","materialKind":"species"},"knownProducts":[{"product":"fresh and smoked lake trout, whitefish, and herring (cisco), sold whole or as fillets","use":"food, sold fresh or smoked at North Shore fish markets","citation":{"sourceUrl":"https://superiorinngrandmarais.com/dockside-fish-market/","sourceTitle":"Dockside Fish Market","accessedOn":"2026-09-05"}},{"product":"commercially netted cisco/lake herring","use":"historically Lake Superior's largest commercial fishery, up to 19 million pounds annually in high-catch years; Minnesota harvested over 350,000 pounds in 2011-2012 before dropping below 250,000 pounds in recent years","citation":{"sourceUrl":"https://www.dnr.state.mn.us/fish/cisco/index.html","sourceTitle":"Cisco, Herring, Lake Herring and Tullibee | Minnesota DNR","accessedOn":"2026-09-05"}}],"markets":[{"buyer":"Dockside Fish Market, Grand Marais, Minnesota (North Shore)","kind":"local fish market and smokehouse","citation":{"sourceUrl":"https://superiorinngrandmarais.com/dockside-fish-market/","sourceTitle":"Dockside Fish Market","accessedOn":"2026-09-05"}},{"buyer":"the 25 Minnesota-licensed Lake Superior commercial fishers as a class","kind":"state-licensed commercial harvest channel","citation":{"sourceUrl":"https://www.dnr.state.mn.us/fishing/commercial/cf.html","sourceTitle":"Commercial fishing license information | Minnesota DNR","accessedOn":"2026-09-05"}}],"chainPositionHeld":"unknown","benefitSharingRecord":null,"observedAt":"2026-09-05"},{"identity":{"name":"manoomin (wild rice)","kind":"commodity","issuer":"unknown","rail":"unknown"},"denomination":{"unit":"pound (finished, hand-parched grain)"},"custody":"unknown","yieldForm":"none","laborForm":"hand-harvested from a canoe using knocking sticks and a push pole, within the licensed statewide season (Minnesota DNR, 'Wild Rice Regulations')","liquidity":{"exitPath":"sold directly to a buyer, through a state-licensed wild rice buyer, or processed and sold as a packaged food product by a tribally-owned foods enterprise","exitsToRow":null},"extractionCeiling":{"cap":"unknown; no per-harvester poundage cap found for state waters, and reservation wild rice committees set their own harvest rules on reservation waters","resetPeriod":"annual (statewide season runs August 15 to September 30, 9 a.m. to 3 p.m. daily; reservation committees set their own opening dates and hours no less than 24 hours before opening)","antiBotRule":"a Minnesota wild-rice harvester license (season or one-day) is required for residents and nonresidents; members of a federally recognized Minnesota tribe with a valid tribal ID card are exempt from the state license"},"identityCost":{"kycRequired":false,"perHumanSlot":true,"detail":"a state wild-rice harvester license, or a tribal ID card for exempt tribal members; license and buyer-license fees are deposited in a dedicated wild-rice management account (Minnesota DNR, 'Wild Rice Regulations')"},"witnesses":[{"source":"state regulator's first-party regulation page","sourceUrl":"https://www.dnr.state.mn.us/regulations/wildrice/index.html","observedOn":"2026-09-05"},{"source":"tribally-owned foods enterprise's first-party site","sourceUrl":"https://redlakenationfoods.com/home-1-2/","observedOn":"2026-09-05"}],"provenance":{"sourceUrl":"https://www.dnr.state.mn.us/aquatic_plants/emergent_plants/wildrice.html","observedOn":"2026-09-05","evidenceStatus":"measured"},"territory":{"path":"lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section","plainName":"North Shore"},"material":{"scientificName":"Zizania palustris","commonName":"manoomin (wild rice)","materialKind":"species"},"knownProducts":[{"product":"hand-harvested raw wild rice grain, parched and finished for food","use":"food; higher protein content than most cereal grains, a subsistence and cultural keystone for Anishinaabe communities of the Lake Superior basin, protected by 1837, 1842, and 1854 treaty harvesting rights","citation":{"sourceUrl":"https://www.dnr.state.mn.us/aquatic_plants/emergent_plants/wildrice.html","sourceTitle":"Wild Rice (Zizania palustris) | Minnesota DNR","accessedOn":"2026-09-05"}},{"product":"packaged cultivated and hand-harvested wild rice, wild-fruit jellies, jams, and gift foods","use":"retail food product sold under a tribally-owned brand; cited here as the reference-implementation market for Minnesota wild rice, not as evidence that this North Shore territory's own harvest reaches this specific enterprise (Red Lake Nation is a different band's reservation)","citation":{"sourceUrl":"https://redlakenationfoods.com/home-1-2/","sourceTitle":"Red Lake Nation Foods","accessedOn":"2026-09-05"}}],"markets":[{"buyer":"Red Lake Nation Foods (Red Lake Nation's tribally-owned enterprise), cited as the reference-implementation market for hand-harvested and cultivated Minnesota wild rice","kind":"reference-implementation, tribally-owned food enterprise","citation":{"sourceUrl":"https://redlakenationfoods.com/home-1-2/","sourceTitle":"Red Lake Nation Foods","accessedOn":"2026-09-05"}},{"buyer":"state-licensed wild rice buyers","kind":"state-licensed buyer channel","citation":{"sourceUrl":"https://www.dnr.state.mn.us/regulations/wildrice/index.html","sourceTitle":"Wild Rice Regulations | Minnesota DNR","accessedOn":"2026-09-05"}}],"chainPositionHeld":"unknown","benefitSharingRecord":null,"observedAt":"2026-09-05"},{"identity":{"name":"rivercane (Arundinaria gigantea)","kind":"commodity","issuer":"unknown","rail":"unknown"},"denomination":{"unit":"unknown; no unit found for a North Shore/Lake Superior harvest, because none is documented (this territory has no established rivercane harvest; see provenance)"},"custody":"unknown","yieldForm":"none","laborForm":"unknown for this territory; in its native Southeastern range, rivercane is propagated and harvested by living-rhizome division and transplant, since it reproduces almost entirely vegetatively and cannot be recompiled from seed (561 Group Services Section, note on Phezí Ocháǧe, citing the rivercane ecology paper in botany-services-section)","liquidity":{"exitPath":"unknown; no market found for a North Shore/Lake Superior source of rivercane","exitsToRow":null},"extractionCeiling":{"cap":"unknown","resetPeriod":"unknown","antiBotRule":"unknown"},"identityCost":{"kycRequired":"unknown","perHumanSlot":"unknown"},"witnesses":[{"source":"university extension first-party plant profile","sourceUrl":"https://plants.ces.ncsu.edu/plants/arundinaria-gigantea/","observedOn":"2026-09-05"},{"source":"federal agency first-party project page","sourceUrl":"https://www.fws.gov/project/collaboration-river-cane-restoration","observedOn":"2026-09-05"}],"provenance":{"sourceUrl":"lib/emsenn/services/561-group/services/561-group-services-section/content/text/documents/articles/notes/2026/08/21/2026-08-21-note-on-phezi-ochage.md","observedOn":"2026-08-21","evidenceStatus":"self-reported"},"territory":{"path":"lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section","plainName":"North Shore"},"material":{"scientificName":"Arundinaria gigantea","commonName":"rivercane, catalogued here as the band's own structural kinship metaphor (Phíž ezí Ocháǧe), not as a plant native to or harvested in this territory","materialKind":"knowledge"},"knownProducts":[{"product":"the founder's structural identification of the tiyóšpaye's kinship-form with the canebrake","use":"a metaphysical/organizational reading, not a physical harvest: one genet with many culms as the kinship's living continuity; extension by living transplant, never by seed, as the model for huŋkápi (the making of relatives); persistence only in relationship; no synchronized all-or-nothing renewal (mautam); a reticulate, adoptive lineage held as one body; the remnant (over 98 percent of historical canebrakes gone) as irreplaceable. This note claims no part of the Cherokee and neighboring nations' inheritance of the plant itself; it claims kinship with the plant of the place actually lived on.","citation":{"sourceUrl":"lib/emsenn/services/561-group/services/561-group-services-section/content/text/documents/articles/notes/2026/08/21/2026-08-21-note-on-phezi-ochage.md","sourceTitle":"2026-08-21 note on Phíž ezí Ocháǧe","accessedOn":"2026-09-05"}},{"product":"woven baskets, blowguns, fishing poles, musical instruments, home construction material, and erosion-control planting","use":"traditional basketry, construction, crafts, and streambank stabilization, documented in the plant's native Southeastern range (the Eastern Band of Cherokee Indians and neighboring nations; also the founder's own hand-propagation along Crooked Creek in Durham, North Carolina) — a different territory than this North Shore/Lake Superior region, included here only to state what the material is, never as a claim it is used or grown here","citation":{"sourceUrl":"https://plants.ces.ncsu.edu/plants/arundinaria-gigantea/","sourceTitle":"River Cane - Arundinaria gigantea | NC State Extension Gardener Plant Toolbox","accessedOn":"2026-09-05"}}],"markets":[],"chainPositionHeld":"unknown","benefitSharingRecord":null,"observedAt":"2026-09-05"}]},"output":{"type":"TerritoryReadout","version":1,"territory":{"path":"lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-great-plains-regional-ecological-adaptation-services-section","name":"Great Plains"},"entries":[],"excluded":4}}
```
## Traceability
- `entries-for-matching-territory` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `entry-carries-material-identity` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `entry-carries-known-products-and-markets` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `entry-carries-chain-position` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `holder-hidden-without-benefit-sharing-record` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `nagoya-protocol-access-benefit-sharing`
- `entries-ordered-by-kind-then-name` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `ecmascript-string-relational-comparison`
- `entry-carries-not-found-field-paths` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`, `ecmascript-string-relational-comparison`
- `result-carries-excluded-count` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-holder-without-benefit-sharing-record` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `nagoya-protocol-access-benefit-sharing`
- `no-cross-territory-entries` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-mutation-of-input` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-clock-no-io` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-invalid-request-type` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
