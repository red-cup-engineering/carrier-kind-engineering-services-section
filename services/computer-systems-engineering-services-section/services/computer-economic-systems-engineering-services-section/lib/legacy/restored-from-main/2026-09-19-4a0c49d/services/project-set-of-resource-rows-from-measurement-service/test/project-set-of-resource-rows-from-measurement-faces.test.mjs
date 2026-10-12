import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { projectSetOfResourceRowsFromMeasurement } from "../scripts/project-set-of-resource-rows-from-measurement.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "project-set-of-resource-rows-from-measurement example",
    "input": {
      "broadSurfaceMeasurement": {
        "rows": []
      },
      "providerAndIncumbentMeasurement": {
        "rows": []
      },
      "catalog": {
        "economy": "test-economy",
        "fieldMapping": {
          "product": "product",
          "text": [
            "product",
            "capability",
            "normalized_value",
            "exact_source_language",
            "result"
          ],
          "sourceUrl": "source_url",
          "observedAt": "observed_at",
          "disclosureClass": "disclosure_class",
          "requiresIdentity": "requiresIdentity",
          "arena": "arena"
        },
        "resources": [
          {
            "name": "HIVE",
            "kind": "currency",
            "rail": "Hive blockchain",
            "unit": "HIVE",
            "match": {
              "type": "regex",
              "pattern": "\\bHIVE\\b"
            }
          }
        ]
      }
    },
    "output": {
      "type": "ResourceRowProjection",
      "rows": [
        {
          "identity": {
            "name": "HIVE",
            "kind": "currency",
            "issuer": "unknown",
            "rail": "Hive blockchain"
          },
          "denomination": {
            "unit": "HIVE",
            "witReading": null,
            "emergyReading": null
          },
          "custody": "unknown",
          "yieldForm": "unknown",
          "laborForm": "unknown",
          "liquidity": {
            "exitPath": "unknown",
            "exitsToRow": null
          },
          "extractionCeiling": {
            "cap": "unknown",
            "resetPeriod": "unknown",
            "antiBotRule": "unknown"
          },
          "identityCost": {
            "kycRequired": "unknown",
            "perHumanSlot": "unknown",
            "detail": "unknown"
          },
          "witnesses": [],
          "provenance": {
            "sourceUrl": "unknown",
            "observedOn": "unknown",
            "evidenceStatus": "unknown"
          }
        }
      ]
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await projectSetOfResourceRowsFromMeasurement(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/project-set-of-resource-rows-from-measurement.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
