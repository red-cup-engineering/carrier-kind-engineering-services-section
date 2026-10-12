# @red-cup-engineering/derive-territory-readout-service

Derives one place's territory readout from the Turtle Island taxonomy: every catalogued material
whose row belongs to that place or one of its ancestors, each with its known products and markets
(citations intact), its currently held chain position, a holder rendered as the literal "not named"
whenever the row carries no benefit-sharing record (never the row's own issuer in that case), and
a notFound listing of every field anywhere in that row the row itself marks unknown, sorted so the
listing never depends on the row's own JSON key order. Pure, no I/O, no clock. Entries are ordered
by material kind then common name, and notFound paths are sorted, by the ECMAScript string
relational comparison (never locale collation); rows outside the requested territory are excluded
and counted.

## Operation

~~~js
export function deriveTerritoryReadout(input)
~~~

### Parameters

- input ({ type: "TerritoryReadoutRequest", version: 1, territory: { path: string, name: string },
 *   rows: readonly object[] }): The place being read (its taxonomy path and plain name) and the territory catalog rows to read it against; each row is a territory-catalog-row record (this section's schema): `territory: {path, plainName}`, `material: {commonName, scientificName, materialKind}`, `knownProducts`, `markets`, `chainPositionHeld`, `benefitSharingRecord`, `identity: {issuer, ...}`, and any other resource-row field.

### Returns

{ type: "TerritoryReadout", version: 1, territory: { path: string, name: string },
 *   entries: readonly { material: { commonName: string, scientificName: (string|null),
 *   materialKind: string }, knownProducts: readonly object[], markets: readonly object[],
 *   chainPosition: ("unknown" | { position: string, evidence: string }), holder: string,
 *   notFound: readonly string[] }[], excluded: number }: The requested territory, one entry per matching row (ordered by material kind then common name), and the count of rows excluded for lying outside that territory and its ancestors.

### Refusals

- TypeError: When `input` is not a `TerritoryReadoutRequest`, or a territory or row field is malformed.

## Command

derive-territory-readout reads one JSON value per input line and writes one JSON value per output line.

## Examples

### the four real North Shore catalog rows (manoomin, rivercane, Lake Superior lake trout, Lake Superior agate) read against their own North Shore node: all four included

Input:

~~~json
{
  "type": "TerritoryReadoutRequest",
  "version": 1,
  "territory": {
    "path": "lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section",
    "name": "North Shore"
  },
  "rows": [
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
  ]
}
~~~

Output:

~~~json
{
  "type": "TerritoryReadout",
  "version": 1,
  "territory": {
    "path": "lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-northern-forests-regional-ecological-adaptation-services-section/services/great-lakes-ecological-adaptation-services-section/services/lake-superior-ecological-adaptation-services-section/services/north-shore-ecological-adaptation-services-section",
    "name": "North Shore"
  },
  "entries": [
    {
      "material": {
        "commonName": "rivercane, catalogued here as the band's own structural kinship metaphor (Phíž ezí Ocháǧe), not as a plant native to or harvested in this territory",
        "scientificName": "Arundinaria gigantea",
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
      "chainPosition": "unknown",
      "holder": "not named",
      "notFound": [
        "chainPositionHeld",
        "custody",
        "denomination.unit",
        "extractionCeiling.antiBotRule",
        "extractionCeiling.cap",
        "extractionCeiling.resetPeriod",
        "identity.issuer",
        "identity.rail",
        "identityCost.kycRequired",
        "identityCost.perHumanSlot",
        "laborForm",
        "liquidity.exitPath"
      ]
    },
    {
      "material": {
        "commonName": "Lake Superior agate",
        "scientificName": null,
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
      "chainPosition": "unknown",
      "holder": "not named",
      "notFound": [
        "chainPositionHeld",
        "custody",
        "denomination.unit",
        "extractionCeiling.antiBotRule",
        "extractionCeiling.cap",
        "extractionCeiling.resetPeriod",
        "identity.issuer",
        "identity.rail",
        "identityCost.kycRequired",
        "identityCost.perHumanSlot",
        "liquidity.exitPath"
      ]
    },
    {
      "material": {
        "commonName": "Lake Superior lake trout (co-managed with cisco/lake herring, Coregonus artedi, under the same Minnesota commercial-fishing license and species list)",
        "scientificName": "Salvelinus namaycush",
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
      "chainPosition": "unknown",
      "holder": "not named",
      "notFound": [
        "chainPositionHeld",
        "custody",
        "identity.issuer",
        "identity.rail"
      ]
    },
    {
      "material": {
        "commonName": "manoomin (wild rice)",
        "scientificName": "Zizania palustris",
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
      "chainPosition": "unknown",
      "holder": "not named",
      "notFound": [
        "chainPositionHeld",
        "custody",
        "extractionCeiling.cap",
        "identity.issuer",
        "identity.rail"
      ]
    }
  ],
  "excluded": 0
}
~~~

### the same four real North Shore catalog rows read against a sibling regional taxonomy node (Great Plains): all four excluded

Input:

~~~json
{
  "type": "TerritoryReadoutRequest",
  "version": 1,
  "territory": {
    "path": "lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-great-plains-regional-ecological-adaptation-services-section",
    "name": "Great Plains"
  },
  "rows": [
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
  ]
}
~~~

Output:

~~~json
{
  "type": "TerritoryReadout",
  "version": 1,
  "territory": {
    "path": "lib/emsenn/services/561-group/services/public-services-section/services/public-ecological-services-section/services/ecological-adaptation-services-section/services/turtle-island-ecological-adaptation-services/services/turtle-island-great-plains-regional-ecological-adaptation-services-section",
    "name": "Great Plains"
  },
  "entries": [],
  "excluded": 4
}
~~~
