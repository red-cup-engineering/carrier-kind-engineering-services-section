import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { deriveContinuationReading } from "../scripts/derive-continuation-reading.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "Lake Superior fish continuation, two supporting rows, found",
    "input": {
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
    },
    "output": {
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
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "contested candidate, one supporting and one refuting row, no candidate found",
    "input": {
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
    },
    "output": {
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
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "no candidates found, searched echoed verbatim",
    "input": {
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
    },
    "output": {
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
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await deriveContinuationReading(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/derive-continuation-reading.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
