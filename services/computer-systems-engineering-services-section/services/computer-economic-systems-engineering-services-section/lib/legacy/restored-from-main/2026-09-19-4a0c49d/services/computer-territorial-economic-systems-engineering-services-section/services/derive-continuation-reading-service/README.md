# @red-cup-engineering/derive-continuation-reading-service

Derives a record-level ContinuationReading for a held position: for every candidate, joins its
evidence rows' charges through metrologic's bilattice knowledge-order join (support and refutation
accumulate losslessly; a row's evidence witnesses that row's own rowId on the side(s) it asserts) and
names the candidate's status (found: support without refutation; contested: knowledge-order top, both
asserted; refuted: refutation without support; unevidenced: knowledge-order bottom, no evidence rows),
then names the overall reading (found if any candidate is found, contested if none is found but any is
contested, else none-found). Pure, no I/O, no clock. This is a record-level reading over evidence rows,
never the unbuilt-affects note's held-⊥ formalization over playing-substrate chronicles — the
territorial-economy science seat's 2026-09-05 continuation-reading-falsification-finding measured that
formalization as unreachable over the playing substrate as built and named it upstream of this program.

## Operation

~~~js
export function deriveContinuationReading(input)
~~~

### Parameters

- input ({ type: "ContinuationReadingRequest", version: 1, position: { text: string, holds: readonly
 *   string[] }, candidates: readonly { id: string, nextStep: string, recordPath: (string | null),
 *   evidenceRows: readonly { rowId: string, charge: { support: boolean, refutation: boolean },
 *   citation: { sourceUrl: string, sourceTitle: string, accessedOn: string } }[] }[], searched:
 *   readonly string[] }): The held position and its candidate continuations, each carrying the evidence rows (a lossless four-valued charge and its citation) found for it, and the search terms run when none was found.

### Returns

{ type: "ContinuationReading", version: 1, notFormal: true, position: { text: string,
 *   holds: readonly string[] }, candidates: readonly { id: string, nextStep: string, recordPath:
 *   (string | null), status: ("found" | "contested" | "refuted" | "unevidenced"), aggregateCharge:
 *   { value: [boolean, boolean], evidence: [readonly string[], readonly string[]] }, evidenceRows:
 *   readonly { rowId: string, charge: { support: boolean, refutation: boolean }, citation: {
 *   sourceUrl: string, sourceTitle: string, accessedOn: string } }[] }[], reading: ("found" |
 *   "contested" | "none-found"), searched: readonly string[] }: The position and searched terms echoed verbatim, each candidate's evidence rows echoed with their citations alongside its joined aggregate charge and derived status, and the overall reading.

### Refusals

- TypeError: When `input` is not a `ContinuationReadingRequest`, or a position, candidate, evidence row, charge, or citation is malformed.
- RangeError: When an evidence row's charge asserts neither support nor refutation, or a citation's `accessedOn` is not an ISO calendar date (YYYY-MM-DD).

## Command

derive-continuation-reading reads one JSON value per input line and writes one JSON value per output line.

## Examples

### Lake Superior fish continuation, two supporting rows, found

Input:

~~~json
{
  "type": "ContinuationReadingRequest",
  "version": 1,
  "position": {
    "text": "What is the next step for a Lake Superior commercial fish species' value chain?",
    "holds": [
      "producer-position-price-elicited",
      "retail-position-price-elicited"
    ]
  },
  "candidates": [
    {
      "id": "lake-trout-dock-to-retail-ladder",
      "nextStep": "Register the Lake Superior lake trout producer-to-retail price ladder (dock price to Bodin Fisheries retail price) in the band's value-chain readout.",
      "recordPath": "lib/emsenn/services/561-group/services/science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/economics-science-services-section/services/territorial-economy-science-services-section/data/records/2026-09-05-band-region-value-chain-readings.json",
      "evidenceRows": [
        {
          "rowId": "mn-dnr-2024-lake-superior-commercial-fishing-summary",
          "charge": {
            "support": true,
            "refutation": false
          },
          "citation": {
            "sourceUrl": "https://files.dnr.state.mn.us/publications/fisheries/educational_reports/2024-lake-superior-commercial-fishing-summary.pdf",
            "sourceTitle": "Commercial Fishing Summary, Minnesota Waters of Lake Superior, 2024, Minnesota DNR Division of Fish and Wildlife",
            "accessedOn": "2026-09-05"
          }
        },
        {
          "rowId": "bodin-fisheries-price-list-2019",
          "charge": {
            "support": true,
            "refutation": false
          },
          "citation": {
            "sourceUrl": "http://www.bodinfisheries.com/price-list.html",
            "sourceTitle": "Price List, Bodin Fisheries",
            "accessedOn": "2026-09-05"
          }
        }
      ]
    }
  ],
  "searched": [
    "Lake Superior lake trout dock-to-retail price ladder, band region economic records"
  ]
}
~~~

Output:

~~~json
{
  "type": "ContinuationReading",
  "version": 1,
  "notFormal": true,
  "position": {
    "text": "What is the next step for a Lake Superior commercial fish species' value chain?",
    "holds": [
      "producer-position-price-elicited",
      "retail-position-price-elicited"
    ]
  },
  "candidates": [
    {
      "id": "lake-trout-dock-to-retail-ladder",
      "nextStep": "Register the Lake Superior lake trout producer-to-retail price ladder (dock price to Bodin Fisheries retail price) in the band's value-chain readout.",
      "recordPath": "lib/emsenn/services/561-group/services/science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/economics-science-services-section/services/territorial-economy-science-services-section/data/records/2026-09-05-band-region-value-chain-readings.json",
      "status": "found",
      "aggregateCharge": {
        "value": [
          true,
          false
        ],
        "evidence": [
          [
            "mn-dnr-2024-lake-superior-commercial-fishing-summary",
            "bodin-fisheries-price-list-2019"
          ],
          []
        ]
      },
      "evidenceRows": [
        {
          "rowId": "mn-dnr-2024-lake-superior-commercial-fishing-summary",
          "charge": {
            "support": true,
            "refutation": false
          },
          "citation": {
            "sourceUrl": "https://files.dnr.state.mn.us/publications/fisheries/educational_reports/2024-lake-superior-commercial-fishing-summary.pdf",
            "sourceTitle": "Commercial Fishing Summary, Minnesota Waters of Lake Superior, 2024, Minnesota DNR Division of Fish and Wildlife",
            "accessedOn": "2026-09-05"
          }
        },
        {
          "rowId": "bodin-fisheries-price-list-2019",
          "charge": {
            "support": true,
            "refutation": false
          },
          "citation": {
            "sourceUrl": "http://www.bodinfisheries.com/price-list.html",
            "sourceTitle": "Price List, Bodin Fisheries",
            "accessedOn": "2026-09-05"
          }
        }
      ]
    }
  ],
  "reading": "found",
  "searched": [
    "Lake Superior lake trout dock-to-retail price ladder, band region economic records"
  ]
}
~~~

### contested candidate, one supporting and one refuting row, no candidate found

Input:

~~~json
{
  "type": "ContinuationReadingRequest",
  "version": 1,
  "position": {
    "text": "Has the band's wild-rice register held its first conversation about pricing hand-harvested rice?",
    "holds": [
      "register-conversation-logged"
    ]
  },
  "candidates": [
    {
      "id": "first-register-conversation",
      "nextStep": "Confirm the register's first conversation about pricing hand-harvested wild rice against cultivated rice.",
      "recordPath": null,
      "evidenceRows": [
        {
          "rowId": "register-entry-2026-09-01",
          "charge": {
            "support": true,
            "refutation": false
          },
          "citation": {
            "sourceUrl": "https://example.test/band-register/entries/2026-09-01",
            "sourceTitle": "Band Economic Register, entry 2026-09-01",
            "accessedOn": "2026-09-05"
          }
        },
        {
          "rowId": "register-attendance-log-gap",
          "charge": {
            "support": false,
            "refutation": true
          },
          "citation": {
            "sourceUrl": "https://example.test/band-register/attendance-log",
            "sourceTitle": "Band Economic Register attendance log",
            "accessedOn": "2026-09-05"
          }
        }
      ]
    }
  ],
  "searched": []
}
~~~

Output:

~~~json
{
  "type": "ContinuationReading",
  "version": 1,
  "notFormal": true,
  "position": {
    "text": "Has the band's wild-rice register held its first conversation about pricing hand-harvested rice?",
    "holds": [
      "register-conversation-logged"
    ]
  },
  "candidates": [
    {
      "id": "first-register-conversation",
      "nextStep": "Confirm the register's first conversation about pricing hand-harvested wild rice against cultivated rice.",
      "recordPath": null,
      "status": "contested",
      "aggregateCharge": {
        "value": [
          true,
          true
        ],
        "evidence": [
          [
            "register-entry-2026-09-01"
          ],
          [
            "register-attendance-log-gap"
          ]
        ]
      },
      "evidenceRows": [
        {
          "rowId": "register-entry-2026-09-01",
          "charge": {
            "support": true,
            "refutation": false
          },
          "citation": {
            "sourceUrl": "https://example.test/band-register/entries/2026-09-01",
            "sourceTitle": "Band Economic Register, entry 2026-09-01",
            "accessedOn": "2026-09-05"
          }
        },
        {
          "rowId": "register-attendance-log-gap",
          "charge": {
            "support": false,
            "refutation": true
          },
          "citation": {
            "sourceUrl": "https://example.test/band-register/attendance-log",
            "sourceTitle": "Band Economic Register attendance log",
            "accessedOn": "2026-09-05"
          }
        }
      ]
    }
  ],
  "reading": "contested",
  "searched": []
}
~~~

### no candidates found, searched echoed verbatim

Input:

~~~json
{
  "type": "ContinuationReadingRequest",
  "version": 1,
  "position": {
    "text": "Is there a named smokehouse's price for the band's fish-to-smoked-product continuation?",
    "holds": [
      "smokehouse-price-named"
    ]
  },
  "candidates": [],
  "searched": [
    "named smokehouse near the dock for Lake Superior lake trout and whitefish, price list or quote"
  ]
}
~~~

Output:

~~~json
{
  "type": "ContinuationReading",
  "version": 1,
  "notFormal": true,
  "position": {
    "text": "Is there a named smokehouse's price for the band's fish-to-smoked-product continuation?",
    "holds": [
      "smokehouse-price-named"
    ]
  },
  "candidates": [],
  "reading": "none-found",
  "searched": [
    "named smokehouse near the dock for Lake Superior lake trout and whitefish, price list or quote"
  ]
}
~~~
