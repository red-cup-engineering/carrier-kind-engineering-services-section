import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { importUtilityStatement } from "../scripts/import-utility-statement.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "imports a CSV row with a held-open meter mismatch",
    "input": {
      "statementText": "Account,From,To,kWh Used,kWh Generated\n12345,2026-08-01,2026-08-31,450.00,120.00\n",
      "format": "csv",
      "parserConfig": {
        "utility": "Example Coop",
        "columnMap": {
          "householdId": "Account",
          "periodStart": "From",
          "periodEnd": "To",
          "kwhUsed": "kWh Used",
          "kwhGenerated": "kWh Generated"
        },
        "dateFormat": "YYYY-MM-DD",
        "sourceUrl": "https://www.example-coop.coop/statement"
      },
      "tariff": {
        "utility": "Example Coop",
        "rateScheduleName": "Residential",
        "usdPerKwhTiers": [
          {
            "usdPerKwh": "0.1423"
          }
        ],
        "sourceUrl": "https://www.example-coop.coop/rates",
        "asOf": "2026-07-01"
      },
      "meterReadings": [
        {
          "date": "2026-08-31",
          "kwh": "448.50"
        }
      ]
    },
    "output": [
      {
        "type": "HouseholdEnergyRecord",
        "version": 1,
        "householdId": "12345",
        "periodStart": "2026-08-01",
        "periodEnd": "2026-08-31",
        "kwhUsed": {
          "statementValue": "450.00",
          "meterOrBankValue": "448.50",
          "mismatch": true,
          "mismatchAmount": "1.5"
        },
        "kwhGenerated": {
          "statementValue": "120.00",
          "meterOrBankValue": null,
          "mismatch": null,
          "mismatchAmount": null
        },
        "tariff": {
          "utility": "Example Coop",
          "rateScheduleName": "Residential",
          "usdPerKwhTiers": [
            {
              "usdPerKwh": "0.1423"
            }
          ],
          "sourceUrl": "https://www.example-coop.coop/rates",
          "asOf": "2026-07-01"
        }
      }
    ]
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await importUtilityStatement(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/import-utility-statement.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
