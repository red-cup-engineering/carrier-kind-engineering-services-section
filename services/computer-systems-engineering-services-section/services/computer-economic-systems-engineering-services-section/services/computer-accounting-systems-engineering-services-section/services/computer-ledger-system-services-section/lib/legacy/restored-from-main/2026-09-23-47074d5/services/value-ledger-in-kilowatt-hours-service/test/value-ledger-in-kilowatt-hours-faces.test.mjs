import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { valueLedgerInKilowattHours } from "../scripts/value-ledger-in-kilowatt-hours.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "fully priced journal values in USD with no unpriced commodities",
    "input": {
      "journal": {
        "text": "option \"title\" \"Test\"\noption \"operating_currency\" \"USD\"\n\n2026-01-01 open Assets:Cash:Operating USD\n2026-01-01 open Equity:Opening-Balances\n\n2026-01-01 * \"Opening\"\n  Assets:Cash:Operating  1000.00 USD\n  Equity:Opening-Balances  -1000.00 USD\n"
      },
      "asOf": "2026-09-05",
      "now": "2026-09-05T00:00:00.000Z"
    },
    "output": {
      "type": "KilowattHourValuation",
      "version": 1,
      "generatedAt": "2026-09-05T00:00:00.000Z",
      "usdValuation": {
        "rows": [
          {
            "account": "Assets:Cash:Operating",
            "units": {
              "kind": "exactNumber.gradedRational",
              "value": {
                "kind": "exactNumber.rational",
                "num": "1000",
                "den": "1"
              },
              "grade": "USD"
            },
            "lot": null,
            "bookValue": null,
            "marketPrice": {
              "kind": "exactNumber.gradedRational",
              "value": {
                "kind": "exactNumber.rational",
                "num": "1",
                "den": "1"
              },
              "grade": "USD"
            },
            "marketValue": {
              "kind": "exactNumber.gradedRational",
              "value": {
                "kind": "exactNumber.rational",
                "num": "1000",
                "den": "1"
              },
              "grade": "USD"
            },
            "unrealized": null,
            "priceDate": null
          }
        ],
        "end": "2026-09-05",
        "reportingCommodity": "USD",
        "kind": "ledger-report",
        "report": "valuation",
        "journal": {
          "text": true,
          "format": "beancount"
        },
        "generatedAt": "2026-09-05T00:00:00.000Z"
      },
      "kwhValuation": null,
      "unpricedCommodities": []
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await valueLedgerInKilowattHours(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/value-ledger-in-kilowatt-hours.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
