import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { deriveJoulesPerSettledRow } from "../scripts/derive-joules-per-settled-row.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "prices a matched row from a declared cpu-seconds factor",
    "input": {
      "settledRows": [
        {
          "rowId": "row-1",
          "intervalStart": "2026-09-05T00:00:00.000Z",
          "intervalEnd": "2026-09-05T00:05:00.000Z"
        }
      ],
      "resourceReceipts": [
        {
          "type": "bare-cedar-fog.resource-metering/unit-resource-consumed",
          "version": 1,
          "host": "bare-cedar-fog",
          "unit": "example.service",
          "provider": "bare-cedar-fog",
          "actor": "example.service",
          "intervalStart": "2026-09-05T00:00:00.000Z",
          "intervalEnd": "2026-09-05T00:05:00.000Z",
          "derivedFrom": {},
          "price": {
            "denomination": {
              "kind": "resource",
              "asset": "cpu-seconds",
              "unit": "second"
            },
            "amount": {
              "numerator": "2000000000",
              "denominator": "1000000000"
            }
          }
        }
      ],
      "conversionFactors": {
        "cpuSecondsToJoules": {
          "value": "65",
          "sourceUrl": "https://example.org/tdp-note",
          "asOf": "2026-09-01"
        },
        "byteToJoules": {
          "value": "0.0000001",
          "sourceUrl": "https://example.org/network-energy-note",
          "asOf": "2026-09-01"
        }
      },
      "boundary": [
        "hosts"
      ]
    },
    "output": {
      "receipts": [
        {
          "type": "SettledRowEnergyReceipt",
          "version": 1,
          "rowId": "row-1",
          "joules": "130",
          "boundary": [
            "hosts"
          ],
          "conversionFactors": {
            "cpuSecondsToJoules": {
              "value": "65",
              "sourceUrl": "https://example.org/tdp-note",
              "asOf": "2026-09-01"
            },
            "byteToJoules": {
              "value": "0.0000001",
              "sourceUrl": "https://example.org/network-energy-note",
              "asOf": "2026-09-01"
            }
          },
          "sourceReceipts": [
            {
              "type": "bare-cedar-fog.resource-metering/unit-resource-consumed",
              "version": 1,
              "host": "bare-cedar-fog",
              "unit": "example.service",
              "provider": "bare-cedar-fog",
              "actor": "example.service",
              "intervalStart": "2026-09-05T00:00:00.000Z",
              "intervalEnd": "2026-09-05T00:05:00.000Z",
              "derivedFrom": {},
              "price": {
                "denomination": {
                  "kind": "resource",
                  "asset": "cpu-seconds",
                  "unit": "second"
                },
                "amount": {
                  "numerator": "2000000000",
                  "denominator": "1000000000"
                }
              }
            }
          ]
        }
      ],
      "unmatchedRowIds": []
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "refuses as data on an asset with no declared conversion factor",
    "input": {
      "settledRows": [
        {
          "rowId": "row-3",
          "intervalStart": "2026-09-05T00:00:00.000Z",
          "intervalEnd": "2026-09-05T00:05:00.000Z"
        }
      ],
      "resourceReceipts": [
        {
          "type": "bare-cedar-fog.resource-metering/unit-resource-consumed",
          "version": 1,
          "host": "bare-cedar-fog",
          "unit": "example.service",
          "provider": "bare-cedar-fog",
          "actor": "example.service",
          "intervalStart": "2026-09-05T00:00:00.000Z",
          "intervalEnd": "2026-09-05T00:05:00.000Z",
          "derivedFrom": {},
          "price": {
            "denomination": {
              "kind": "resource",
              "asset": "memory-peak-bytes",
              "unit": "byte"
            },
            "amount": {
              "numerator": "500",
              "denominator": "1"
            }
          }
        }
      ],
      "conversionFactors": {
        "cpuSecondsToJoules": {
          "value": "65",
          "sourceUrl": "https://example.org/tdp-note",
          "asOf": "2026-09-01"
        },
        "byteToJoules": {
          "value": "0.0000001",
          "sourceUrl": "https://example.org/network-energy-note",
          "asOf": "2026-09-01"
        }
      },
      "boundary": [
        "hosts"
      ]
    },
    "output": {
      "refused": true,
      "reason": "no-conversion-factor-for-asset",
      "asset": "memory-peak-bytes"
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await deriveJoulesPerSettledRow(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/derive-joules-per-settled-row.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
