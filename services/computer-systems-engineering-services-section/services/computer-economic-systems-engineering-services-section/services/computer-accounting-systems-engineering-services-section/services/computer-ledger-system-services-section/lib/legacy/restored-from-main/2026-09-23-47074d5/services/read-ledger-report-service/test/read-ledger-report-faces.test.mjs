import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { readLedgerReport } from "../scripts/read-ledger-report.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "reads a stats report from inline text with a pinned generatedAt",
    "input": {
      "journal": {
        "text": "option \"title\" \"Test Ledger\"\noption \"operating_currency\" \"USD\"\n\n2026-01-01 open Assets:Cash:Operating USD\n2026-01-01 open Assets:Cash:Reserve USD\n2026-01-01 open Equity:Opening-Balances\n2026-01-01 open Income:Consulting\n2026-01-01 open Expenses:Software\n\n2026-01-01 * \"Opening balance\"\n  Assets:Cash:Operating  1000.00 USD\n  Equity:Opening-Balances  -1000.00 USD\n\n2026-01-05 * \"Client payment\" \"Acme Corp\"\n  Assets:Cash:Operating  500.00 USD\n  Income:Consulting  -500.00 USD\n\n2026-01-10 * \"Software subscription\"\n  Assets:Cash:Operating  -20.00 USD\n  Expenses:Software  20.00 USD\n\n2026-01-15 balance Assets:Cash:Operating  1480.00 USD\n\n2026-01-20 balance Assets:Cash:Reserve  50.00 USD\n"
      },
      "report": "stats",
      "now": "2026-09-05T00:00:00.000Z"
    },
    "output": {
      "transactions": 3,
      "postings": 6,
      "accounts": 5,
      "commodities": 1,
      "directives": 9,
      "span": "2026-01-01 … 2026-01-10",
      "malformed": 0,
      "held": 1,
      "synthesized": 0,
      "kind": "ledger-report",
      "report": "stats",
      "journal": {
        "text": true,
        "format": "beancount"
      },
      "generatedAt": "2026-09-05T00:00:00.000Z"
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await readLedgerReport(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/read-ledger-report.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
